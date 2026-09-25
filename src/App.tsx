/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Award, DollarSign, Play, RefreshCw, Volume2 } from 'lucide-react';
import { FlightHUD } from './components/FlightHUD';
import { HangarModal } from './components/HangarModal';
import { HelpManualModal } from './components/HelpManualModal';
import { MiniMap } from './components/MiniMap';
import { MissionBriefingModal } from './components/MissionBriefingModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { RadioStationPlayer } from './components/RadioStationPlayer';
import { SettingsModal } from './components/SettingsModal';
import { TouchControls } from './components/TouchControls';
import { soundManager } from './game/audioSystem';
import { generateCity } from './game/cityGenerator';
import { HELICOPTER_FLEET } from './game/fleetData';
import { MissionSystem } from './game/missionSystem';
import { checkObstacleRadar, createInitialHelicopter, FlightInputs, ObstacleAlert, updateHelicopterPhysics } from './game/physics';
import { GameRenderer } from './game/renderer';
import { WeatherEngine } from './game/weather';
import { CityData, GameSettings, HelicopterModel, HelicopterState, Mission, Pedestrian, PilotProfile, RailroadTrack, WaterDrop, WeatherType } from './types/game';

function getPointAlongTrack(track: RailroadTrack, ratio: number): { x: number; y: number; heading: number } {
  const normRatio = ((ratio % 1) + 1) % 1;
  const targetDist = normRatio * track.totalLength;
  let accumulated = 0;

  for (let i = 0; i < track.points.length - 1; i++) {
    const p1 = track.points[i];
    const p2 = track.points[i + 1];
    const segDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (accumulated + segDist >= targetDist || i === track.points.length - 2) {
      const segT = segDist > 0 ? (targetDist - accumulated) / segDist : 0;
      const x = p1.x + (p2.x - p1.x) * segT;
      const y = p1.y + (p2.y - p1.y) * segT;
      const heading = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      return { x, y, heading };
    }
    accumulated += segDist;
  }
  const last = track.points[track.points.length - 1];
  return { x: last.x, y: last.y, heading: 0 };
}

const INITIAL_SETTINGS: GameSettings = {
  autoRudder: true,
  touchSensitivity: 1.0,
  masterVolume: 0.8,
  sfxVolume: 0.85,
  radioVolume: 0.35,
  weatherCycle: true,
  showFlightVectors: false,
  cameraZoom: 1.0,
};

const INITIAL_PILOT: PilotProfile = {
  name: 'Flight Officer Maverick',
  callsign: 'RESCUE-01',
  cash: 5000,
  reputation: 100,
  rank: 'Patrol Pilot',
  missionsCompleted: 0,
  peopleRescued: 0,
  firesExtinguished: 0,
  flightTimeSeconds: 0,
  ownedChopperIds: ['schweizer-300'],
  currentChopperId: 'schweizer-300',
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);

  // Simulation Core References
  const weatherEngineRef = useRef<WeatherEngine>(new WeatherEngine('clear'));
  const missionSystemRef = useRef<MissionSystem>(new MissionSystem());
  const cityRef = useRef<CityData | null>(null);
  const chopperStateRef = useRef<HelicopterState | null>(null);
  const currentModelRef = useRef<HelicopterModel>(HELICOPTER_FLEET[0]);
  const waterDropsRef = useRef<WaterDrop[]>([]);
  const trafficClearTimerRef = useRef(0);

  // Real-time user inputs
  const inputsRef = useRef<FlightInputs>({
    cyclicX: 0,
    cyclicY: 0,
    collective: 0.0,
    rudder: 0,
    dropWater: false,
    toggleHoist: false,
    toggleSiren: false,
    toggleMegaphone: false,
    toggleSearchlight: false,
    toggleFLIR: false,
    autoHover: false,
  });

  // UI States
  const [hudHeli, setHudHeli] = useState<HelicopterState | null>(null);
  const [hudWeather, setHudWeather] = useState(weatherEngineRef.current.state);
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [isAutoHoverActive, setIsAutoHoverActive] = useState(false);
  const [pilot, setPilot] = useState<PilotProfile>(() => {
    try {
      const saved = localStorage.getItem('simcopter_pilot_profile');
      return saved ? JSON.parse(saved) : INITIAL_PILOT;
    } catch {
      return INITIAL_PILOT;
    }
  });
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('simcopter_settings');
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  // Modals
  const [isHangarOpen, setIsHangarOpen] = useState(false);
  const [isMissionsOpen, setIsMissionsOpen] = useState(false);
  const [isRadioOpen, setIsRadioOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isCrashed, setIsCrashed] = useState(false);
  const [crashReason, setCrashReason] = useState('');
  const [missionCompleteBanner, setMissionCompleteBanner] = useState<Mission | null>(null);
  const [currentObstacleAlert, setCurrentObstacleAlert] = useState<ObstacleAlert | null>(null);
  const lastWarningBuildingIdRef = useRef<string | null>(null);
  const isTouchJoystickActiveRef = useRef<boolean>(false);

  // Save pilot profile to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('simcopter_pilot_profile', JSON.stringify(pilot));
    } catch {}
  }, [pilot]);

  // Save settings to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('simcopter_settings', JSON.stringify(settings));
    } catch {}
    soundManager.setVolumes(settings.masterVolume, settings.sfxVolume, settings.radioVolume);
    weatherEngineRef.current.setAutoCycle(settings.weatherCycle);
  }, [settings]);

  // Initialize Game World
  const initGameWorld = useCallback((seed = Date.now()) => {
    const city = generateCity(seed);
    cityRef.current = city;

    // Pick active helicopter from fleet
    const model = HELICOPTER_FLEET.find((h) => h.id === pilot.currentChopperId) || HELICOPTER_FLEET[0];
    currentModelRef.current = model;

    // Spawn on Central Heliport
    const heliport = city.helipads.find((h) => h.type === 'hangar') || city.helipads[0];
    const initialHeli = createInitialHelicopter(model, heliport);
    chopperStateRef.current = initialHeli;

    // Pre-populate mission queue
    missionSystemRef.current.availableMissions = [
      missionSystemRef.current.generateMission(city),
      missionSystemRef.current.generateMission(city),
    ];

    setHudHeli({ ...initialHeli });
    setIsAutoHoverActive(false);
    inputsRef.current.autoHover = false;
    inputsRef.current.collective = 0.0;
    inputsRef.current.cyclicX = 0;
    inputsRef.current.cyclicY = 0;
    inputsRef.current.rudder = 0;
    setIsCrashed(false);
    setCrashReason('');
  }, [pilot.currentChopperId]);

  useEffect(() => {
    initGameWorld();
  }, [initGameWorld]);

  // Resize canvas
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvasRef.current.width = w;
        canvasRef.current.height = h;
        if (rendererRef.current) {
          rendererRef.current.resize(w, h);
        }
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard controls for desktop
  useEffect(() => {
    const keysDown = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      keysDown.add(e.code);
      soundManager.resume();

      // One-shot toggles
      if (e.code === 'KeyR') {
        inputsRef.current.toggleHoist = true;
      } else if (e.code === 'KeyX') {
        inputsRef.current.toggleSiren = true;
      } else if (e.code === 'KeyP') {
        inputsRef.current.toggleMegaphone = true;
      } else if (e.code === 'KeyL') {
        inputsRef.current.toggleSearchlight = true;
      } else if (e.code === 'KeyV') {
        inputsRef.current.toggleFLIR = true;
      } else if (e.code === 'KeyM') {
        setIsMissionsOpen((prev) => !prev);
      } else if (e.code === 'KeyI') {
        inputsRef.current.toggleEngine = true;
      } else if (e.code === 'KeyZ') {
        setIsAutoHoverActive((prev) => {
          const next = !prev;
          inputsRef.current.autoHover = next;
          return next;
        });
      } else if (e.code === 'KeyH' || e.code === 'Slash') {
        setIsHelpOpen((prev) => !prev);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
      if (e.code === 'KeyR') inputsRef.current.toggleHoist = false;
      if (e.code === 'KeyX') inputsRef.current.toggleSiren = false;
      if (e.code === 'KeyP') inputsRef.current.toggleMegaphone = false;
      if (e.code === 'KeyL') inputsRef.current.toggleSearchlight = false;
      if (e.code === 'KeyV') inputsRef.current.toggleFLIR = false;
      if (e.code === 'KeyI') inputsRef.current.toggleEngine = false;
    };

    // Keyboard update interval
    const keyInterval = setInterval(() => {
      let cx = 0;
      let cy = 0;
      let rudder = 0;

      if (keysDown.has('ArrowUp') || keysDown.has('KeyW')) cy -= 1.0;
      if (keysDown.has('ArrowDown') || keysDown.has('KeyS')) cy += 1.0;
      if (keysDown.has('ArrowLeft') || keysDown.has('KeyA')) cx -= 1.0;
      if (keysDown.has('ArrowRight') || keysDown.has('KeyD')) cx += 1.0;

      if (keysDown.has('KeyQ')) rudder -= 1.0;
      if (keysDown.has('KeyE')) rudder += 1.0;

      // Collective throttle up/down
      if (keysDown.has('ShiftLeft') || keysDown.has('ShiftRight') || keysDown.has('Space')) {
        inputsRef.current.collective = Math.min(1.0, inputsRef.current.collective + 0.015);
      }
      if (keysDown.has('ControlLeft') || keysDown.has('KeyC')) {
        inputsRef.current.collective = Math.max(0.0, inputsRef.current.collective - 0.015);
      }

      inputsRef.current.dropWater = keysDown.has('KeyF');

      // Update inputs: if directional keys are pressed, assign them; if none are pressed and touch isn't used, reset cleanly to 0!
      if (cx !== 0 || cy !== 0 || rudder !== 0) {
        inputsRef.current.cyclicX = cx;
        inputsRef.current.cyclicY = cy;
        inputsRef.current.rudder = rudder;
      } else {
        // Only reset cyclicX/cyclicY if touch/virtual joystick is NOT active!
        if (!isTouchJoystickActiveRef.current) {
          inputsRef.current.cyclicX = 0;
          inputsRef.current.cyclicY = 0;
          inputsRef.current.rudder = 0;
        }
      }
    }, 16);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      clearInterval(keyInterval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main Simulation & Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let hudTimer = 0;

    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new GameRenderer(canvasRef.current);
    }

    soundManager.startEngine();

    const loop = (time: number) => {
      const rawDt = (time - lastTime) / 1000;
      lastTime = time;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));

      const heli = chopperStateRef.current;
      const city = cityRef.current;
      const model = currentModelRef.current;
      const weatherEngine = weatherEngineRef.current;
      const missionSystem = missionSystemRef.current;

      // Advance dynamic weather & time-of-day cycle
      weatherEngine.update(dt);

      if (heli && city && model) {
        // 1. Update Physics
        updateHelicopterPhysics(
          heli,
          model,
          inputsRef.current,
          weatherEngine.state,
          city,
          dt,
          {
            onCrash: (reason) => {
              setIsCrashed(true);
              setCrashReason(reason);
              soundManager.playCrash();
            },
            onHardLanding: () => {
              soundManager.playTouchdown(true);
            },
            onSafeLanding: (helipad) => {
              soundManager.playTouchdown(false);

              // 1. VIP Transport & Air Taxi Boarding and Drop-off
              if (
                missionSystem.activeMission &&
                (missionSystem.activeMission.type === 'vip_transport' || missionSystem.activeMission.type === 'air_taxi')
              ) {
                const mission = missionSystem.activeMission;
                if (!mission.phase || mission.phase === 'pickup') {
                  const dist = Math.hypot(heli.x - mission.x, heli.y - mission.y);
                  if (dist < 85) {
                    // Board VIP!
                    const vipPassenger: Pedestrian = {
                      id: `vip-${Date.now()}`,
                      x: heli.x,
                      y: heli.y,
                      vx: 0,
                      vy: 0,
                      state: 'rescued',
                      role: 'vip',
                      health: 100,
                      speechBubble: 'VIP ONBOARD! Fly to destination!',
                    };
                    if (heli.passengers.length < model.passengerCapacity) {
                      heli.passengers.push(vipPassenger);
                    }
                    mission.phase = 'dropoff';
                    const destPad = city.helipads.find((h) => h.id === mission.targetHelipadId) || city.helipads[1];
                    mission.x = destPad.x;
                    mission.y = destPad.y;
                    soundManager.playDispatchChime();
                  }
                } else if (mission.phase === 'dropoff') {
                  const dist = Math.hypot(heli.x - mission.x, heli.y - mission.y);
                  if (dist < 85) {
                    // Disembark VIP!
                    heli.passengers = heli.passengers.filter((p) => p.role !== 'vip');
                    mission.targetsRemaining = 0;
                    soundManager.playRescueSuccess();
                  }
                }
              }

              // 2. Roadside Flying Ambulance / Road Casualty Pickup
              if (
                missionSystem.activeMission &&
                (missionSystem.activeMission.type === 'roadside_ambulance' || missionSystem.activeMission.type === 'highway_pileup')
              ) {
                const mission = missionSystem.activeMission;
                if (!mission.phase || mission.phase === 'pickup') {
                  const dist = Math.hypot(heli.x - mission.x, heli.y - mission.y);
                  if (dist < 90) {
                    // Load casualty onto helicopter
                    const casualty: Pedestrian = {
                      id: `pt-${Date.now()}`,
                      x: heli.x,
                      y: heli.y,
                      vx: 0,
                      vy: 0,
                      state: 'rescued',
                      role: 'patient',
                      health: 75,
                      speechBubble: 'Patient loaded! Rush to Hospital ER!',
                    };
                    if (heli.passengers.length < model.passengerCapacity) {
                      heli.passengers.push(casualty);
                    }
                    if (mission.associatedVictims) {
                      city.pedestrians = city.pedestrians.filter((p) => !mission.associatedVictims?.includes(p.id));
                    }
                    mission.phase = 'dropoff';
                    const hospPad = city.helipads.find((h) => h.type === 'hospital') || city.helipads[0];
                    mission.x = hospPad.x;
                    mission.y = hospPad.y;
                    soundManager.playDispatchChime();
                  }
                }
              }

              // If landed on Hospital Helipad with rescued passengers, disembark them!
              if (helipad && helipad.type === 'hospital' && heli.passengers.length > 0) {
                const count = heli.passengers.length;
                const earnedCash = count * 1500;
                const earnedRep = count * 100;

                setPilot((prev) => ({
                  ...prev,
                  cash: prev.cash + earnedCash,
                  reputation: prev.reputation + earnedRep,
                  peopleRescued: prev.peopleRescued + count,
                }));

                soundManager.playRescueSuccess();
                heli.passengers = [];

                // Progress mission targets if applicable
                if (missionSystem.activeMission) {
                  missionSystem.activeMission.targetsRemaining = Math.max(
                    0,
                    missionSystem.activeMission.targetsRemaining - count
                  );
                }
              }

              // If landed at Central Heliport HQ, automatic refuel & water tank refill!
              if (helipad && helipad.type === 'hangar') {
                heli.fuel = Math.min(heli.fuelMax, heli.fuel + dt * 30);
                heli.water = heli.waterMax;
              }
            },
            onWaterRefilled: () => {
              // Sound or splash effect handled
            },
            onVictimHoisted: (victim) => {
              soundManager.playWinchClick();
              victim.speechBubble = 'HOOKED! WINCH ME UP!';
            },
            onWaterDropped: (drop) => {
              waterDropsRef.current.push(drop);
              soundManager.playWaterDrop();
            },
          }
        );

        // Reset one-shot toggles
        inputsRef.current.toggleHoist = false;
        inputsRef.current.toggleSiren = false;
        inputsRef.current.toggleMegaphone = false;
        inputsRef.current.toggleSearchlight = false;
        inputsRef.current.toggleFLIR = false;
        inputsRef.current.toggleEngine = false;

        // 2. Water Drops Ballistics & Fire Extinguishing
        const windX = Math.cos(weatherEngine.state.windDirection) * weatherEngine.state.windSpeed * 1.5;
        const windY = Math.sin(weatherEngine.state.windDirection) * weatherEngine.state.windSpeed * 1.5;

        for (let i = waterDropsRef.current.length - 1; i >= 0; i--) {
          const drop = waterDropsRef.current[i];
          drop.x += (drop.vx + windX) * dt;
          drop.y += (drop.vy + windY) * dt;
          drop.altitude += (drop.vz / 60) * dt;

          // Check collision with city fires
          for (const fire of city.fires) {
            const dist = Math.hypot(drop.x - fire.x, drop.y - fire.y);
            if (dist < fire.radius + drop.radius && Math.abs(drop.altitude - fire.altitude) < 30) {
              fire.intensity -= 30;
              soundManager.playSteamSizzle();
              if (fire.intensity <= 0) {
                // Extinguished!
                const idx = city.fires.indexOf(fire);
                if (idx !== -1) city.fires.splice(idx, 1);

                setPilot((prev) => ({
                  ...prev,
                  firesExtinguished: prev.firesExtinguished + 1,
                  cash: prev.cash + 400,
                }));

                if (missionSystem.activeMission) {
                  missionSystem.activeMission.targetsRemaining = Math.max(
                    0,
                    missionSystem.activeMission.targetsRemaining - 1
                  );
                }
              }
              // Consume drop
              waterDropsRef.current.splice(i, 1);
              break;
            }
          }

          // If hit ground/water surface, splash and remove
          if (drop.altitude <= 0) {
            waterDropsRef.current.splice(i, 1);
          }
        }

        // 3. Traffic Simulation
        // 3.1. Traffic Light Controller Cycle
        if (city.trafficLights) {
          city.trafficLights.forEach((tl) => {
            tl.timer -= dt;
            if (tl.timer <= 0) {
              if (tl.state === 'green_ns') {
                tl.state = 'yellow_ns';
                tl.timer = 3.5;
              } else if (tl.state === 'yellow_ns') {
                tl.state = 'green_ew';
                tl.timer = 12;
              } else if (tl.state === 'green_ew') {
                tl.state = 'yellow_ew';
                tl.timer = 3.5;
              } else {
                tl.state = 'green_ns';
                tl.timer = 12;
              }
            }
          });
        }

        // 3.2. Vehicle Dynamics & Signal Observance
        city.vehicles.forEach((veh) => {
          // If helicopter siren is screaming nearby, cars pull over and stop!
          const distToHeli = Math.hypot(veh.x - heli.x, veh.y - heli.y);
          if (heli.sirenActive && distToHeli < 240 && heli.z < 250) {
            veh.speed = Math.max(0, veh.speed - dt * 50);
          } else {
            // Check traffic light ahead
            let mustStop = false;
            if (city.trafficLights) {
              for (const tl of city.trafficLights) {
                const distToLight = Math.hypot(veh.x - tl.x, veh.y - tl.y);
                if (distToLight < 65) {
                  const isNorthSouth = Math.abs(Math.sin(veh.heading)) > 0.7;
                  if (isNorthSouth && tl.state !== 'green_ns') {
                    const approaching =
                      (Math.sin(veh.heading) > 0 && veh.y < tl.y) ||
                      (Math.sin(veh.heading) < 0 && veh.y > tl.y);
                    if (approaching) {
                      mustStop = true;
                      break;
                    }
                  } else if (!isNorthSouth && tl.state !== 'green_ew') {
                    const approaching =
                      (Math.cos(veh.heading) > 0 && veh.x < tl.x) ||
                      (Math.cos(veh.heading) < 0 && veh.x > tl.x);
                    if (approaching) {
                      mustStop = true;
                      break;
                    }
                  }
                }
              }
            }

            // Transit bus stop behavior
            if (veh.type === 'bus') {
              if (veh.busStopTimer && veh.busStopTimer > 0) {
                veh.busStopTimer -= dt;
                mustStop = true;
              } else if (!mustStop && Math.random() < 0.0006) {
                veh.busStopTimer = 4.5;
                mustStop = true;
              }
            }

            veh.stoppedAtLight = mustStop;

            if (mustStop) {
              veh.speed = Math.max(0, veh.speed - dt * 45);
            } else {
              veh.speed += (veh.targetSpeed - veh.speed) * dt;
            }
          }

          // Roundabout circular navigation (cars go around the central monument/island)
          let inRoundabout = false;
          if (veh.roundaboutState) {
            const rb = city.roundabouts?.find((r) => r.id === veh.roundaboutState!.rbId);
            if (rb) {
              inRoundabout = true;
              const state = veh.roundaboutState;
              const targetR = state.targetRadius;
              const curveSpeed = Math.min(veh.speed, 30);
              const angularSpeed = Math.max(0.2, curveSpeed / targetR);
              state.angle += angularSpeed * dt;

              veh.x = rb.x + Math.cos(state.angle) * targetR;
              veh.y = rb.y + Math.sin(state.angle) * targetR;
              veh.heading = state.angle + Math.PI / 2; // counter-clockwise circle heading

              // Check if car reached exit side aligned with its target road heading
              let angleNorm = state.angle % (Math.PI * 2);
              if (angleNorm < 0) angleNorm += Math.PI * 2;
              let targetNorm = state.targetHeading % (Math.PI * 2);
              if (targetNorm < 0) targetNorm += Math.PI * 2;

              let diff = Math.abs(angleNorm - targetNorm);
              if (diff > Math.PI) diff = Math.PI * 2 - diff;

              if (diff < 0.22) {
                // Exit roundabout back onto straight road!
                veh.heading = state.targetHeading;
                veh.x = rb.x + Math.cos(state.targetHeading) * (rb.radius + 6);
                veh.y = rb.y + Math.sin(state.targetHeading) * (rb.radius + 6);
                veh.roundaboutState = undefined;
              }
            } else {
              veh.roundaboutState = undefined;
            }
          } else if (city.roundabouts) {
            for (const rb of city.roundabouts) {
              const dist = Math.hypot(veh.x - rb.x, veh.y - rb.y);
              if (dist <= rb.radius + 6) {
                const toCenterX = rb.x - veh.x;
                const toCenterY = rb.y - veh.y;
                const movingX = Math.cos(veh.heading);
                const movingY = Math.sin(veh.heading);
                const dot = toCenterX * movingX + toCenterY * movingY;
                if (dot > 0) {
                  // Approaching and entering roundabout!
                  const currentAngle = Math.atan2(veh.y - rb.y, veh.x - rb.x);
                  const targetR = (rb.radius + rb.innerRadius) / 2 + (veh.laneOffset || 0) * 0.25;
                  veh.roundaboutState = {
                    rbId: rb.id,
                    targetHeading: veh.heading,
                    angle: currentAngle,
                    targetRadius: targetR,
                  };
                  veh.x = rb.x + Math.cos(currentAngle) * targetR;
                  veh.y = rb.y + Math.sin(currentAngle) * targetR;
                  veh.heading = currentAngle + Math.PI / 2;
                  inRoundabout = true;
                  break;
                }
              }
            }
          }

          if (!inRoundabout) {
            veh.x += Math.cos(veh.heading) * veh.speed * dt;
            veh.y += Math.sin(veh.heading) * veh.speed * dt;
          }

          // Wrap vehicle at city edges
          if (veh.x > city.width - 100) veh.x = 100;
          if (veh.x < 100) veh.x = city.width - 100;
          if (veh.y > city.height - 100) veh.y = 100;
          if (veh.y < 100) veh.y = city.height - 100;
        });

        // 3.3. Commuter Train Simulation
        if (city.trains && city.trains.length > 0 && city.railroadTracks && city.railroadTracks[0]) {
          const track = city.railroadTracks[0];
          city.trains.forEach((train) => {
            if (train.state === 'stopped') {
              train.stopTimer -= dt;
              if (train.stopTimer <= 0) {
                train.state = 'cruising';
                train.trackProgress = (train.trackProgress + 0.003) % 1;
              }
            } else {
              // Cruising along track loop
              train.trackProgress = (train.trackProgress + (train.speed * dt) / track.totalLength) % 1;
              if (city.trainStations) {
                const nearStation = city.trainStations.some(
                  (st) => Math.abs(train.trackProgress - st.trackRatio) < 0.005
                );
                if (nearStation) {
                  train.state = 'stopped';
                  train.stopTimer = 5.5;
                }
              }
            }

            // Update positions of all connected coaches along track
            for (let cIdx = 0; cIdx < train.cars.length; cIdx++) {
              const carOffsetRatio = (cIdx * 38) / track.totalLength;
              const carTrackRatio = (train.trackProgress - carOffsetRatio + 1) % 1;
              const pt = getPointAlongTrack(track, carTrackRatio);
              train.cars[cIdx].x = pt.x;
              train.cars[cIdx].y = pt.y;
              train.cars[cIdx].heading = pt.heading;
            }
          });
        }

        // 3.4. Drifting Clouds Simulation
        if (city.driftingClouds) {
          const windDir = weatherEngine.state.windDirection;
          const windSpd = weatherEngine.state.windSpeed;
          const cloudDriftSpeed = windSpd * 2.2 + 14;
          const driftX = Math.cos(windDir) * cloudDriftSpeed * dt;
          const driftY = Math.sin(windDir) * cloudDriftSpeed * dt;

          city.driftingClouds.forEach((cloud) => {
            cloud.x += driftX;
            cloud.y += driftY;

            // Wrap around world borders
            if (cloud.x > city.width + cloud.radius) cloud.x = -cloud.radius;
            if (cloud.x < -cloud.radius) cloud.x = city.width + cloud.radius;
            if (cloud.y > city.height + cloud.radius) cloud.y = -cloud.radius;
            if (cloud.y < -cloud.radius) cloud.y = city.height + cloud.radius;
          });
        }

        // 4. Pedestrian Wander & Reactions
        city.pedestrians.forEach((ped) => {
          if (ped.state === 'walking' || ped.state === 'rioting') {
            ped.x += ped.vx * dt;
            ped.y += ped.vy * dt;

            // If megaphone screams, rioters disperse!
            if (ped.state === 'rioting' && heli.megaphoneActive) {
              const dist = Math.hypot(ped.x - heli.x, ped.y - heli.y);
              if (dist < 320 && heli.z < 280) {
                ped.state = 'walking';
                ped.role = 'civilian';
                ped.speechBubble = 'DISPERSING!';
                soundManager.playMegaphone();
                if (missionSystem.activeMission && missionSystem.activeMission.type === 'riot_control') {
                  missionSystem.activeMission.targetsRemaining = Math.max(
                    0,
                    missionSystem.activeMission.targetsRemaining - 1
                  );
                }
              }
            }
          }
        });

        // 4.5. Traffic Jam Monitoring & Dispersal
        if (missionSystem.activeMission && missionSystem.activeMission.type === 'traffic_jam') {
          const mission = missionSystem.activeMission;
          const dist = Math.hypot(heli.x - mission.x, heli.y - mission.y);
          if (dist < 220 && heli.z < 160) {
            if (heli.sirenActive || heli.megaphoneActive) {
              trafficClearTimerRef.current += dt;
              if (trafficClearTimerRef.current >= 3.5) {
                mission.targetsRemaining = 0;
                soundManager.playRescueSuccess();
                trafficClearTimerRef.current = 0;
              }
            }
          }
        }

        // 5. Dynamic Weather Engine Update
        weatherEngine.update(dt, () => {
          soundManager.playThunder();
        });

        // 6. Mission System Update
        missionSystem.update(
          dt,
          (completed) => {
            // Mission Succeeded!
            soundManager.playRescueSuccess();
            setMissionCompleteBanner(completed);
            setPilot((prev) => ({
              ...prev,
              cash: prev.cash + completed.rewardCash,
              reputation: prev.reputation + completed.rewardReputation,
              missionsCompleted: prev.missionsCompleted + 1,
            }));
            setActiveMission(null);

            // Refill available missions
            if (missionSystem.availableMissions.length < 3) {
              missionSystem.availableMissions.push(missionSystem.generateMission(city));
            }
          },
          (failed) => {
            // Mission Failed
            soundManager.playWarningBeep();
            setActiveMission(null);
          }
        );

        // Periodically generate new dispatch calls
        if (Math.random() < 0.005 && missionSystem.availableMissions.length < 4) {
          missionSystem.availableMissions.push(missionSystem.generateMission(city));
          soundManager.playDispatchChime();
        }

        // 7. Audio Updates
        soundManager.updateEngine(
          heli.rotorRpm,
          inputsRef.current.collective * 100,
          heli.roll,
          Math.hypot(heli.vx, heli.vy)
        );
        soundManager.toggleSiren(heli.sirenActive);

        // Low fuel alarm
        if (heli.fuel < heli.fuelMax * 0.15 && Math.floor(time / 800) % 2 === 0) {
          soundManager.playWarningBeep();
        }

        // Forward Obstacle Collision Avoidance Radar (TAWS)
        const obstacleAlert = checkObstacleRadar(heli, city);
        if (
          obstacleAlert &&
          obstacleAlert.severity === 'warning' &&
          lastWarningBuildingIdRef.current !== obstacleAlert.buildingId
        ) {
          lastWarningBuildingIdRef.current = obstacleAlert.buildingId;
          soundManager.playTerrainAlert();
        } else if (!obstacleAlert) {
          lastWarningBuildingIdRef.current = null;
        }

        // 8. Render Canvas
        if (rendererRef.current) {
          rendererRef.current.render(
            heli,
            model,
            city,
            weatherEngine.state,
            waterDropsRef.current,
            dt,
            settings.cameraZoom,
            missionSystem.activeMission,
            obstacleAlert
          );
        }

        // Sync React HUD state at ~15fps to keep React render light & buttery 60fps canvas
        hudTimer += dt;
        if (hudTimer > 0.065) {
          hudTimer = 0;
          setHudHeli({ ...heli });
          setHudWeather({ ...weatherEngine.state });
          setActiveMission(missionSystem.activeMission);
          setCurrentObstacleAlert(obstacleAlert);
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      soundManager.stopEngine();
    };
  }, [settings.autoRudder, settings.cameraZoom]);

  // Respawn after crash
  const handleRespawn = () => {
    initGameWorld();
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 font-sans select-none touch-none">
      {/* Simulation WebGL/Canvas Layer */}
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full touch-none" />

      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Primary Flight Instrumentation HUD */}
      {hudHeli && (
        <FlightHUD
          heli={hudHeli}
          model={currentModelRef.current}
          weather={hudWeather}
          mission={activeMission}
          city={cityRef.current || undefined}
          obstacleAlert={currentObstacleAlert}
          isAutoHoverActive={isAutoHoverActive}
          inNoFlyZone={
            !!cityRef.current?.noFlyZones?.some((nfz) => {
              const dist = Math.hypot(hudHeli.x - nfz.x, hudHeli.y - nfz.y);
              return dist <= nfz.radius && hudHeli.z <= nfz.ceilingAltitude;
            })
          }
          onOpenRadio={() => setIsRadioOpen(true)}
          onOpenHangar={() => setIsHangarOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenMissions={() => setIsMissionsOpen(true)}
          onOpenHelp={() => setIsHelpOpen(true)}
          onToggleEngine={() => {
            inputsRef.current.toggleEngine = true;
          }}
        />
      )}

      {/* Tactical GPS MiniMap Radar */}
      {hudHeli && cityRef.current && (
        <MiniMap city={cityRef.current} heli={hudHeli} mission={activeMission} />
      )}

      {/* Mobile Ergonomic Touch Controls */}
      {hudHeli && (
        <TouchControls
          onInputUpdate={(updater) => {
            soundManager.resume();
            inputsRef.current = updater(inputsRef.current);
          }}
          onJoystickActiveChange={(active) => {
            isTouchJoystickActiveRef.current = active;
          }}
          waterRemaining={hudHeli.water}
          waterMax={hudHeli.waterMax}
          isSirenActive={hudHeli.sirenActive}
          isMegaphoneActive={hudHeli.megaphoneActive}
          isSearchlightActive={hudHeli.searchlightActive}
          isFLIRActive={hudHeli.flirActive}
          isHoistDeployed={hudHeli.hoistDeployed}
          collective={inputsRef.current.collective}
          isAutoHoverActive={isAutoHoverActive}
          onToggleAutoHover={() => {
            setIsAutoHoverActive((prev) => {
              const next = !prev;
              inputsRef.current.autoHover = next;
              return next;
            });
          }}
        />
      )}

      {/* Mission Success Celebration Banner */}
      {missionCompleteBanner && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center rounded-2xl bg-emerald-950/95 border-2 border-emerald-400 p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in text-white max-w-sm text-center">
          <div className="text-xs font-mono font-bold tracking-widest text-emerald-300 uppercase">
            ★ MISSION ACCOMPLISHED ★
          </div>
          <div className="text-base font-bold mt-0.5">{missionCompleteBanner.title}</div>
          <div className="mt-2 flex items-center gap-4 text-xs font-mono">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <DollarSign className="w-4 h-4" /> +{missionCompleteBanner.rewardCash}
            </span>
            <span className="text-sky-300 font-bold flex items-center gap-1">
              <Award className="w-4 h-4" /> +{missionCompleteBanner.rewardReputation} REP
            </span>
          </div>
          <button
            onClick={() => setMissionCompleteBanner(null)}
            className="mt-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-1.5 shadow-md active:scale-95 transition"
          >
            Acknowledge & Continue
          </button>
        </div>
      )}

      {/* Crash / Game Over Overlay */}
      {isCrashed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border-2 border-red-500 p-6 text-center text-slate-100 shadow-2xl">
            <div className="text-3xl mb-2">💥</div>
            <h2 className="text-xl font-bold font-mono text-red-500 uppercase tracking-wide">
              AIRCRAFT DOWN — FATAL CRASH
            </h2>
            <p className="text-xs text-slate-300 mt-2">{crashReason || 'Structural envelope failure.'}</p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleRespawn}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 text-xs shadow-lg shadow-red-950/50 transition active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Scramble Replacement Chopper</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <MissionBriefingModal
        isOpen={isMissionsOpen}
        onClose={() => setIsMissionsOpen(false)}
        availableMissions={missionSystemRef.current.availableMissions}
        activeMission={activeMission}
        onAcceptMission={(mission) => {
          missionSystemRef.current.acceptMission(mission, cityRef.current || undefined);
          setActiveMission(missionSystemRef.current.activeMission);
          trafficClearTimerRef.current = 0;
          soundManager.playDispatchChime();
        }}
        onCancelMission={() => {
          missionSystemRef.current.activeMission = null;
          setActiveMission(null);
        }}
      />

      <HangarModal
        isOpen={isHangarOpen}
        onClose={() => setIsHangarOpen(false)}
        pilot={pilot}
        currentChopper={currentModelRef.current}
        heliHealth={hudHeli ? hudHeli.health : 100}
        onSelectChopper={(model) => {
          currentModelRef.current = model;
          setPilot((prev) => ({ ...prev, currentChopperId: model.id }));
          if (chopperStateRef.current) {
            chopperStateRef.current.fuelMax = model.fuelCapacity;
            chopperStateRef.current.waterMax = model.waterCapacity;
            chopperStateRef.current.fuel = model.fuelCapacity;
            chopperStateRef.current.water = model.waterCapacity;
          }
        }}
        onBuyChopper={(model) => {
          if (pilot.cash >= model.price) {
            setPilot((prev) => ({
              ...prev,
              cash: prev.cash - model.price,
              ownedChopperIds: [...prev.ownedChopperIds, model.id],
              currentChopperId: model.id,
            }));
            currentModelRef.current = model;
            soundManager.playRescueSuccess();
          }
        }}
        onRepairChopper={() => {
          if (pilot.cash >= 500 && chopperStateRef.current) {
            setPilot((prev) => ({ ...prev, cash: prev.cash - 500 }));
            chopperStateRef.current.health = 100;
            soundManager.playRescueSuccess();
          }
        }}
      />

      <RadioStationPlayer
        isOpen={isRadioOpen}
        onClose={() => setIsRadioOpen(false)}
        volume={settings.radioVolume}
        onVolumeChange={(v) => {
          setSettings((s) => ({ ...s, radioVolume: v }));
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        currentWeather={hudWeather.type}
        currentTimeOfDay={hudWeather.timeOfDay}
        onSetTimeOfDay={(hour) => {
          weatherEngineRef.current.setTimeOfDay(hour);
          setHudWeather({ ...weatherEngineRef.current.state });
        }}
        onChangeWeather={(type) => {
          weatherEngineRef.current.setWeather(type);
          setHudWeather({ ...weatherEngineRef.current.state });
        }}
        onRegenerateCity={() => {
          initGameWorld(Date.now());
        }}
      />

      <HelpManualModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}
