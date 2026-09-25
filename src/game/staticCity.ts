/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AirportRunway,
  Bridge,
  Building,
  CityData,
  CityTree,
  DriftingCloud,
  Helipad,
  NoFlyZone,
  ParkedPlane,
  ParkZone,
  Pier,
  RailroadTrack,
  Road,
  Roundabout,
  StreetLight,
  TrafficLight,
  TrainStation,
  WaterBody,
} from '../types/game';

export function createStaticCityMap(): Omit<CityData, 'vehicles' | 'pedestrians' | 'fires'> {
  // Tripled Metropolitan Area Dimensions (8400 x 8400 px)
  const width = 8400;
  const height = 8400;

  // 1. Water Bodies (Navigable Bay, Ocean Channel & Lakes)
  const waterBodies: WaterBody[] = [
    {
      id: 'river-main',
      x: 4100,
      y: 0,
      width: 440,
      height: 8400,
      name: 'Metropolitan Bay Channel (Water Refill)',
    },
    {
      id: 'emerald-lake',
      x: 5800,
      y: 600,
      width: 950,
      height: 700,
      name: 'Emerald Forest Lake (Water Refill)',
    },
    {
      id: 'marina-basin',
      x: 3450,
      y: 4400,
      width: 480,
      height: 650,
      name: 'Yacht Harbor & Marina Basin',
    },
  ];

  // 2. Scenic Bridges across River Channel
  const bridges: Bridge[] = [
    {
      id: 'bridge-north',
      name: 'North Skyline Suspension Bridge',
      x: 4050,
      y: 1550,
      width: 540,
      height: 60,
      deckHeight: 45,
      towerHeight: 160,
    },
    {
      id: 'bridge-central',
      name: 'Grand Central Interstate Bridge (I-95)',
      x: 4050,
      y: 3550,
      width: 540,
      height: 98,
      deckHeight: 35,
    },
    {
      id: 'bridge-rail',
      name: 'Union Rail & Commuter Steel Bridge',
      x: 4050,
      y: 4550,
      width: 540,
      height: 52,
      deckHeight: 30,
    },
    {
      id: 'bridge-south',
      name: 'South Port Industrial Truss Bridge',
      x: 4050,
      y: 6550,
      width: 540,
      height: 64,
      deckHeight: 32,
    },
  ];

  // 3. Piers & Docks
  const piers: Pier[] = [
    { id: 'pier-marina-a', name: 'Marina Yacht Slip A', x: 3480, y: 4500, width: 220, height: 26 },
    { id: 'pier-marina-b', name: 'Marina Yacht Slip B', x: 3480, y: 4680, width: 240, height: 26 },
    { id: 'pier-marina-c', name: 'Harbor Master Landing Pier', x: 3480, y: 4860, width: 260, height: 36 },
    { id: 'pier-cargo-1', name: 'Port Container Pier 1', x: 4650, y: 6400, width: 340, height: 55 },
    { id: 'pier-cargo-2', name: 'Port Container Pier 2', x: 4650, y: 6700, width: 320, height: 55 },
  ];

  // 4. Park Zones, Plazas & Nature Reserves
  const parkZones: ParkZone[] = [
    {
      id: 'park-grand-forest',
      name: 'Grand Botanical Forest Nature Reserve',
      x: 5500,
      y: 300,
      width: 2200,
      height: 1800,
      type: 'forest',
      color: '#143828',
    },
    {
      id: 'park-civic-plaza',
      name: 'Civic Plaza & Gardens',
      x: 2350,
      y: 4150,
      width: 550,
      height: 520,
      type: 'plaza',
      color: '#334155',
    },
    {
      id: 'park-hospital-gardens',
      name: 'Trauma Center Healing Park',
      x: 1650,
      y: 1300,
      width: 320,
      height: 240,
      type: 'garden',
      color: '#164e32',
    },
    {
      id: 'park-stadium-grounds',
      name: 'Metro Arena Athletic Grounds',
      x: 2350,
      y: 5050,
      width: 580,
      height: 520,
      type: 'sports_field',
      color: '#1e3a2f',
    },
    {
      id: 'park-heliport-lawn',
      name: 'Central Heliport Safety Clear Zone',
      x: 2850,
      y: 4250,
      width: 440,
      height: 380,
      type: 'lawn',
      color: '#1c3d2e',
    },
    {
      id: 'park-military-compound',
      name: 'Fort Sentinel Military Secure Perimeter',
      x: 750,
      y: 6550,
      width: 950,
      height: 950,
      type: 'plaza',
      color: '#2d3748',
    },
    {
      id: 'park-airport-tarmac',
      name: 'Metro International Airport Airfield',
      x: 5000,
      y: 5900,
      width: 3100,
      height: 2200,
      type: 'plaza',
      color: '#1e293b',
    },
  ];

  // 5. Roads & Highways (6-Lane Interstate Freeway + Multi-lane Avenues)
  const roads: Road[] = [];

  // 5.1. Major Interstate Freeway I-95 (6 Lanes, 96px width, central concrete barrier)
  roads.push({
    id: 'freeway-i95',
    name: 'Interstate 95 Metro Expressway',
    x1: 0,
    y1: 3600,
    x2: width,
    y2: 3600,
    width: 96,
    lanes: 6,
    isFreeway: true,
  });

  // 5.2. East-West Avenues (Avenue widths: 54px, 4 lanes)
  const avenueYs = [
    { y: 800, name: 'North Perimeter Boulevard' },
    { y: 1600, name: 'Skyline Boulevard North' },
    { y: 2600, name: 'Midtown Grand Parkway' },
    { y: 4600, name: 'Civic Center Boulevard' },
    { y: 5600, name: 'Airport Gateway Boulevard' },
    { y: 6600, name: 'Harbor Commercial Parkway' },
    { y: 7600, name: 'South Industrial Expressway' },
  ];

  avenueYs.forEach((ave, idx) => {
    roads.push({
      id: `ave-ew-${idx}`,
      name: ave.name,
      x1: 0,
      y1: ave.y,
      x2: width,
      y2: ave.y,
      width: 54,
      lanes: 4,
      hasBusStop: true,
      busStopX: 2100 + (idx % 3) * 600,
      busStopY: ave.y + 28,
    });
  });

  // 5.3. North-South Thoroughfares (4 Lanes, 54px width)
  const avenueXs = [
    { x: 1000, name: 'West Military Highway' },
    { x: 2000, name: 'Medical District Avenue' },
    { x: 3000, name: 'Civic Plaza Avenue' },
    { x: 5200, name: 'Riverfront Commerce Drive' },
    { x: 6200, name: 'Airport Central Parkway' },
    { x: 7200, name: 'East Shore Perimeter Drive' },
  ];

  avenueXs.forEach((ave, idx) => {
    roads.push({
      id: `ave-ns-${idx}`,
      name: ave.name,
      x1: ave.x,
      y1: 0,
      x2: ave.x,
      y2: height,
      width: 54,
      lanes: 4,
      hasBusStop: true,
      busStopX: ave.x + 28,
      busStopY: 2200 + (idx % 3) * 800,
    });
  });

  // 6. Roundabouts (Traffic circles with central monuments)
  const roundabouts: Roundabout[] = [
    {
      id: 'rb-civic',
      name: 'Civic Victory Circle',
      x: 3000,
      y: 4600,
      radius: 120,
      innerRadius: 55,
    },
    {
      id: 'rb-airport',
      name: 'Airport Gateway Grand Circle',
      x: 6200,
      y: 5600,
      radius: 130,
      innerRadius: 60,
    },
  ];

  // 7. Traffic Light Junctions (Signal-controlled crossroads)
  const trafficLights: TrafficLight[] = [
    { id: 'tl-1', x: 2000, y: 1600, state: 'green_ns', timer: 8 },
    { id: 'tl-2', x: 3000, y: 1600, state: 'green_ew', timer: 12 },
    { id: 'tl-3', x: 2000, y: 2600, state: 'green_ns', timer: 15 },
    { id: 'tl-4', x: 3000, y: 2600, state: 'green_ew', timer: 7 },
    { id: 'tl-5', x: 5200, y: 1600, state: 'green_ns', timer: 10 },
    { id: 'tl-6', x: 5200, y: 2600, state: 'green_ew', timer: 9 },
    { id: 'tl-7', x: 6200, y: 2600, state: 'green_ns', timer: 14 },
    { id: 'tl-8', x: 2000, y: 6600, state: 'green_ns', timer: 11 },
    { id: 'tl-9', x: 5200, y: 6600, state: 'green_ew', timer: 6 },
    { id: 'tl-10', x: 7200, y: 6600, state: 'green_ns', timer: 13 },
  ];

  // 8. Railroad Track & Commuter Train Loop
  const railLoopPoints = [
    { x: 3000, y: 2600 },
    { x: 5200, y: 2600 },
    { x: 7200, y: 2600 },
    { x: 7400, y: 4600 },
    { x: 6400, y: 6200 },
    { x: 5200, y: 6200 },
    { x: 3000, y: 7600 },
    { x: 1000, y: 7600 },
    { x: 1000, y: 4600 },
    { x: 1000, y: 1600 },
    { x: 3000, y: 1600 },
    { x: 3000, y: 2600 },
  ];

  let totalTrackLength = 0;
  for (let i = 0; i < railLoopPoints.length - 1; i++) {
    totalTrackLength += Math.hypot(
      railLoopPoints[i + 1].x - railLoopPoints[i].x,
      railLoopPoints[i + 1].y - railLoopPoints[i].y
    );
  }

  const railroadTracks: RailroadTrack[] = [
    {
      points: railLoopPoints,
      totalLength: totalTrackLength,
    },
  ];

  const trainStations: TrainStation[] = [
    { id: 'st-union', name: 'Grand Central Union Station', x: 3000, y: 2600, width: 140, height: 44, trackRatio: 0.0 },
    { id: 'st-east', name: 'East Commerce Rail Terminal', x: 7200, y: 2600, width: 140, height: 44, trackRatio: 0.28 },
    { id: 'st-airport', name: 'Metro Airport SkyTrain Terminal', x: 6400, y: 6200, width: 150, height: 48, trackRatio: 0.48 },
    { id: 'st-south', name: 'South Fort Transport Hub', x: 3000, y: 7600, width: 130, height: 44, trackRatio: 0.68 },
    { id: 'st-harbor', name: 'West Harbor Commuter Station', x: 1000, y: 4600, width: 130, height: 44, trackRatio: 0.84 },
  ];

  // 9. Buildings & Structures
  const buildings: Building[] = [];
  const helipads: Helipad[] = [];

  // Helper window generator
  const createWindows = (w: number, h: number, rows: number, cols: number) => {
    const list: Array<{ x: number; y: number; w: number; h: number; lit: boolean }> = [];
    const padX = 8;
    const padY = 8;
    const winW = (w - padX * 2) / cols - 4;
    const winH = (h - padY * 2) / rows - 4;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        list.push({
          x: padX + c * (winW + 4),
          y: padY + r * (winH + 4),
          w: Math.max(2, winW),
          h: Math.max(2, winH),
          lit: Math.random() < 0.65,
        });
      }
    }
    return list;
  };

  // 9.1. CENTRAL HELIPORT BASE (Starting Hub)
  const heliportHQ: Building = {
    id: 'b-central-heliport',
    name: 'Central Metro Heliport Base & Terminal',
    elevationLabel: '30 FT',
    stories: 2,
    x: 2900,
    y: 4300,
    width: 340,
    height: 240,
    roofHeight: 30,
    type: 'hangar',
    geometry: 'box',
    hasHelipad: true,
    color: '#334155',
    roofColor: '#1e293b',
    beacon: true,
    windows: createWindows(340, 240, 2, 8),
  };
  buildings.push(heliportHQ);

  helipads.push(
    {
      id: 'pad-hq-alpha',
      x: 3000,
      y: 4420,
      altitude: 0,
      radius: 26,
      type: 'hangar',
      label: 'BASE HELIPAD ALPHA',
      buildingId: heliportHQ.id,
    },
    {
      id: 'pad-hq-bravo',
      x: 3140,
      y: 4420,
      altitude: 0,
      radius: 26,
      type: 'hangar',
      label: 'BASE HELIPAD BRAVO',
      buildingId: heliportHQ.id,
    }
  );

  // 9.2. METROPOLITAN GENERAL TRAUMA HOSPITAL CAMPUS (North-West)
  const hospitalBuilding: Building = {
    id: 'b-metro-hospital',
    name: 'Metro General Trauma Center & ER',
    elevationLabel: '120 FT',
    stories: 10,
    x: 1800,
    y: 1380,
    width: 320,
    height: 240,
    roofHeight: 120,
    type: 'hospital',
    geometry: 'l_shape',
    hasHelipad: true,
    color: '#f8fafc',
    roofColor: '#dc2626',
    beacon: true,
    windows: createWindows(320, 240, 6, 8),
  };
  buildings.push(hospitalBuilding);

  // Hospital Rooftop Helipad
  helipads.push({
    id: 'pad-hospital-main',
    x: 1920,
    y: 1470,
    altitude: 120,
    radius: 26,
    type: 'hospital',
    label: 'METRO ER ROOFTOP HELIPAD (120 FT)',
    buildingId: hospitalBuilding.id,
  });

  // HOSPITAL GROUND HELIPAD (User requested: ground helipad for ambulances!)
  helipads.push({
    id: 'pad-hospital-ground',
    x: 1720,
    y: 1680,
    altitude: 0,
    radius: 26,
    type: 'hospital',
    label: 'GROUND TRAUMA AMBULANCE HELIPAD',
  });

  // 9.3. METRO POLICE HEADQUARTERS
  const policeHQ: Building = {
    id: 'b-police-hq',
    name: 'Metropolitan Police Dept Headquarters',
    elevationLabel: '160 FT',
    stories: 14,
    x: 2150,
    y: 2400,
    width: 250,
    height: 180,
    roofHeight: 160,
    type: 'police',
    geometry: 'octagonal',
    hasHelipad: true,
    color: '#1e293b',
    roofColor: '#0284c7',
    beacon: true,
    windows: createWindows(250, 180, 8, 7),
  };
  buildings.push(policeHQ);

  helipads.push({
    id: 'pad-police-hq',
    x: 2275,
    y: 2490,
    altitude: 160,
    radius: 24,
    type: 'police',
    label: 'METRO PD AIR SUPPORT HELIPAD (160 FT)',
    buildingId: policeHQ.id,
  });

  // 9.4. DOWNTOWN FINANCIAL DISTRICT SKYSCRAPERS
  const skyscraperSpecs: Array<{
    id: string;
    name: string;
    label: string;
    stories: number;
    roofHeight: number;
    x: number;
    y: number;
    w: number;
    h: number;
    color: string;
    roofColor: string;
    hasPad?: boolean;
    geometry?: Building['geometry'];
    spire?: boolean;
    beacon?: boolean;
  }> = [
    {
      id: 'b-tower-one',
      name: 'One Metropolis Financial Spire',
      label: '580 FT',
      stories: 52,
      roofHeight: 580,
      x: 2350,
      y: 1850,
      w: 220,
      h: 220,
      color: '#0f172a',
      roofColor: '#0369a1',
      hasPad: true,
      geometry: 'stepped',
      spire: true,
      beacon: true,
    },
    {
      id: 'b-apex-plaza',
      name: 'Apex Tower World Trade',
      label: '520 FT',
      stories: 48,
      roofHeight: 520,
      x: 2650,
      y: 1850,
      w: 200,
      h: 210,
      color: '#1e293b',
      roofColor: '#334155',
      hasPad: true,
      geometry: 'octagonal',
      beacon: true,
    },
    {
      id: 'b-zenith-center',
      name: 'Zenith Global Communications Tower',
      label: '460 FT',
      stories: 42,
      roofHeight: 460,
      x: 2350,
      y: 2150,
      w: 190,
      h: 190,
      color: '#1e3a5f',
      roofColor: '#0ea5e9',
      hasPad: true,
      geometry: 'cylindrical',
      spire: true,
      beacon: true,
    },
    {
      id: 'b-harbor-view',
      name: 'Harborview Financial Center',
      label: '380 FT',
      stories: 34,
      roofHeight: 380,
      x: 2650,
      y: 2150,
      w: 210,
      h: 200,
      color: '#0f2942',
      roofColor: '#1e40af',
      hasPad: false,
      geometry: 'box',
      beacon: true,
    },
    {
      id: 'b-mercantile-spire',
      name: 'Mercantile Exchange Tower',
      label: '440 FT',
      stories: 40,
      roofHeight: 440,
      x: 3250,
      y: 1850,
      w: 210,
      h: 200,
      color: '#1e1e2f',
      roofColor: '#4f46e5',
      hasPad: true,
      geometry: 't_shape',
      spire: true,
      beacon: true,
    },
    {
      id: 'b-pacific-bank',
      name: 'Pacific Commerce Bank HQ',
      label: '410 FT',
      stories: 36,
      roofHeight: 410,
      x: 3250,
      y: 2150,
      w: 200,
      h: 210,
      color: '#0d2818',
      roofColor: '#059669',
      hasPad: true,
      geometry: 'l_shape',
      beacon: true,
    },
  ];

  skyscraperSpecs.forEach((spec) => {
    const b: Building = {
      id: spec.id,
      name: spec.name,
      elevationLabel: spec.label,
      stories: spec.stories,
      roofHeight: spec.roofHeight,
      x: spec.x,
      y: spec.y,
      width: spec.w,
      height: spec.h,
      type: 'skyscraper',
      geometry: spec.geometry || 'box',
      hasHelipad: !!spec.hasPad,
      color: spec.color,
      roofColor: spec.roofColor,
      spire: spec.spire,
      beacon: spec.beacon,
      windows: createWindows(spec.w, spec.h, Math.floor(spec.stories / 5), 6),
    };
    buildings.push(b);

    if (spec.hasPad) {
      helipads.push({
        id: `pad-${spec.id}`,
        x: spec.x + spec.w / 2,
        y: spec.y + spec.h / 2,
        altitude: spec.roofHeight,
        radius: 22,
        type: 'civilian',
        label: `${spec.name.toUpperCase()} ROOFTOP PAD (${spec.roofHeight} FT)`,
        buildingId: spec.id,
      });
    }
  });

  // 9.5. CIVIC CENTER, CITY HALL & COLISEUM
  buildings.push({
    id: 'b-city-hall',
    name: 'Metro City Hall & Rotunda',
    elevationLabel: '90 FT',
    stories: 6,
    x: 2450,
    y: 4250,
    width: 280,
    height: 200,
    roofHeight: 90,
    type: 'civic',
    geometry: 'octagonal',
    hasHelipad: false,
    color: '#cbd5e1',
    roofColor: '#64748b',
    beacon: true,
    spire: true,
    windows: createWindows(280, 200, 4, 7),
  });

  buildings.push({
    id: 'b-coliseum',
    name: 'Metropolitan Grand Arena & Stadium',
    elevationLabel: '80 FT',
    stories: 5,
    x: 2400,
    y: 5120,
    width: 480,
    height: 380,
    roofHeight: 80,
    type: 'stadium',
    geometry: 'cylindrical',
    hasHelipad: false,
    color: '#3b82f6',
    roofColor: '#1d4ed8',
    beacon: true,
    windows: createWindows(480, 380, 3, 10),
  });

  // 9.6. FORT SENTINEL MILITARY BASE & NO-FLY ZONE
  const militaryHangar: Building = {
    id: 'b-mil-hangar',
    name: 'Fort Sentinel Air Wing Hangar',
    elevationLabel: '40 FT',
    stories: 2,
    x: 1050,
    y: 6900,
    width: 320,
    height: 200,
    roofHeight: 40,
    type: 'hangar',
    geometry: 'box',
    hasHelipad: true,
    color: '#2d3748',
    roofColor: '#1a202c',
    beacon: true,
    windows: createWindows(320, 200, 2, 6),
  };
  buildings.push(militaryHangar);

  helipads.push({
    id: 'pad-military-base',
    x: 1210,
    y: 7000,
    altitude: 0,
    radius: 30,
    type: 'military',
    label: 'FORT SENTINEL MILITARY HELIPAD',
    buildingId: militaryHangar.id,
  });

  const noFlyZones: NoFlyZone[] = [
    {
      id: 'nfz-military',
      name: 'PROHIBITED AIRSPACE R-4402 - FORT SENTINEL',
      x: 1200,
      y: 7000,
      radius: 850,
      ceilingAltitude: 850,
      warningText: 'RESTRICTED MILITARY ZONE — TURN BACK IMMEDIATELY',
    },
  ];

  // 9.7. METROPOLITAN INTERNATIONAL AIRPORT
  const airportTerminal: Building = {
    id: 'b-airport-terminal',
    name: 'Metro International Passenger Concourse',
    elevationLabel: '45 FT',
    stories: 4,
    x: 6100,
    y: 6400,
    width: 580,
    height: 220,
    roofHeight: 45,
    type: 'commercial',
    geometry: 't_shape',
    hasHelipad: true,
    color: '#0f172a',
    roofColor: '#38bdf8',
    beacon: true,
    windows: createWindows(580, 220, 3, 14),
  };
  buildings.push(airportTerminal);

  // Airport Air Traffic Control Tower
  buildings.push({
    id: 'b-airport-tower',
    name: 'Airport Air Traffic Control Tower',
    elevationLabel: '180 FT',
    stories: 16,
    x: 6000,
    y: 6350,
    width: 60,
    height: 60,
    roofHeight: 180,
    type: 'civic',
    geometry: 'cylindrical',
    hasHelipad: false,
    color: '#f8fafc',
    roofColor: '#0284c7',
    spire: true,
    beacon: true,
    windows: createWindows(60, 60, 4, 3),
  });

  // Airport Runways
  const airportRunways: AirportRunway[] = [
    {
      id: 'rw-09-27',
      x1: 5200,
      y1: 7200,
      x2: 7800,
      y2: 7200,
      width: 76,
      headingLabel: '09L / 27R',
    },
    {
      id: 'rw-14-32',
      x1: 5800,
      y1: 6200,
      x2: 7600,
      y2: 7800,
      width: 66,
      headingLabel: '14 / 32',
    },
  ];

  // Parked commercial airliners & corporate business jets
  const parkedPlanes: ParkedPlane[] = [
    { id: 'plane-1', x: 6200, y: 6720, heading: Math.PI / 2, type: 'airliner', wingspan: 72, length: 78, color: '#f8fafc' },
    { id: 'plane-2', x: 6420, y: 6720, heading: Math.PI / 2, type: 'airliner', wingspan: 72, length: 78, color: '#0284c7' },
    { id: 'plane-3', x: 6750, y: 6700, heading: Math.PI / 2, type: 'cargo', wingspan: 86, length: 90, color: '#475569' },
    { id: 'plane-4', x: 5750, y: 6680, heading: -Math.PI / 4, type: 'private_jet', wingspan: 44, length: 48, color: '#ffffff' },
    { id: 'plane-5', x: 5920, y: 6680, heading: -Math.PI / 4, type: 'private_jet', wingspan: 44, length: 48, color: '#e2e8f0' },
  ];

  // Airport Helipads for Taxi missions!
  helipads.push(
    {
      id: 'pad-airport-terminal',
      x: 6380,
      y: 6300,
      altitude: 0,
      radius: 28,
      type: 'airport',
      label: 'AIRPORT CONCOURSE HELIPAD (AIR TAXI)',
      buildingId: airportTerminal.id,
    },
    {
      id: 'pad-airport-fbo',
      x: 5650,
      y: 6550,
      altitude: 0,
      radius: 26,
      type: 'airport',
      label: 'AIRPORT PRIVATE VIP AVIATION PAD',
    }
  );

  // 10. Street Lights (Lamps placed along all avenues and freeways)
  const streetLights: StreetLight[] = [];

  // Along Freeway
  for (let x = 120; x < width - 120; x += 220) {
    streetLights.push({ x, y: 3546 });
    streetLights.push({ x, y: 3654 });
  }

  // Along East-West Avenues
  avenueYs.forEach((ave) => {
    for (let x = 150; x < width - 150; x += 260) {
      streetLights.push({ x, y: ave.y - 32 });
      streetLights.push({ x, y: ave.y + 32 });
    }
  });

  // Along North-South Thoroughfares
  avenueXs.forEach((ave) => {
    for (let y = 150; y < height - 150; y += 260) {
      streetLights.push({ x: ave.x - 32, y });
      streetLights.push({ x: ave.x + 32, y });
    }
  });

  // 11. Drifting Clouds (Clouds that move with the wind across the metropolitan sky)
  const driftingClouds: DriftingCloud[] = [];
  const cloudAltitudes = [380, 480, 560, 680, 780, 890];

  for (let c = 0; c < 22; c++) {
    const cx = (c * 380 + 200) % width;
    const cy = (c * 420 + 350) % height;
    const r = 90 + (c % 4) * 35;
    const puffs: Array<{ ox: number; oy: number; r: number }> = [];
    const numPuffs = 4 + (c % 4);

    for (let p = 0; p < numPuffs; p++) {
      const angle = (p / numPuffs) * Math.PI * 2;
      const dist = (r * 0.45) * Math.random();
      puffs.push({
        ox: Math.cos(angle) * dist,
        oy: Math.sin(angle) * dist,
        r: r * (0.45 + Math.random() * 0.35),
      });
    }

    driftingClouds.push({
      id: `cloud-${c}`,
      x: cx,
      y: cy,
      radius: r,
      altitude: cloudAltitudes[c % cloudAltitudes.length],
      opacity: 0.35 + (c % 3) * 0.12,
      puffs,
    });
  }

  // 12. City Trees (Filter strictly away from roads, buildings, helipads, and water)
  const candidateTrees: CityTree[] = [];

  // Grand Botanical Forest cluster
  for (let x = 5600; x < 7600; x += 110) {
    for (let y = 350; y < 1750; y += 110) {
      const jx = x + (Math.sin(x * y) * 35);
      const jy = y + (Math.cos(x * y) * 35);
      candidateTrees.push({
        x: jx,
        y: jy,
        radius: 12 + ((x + y) % 10),
        type: (x + y) % 2 === 0 ? 'pine' : 'oak',
      });
    }
  }

  // Civic Park cluster
  for (let x = 2380; x < 2880; x += 85) {
    for (let y = 4180; y < 4640; y += 85) {
      candidateTrees.push({
        x: x + 10,
        y: y + 10,
        radius: 10,
        type: 'flowering',
      });
    }
  }

  // Filter out any trees overlapping roads, buildings, helipads, or open water
  const trees = candidateTrees.filter((tree) => {
    // 1. Never on a road or highway
    for (const r of roads) {
      const isH = Math.abs(r.y1 - r.y2) < 5;
      const clearance = r.width / 2 + tree.radius + 8;
      if (isH) {
        if (tree.x >= r.x1 - 10 && tree.x <= r.x2 + 10 && Math.abs(tree.y - r.y1) < clearance) {
          return false;
        }
      } else {
        if (tree.y >= r.y1 - 10 && tree.y <= r.y2 + 10 && Math.abs(tree.x - r.x1) < clearance) {
          return false;
        }
      }
    }

    // 2. Never on a building
    for (const b of buildings) {
      if (
        tree.x >= b.x - tree.radius - 6 &&
        tree.x <= b.x + b.width + tree.radius + 6 &&
        tree.y >= b.y - tree.radius - 6 &&
        tree.y <= b.y + b.height + tree.radius + 6
      ) {
        return false;
      }
    }

    // 3. Never on a helipad
    for (const h of helipads) {
      if (Math.hypot(tree.x - h.x, tree.y - h.y) < h.radius + tree.radius + 15) {
        return false;
      }
    }

    // 4. Never in open water
    for (const wb of waterBodies) {
      if (
        tree.x >= wb.x - 6 &&
        tree.x <= wb.x + wb.width + 6 &&
        tree.y >= wb.y - 6 &&
        tree.y <= wb.y + wb.height + 6
      ) {
        return false;
      }
    }

    return true;
  });

  return {
    width,
    height,
    seed: 1996,
    buildings,
    helipads,
    roads,
    waterBodies,
    parkZones,
    trees,
    bridges,
    piers,
    trainStations,
    railroadTracks,
    trafficLights,
    roundabouts,
    noFlyZones,
    airportRunways,
    parkedPlanes,
    streetLights,
    driftingClouds,
  };
}
