/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CityData, Vehicle, Pedestrian, FireNode, CityTrain } from '../types/game';
import { createStaticCityMap } from './staticCity';

// Seedable pseudo-random generator
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateCity(seed = 1996): CityData {
  const rand = mulberry32(seed);
  const staticMap = createStaticCityMap();

  const vehicles: Vehicle[] = [];
  const pedestrians: Pedestrian[] = [];
  const fires: FireNode[] = [];

  // 1. Generate Realistic Ambient Vehicles Driving in Designated Correct Lanes
  const vehicleColors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ffffff', '#64748b', '#0f172a', '#e2e8f0'];
  const trailerColors = ['#f8fafc', '#94a3b8', '#1e293b', '#0369a1', '#b91c1c', '#15803d'];
  let vId = 0;

  staticMap.roads.forEach((road) => {
    const isHorizontal = Math.abs(road.y1 - road.y2) < 5;
    const len = isHorizontal ? road.x2 - road.x1 : road.y2 - road.y1;
    // Appropriate vehicle density for expanded 8400px city
    const numVehicles = Math.max(2, Math.floor(len / 340));

    for (let i = 0; i < numVehicles; i++) {
      vId++;
      const posRatio = (i + rand() * 0.8) / numVehicles;
      const isReverse = rand() > 0.5;

      // Determine correct lane offset (right-hand traffic rule):
      // Horizontal: Eastbound (heading = 0) is south side (+Y offset), Westbound (heading = PI) is north side (-Y offset)
      // Vertical: Southbound (heading = PI/2) is west side (-X offset), Northbound (heading = -PI/2) is east side (+X offset)
      let laneOffset = 0;
      if (road.isFreeway) {
        // 6-Lane Freeway: 3 lanes per direction
        const laneChoice = rand() < 0.35 ? 1 : rand() < 0.7 ? 2 : 3;
        const distFromCenter = laneChoice === 1 ? 16 : laneChoice === 2 ? 28 : 40;
        laneOffset = isReverse ? -distFromCenter : distFromCenter;
      } else {
        // 4-Lane Avenue: 2 lanes per direction
        const laneChoice = rand() < 0.5 ? 1 : 2;
        const distFromCenter = laneChoice === 1 ? 11 : 20;
        laneOffset = isReverse ? -distFromCenter : distFromCenter;
      }

      let vx = isHorizontal ? road.x1 + posRatio * len : road.x1 + laneOffset;
      let vy = isHorizontal ? road.y1 + laneOffset : road.y1 + posRatio * len;
      const heading = isHorizontal ? (isReverse ? Math.PI : 0) : isReverse ? -Math.PI / 2 : Math.PI / 2;

      // Check if vehicle is over water body (must be traversing a valid bridge)
      const river = staticMap.waterBodies.find((w) => w.id === 'river-main');
      if (river && vx > river.x && vx < river.x + river.width) {
        const onBridge = (staticMap.bridges || []).some(
          (b) => Math.abs(vy - (b.y + b.height / 2)) < 35
        );
        if (!onBridge) continue;
      }

      // Diverse vehicle fleet: Cars, Semi-Trucks with Trailers, Transit Buses, Emergency Vehicles
      const roll = rand();
      let vType: Vehicle['type'] = 'car';
      let vColor = vehicleColors[Math.floor(rand() * vehicleColors.length)];
      let siren = false;
      let length = 15;
      let trailerColor: string | undefined = undefined;

      if (roll < 0.04) {
        vType = 'police';
        vColor = '#0f172a';
        siren = true;
      } else if (roll < 0.07) {
        vType = 'ambulance';
        vColor = '#f8fafc';
        siren = true;
      } else if (roll < 0.09) {
        vType = 'firetruck';
        vColor = '#dc2626';
        siren = true;
        length = 24;
      } else if (roll < 0.22) {
        // Semi-Truck with Freight Cargo Trailer
        vType = 'truck';
        vColor = vehicleColors[Math.floor(rand() * vehicleColors.length)];
        trailerColor = trailerColors[Math.floor(rand() * trailerColors.length)];
        length = 32;
      } else if (roll < 0.35) {
        // Metropolitan City Transit Bus
        vType = 'bus';
        vColor = '#f59e0b';
        length = 26;
      }

      const baseSpeed = road.isFreeway ? 48 + rand() * 22 : 28 + rand() * 18;

      vehicles.push({
        id: `veh-${vId}`,
        x: vx,
        y: vy,
        speed: baseSpeed,
        targetSpeed: baseSpeed,
        heading,
        type: vType,
        color: vColor,
        siren,
        roadId: road.id,
        stuck: false,
        laneOffset,
        length,
        trailerColor,
        busStopTimer: 0,
        stoppedAtLight: false,
      });
    }
  });

  // 2. Generate Animated Metropolitan Commuter Train
  const trains: CityTrain[] = [];
  if (staticMap.railroadTracks && staticMap.railroadTracks[0]) {
    const track = staticMap.railroadTracks[0];
    const initialCars = [
      { x: track.points[0].x, y: track.points[0].y, heading: 0 },
      { x: track.points[0].x - 30, y: track.points[0].y, heading: 0 },
      { x: track.points[0].x - 60, y: track.points[0].y, heading: 0 },
      { x: track.points[0].x - 90, y: track.points[0].y, heading: 0 },
      { x: track.points[0].x - 120, y: track.points[0].y, heading: 0 },
    ];

    trains.push({
      id: 'train-metro-express',
      trackProgress: 0.02,
      speed: 68,
      state: 'cruising',
      stopTimer: 0,
      targetStationIndex: 0,
      cars: initialCars,
    });
  }

  // 3. Generate Ambient Pedestrians on Sidewalks, Plazas, Hospital, Airport & Stations
  const pedestrianSpawns = [
    // Civic Plaza & Gardens
    { minX: 2380, maxX: 2850, minY: 4180, maxY: 4600, count: 35 },
    // Downtown Skyscraper Sidewalks & Crosswalks
    { minX: 2300, maxX: 3450, minY: 1800, maxY: 2500, count: 45 },
    // Hospital Healing Gardens & ER Walkway
    { minX: 1680, maxX: 1980, minY: 1350, maxY: 1720, count: 20 },
    // Grand Central Union Station Platform
    { minX: 2950, maxX: 3150, minY: 2550, maxY: 2680, count: 25 },
    // Metro Airport Terminal Concourse
    { minX: 6150, maxX: 6650, minY: 6350, maxY: 6650, count: 30 },
    // Botanical Forest Trails & Emerald Lake Shore
    { minX: 5700, maxX: 6900, minY: 600, maxY: 1400, count: 25 },
  ];

  let pId = 0;
  pedestrianSpawns.forEach((spawn) => {
    for (let i = 0; i < spawn.count; i++) {
      pId++;
      const px = spawn.minX + rand() * (spawn.maxX - spawn.minX);
      const py = spawn.minY + rand() * (spawn.maxY - spawn.minY);

      pedestrians.push({
        id: `ped-${pId}`,
        x: px,
        y: py,
        vx: (rand() - 0.5) * 6,
        vy: (rand() - 0.5) * 6,
        state: 'walking',
        role: 'civilian',
        health: 100,
      });
    }
  });

  return {
    ...staticMap,
    seed,
    vehicles,
    pedestrians,
    fires,
    trains,
  };
}
