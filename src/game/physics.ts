/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Building, CityData, Helipad, HelicopterModel, HelicopterState, NoFlyZone, Pedestrian, WaterDrop, WeatherState } from '../types/game';

export interface FlightInputs {
  cyclicX: number; // -1 (roll left) to +1 (roll right)
  cyclicY: number; // -1 (pitch down/forward) to +1 (pitch up/backward)
  collective: number; // 0 to 1 (throttle/lift)
  rudder: number; // -1 (yaw left) to +1 (yaw right)
  dropWater: boolean;
  toggleHoist: boolean;
  toggleSiren: boolean;
  toggleMegaphone: boolean;
  toggleSearchlight: boolean;
  toggleFLIR: boolean;
  toggleEngine?: boolean;
  autoHover?: boolean;
}

export interface ObstacleAlert {
  buildingId: string;
  buildingName: string;
  roofHeight: number;
  distance: number;
  timeToImpact: number; // seconds
  heightDeficit: number; // ft to climb to clear
  severity: 'caution' | 'warning'; // caution: ~2.5-5s ahead, warning: < 2.5s
  buildingX: number;
  buildingY: number;
  buildingWidth: number;
  buildingHeight: number;
}

export function checkObstacleRadar(heli: HelicopterState, city: CityData): ObstacleAlert | null {
  if (heli.isLanded || !city || !city.buildings) return null;

  const speed = Math.hypot(heli.vx, heli.vy);
  let dirX: number;
  let dirY: number;

  if (speed > 12) {
    dirX = heli.vx / speed;
    dirY = heli.vy / speed;
  } else {
    // Canvas coordinates: 0 is North (-Y), PI/2 is East (+X)
    dirX = Math.sin(heli.heading);
    dirY = -Math.cos(heli.heading);
  }

  // Scan look-ahead distance: 150px to 600px depending on velocity
  const lookAhead = Math.max(160, Math.min(600, speed * 3.5));
  let closestAlert: ObstacleAlert | null = null;
  let minDistance = Infinity;

  for (const b of city.buildings) {
    // Skip buildings that are safely lower than current helicopter altitude
    if (b.roofHeight < heli.z - 4) continue;

    const bcx = b.x + b.width / 2;
    const bcy = b.y + b.height / 2;
    const bRadius = Math.max(b.width, b.height) / 2;

    const relX = bcx - heli.x;
    const relY = bcy - heli.y;

    // Dot product with direction vector (forward distance)
    const forwardDist = relX * dirX + relY * dirY;
    if (forwardDist < 8 || forwardDist > lookAhead + bRadius) continue;

    // Lateral distance perpendicular to flight vector
    const lateralDist = Math.abs(relX * (-dirY) + relY * dirX);
    const corridorWidth = bRadius + 28; // safety corridor

    if (lateralDist < corridorWidth) {
      const edgeDist = Math.max(1, forwardDist - bRadius);
      if (edgeDist < minDistance) {
        minDistance = edgeDist;
        const estSpeed = Math.max(25, speed);
        const timeToImpact = Math.max(0.3, edgeDist / estSpeed);
        const heightDeficit = Math.ceil(b.roofHeight - heli.z + 16);
        const severity: 'caution' | 'warning' = (timeToImpact < 2.0 || edgeDist < 95) ? 'warning' : 'caution';

        closestAlert = {
          buildingId: b.id,
          buildingName: b.name || `Tower (${b.roofHeight} FT)`,
          roofHeight: b.roofHeight,
          distance: Math.round(edgeDist),
          timeToImpact: Number(timeToImpact.toFixed(1)),
          heightDeficit,
          severity,
          buildingX: b.x,
          buildingY: b.y,
          buildingWidth: b.width,
          buildingHeight: b.height,
        };
      }
    }
  }

  return closestAlert;
}

export function createInitialHelicopter(model: HelicopterModel, spawnHelipad: Helipad): HelicopterState {
  return {
    x: spawnHelipad.x,
    y: spawnHelipad.y,
    z: spawnHelipad.altitude,
    vx: 0,
    vy: 0,
    vz: 0,
    heading: 0,
    pitch: 0,
    roll: 0,
    rotorRpm: 100,
    rotorAngle: 0,
    tailRotorAngle: 0,
    engineStarted: true,
    fuel: model.fuelCapacity,
    fuelMax: model.fuelCapacity,
    health: 100,
    water: model.waterCapacity,
    waterMax: model.waterCapacity,
    hoistDeployed: false,
    hoistLength: 0,
    hoistPayload: null,
    passengers: [],
    sirenActive: false,
    megaphoneActive: false,
    searchlightActive: false,
    searchlightAngle: 0,
    flirActive: false,
    isLanded: true,
    landedHelipad: spawnHelipad,
    touchdownTimer: 1.0,
  };
}

export function updateHelicopterPhysics(
  heli: HelicopterState,
  model: HelicopterModel,
  inputs: FlightInputs,
  weather: WeatherState,
  city: CityData,
  dt: number,
  events: {
    onCrash?: (reason: string) => void;
    onHardLanding?: () => void;
    onSafeLanding?: (helipad: Helipad | null) => void;
    onWaterRefilled?: () => void;
    onVictimHoisted?: (victim: Pedestrian) => void;
    onWaterDropped?: (drop: WaterDrop) => void;
  }
) {
  // 1. Engine & Rotor RPM dynamics
  if (inputs.toggleEngine) {
    heli.engineStarted = !heli.engineStarted;
  }

  if (heli.engineStarted && heli.fuel > 0) {
    if (heli.rotorRpm < 100) {
      heli.rotorRpm = Math.min(100, heli.rotorRpm + dt * 25);
    }
    // Fuel burn rate based on collective
    const burnRate = (0.015 + (inputs.collective * 0.035)) / 60;
    heli.fuel = Math.max(0, heli.fuel - burnRate * dt * 20);
    if (heli.fuel <= 0) {
      heli.engineStarted = false;
    }
  } else {
    // Engine off / shutdown / fuel out
    if (heli.isLanded) {
      // Rotor spins down to complete stop on ground
      heli.rotorRpm = Math.max(0, heli.rotorRpm - dt * 22);
    } else {
      // Autorotation decay in air
      heli.rotorRpm = Math.max(0, heli.rotorRpm - dt * 10);
    }
  }

  // Spin rotor blades visually
  const rpmRadSec = (heli.rotorRpm / 100) * 45;
  heli.rotorAngle = (heli.rotorAngle + rpmRadSec * dt) % (Math.PI * 2);
  heli.tailRotorAngle = (heli.tailRotorAngle + rpmRadSec * 1.6 * dt) % (Math.PI * 2);

  // 2. Control inputs with helicopter agility response
  const agility = model.agility;
  const stickMag = Math.hypot(inputs.cyclicX, inputs.cyclicY);

  // If landed on ground or helipad and collective is below takeoff threshold,
  // helicopter is completely locked in place by ground weight and friction
  if (heli.isLanded && inputs.collective < 0.48) {
    heli.vx = 0;
    heli.vy = 0;
    heli.vz = 0;
    heli.pitch = 0;
    heli.roll = 0;

    // Turntable yaw turn while parked only if deliberate pedal input
    if (Math.abs(inputs.rudder) > 0.25) {
      heli.heading = (heli.heading + inputs.rudder * dt * 1.5) % (Math.PI * 2);
      if (heli.heading < 0) heli.heading += Math.PI * 2;
    }
  } else {
    // When joystick is pushed in flight, naturally direct helicopter heading and forward thrust
    if (stickMag > 0.08) {
      const targetHeading = (Math.atan2(inputs.cyclicY, inputs.cyclicX) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2);

      // Shortest-arc angular interpolation towards target heading
      let angleDiff = targetHeading - heli.heading;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

      heli.heading = (heli.heading + angleDiff * Math.min(1, dt * 6.5 * agility)) % (Math.PI * 2);
      if (heli.heading < 0) heli.heading += Math.PI * 2;

      // Pitch forward proportional to stick push
      const targetPitch = -stickMag * 0.42;
      const targetRoll = Math.max(-0.4, Math.min(0.4, angleDiff * 0.5));
      heli.pitch += (targetPitch - heli.pitch) * Math.min(1, dt * 6 * agility);
      heli.roll += (targetRoll - heli.roll) * Math.min(1, dt * 6 * agility);
    } else {
      // Return to level hover when stick released: MAINTAIN HEADING STEADY! Zero drift!
      heli.pitch += (0 - heli.pitch) * Math.min(1, dt * 5 * agility);
      heli.roll += (0 - heli.roll) * Math.min(1, dt * 5 * agility);
    }

    // Rudder / Yaw fine trim if deliberately requested
    if (Math.abs(inputs.rudder) > 0.08) {
      const yawRate = inputs.rudder * 2.2 * agility;
      heli.heading = (heli.heading + yawRate * dt) % (Math.PI * 2);
      if (heli.heading < 0) heli.heading += Math.PI * 2;
    }
  }

  // 3. Aerodynamics & Lift Calculation
  // Must have rotor spinning above 45% RPM to generate positive aerodynamic lift
  const rpmFactor = heli.rotorRpm > 45 ? Math.pow(heli.rotorRpm / 100, 2) : 0;
  // Ground effect increases lift when hover height above landing surface is < 45 ft
  const groundCloseness = Math.max(0, Math.min(1, (45 - heli.z) / 45));
  const groundEffect = 1 + groundCloseness * 0.22;

  // Vertical thrust (ft/min)
  const maxClimb = model.climbRate; // e.g. 1100 ft/min
  const hoverCollective = 0.5; // 50% collective gives level hover
  const netLiftAcceleration = (inputs.collective - hoverCollective) * maxClimb * groundEffect * rpmFactor;

  // Gravity sink when collective is low or engine off
  const gravitySink = (1 - inputs.collective * (heli.rotorRpm / 100)) * -950;
  const totalVerticalThrust = netLiftAcceleration + (inputs.collective > hoverCollective && heli.rotorRpm > 60 ? 0 : gravitySink * (1 - groundCloseness * 0.5));

  // If landed and not pulling collective to take off, lock vz to 0
  if (heli.isLanded && inputs.collective < 0.48) {
    heli.vz = 0;
  } else {
    // Update vertical velocity (vz in ft/min)
    heli.vz += (totalVerticalThrust - heli.vz) * Math.min(1, dt * 3.5);
  }

  // 4. Horizontal Thrust Vector (Directed along helicopter heading vector)
  if (!heli.isLanded) {
    const forwardThrust = stickMag * 580 * agility * rpmFactor;
    const hx = Math.sin(heli.heading) * forwardThrust;
    const hy = -Math.cos(heli.heading) * forwardThrust;

    // Wind vector effect
    const wx = Math.cos(weather.windDirection) * weather.windSpeed * 3.2;
    const wy = Math.sin(weather.windDirection) * weather.windSpeed * 3.2;
    const windDriftFactor = Math.min(1, Math.max(0.2, heli.z / 150));

    // Turbulence jitter in storm/high winds
    const turbulenceX = (Math.random() - 0.5) * weather.windGust * 18;
    const turbulenceY = (Math.random() - 0.5) * weather.windGust * 18;

    // Damping: stronger deceleration when stick is neutral to allow steady hovering
    const dragFactor = inputs.autoHover ? 8.5 : stickMag > 0.08 ? 1.1 : 2.4;

    // Accelerations
    heli.vx += (hx + (wx + turbulenceX) * windDriftFactor - heli.vx * dragFactor) * dt;
    heli.vy += (hy + (wy + turbulenceY) * windDriftFactor - heli.vy * dragFactor) * dt;

    // Auto-Hover precision damping: locks horizontal drift & stabilizes altitude
    if (inputs.autoHover) {
      if (stickMag < 0.12) {
        heli.vx *= Math.pow(0.02, dt);
        heli.vy *= Math.pow(0.02, dt);
        heli.pitch += (0 - heli.pitch) * Math.min(1, dt * 9);
        heli.roll += (0 - heli.roll) * Math.min(1, dt * 9);
      }
      if (Math.abs(inputs.collective - 0.5) < 0.12) {
        heli.vz *= Math.pow(0.04, dt);
      }
    }

    // Terminal speed limit
    const maxHeliSpeed = model.maxSpeed * 3.5;
    const currentSpeed = Math.hypot(heli.vx, heli.vy);
    if (currentSpeed > maxHeliSpeed) {
      heli.vx = (heli.vx / currentSpeed) * maxHeliSpeed;
      heli.vy = (heli.vy / currentSpeed) * maxHeliSpeed;
    }

    // 5. Update Position
    heli.x += heli.vx * dt;
    heli.y += heli.vy * dt;
    // vz is in ft/min, so convert to ft/sec for altitude update
    heli.z += (heli.vz / 60) * dt;
  } else {
    // When landed: absolutely no horizontal translation!
    heli.vx = 0;
    heli.vy = 0;
    // Lift off if collective raised
    if (inputs.collective >= 0.48) {
      heli.z += (heli.vz / 60) * dt;
      if (heli.z > (heli.landedHelipad ? heli.landedHelipad.altitude : 0) + 2) {
        heli.isLanded = false;
        heli.landedHelipad = null;
      }
    }
  }

  // Keep within city boundaries
  heli.x = Math.max(80, Math.min(city.width - 80, heli.x));
  heli.y = Math.max(80, Math.min(city.height - 80, heli.y));
  heli.z = Math.min(model.maxAltitude, heli.z);

  // 6. Surface Height & Collision Detection (Terrain, Bridges, Piers & Buildings)
  // Check if over open water
  const isOverWater = city.waterBodies.some(
    (wb) => heli.x >= wb.x && heli.x <= wb.x + wb.width && heli.y >= wb.y && heli.y <= wb.y + wb.height
  );

  const bridgeUnderneath = (city.bridges || []).find(
    (b) => heli.x >= b.x && heli.x <= b.x + b.width && heli.y >= b.y && heli.y <= b.y + b.height
  );

  const pierUnderneath = (city.piers || []).find(
    (p) => heli.x >= p.x && heli.x <= p.x + p.width && heli.y >= p.y && heli.y <= p.y + p.height
  );

  let surfaceHeight = 0;
  let standingHelipad: Helipad | null = null;
  let collidedBuilding: Building | null = null;

  if (bridgeUnderneath) {
    surfaceHeight = bridgeUnderneath.deckHeight;
  } else if (pierUnderneath) {
    surfaceHeight = 6;
  } else if (isOverWater) {
    // Water has NO solid ground to land on!
    surfaceHeight = -999;
  }

  // Check buildings for rooftop landing or side collision
  for (const b of city.buildings) {
    // If helicopter is safely parked/landed on a helipad on this building, it cannot collide with it!
    if (heli.isLanded && heli.landedHelipad && heli.landedHelipad.buildingId === b.id) {
      surfaceHeight = Math.max(surfaceHeight, b.roofHeight);
      standingHelipad = heli.landedHelipad;
      continue;
    }

    const margin = 18; // helicopter chassis radius
    if (
      heli.x >= b.x - margin &&
      heli.x <= b.x + b.width + margin &&
      heli.y >= b.y - margin &&
      heli.y <= b.y + b.height + margin
    ) {
      // Find helipad on this building that the helicopter is landing on or over
      const pad = city.helipads.find(
        (h) => h.buildingId === b.id && Math.hypot(heli.x - h.x, heli.y - h.y) <= h.radius + 12
      );

      // Inside building bounding footprint
      if (pad && (heli.z >= b.roofHeight - 6 || heli.isLanded)) {
        // Over helipad at roof level (or safely parked): Roof landing surface!
        if (b.roofHeight > surfaceHeight) {
          surfaceHeight = b.roofHeight;
          standingHelipad = pad;
        }
      } else if (heli.z < b.roofHeight - 6) {
        // Flying lower than roof: Side collision! (Only if not already landed)
        if (!heli.isLanded) {
          collidedBuilding = b;
          break;
        }
      } else {
        // Above roof: Roof surface!
        if (b.roofHeight > surfaceHeight) {
          surfaceHeight = b.roofHeight;
          if (pad && Math.hypot(heli.x - pad.x, heli.y - pad.y) <= pad.radius) {
            standingHelipad = pad;
          }
        }
      }
    }
  }

  // Check standalone ground/pier helipads
  if (!standingHelipad) {
    for (const h of city.helipads) {
      if (!h.buildingId && Math.hypot(heli.x - h.x, heli.y - h.y) <= h.radius) {
        if (Math.abs(heli.z - h.altitude) < 16) {
          surfaceHeight = h.altitude;
          standingHelipad = h;
          break;
        }
      }
    }
  }

  // Side building crash
  if (collidedBuilding) {
    heli.health = Math.max(0, heli.health - dt * 65);
    heli.vx = -heli.vx * 0.4;
    heli.vy = -heli.vy * 0.4;
    events.onCrash?.(`Collided with ${collidedBuilding.name || 'Building'}!`);
  }

  // WATER DITCHING CHECK: CANNOT LAND ON WATER!
  if (isOverWater && !bridgeUnderneath && !pierUnderneath && heli.z <= 2) {
    // Aircraft strikes open water without floats
    heli.health = 0;
    heli.isLanded = false;
    heli.landedHelipad = null;
    heli.vx = 0;
    heli.vy = 0;
    heli.vz = 0;
    heli.z = 0;
    events.onCrash?.('Helicopter ditched into open water! Aircraft submerged and destroyed.');
    return;
  }

  // 7. Ground / Rooftop Touchdown (Solid surface only)
  if (surfaceHeight >= 0 && heli.z <= surfaceHeight) {
    heli.z = surfaceHeight;
    const descentRate = Math.abs(heli.vz); // ft/min

    if (descentRate > 850 || Math.abs(heli.pitch) > 0.4 || Math.abs(heli.roll) > 0.4) {
      // Severe crash impact
      heli.health = Math.max(0, heli.health - 50);
      events.onHardLanding?.();
      if (heli.health <= 0) {
        events.onCrash?.('Fatal high-impact landing crash! Descent rate exceeded structural limits.');
      }
    } else if (descentRate > 550) {
      // Rough bump landing
      heli.health = Math.max(0, heli.health - 12);
      events.onHardLanding?.();
    } else {
      // Smooth safe touchdown!
      if (!heli.isLanded) {
        heli.isLanded = true;
        heli.landedHelipad = standingHelipad;
        events.onSafeLanding?.(standingHelipad);
      }
    }

    // Stop all velocity and level the helicopter on its skids/wheels
    heli.vz = 0;
    heli.vx = 0;
    heli.vy = 0;
    heli.pitch = 0;
    heli.roll = 0;
  } else if (heli.z > surfaceHeight + 6) {
    // Airborne
    if (heli.isLanded) {
      heli.isLanded = false;
      heli.landedHelipad = null;
    }
  }

  // 8. Water Tank Refill (Hovering low over water or near fire station)
  if (isOverWater && heli.z <= 35 && heli.water < heli.waterMax) {
    heli.water = Math.min(heli.waterMax, heli.water + dt * 90);
    events.onWaterRefilled?.();
  }

  // 9. Water Cannon / Bambi Bucket Release
  if (inputs.dropWater && heli.water > 0) {
    const dropAmount = Math.min(heli.water, dt * 120);
    heli.water -= dropAmount;

    // Emit high-velocity water jet payload directly forward from nose water cannon along helicopter heading
    const forwardX = Math.sin(heli.heading);
    const forwardY = -Math.cos(heli.heading);
    events.onWaterDropped?.({
      id: `drop-${Date.now()}-${Math.random()}`,
      x: heli.x + forwardX * 38,
      y: heli.y + forwardY * 38,
      altitude: heli.z,
      vx: heli.vx * 0.15 + forwardX * 450,
      vy: heli.vy * 0.15 + forwardY * 450,
      vz: -1800,
      radius: 20,
      volume: dropAmount,
    });
  }

  // 10. Rescue Hoist & Winch Dynamics
  if (inputs.toggleHoist) {
    heli.hoistDeployed = !heli.hoistDeployed;
  }

  if (heli.hoistDeployed) {
    // Winch extending down
    heli.hoistLength = Math.min(120, heli.hoistLength + dt * model.winchSpeed);
  } else {
    // Winching back up
    heli.hoistLength = Math.max(0, heli.hoistLength - dt * model.winchSpeed * 1.5);
  }

  // Rescue hoist hook position in world
  const hookZ = Math.max(0, heli.z - heli.hoistLength);
  const hookX = heli.x;
  const hookY = heli.y;

  // Check if hook is close to any stranded/drowning victim
  if (heli.hoistDeployed && !heli.hoistPayload && heli.passengers.length < model.passengerCapacity) {
    for (const ped of city.pedestrians) {
      if (ped.state === 'stranded' || ped.state === 'drowning' || ped.state === 'injured') {
        const dist = Math.hypot(hookX - ped.x, hookY - ped.y);
        if (dist < 28 && hookZ <= 15) {
          // Hooked victim!
          heli.hoistPayload = ped;
          ped.state = 'rescued';
          events.onVictimHoisted?.(ped);
          break;
        }
      }
    }
  }

  // Once hoisted to helicopter cabin, transfer victim to passengers
  if (heli.hoistPayload && heli.hoistLength <= 10) {
    heli.passengers.push(heli.hoistPayload);
    heli.hoistPayload = null;
    heli.hoistDeployed = false;
  }

  // 11. Sirens, Megaphone, Searchlight, FLIR toggles
  if (inputs.toggleSiren) heli.sirenActive = !heli.sirenActive;
  if (inputs.toggleMegaphone) heli.megaphoneActive = !heli.megaphoneActive;
  if (inputs.toggleSearchlight) heli.searchlightActive = !heli.searchlightActive;
  if (inputs.toggleFLIR) heli.flirActive = !heli.flirActive;

  // Searchlight aims along helicopter heading
  heli.searchlightAngle = heli.heading;
}

export function checkNoFlyZone(heli: HelicopterState, city: CityData): NoFlyZone | null {
  if (!city || !city.noFlyZones) return null;
  for (const nfz of city.noFlyZones) {
    const dist = Math.hypot(heli.x - nfz.x, heli.y - nfz.y);
    if (dist <= nfz.radius && heli.z <= nfz.ceilingAltitude) {
      return nfz;
    }
  }
  return null;
}
