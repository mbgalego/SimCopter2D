/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WeatherType = 'clear' | 'windy' | 'fog' | 'storm' | 'night';

export interface WeatherState {
  type: WeatherType;
  windSpeed: number; // knots
  windDirection: number; // radians (0 to 2*PI)
  windGust: number; // turbulence factor 0 to 1
  visibility: number; // 0 (dense fog) to 1 (crystal clear)
  rainIntensity: number; // 0 to 1
  ambientLight: number; // 0.15 (night) to 1.0 (bright noon)
  lightning: number; // flash intensity 0 to 1
  clouds: Array<{ x: number; y: number; radius: number; speed: number; opacity: number }>;
}

export interface Building {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  roofHeight: number; // altitude in feet (e.g. 25 to 540)
  type: 'skyscraper' | 'commercial' | 'residential' | 'hospital' | 'police' | 'fire_station' | 'hangar' | 'industrial' | 'civic' | 'stadium';
  geometry?: 'box' | 'cylindrical' | 'l_shape' | 't_shape' | 'octagonal' | 'stepped';
  name?: string;
  elevationLabel?: string;
  stories?: number;
  hasHelipad: boolean;
  helipadSize?: number;
  color: string;
  roofColor: string;
  beacon?: boolean;
  spire?: boolean;
  windows: Array<{ x: number; y: number; w: number; h: number; lit: boolean }>;
}

export interface ParkZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'forest' | 'park' | 'garden' | 'plaza' | 'sports_field' | 'lawn';
  color?: string;
}

export interface CityTree {
  x: number;
  y: number;
  radius: number;
  type: 'oak' | 'pine' | 'flowering' | 'palm';
  color?: string;
}

export interface Bridge {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  deckHeight: number;
  towerHeight?: number;
}

export interface Pier {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Helipad {
  id: string;
  x: number;
  y: number;
  altitude: number; // feet
  radius: number;
  type: 'hospital' | 'police' | 'civilian' | 'hangar' | 'military' | 'airport';
  label: string;
  buildingId?: string;
}

export interface WaterBody {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
}

export interface Road {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  lanes: number;
  isFreeway?: boolean;
  name?: string;
  hasBusStop?: boolean;
  busStopX?: number;
  busStopY?: number;
}

export interface Vehicle {
  id: string;
  x: number;
  y: number;
  speed: number;
  targetSpeed: number;
  heading: number;
  type: 'car' | 'bus' | 'truck' | 'police' | 'ambulance' | 'firetruck' | 'suspect';
  color: string;
  siren: boolean;
  roadId: string;
  stuck: boolean;
  laneOffset: number; // offset perpendicular to road (+ is right side, - is left side)
  length?: number;
  trailerColor?: string;
  busStopTimer?: number;
  stoppedAtLight?: boolean;
}

export interface TrainStation {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  trackRatio: number; // 0 to 1 along track loop
}

export interface TrainCar {
  x: number;
  y: number;
  heading: number;
}

export interface CityTrain {
  id: string;
  trackProgress: number; // 0 to 1 loop
  speed: number;
  state: 'cruising' | 'stopped';
  stopTimer: number;
  targetStationIndex: number;
  cars: TrainCar[]; // [0] = locomotive, [1..4] = passenger coaches
}

export interface RailroadTrack {
  points: Array<{ x: number; y: number }>;
  totalLength: number;
}

export interface TrafficLight {
  id: string;
  x: number;
  y: number;
  state: 'green_ns' | 'yellow_ns' | 'green_ew' | 'yellow_ew';
  timer: number;
}

export interface Roundabout {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  innerRadius: number;
}

export interface NoFlyZone {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  ceilingAltitude: number;
  warningText: string;
}

export interface AirportRunway {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  headingLabel: string;
}

export interface ParkedPlane {
  id: string;
  x: number;
  y: number;
  heading: number;
  type: 'airliner' | 'cargo' | 'private_jet';
  wingspan: number;
  length: number;
  color: string;
}

export interface StreetLight {
  x: number;
  y: number;
}

export interface DriftingCloud {
  id: string;
  x: number;
  y: number;
  radius: number;
  altitude: number;
  opacity: number;
  puffs: Array<{ ox: number; oy: number; r: number }>;
}

export interface Pedestrian {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  state: 'idle' | 'walking' | 'rioting' | 'fleeing' | 'drowning' | 'stranded' | 'injured' | 'rescued';
  role?: 'civilian' | 'patient' | 'rioter' | 'suspect' | 'vip' | 'officer';
  health: number; // 0 to 100
  speechBubble?: string;
  speechTimer?: number;
}

export interface FireNode {
  id: string;
  x: number;
  y: number;
  altitude: number;
  intensity: number; // 0 to 100
  spreadRate: number;
  maxRadius: number;
  radius: number;
  smokeParticles: number;
}

export interface WaterDrop {
  x: number;
  y: number;
  altitude: number;
  vx: number;
  vy: number;
  vz: number;
  radius: number;
  volume: number;
  id: string;
}

export interface HelicopterModel {
  id: string;
  name: string;
  callsign: string;
  description: string;
  price: number;
  unlocked: boolean;
  maxSpeed: number; // knots
  climbRate: number; // ft/min
  maxAltitude: number; // ft
  fuelCapacity: number; // gal
  waterCapacity: number; // gal
  passengerCapacity: number;
  agility: number; // handling responsiveness
  durability: number;
  color: string;
  rotorBladeCount: number;
  hasWaterCannon: boolean;
  hasSearchlight: boolean;
  hasMegaphone: boolean;
  winchSpeed: number;
}

export interface HelicopterState {
  x: number; // world x
  y: number; // world y
  z: number; // altitude in feet (0 to 1200)
  vx: number; // horizontal velocity X
  vy: number; // horizontal velocity Y
  vz: number; // vertical climb/sink velocity ft/min
  heading: number; // radians (0 to 2*PI)
  pitch: number; // tilt forward/backward radians
  roll: number; // tilt left/right radians
  rotorRpm: number; // 0 to 100%
  rotorAngle: number; // rotor spin position radians
  tailRotorAngle: number;
  engineStarted: boolean;
  
  // Fuel & Systems
  fuel: number; // current gallons
  fuelMax: number;
  health: number; // 0 to 100%
  water: number; // current water volume
  waterMax: number;
  
  // Hoist & Winch
  hoistDeployed: boolean;
  hoistLength: number; // 0 to 150 ft
  hoistPayload: Pedestrian | null;
  
  // Passengers onboard
  passengers: Pedestrian[];
  
  // Equipment states
  sirenActive: boolean;
  megaphoneActive: boolean;
  searchlightActive: boolean;
  searchlightAngle: number; // relative or world angle
  flirActive: boolean; // thermal camera mode
  
  // Landing status
  isLanded: boolean;
  landedHelipad: Helipad | null;
  touchdownTimer: number;
}

export type MissionType = 
  | 'highrise_fire'
  | 'water_rescue'
  | 'highway_pileup'
  | 'riot_control'
  | 'suspect_pursuit'
  | 'vip_transport'
  | 'brush_fire'
  | 'traffic_jam'
  | 'roadside_ambulance'
  | 'air_taxi'
  | 'car_crash';

export interface Mission {
  id: string;
  title: string;
  code: string;
  type: MissionType;
  description: string;
  briefingAudioText: string;
  urgency: 'routine' | 'urgent' | 'critical';
  x: number;
  y: number;
  targetHelipadId?: string;
  targetName?: string;
  phase?: 'pickup' | 'dropoff' | 'monitor' | 'extinguish';
  rewardCash: number;
  rewardReputation: number;
  timeLimit: number; // seconds
  timeRemaining: number;
  state: 'available' | 'active' | 'completed' | 'failed';
  
  // Mission-specific targets
  targetsRemaining: number;
  targetsTotal: number;
  associatedVictims?: string[];
  associatedFires?: string[];
  associatedVehicles?: string[];
}

export interface CityData {
  width: number;
  height: number;
  seed: number;
  buildings: Building[];
  helipads: Helipad[];
  roads: Road[];
  waterBodies: WaterBody[];
  vehicles: Vehicle[];
  pedestrians: Pedestrian[];
  fires: FireNode[];
  parkZones?: ParkZone[];
  trees?: CityTree[];
  bridges?: Bridge[];
  piers?: Pier[];
  trainStations?: TrainStation[];
  trains?: CityTrain[];
  railroadTracks?: RailroadTrack[];
  trafficLights?: TrafficLight[];
  roundabouts?: Roundabout[];
  noFlyZones?: NoFlyZone[];
  airportRunways?: AirportRunway[];
  parkedPlanes?: ParkedPlane[];
  streetLights?: StreetLight[];
  driftingClouds?: DriftingCloud[];
}

export interface GameSettings {
  autoRudder: boolean;
  touchSensitivity: number;
  masterVolume: number;
  sfxVolume: number;
  radioVolume: number;
  weatherCycle: boolean;
  showFlightVectors: boolean;
  cameraZoom: number;
}

export interface PilotProfile {
  name: string;
  callsign: string;
  cash: number;
  reputation: number;
  rank: string;
  missionsCompleted: number;
  peopleRescued: number;
  firesExtinguished: number;
  flightTimeSeconds: number;
  ownedChopperIds: string[];
  currentChopperId: string;
}
