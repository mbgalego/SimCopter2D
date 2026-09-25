/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AirportRunway,
  Building,
  CityData,
  DriftingCloud,
  HelicopterModel,
  HelicopterState,
  Mission,
  NoFlyZone,
  ParkedPlane,
  RailroadTrack,
  Roundabout,
  StreetLight,
  TrafficLight,
  TrainStation,
  Vehicle,
  WaterDrop,
  WeatherState,
} from '../types/game';
import { ObstacleAlert } from './physics';

interface FireParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  isWater?: boolean;
}

export class GameRenderer {
  private fireParticles: FireParticle[] = [];
  private rotorWashParticles: FireParticle[] = [];
  private rainDrops: Array<{ x: number; y: number; length: number; speed: number }> = [];

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width || (typeof window !== 'undefined' ? window.innerWidth : 800);
    this.height = canvas.height || (typeof window !== 'undefined' ? window.innerHeight : 600);
    this.initRain();
  }

  public resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.initRain();
  }

  private initRain() {
    this.rainDrops = [];
    for (let i = 0; i < 220; i++) {
      this.rainDrops.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        length: 12 + Math.random() * 16,
        speed: 400 + Math.random() * 300,
      });
    }
  }

  /**
   * Helper to calculate pixel-perfect 2.5D radial perspective extrusion
   * of building rooftops relative to camera center (the helicopter).
   */
  private getBuildingExtrusion(b: Building, heli: HelicopterState): { dx: number; dy: number } {
    const relX = b.x + b.width / 2 - heli.x;
    const relY = b.y + b.height / 2 - heli.y;
    // Calibrated height ratio: 540 FT skyscraper extrudes ~40-60px, 30 FT house extrudes ~2px
    const heightRatio = Math.max(0.04, b.roofHeight / 600);
    const extrusion = heightRatio * 0.14;
    return {
      dx: relX * extrusion,
      dy: relY * extrusion,
    };
  }

  public render(
    heli: HelicopterState,
    model: HelicopterModel,
    city: CityData,
    weather: WeatherState,
    waterDrops: WaterDrop[],
    dt: number,
    _cameraZoom = 1.0,
    activeMission?: Mission | null,
    obstacleAlert?: ObstacleAlert | null
  ) {
    const ctx = this.ctx || this.canvas.getContext('2d');
    if (!ctx) return;

    const cw = this.canvas.width || this.width;
    const ch = this.canvas.height || this.height;

    // Clear frame
    ctx.clearRect(0, 0, cw, ch);

    // Save camera context
    ctx.save();

    // Camera Center on Helicopter
    const camX = heli.x;
    const camY = heli.y;

    ctx.translate(cw / 2, ch / 2);

    // Camera Zoom: smooth zoom based on altitude
    const baseZoom = 1.0;
    const altitudeZoom = baseZoom * (1.0 - Math.min(0.22, (heli.z / 900) * 0.22));
    ctx.scale(altitudeZoom, altitudeZoom);

    ctx.translate(-camX, -camY);

    // Viewport bounds in world coords for culling
    const vpLeft = camX - cw / 2 / altitudeZoom - 350;
    const vpRight = camX + cw / 2 / altitudeZoom + 350;
    const vpTop = camY - ch / 2 / altitudeZoom - 350;
    const vpBottom = camY + ch / 2 / altitudeZoom + 350;

    // 1. Render Ground Terrain, Parks, Plazas, Gardens & Sidewalks
    this.renderTerrain(ctx, city, vpLeft, vpRight, vpTop, vpBottom);

    // 2. Render Water Bodies (Rivers, Lakes, Marina Harbor)
    this.renderWaterBodies(ctx, city, weather);

    // 3. Render Piers & Boat Docks
    this.renderPiers(ctx, city);

    // 4. Render Airport Runways, Markings, Taxiways & Parked Planes
    this.renderAirportAndPlanes(ctx, city, weather, vpLeft, vpRight, vpTop, vpBottom);

    // 5. Render Railroad Tracks, Ballast & Train Stations
    this.renderRailroadsAndStations(ctx, city, vpLeft, vpRight, vpTop, vpBottom);

    // 6. Render Roads & Bridges
    this.renderRoads(ctx, city);
    this.renderBridges(ctx, city);

    // 7. Render Roundabouts with Central Monuments/Fountains
    this.renderRoundabouts(ctx, city);

    // 8. Render Traffic Lights & Pedestrian Crosswalks
    this.renderTrafficLightsAndCrosswalks(ctx, city, weather);

    // 9. Render Military Base (Fort Sentinel) & Restricted No-Fly Airspace
    this.renderMilitaryBaseAndNoFlyZone(ctx, city, heli);

    // 10. Render Trees (Forest, Street Trees, Gardens)
    this.renderTrees(ctx, city, vpLeft, vpRight, vpTop, vpBottom);

    // 11. Render Street Light Poles & Nocturnal Amber Light Pools
    this.renderStreetLights(ctx, city, weather, vpLeft, vpRight, vpTop, vpBottom);

    // 12. Render Ground Level & Pier Helipads
    this.renderHelipads(ctx, city, heli, false);

    // 13. Render Animated Commuter Train on Tracks
    this.renderTrain(ctx, city, weather, vpLeft, vpRight, vpTop, vpBottom);

    // 14. Render Ground Vehicles (Trucks, Buses, Cars, Emergency) & Pedestrians
    this.renderVehicles(ctx, city, weather, vpLeft, vpRight, vpTop, vpBottom);
    this.renderPedestrians(ctx, city, false);

    // 15. Render Soft Ground Shadows from Drifting Clouds
    this.renderDriftingClouds(ctx, city, weather, vpLeft, vpRight, vpTop, vpBottom, true);

    // 16. Render Building Shadows (Proportional to height for instant altitude readability)
    this.renderBuildingShadows(ctx, city, vpLeft, vpRight, vpTop, vpBottom);

    // 17. Render Buildings & Skyscrapers (with 2.5D radial perspective extrusion & floor bands)
    this.renderBuildings(ctx, city, heli, weather, vpLeft, vpRight, vpTop, vpBottom, obstacleAlert);

    // 18. Render Rooftop Helipads & Rooftop Victims (Matching building 2.5D extrusion)
    this.renderHelipads(ctx, city, heli, true);
    this.renderPedestrians(ctx, city, true);

    // 19. Render Fire Nodes & Rising Smoke
    this.renderFires(ctx, city, dt);

    // 20. Render Water Drops in Air & High-Pressure Water Cannon Stream
    this.renderWaterDrops(ctx, waterDrops, heli, model);

    // 21. Render Downwash & Rotor Wash Effects on Ground/Water
    this.renderRotorWash(ctx, heli, city, dt);

    // 22. Render Drifting Clouds in Atmosphere above terrain
    this.renderDriftingClouds(ctx, city, weather, vpLeft, vpRight, vpTop, vpBottom, false);

    // 23. Render Helicopter Ground Shadow (Tight under skids when landed, decouples with altitude)
    this.renderHelicopterShadow(ctx, heli, city);

    // 24. Render Rescue Hoist Cable & Payload
    this.renderRescueHoist(ctx, heli);

    // 25. Preemptive Forward Obstacle Radar Flight Path Beam
    if (obstacleAlert) {
      this.renderObstacleRadarBeam(ctx, heli, obstacleAlert);
    }

    // 26. Render Helicopter Fuselage & Rotor System
    this.renderHelicopter(ctx, heli, model);

    // 27. Mission Directional Navigation Chevron Arrow
    if (activeMission) {
      this.renderMissionArrow(ctx, heli, activeMission);
    }

    // 28. Searchlight Cone (world coordinates)
    if (heli.searchlightActive) {
      this.renderSearchlightBeam(ctx, heli);
    }

    ctx.restore();

    // 18. Screen-Space Atmospheric Layers: Rain, Fog, Night Lighting & FLIR
    this.renderAtmosphere(ctx, cw, ch, weather, heli, dt);
  }

  private renderTerrain(ctx: CanvasRenderingContext2D, city: CityData, left: number, right: number, top: number, bottom: number) {
    // City ground base: dark urban slate
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(Math.max(0, left), Math.max(0, top), Math.min(city.width, right) - Math.max(0, left), Math.min(city.height, bottom) - Math.max(0, top));

    // Render Park Zones (Grand Botanical Forest, Plazas, Gardens, Lawns, Stadium)
    if (city.parkZones) {
      city.parkZones.forEach((pz) => {
        if (pz.x + pz.width < left || pz.x > right || pz.y + pz.height < top || pz.y > bottom) return;

        ctx.fillStyle = pz.color || '#143828';
        ctx.fillRect(pz.x, pz.y, pz.width, pz.height);

        // Distinct styling per park type
        if (pz.type === 'plaza') {
          // Stone plaza pavers grid
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          ctx.lineWidth = 1;
          for (let px = pz.x + 30; px < pz.x + pz.width; px += 35) {
            ctx.beginPath();
            ctx.moveTo(px, pz.y);
            ctx.lineTo(px, pz.y + pz.height);
            ctx.stroke();
          }
          for (let py = pz.y + 30; py < pz.y + pz.height; py += 35) {
            ctx.beginPath();
            ctx.moveTo(pz.x, py);
            ctx.lineTo(pz.x + pz.width, py);
            ctx.stroke();
          }
        } else if (pz.type === 'sports_field') {
          // Soccer / Sports pitch markings
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(pz.x + 15, pz.y + 15, pz.width - 30, pz.height - 30);
          // Halfway line
          ctx.beginPath();
          ctx.moveTo(pz.x + pz.width / 2, pz.y + 15);
          ctx.lineTo(pz.x + pz.width / 2, pz.y + pz.height - 15);
          ctx.stroke();
          // Center circle
          ctx.beginPath();
          ctx.arc(pz.x + pz.width / 2, pz.y + pz.height / 2, 28, 0, Math.PI * 2);
          ctx.stroke();
        } else if (pz.type === 'forest') {
          // Subtle walking trails through the forest
          ctx.strokeStyle = '#a16207';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(pz.x + 100, pz.y + 200);
          ctx.bezierCurveTo(pz.x + 400, pz.y + 350, pz.x + 600, pz.y + 1000, pz.x + 1100, pz.y + 1200);
          ctx.stroke();
        }
      });
    }
  }

  private renderWaterBodies(ctx: CanvasRenderingContext2D, city: CityData, weather: WeatherState) {
    city.waterBodies.forEach((wb) => {
      // Deep blue water
      ctx.fillStyle = weather.type === 'night' ? '#082f49' : '#0369a1';
      ctx.fillRect(wb.x, wb.y, wb.width, wb.height);

      // Water shoreline border
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(wb.x, wb.y, wb.width, wb.height);

      // Flowing wave lines
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.22;
      const t = Date.now() * 0.001;
      for (let y = wb.y + 35; y < wb.y + wb.height; y += 65) {
        ctx.beginPath();
        const offsetX = Math.sin(y * 0.05 + t) * 14;
        ctx.moveTo(wb.x + 8 + offsetX, y);
        ctx.lineTo(wb.x + wb.width - 8 + offsetX, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1.0;
    });
  }

  private renderPiers(ctx: CanvasRenderingContext2D, city: CityData) {
    if (!city.piers) return;
    city.piers.forEach((pier) => {
      // Wooden dock deck
      ctx.fillStyle = '#78350f';
      ctx.fillRect(pier.x, pier.y, pier.width, pier.height);

      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2;
      ctx.strokeRect(pier.x, pier.y, pier.width, pier.height);

      // Wood plank lines
      ctx.strokeStyle = 'rgba(69, 26, 3, 0.5)';
      ctx.lineWidth = 1;
      for (let px = pier.x + 8; px < pier.x + pier.width; px += 10) {
        ctx.beginPath();
        ctx.moveTo(px, pier.y);
        ctx.lineTo(px, pier.y + pier.height);
        ctx.stroke();
      }

      // Moored luxury yacht at marina pier
      if (pier.id.includes('marina')) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(pier.x + pier.width - 25, pier.y + pier.height + 12, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(pier.x + pier.width - 28, pier.y + pier.height + 9, 8, 6);
      }
    });
  }

  private renderRoads(ctx: CanvasRenderingContext2D, city: CityData) {
    city.roads.forEach((road) => {
      const isHorizontal = Math.abs(road.y1 - road.y2) < 5;

      // 1. FREEWAY / EXPRESSWAY RENDERING (6-Lane Interstate)
      if (road.isFreeway) {
        const fw = road.width; // 92px
        const len = road.x2 - road.x1;

        // Concrete Highway Base & Shoulders
        ctx.fillStyle = '#334155';
        ctx.fillRect(road.x1, road.y1 - fw / 2, len, fw);

        // Asphalt Driving Surface
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(road.x1, road.y1 - fw / 2 + 5, len, fw - 10);

        // Outer White Fog Lines (Shoulders)
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(road.x1, road.y1 - fw / 2 + 6);
        ctx.lineTo(road.x2, road.y1 - fw / 2 + 6);
        ctx.moveTo(road.x1, road.y1 + fw / 2 - 6);
        ctx.lineTo(road.x2, road.y1 + fw / 2 - 6);
        ctx.stroke();

        // Eastbound 3 lanes: lane divider dashes
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([16, 16]);
        ctx.beginPath();
        ctx.moveTo(road.x1, road.y1 - 16);
        ctx.lineTo(road.x2, road.y1 - 16);
        ctx.moveTo(road.x1, road.y1 - 30);
        ctx.lineTo(road.x2, road.y1 - 30);
        ctx.stroke();

        // Westbound 3 lanes: lane divider dashes
        ctx.beginPath();
        ctx.moveTo(road.x1, road.y1 + 16);
        ctx.lineTo(road.x2, road.y1 + 16);
        ctx.moveTo(road.x1, road.y1 + 30);
        ctx.lineTo(road.x2, road.y1 + 30);
        ctx.stroke();
        ctx.setLineDash([]);

        // Yellow Inner Median Lines
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(road.x1, road.y1 - 4);
        ctx.lineTo(road.x2, road.y1 - 4);
        ctx.moveTo(road.x1, road.y1 + 4);
        ctx.lineTo(road.x2, road.y1 + 4);
        ctx.stroke();

        // Center Concrete Jersey Barrier Median
        ctx.fillStyle = '#64748b';
        ctx.fillRect(road.x1, road.y1 - 3, len, 6);
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(road.x1, road.y1);
        ctx.lineTo(road.x2, road.y1);
        ctx.stroke();

        // Overhead Highway Gantry Signs every 800px
        for (let gx = road.x1 + 400; gx < road.x2; gx += 800) {
          ctx.fillStyle = '#475569';
          ctx.fillRect(gx - 4, road.y1 - fw / 2 - 4, 8, fw + 8);
          // Green Highway Sign Board
          ctx.fillStyle = '#065f46';
          ctx.fillRect(gx - 28, road.y1 - 18, 56, 12);
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 1;
          ctx.strokeRect(gx - 28, road.y1 - 18, 56, 12);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 7px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('I-95 EXPRESSWAY', gx, road.y1 - 10);
        }
        return;
      }

      // 2. STANDARD URBAN AVENUE & STREET RENDERING WITH SIDEWALKS
      const sidewalkWidth = 10;
      if (isHorizontal) {
        const len = road.x2 - road.x1;

        // North Sidewalk
        ctx.fillStyle = '#334155';
        ctx.fillRect(road.x1, road.y1 - road.width / 2 - sidewalkWidth, len, sidewalkWidth);

        // South Sidewalk
        ctx.fillRect(road.x1, road.y1 + road.width / 2, len, sidewalkWidth);

        // Sidewalk expansion lines
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let sx = road.x1; sx < road.x2; sx += 32) {
          ctx.moveTo(sx, road.y1 - road.width / 2 - sidewalkWidth);
          ctx.lineTo(sx, road.y1 - road.width / 2);
          ctx.moveTo(sx, road.y1 + road.width / 2);
          ctx.lineTo(sx, road.y1 + road.width / 2 + sidewalkWidth);
        }
        ctx.stroke();

        // Tarmac Road Surface
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(road.x1, road.y1 - road.width / 2, len, road.width);

        // Granite Curb Edges
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(road.x1, road.y1 - road.width / 2);
        ctx.lineTo(road.x2, road.y1 - road.width / 2);
        ctx.moveTo(road.x1, road.y1 + road.width / 2);
        ctx.lineTo(road.x2, road.y1 + road.width / 2);
        ctx.stroke();

        // Center Double Yellow Lines
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(road.x1, road.y1 - 1.5);
        ctx.lineTo(road.x2, road.y1 - 1.5);
        ctx.moveTo(road.x1, road.y1 + 1.5);
        ctx.lineTo(road.x2, road.y1 + 1.5);
        ctx.stroke();

        // 4-Lane Dashed White Dividers if width >= 48
        if (road.width >= 48) {
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([12, 12]);
          ctx.beginPath();
          ctx.moveTo(road.x1, road.y1 - road.width / 4);
          ctx.lineTo(road.x2, road.y1 - road.width / 4);
          ctx.moveTo(road.x1, road.y1 + road.width / 4);
          ctx.lineTo(road.x2, road.y1 + road.width / 4);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else {
        // Vertical Road
        const len = road.y2 - road.y1;

        // West Sidewalk
        ctx.fillStyle = '#334155';
        ctx.fillRect(road.x1 - road.width / 2 - sidewalkWidth, road.y1, sidewalkWidth, len);

        // East Sidewalk
        ctx.fillRect(road.x1 + road.width / 2, road.y1, sidewalkWidth, len);

        // Sidewalk expansion lines
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let sy = road.y1; sy < road.y2; sy += 32) {
          ctx.moveTo(road.x1 - road.width / 2 - sidewalkWidth, sy);
          ctx.lineTo(road.x1 - road.width / 2, sy);
          ctx.moveTo(road.x1 + road.width / 2, sy);
          ctx.lineTo(road.x1 + road.width / 2 + sidewalkWidth, sy);
        }
        ctx.stroke();

        // Tarmac Road Surface
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(road.x1 - road.width / 2, road.y1, road.width, len);

        // Granite Curb Edges
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(road.x1 - road.width / 2, road.y1);
        ctx.lineTo(road.x1 - road.width / 2, road.y2);
        ctx.moveTo(road.x1 + road.width / 2, road.y1);
        ctx.lineTo(road.x1 + road.width / 2, road.y2);
        ctx.stroke();

        // Center Double Yellow Lines
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(road.x1 - 1.5, road.y1);
        ctx.lineTo(road.x1 - 1.5, road.y2);
        ctx.moveTo(road.x1 + 1.5, road.y1);
        ctx.lineTo(road.x1 + 1.5, road.y2);
        ctx.stroke();

        // 4-Lane Dashed White Dividers if width >= 48
        if (road.width >= 48) {
          ctx.strokeStyle = '#f8fafc';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([12, 12]);
          ctx.beginPath();
          ctx.moveTo(road.x1 - road.width / 4, road.y1);
          ctx.lineTo(road.x1 - road.width / 4, road.y2);
          ctx.moveTo(road.x1 + road.width / 4, road.y1);
          ctx.lineTo(road.x1 + road.width / 4, road.y2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    });
  }

  private renderBridges(ctx: CanvasRenderingContext2D, city: CityData) {
    if (!city.bridges) return;
    city.bridges.forEach((bridge) => {
      // Concrete Bridge Structure
      ctx.fillStyle = '#334155';
      ctx.fillRect(bridge.x, bridge.y, bridge.width, bridge.height);

      // Roadway deck surface
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(bridge.x, bridge.y + 4, bridge.width, bridge.height - 8);

      // Yellow double center line
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.moveTo(bridge.x, bridge.y + bridge.height / 2);
      ctx.lineTo(bridge.x + bridge.width, bridge.y + bridge.height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Steel safety barriers
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.strokeRect(bridge.x, bridge.y, bridge.width, bridge.height);

      // Suspension Towers on Skyline Bridge
      if (bridge.towerHeight) {
        const t1X = bridge.x + 90;
        const t2X = bridge.x + bridge.width - 90;

        ctx.fillStyle = '#475569';
        ctx.fillRect(t1X - 8, bridge.y - 8, 16, bridge.height + 16);
        ctx.fillRect(t2X - 8, bridge.y - 8, 16, bridge.height + 16);

        // Suspension cable arcs
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.75)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(bridge.x, bridge.y + 4);
        ctx.quadraticCurveTo((t1X + t2X) / 2, bridge.y - 20, bridge.x + bridge.width, bridge.y + 4);
        ctx.stroke();
      }
    });
  }

  private renderTrees(ctx: CanvasRenderingContext2D, city: CityData, left: number, right: number, top: number, bottom: number) {
    if (!city.trees) return;
    city.trees.forEach((tree) => {
      if (tree.x < left - 30 || tree.x > right + 30 || tree.y < top - 30 || tree.y > bottom + 30) return;

      // Tree ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.beginPath();
      ctx.arc(tree.x + 4, tree.y + 4, tree.radius * 0.9, 0, Math.PI * 2);
      ctx.fill();

      // Tree foliage base
      ctx.fillStyle = tree.color || (tree.type === 'pine' ? '#0f4024' : '#15803d');
      ctx.beginPath();
      ctx.arc(tree.x, tree.y, tree.radius, 0, Math.PI * 2);
      ctx.fill();

      // Foliage highlight
      ctx.fillStyle = tree.type === 'pine' ? '#166534' : tree.type === 'flowering' ? '#fbcfe8' : '#22c55e';
      ctx.beginPath();
      ctx.arc(tree.x - tree.radius * 0.25, tree.y - tree.radius * 0.25, tree.radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private renderHelipads(ctx: CanvasRenderingContext2D, city: CityData, heli: HelicopterState, rooftopOnly: boolean) {
    city.helipads.forEach((pad) => {
      const isRooftop = !!pad.buildingId;
      if (isRooftop !== rooftopOnly) return;

      let drawX = pad.x;
      let drawY = pad.y;

      // Lock rooftop helipad strictly to extruded rooftop coordinates
      if (isRooftop && pad.buildingId) {
        const b = city.buildings.find((item) => item.id === pad.buildingId);
        if (b) {
          const { dx, dy } = this.getBuildingExtrusion(b, heli);
          drawX += dx;
          drawY += dy;
        }
      }

      // Outer concrete ring
      ctx.beginPath();
      ctx.arc(drawX, drawY, pad.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#1e293b';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = pad.type === 'hospital' ? '#ef4444' : pad.type === 'police' ? '#38bdf8' : '#f59e0b';
      ctx.stroke();

      // Yellow perimeter landing circle
      ctx.beginPath();
      ctx.arc(drawX, drawY, pad.radius * 0.75, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#facc15';
      ctx.stroke();

      // "H" or Red Cross symbol
      if (pad.type === 'hospital') {
        ctx.fillStyle = '#ef4444';
        const crossW = pad.radius * 0.45;
        const crossBar = crossW * 0.35;
        ctx.fillRect(drawX - crossBar / 2, drawY - crossW / 2, crossBar, crossW);
        ctx.fillRect(drawX - crossW / 2, drawY - crossBar / 2, crossW, crossBar);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.floor(pad.radius * 0.75)}px 'JetBrains Mono', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('H', drawX, drawY);
      }

      // Perimeter beacon strobe lights
      const strobeOn = Math.floor(Date.now() / 350) % 2 === 0;
      if (strobeOn) {
        ctx.fillStyle = pad.type === 'hospital' ? '#ef4444' : '#22c55e';
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
          const bx = drawX + Math.cos(a) * (pad.radius - 3);
          const by = drawY + Math.sin(a) * (pad.radius - 3);
          ctx.beginPath();
          ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }

  /**
   * Renders directional sun-cast ground shadows proportional to building roofHeight.
   * This is the #1 visual cue enabling immediate altitude reading of tall vs short buildings!
   */
  private renderBuildingShadows(ctx: CanvasRenderingContext2D, city: CityData, left: number, right: number, top: number, bottom: number) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.40)';

    city.buildings.forEach((b) => {
      if (b.x + b.width < left - 250 || b.x > right + 250 || b.y + b.height < top - 250 || b.y > bottom + 250) return;

      // Sun angle: Upper-left light casting towards bottom-right (dx: +0.707, dy: +0.707)
      // 540 FT skyscraper casts 165px shadow, 30 FT house casts 10px shadow
      const shadowDist = Math.max(8, (b.roofHeight / 540) * 165);
      const sx = shadowDist * 0.707;
      const sy = shadowDist * 0.707;

      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + sx, b.y + sy);
      ctx.lineTo(b.x + b.width + sx, b.y + sy);
      ctx.lineTo(b.x + b.width + sx, b.y + b.height + sy);
      ctx.lineTo(b.x + sx, b.y + b.height + sy);
      ctx.lineTo(b.x, b.y + b.height);
      ctx.closePath();
      ctx.fill();
    });

    ctx.restore();
  }

  /**
   * Renders 3D buildings with 2.5D radial perspective extrusion, directional face lighting,
   * floor bands, and prominent elevation badges.
   */
  private renderBuildings(
    ctx: CanvasRenderingContext2D,
    city: CityData,
    heli: HelicopterState,
    weather: WeatherState,
    left: number,
    right: number,
    top: number,
    bottom: number,
    obstacleAlert?: ObstacleAlert | null
  ) {
    city.buildings.forEach((b) => {
      if (b.x + b.width < left - 250 || b.x > right + 250 || b.y + b.height < top - 250 || b.y > bottom + 250) return;

      const { dx, dy } = this.getBuildingExtrusion(b, heli);

      const gx1 = b.x;
      const gy1 = b.y;
      const gx2 = b.x + b.width;
      const gy2 = b.y + b.height;

      const rx1 = b.x + dx;
      const ry1 = b.y + dy;
      const rx2 = b.x + b.width + dx;
      const ry2 = b.y + b.height + dy;

      // --- 1. RENDER 3D WALLS WITH DIRECTIONAL LIGHTING & FLOORS ---
      // West Wall (visible when roof shifted to the right: dx > 0)
      if (dx > 0) {
        ctx.fillStyle = '#1e293b'; // shadowed wall
        ctx.beginPath();
        ctx.moveTo(gx1, gy1);
        ctx.lineTo(rx1, ry1);
        ctx.lineTo(rx1, ry2);
        ctx.lineTo(gx1, gy2);
        ctx.closePath();
        ctx.fill();

        // Floor stripes on tall buildings
        if (b.roofHeight >= 80) {
          const stories = Math.min(24, Math.floor(b.roofHeight / 16));
          ctx.strokeStyle = weather.ambientLight < 0.5 ? 'rgba(253, 224, 71, 0.45)' : 'rgba(148, 163, 184, 0.35)';
          ctx.lineWidth = 1.5;
          for (let s = 1; s < stories; s++) {
            const ratio = s / stories;
            const yStart = gy1 + (gy2 - gy1) * ratio;
            const yEnd = ry1 + (ry2 - ry1) * ratio;
            ctx.beginPath();
            ctx.moveTo(gx1, yStart);
            ctx.lineTo(rx1, yEnd);
            ctx.stroke();
          }
        }
      }

      // East Wall (visible when roof shifted to the left: dx < 0)
      if (dx < 0) {
        ctx.fillStyle = '#334155'; // ambient light wall
        ctx.beginPath();
        ctx.moveTo(gx2, gy1);
        ctx.lineTo(rx2, ry1);
        ctx.lineTo(rx2, ry2);
        ctx.lineTo(gx2, gy2);
        ctx.closePath();
        ctx.fill();

        if (b.roofHeight >= 80) {
          const stories = Math.min(24, Math.floor(b.roofHeight / 16));
          ctx.strokeStyle = weather.ambientLight < 0.5 ? 'rgba(253, 224, 71, 0.45)' : 'rgba(148, 163, 184, 0.35)';
          ctx.lineWidth = 1.5;
          for (let s = 1; s < stories; s++) {
            const ratio = s / stories;
            const yStart = gy1 + (gy2 - gy1) * ratio;
            const yEnd = ry1 + (ry2 - ry1) * ratio;
            ctx.beginPath();
            ctx.moveTo(gx2, yStart);
            ctx.lineTo(rx2, yEnd);
            ctx.stroke();
          }
        }
      }

      // North Wall (visible when roof shifted down: dy > 0)
      if (dy > 0) {
        ctx.fillStyle = '#0f172a'; // deepest shadow face
        ctx.beginPath();
        ctx.moveTo(gx1, gy1);
        ctx.lineTo(rx1, ry1);
        ctx.lineTo(rx2, ry1);
        ctx.lineTo(gx2, gy1);
        ctx.closePath();
        ctx.fill();
      }

      // South Wall (visible when roof shifted up: dy < 0)
      if (dy < 0) {
        ctx.fillStyle = '#475569'; // sunlit face
        ctx.beginPath();
        ctx.moveTo(gx1, gy2);
        ctx.lineTo(rx1, ry2);
        ctx.lineTo(rx2, ry2);
        ctx.lineTo(gx2, gy2);
        ctx.closePath();
        ctx.fill();
      }

      // --- 2. ROOFTOP SLAB WITH ADVANCED ARCHITECTURAL GEOMETRIES ---
      ctx.fillStyle = b.roofColor;

      if (b.geometry === 'cylindrical') {
        const radius = Math.min(b.width, b.height) / 2;
        const cx = rx1 + b.width / 2;
        const cy = ry1 + b.height / 2;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = b.roofHeight >= 300 ? '#38bdf8' : '#64748b';
        ctx.lineWidth = b.roofHeight >= 300 ? 2.5 : 1.5;
        ctx.stroke();

        // Observation rotunda / concentric inner deck
        ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (b.geometry === 'octagonal') {
        const bevel = Math.min(b.width, b.height) * 0.22;
        ctx.beginPath();
        ctx.moveTo(rx1 + bevel, ry1);
        ctx.lineTo(rx2 - bevel, ry1);
        ctx.lineTo(rx2, ry1 + bevel);
        ctx.lineTo(rx2, ry2 - bevel);
        ctx.lineTo(rx2 - bevel, ry2);
        ctx.lineTo(rx1 + bevel, ry2);
        ctx.lineTo(rx1, ry2 - bevel);
        ctx.lineTo(rx1, ry1 + bevel);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = b.roofHeight >= 300 ? '#38bdf8' : '#64748b';
        ctx.lineWidth = b.roofHeight >= 300 ? 2.5 : 1.5;
        ctx.stroke();
      } else if (b.geometry === 'stepped') {
        // Multi-tier Setback Skyscraper (Tier 1 base, Tier 2 mid, Tier 3 penthouse)
        ctx.fillRect(rx1, ry1, b.width, b.height);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rx1, ry1, b.width, b.height);

        // Tier 2 Setback
        const t2Inset = b.width * 0.15;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(rx1 + t2Inset, ry1 + t2Inset, b.width - t2Inset * 2, b.height - t2Inset * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(rx1 + t2Inset, ry1 + t2Inset, b.width - t2Inset * 2, b.height - t2Inset * 2);

        // Tier 3 Penthouse Tower
        const t3Inset = b.width * 0.3;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(rx1 + t3Inset, ry1 + t3Inset, b.width - t3Inset * 2, b.height - t3Inset * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.strokeRect(rx1 + t3Inset, ry1 + t3Inset, b.width - t3Inset * 2, b.height - t3Inset * 2);
      } else if (b.geometry === 'l_shape') {
        // L-shaped footprint
        const cutW = b.width * 0.45;
        const cutH = b.height * 0.45;
        ctx.beginPath();
        ctx.moveTo(rx1, ry1);
        ctx.lineTo(rx2, ry1);
        ctx.lineTo(rx2, ry2 - cutH);
        ctx.lineTo(rx1 + cutW, ry2 - cutH);
        ctx.lineTo(rx1 + cutW, ry2);
        ctx.lineTo(rx1, ry2);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else {
        // Standard rectangular slab
        ctx.fillRect(rx1, ry1, b.width, b.height);
        ctx.strokeStyle = b.roofHeight >= 300 ? '#38bdf8' : '#64748b';
        ctx.lineWidth = b.roofHeight >= 300 ? 2.5 : 1.5;
        ctx.strokeRect(rx1, ry1, b.width, b.height);
      }

      // Rooftop AC chiller units
      if (b.roofHeight >= 60 && b.geometry !== 'cylindrical') {
        ctx.fillStyle = '#334155';
        ctx.fillRect(rx1 + 10, ry1 + 10, 24, 16);
        ctx.fillRect(rx1 + b.width - 34, ry1 + 10, 22, 16);
      }

      // --- 3. PROMINENT ROOFTOP ELEVATION BADGE ---
      // Instantly tells the pilot the exact elevation of every building!
      const elevText = b.elevationLabel || `${Math.round(b.roofHeight)} FT`;
      ctx.save();
      const badgeW = 62;
      const badgeH = 16;
      ctx.fillStyle = b.roofHeight >= 350 ? 'rgba(2, 6, 23, 0.9)' : 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(rx1 + 4, ry1 + 4, badgeW, badgeH);
      ctx.strokeStyle = b.roofHeight >= 350 ? '#38bdf8' : '#94a3b8';
      ctx.lineWidth = 1;
      ctx.strokeRect(rx1 + 4, ry1 + 4, badgeW, badgeH);

      ctx.fillStyle = b.roofHeight >= 350 ? '#38bdf8' : '#f8fafc';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`▲ ${elevText}`, rx1 + 4 + badgeW / 2, ry1 + 4 + badgeH / 2);
      ctx.restore();

      // Preemptive Forward Obstacle Warning Outline & Tag
      if (obstacleAlert && obstacleAlert.buildingId === b.id) {
        const isWarning = obstacleAlert.severity === 'warning';
        const flash = Math.floor(Date.now() / 200) % 2 === 0;
        ctx.save();
        ctx.strokeStyle = isWarning ? (flash ? '#ef4444' : '#ffffff') : '#f59e0b';
        ctx.lineWidth = 3.5;
        ctx.strokeRect(rx1 - 2, ry1 - 2, b.width + 4, b.height + 4);

        // Preemptive obstacle warning tag floating right above rooftop
        const tagW = 100;
        const tagH = 18;
        ctx.fillStyle = isWarning ? (flash ? 'rgba(239, 68, 68, 0.95)' : 'rgba(185, 28, 28, 0.95)') : 'rgba(245, 158, 11, 0.95)';
        ctx.fillRect(rx1 + (b.width - tagW) / 2, ry1 - 24, tagW, tagH);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx1 + (b.width - tagW) / 2, ry1 - 24, tagW, tagH);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`⚠ ${isWarning ? 'PULL UP!' : 'COLLISION'}: ${Math.round(b.roofHeight)}FT`, rx1 + b.width / 2, ry1 - 15);
        ctx.restore();
      }

      // Red Obstruction Beacon for structures >= 150 FT
      if (b.beacon || b.roofHeight >= 150) {
        const beaconX = rx1 + b.width / 2;
        const beaconY = ry1 + b.height / 2;
        const flash = Math.floor(Date.now() / 600) % 2 === 0;

        if (b.spire) {
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(beaconX, beaconY);
          ctx.lineTo(beaconX, beaconY - 20);
          ctx.stroke();
        }

        const lightY = b.spire ? beaconY - 20 : beaconY;
        ctx.beginPath();
        ctx.arc(beaconX, lightY, 4, 0, Math.PI * 2);
        ctx.fillStyle = flash ? '#ef4444' : '#7f1d1d';
        ctx.fill();

        if (flash) {
          ctx.beginPath();
          ctx.arc(beaconX, lightY, 12, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.45)';
          ctx.fill();
        }
      }
    });
  }

  private renderVehicles(
    ctx: CanvasRenderingContext2D,
    city: CityData,
    weather: WeatherState,
    left: number,
    right: number,
    top: number,
    bottom: number
  ) {
    const isDark = weather.ambientLight < 0.65 || weather.type === 'night';

    city.vehicles.forEach((veh) => {
      if (veh.x < left - 60 || veh.x > right + 60 || veh.y < top - 60 || veh.y > bottom + 60) return;

      ctx.save();
      ctx.translate(veh.x, veh.y);
      ctx.rotate(veh.heading);

      // --- 1. HEADLIGHT CONES PROJECTING FORWARD AT NIGHT / LOW LIGHT ---
      if (isDark) {
        ctx.save();
        const beamLen = veh.type === 'truck' ? 65 : 45;
        const beamW = 18;
        const gradL = ctx.createRadialGradient(8, -3, 2, 8 + beamLen * 0.8, -beamW / 2, beamLen);
        gradL.addColorStop(0, 'rgba(254, 240, 138, 0.7)');
        gradL.addColorStop(0.5, 'rgba(254, 240, 138, 0.25)');
        gradL.addColorStop(1, 'rgba(254, 240, 138, 0)');

        ctx.fillStyle = gradL;
        ctx.beginPath();
        ctx.moveTo(8, -4);
        ctx.lineTo(8 + beamLen, -beamW);
        ctx.lineTo(8 + beamLen, 0);
        ctx.closePath();
        ctx.fill();

        const gradR = ctx.createRadialGradient(8, 3, 2, 8 + beamLen * 0.8, beamW / 2, beamLen);
        gradR.addColorStop(0, 'rgba(254, 240, 138, 0.7)');
        gradR.addColorStop(0.5, 'rgba(254, 240, 138, 0.25)');
        gradR.addColorStop(1, 'rgba(254, 240, 138, 0)');

        ctx.fillStyle = gradR;
        ctx.beginPath();
        ctx.moveTo(8, 4);
        ctx.lineTo(8 + beamLen, 0);
        ctx.lineTo(8 + beamLen, beamW);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // --- 2. VEHICLE CHASSIS & ACCESSORIES BY TYPE ---
      if (veh.type === 'truck') {
        // Semi-Truck with Articulated / Connected Freight Trailer
        const cabLen = 13;
        const cabWidth = 9;
        const trailerLen = 22;
        const trailerWidth = 9.5;
        const hitchGap = 3;

        // Shadow under whole truck
        ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.fillRect(-trailerLen - hitchGap - 2, -trailerWidth / 2 + 2, cabLen + trailerLen + hitchGap + 2, trailerWidth);

        // Trailer Body
        ctx.fillStyle = veh.trailerColor || '#f8fafc';
        ctx.fillRect(-trailerLen - hitchGap, -trailerWidth / 2, trailerLen, trailerWidth);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(-trailerLen - hitchGap, -trailerWidth / 2, trailerLen, trailerWidth);

        // Trailer ribbed roof details
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        for (let rx = -trailerLen - hitchGap + 4; rx < -hitchGap - 2; rx += 4) {
          ctx.beginPath();
          ctx.moveTo(rx, -trailerWidth / 2 + 1);
          ctx.lineTo(rx, trailerWidth / 2 - 1);
          ctx.stroke();
        }

        // Hitch connector
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-hitchGap, -2, hitchGap, 4);

        // Cab Body
        ctx.fillStyle = veh.color;
        ctx.fillRect(0, -cabWidth / 2, cabLen, cabWidth);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, -cabWidth / 2, cabLen, cabWidth);

        // Cab Windshield & Hood
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(cabLen - 5, -cabWidth / 2 + 1.5, 3, cabWidth - 3);

        // Twin Chrome Exhaust Stacks
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(1, -cabWidth / 2 - 1.5, 2, 1.5);
        ctx.fillRect(1, cabWidth / 2, 2, 1.5);

        // Side Mirrors
        ctx.fillStyle = '#334155';
        ctx.fillRect(cabLen - 4, -cabWidth / 2 - 2, 2, 2);
        ctx.fillRect(cabLen - 4, cabWidth / 2, 2, 2);

        // Rear Taillights
        if (isDark) {
          const isBraking = veh.stoppedAtLight || veh.speed < 4;
          ctx.fillStyle = isBraking ? '#ef4444' : '#b91c1c';
          ctx.fillRect(-trailerLen - hitchGap - 1, -trailerWidth / 2 + 1, 1.5, 2);
          ctx.fillRect(-trailerLen - hitchGap - 1, trailerWidth / 2 - 3, 1.5, 2);
          if (isBraking) {
            ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
            ctx.fillRect(-trailerLen - hitchGap - 5, -trailerWidth / 2, 4, 3);
            ctx.fillRect(-trailerLen - hitchGap - 5, trailerWidth / 2 - 3, 4, 3);
          }
        }
      } else if (veh.type === 'bus') {
        // Metropolitan City Transit Bus
        const length = 28;
        const width = 10;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(-length / 2 + 2, -width / 2 + 2, length, width);

        // Yellow / Amber Transit Bus Body
        ctx.fillStyle = veh.color || '#f59e0b';
        ctx.fillRect(-length / 2, -width / 2, length, width);
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1;
        ctx.strokeRect(-length / 2, -width / 2, length, width);

        // Front Windshield & Destination Sign
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(length / 2 - 6, -width / 2 + 1, 4, width - 2);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(length / 2 - 2, -width / 2 + 2, 2, width - 4);

        // Tinted Passenger Windows along sides
        ctx.fillStyle = '#1e293b';
        for (let wx = -length / 2 + 4; wx < length / 2 - 8; wx += 4) {
          ctx.fillRect(wx, -width / 2 + 1, 2.5, 1.5);
          ctx.fillRect(wx, width / 2 - 2.5, 2.5, 1.5);
        }

        // Roof AC units
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-4, -2.5, 8, 5);

        // Taillights
        if (isDark) {
          const isBraking = veh.stoppedAtLight || veh.speed < 4;
          ctx.fillStyle = isBraking ? '#ef4444' : '#b91c1c';
          ctx.fillRect(-length / 2 - 1, -width / 2 + 1, 1.5, 2);
          ctx.fillRect(-length / 2 - 1, width / 2 - 3, 1.5, 2);
        }
      } else {
        // Passenger Cars & Emergency Vehicles
        const length = veh.type === 'firetruck' ? 24 : 16;
        const width = veh.type === 'firetruck' ? 10 : 8;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(-length / 2 + 2, -width / 2 + 2, length, width);

        // Body
        ctx.fillStyle = veh.color;
        ctx.fillRect(-length / 2, -width / 2, length, width);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-length / 2, -width / 2, length, width);

        // Front Windshield
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(length / 2 - 5, -width / 2 + 1.2, 3, width - 2.4);

        // Rear Windshield & Roof
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-length / 2 + 2, -width / 2 + 1.5, 2, width - 3);

        // Firetruck Ladder on roof
        if (veh.type === 'firetruck') {
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-length / 2 + 2, 0);
          ctx.lineTo(length / 2 - 6, 0);
          ctx.stroke();
        }

        // Emergency Strobe Lightbar
        if (veh.siren) {
          const strobe = Math.floor(Date.now() / 140) % 2 === 0;
          ctx.fillStyle = strobe ? '#ef4444' : '#3b82f6';
          ctx.fillRect(-2, -width / 2 + 1, 4, width - 2);
        }

        // Taillights
        if (isDark) {
          const isBraking = veh.stoppedAtLight || veh.speed < 4;
          ctx.fillStyle = isBraking ? '#ef4444' : '#b91c1c';
          ctx.fillRect(-length / 2 - 1, -width / 2 + 1, 1.5, 2);
          ctx.fillRect(-length / 2 - 1, width / 2 - 3, 1.5, 2);
        }
      }

      ctx.restore();
    });
  }

  private renderPedestrians(ctx: CanvasRenderingContext2D, city: CityData, rooftopOnly: boolean) {
    city.pedestrians.forEach((ped) => {
      const isStranded = ped.state === 'stranded';
      if (isStranded !== rooftopOnly && ped.state !== 'drowning') return;

      ctx.save();
      ctx.translate(ped.x, ped.y);

      // Pedestrian silhouette
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      if (ped.state === 'drowning') {
        ctx.fillStyle = '#f97316';
      } else if (ped.state === 'injured') {
        ctx.fillStyle = '#ef4444';
      } else if (ped.state === 'rioting') {
        ctx.fillStyle = '#dc2626';
      } else {
        ctx.fillStyle = '#e2e8f0';
      }
      ctx.fill();

      // Flailing arms when stranded/waving for rescue
      if (ped.state === 'stranded' || ped.state === 'drowning') {
        const wave = Math.sin(Date.now() * 0.012) * 4;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-4, -wave);
        ctx.lineTo(4, wave);
        ctx.stroke();

        // Speech Bubble
        if (ped.speechBubble) {
          ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
          ctx.fillRect(-35, -28, 70, 16);
          ctx.fillStyle = '#facc15';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(ped.speechBubble, 0, -17);
        }
      }

      ctx.restore();
    });
  }

  private renderFires(ctx: CanvasRenderingContext2D, city: CityData, dt: number) {
    city.fires.forEach((fire) => {
      const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.15;
      const grad = ctx.createRadialGradient(fire.x, fire.y, 2, fire.x, fire.y, fire.radius * pulse);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#f97316');
      grad.addColorStop(0.7, '#dc2626');
      grad.addColorStop(1, 'rgba(220, 38, 38, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(fire.x, fire.y, fire.radius * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Smoke particles rising
      if (Math.random() < 0.4) {
        this.fireParticles.push({
          x: fire.x + (Math.random() - 0.5) * fire.radius,
          y: fire.y + (Math.random() - 0.5) * fire.radius,
          vx: (Math.random() - 0.5) * 8,
          vy: -20 - Math.random() * 25,
          life: 0,
          maxLife: 2.2,
          size: 6 + Math.random() * 8,
        });
      }
    });

    // Update smoke particles
    for (let i = this.fireParticles.length - 1; i >= 0; i--) {
      const p = this.fireParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;
      p.size += dt * 4;

      if (p.life >= p.maxLife) {
        this.fireParticles.splice(i, 1);
        continue;
      }

      const alpha = (1 - p.life / p.maxLife) * 0.4;
      ctx.fillStyle = `rgba(51, 65, 85, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderWaterDrops(
    ctx: CanvasRenderingContext2D,
    drops: WaterDrop[],
    heli: HelicopterState,
    model: HelicopterModel
  ) {
    // 1. HIGH-PRESSURE NOSE WATER CANNON JET STREAM
    // When water is actively released or recent drops exist, draw a direct jet stream
    // shooting straight out from the nose cannon nozzle along the helicopter's heading vector!
    if ((model.hasWaterCannon || heli.waterMax > 0) && drops.length > 0) {
      const forwardX = Math.sin(heli.heading);
      const forwardY = -Math.cos(heli.heading);
      const nozzleX = heli.x + forwardX * 38;
      const nozzleY = heli.y + forwardY * 38;

      ctx.save();
      // High-pressure core stream
      const streamLen = 110;
      const streamEndX = nozzleX + forwardX * streamLen;
      const streamEndY = nozzleY + forwardY * streamLen;

      const streamGrad = ctx.createLinearGradient(nozzleX, nozzleY, streamEndX, streamEndY);
      streamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      streamGrad.addColorStop(0.3, 'rgba(56, 189, 248, 0.85)');
      streamGrad.addColorStop(0.8, 'rgba(2, 132, 199, 0.55)');
      streamGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');

      ctx.strokeStyle = streamGrad;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(nozzleX, nozzleY);
      ctx.lineTo(streamEndX, streamEndY);
      ctx.stroke();

      // High-velocity stream inner core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(nozzleX, nozzleY);
      ctx.lineTo(nozzleX + forwardX * (streamLen * 0.6), nozzleY + forwardY * (streamLen * 0.6));
      ctx.stroke();

      // Water cannon forward spray cone
      ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
      ctx.beginPath();
      ctx.moveTo(nozzleX, nozzleY);
      const perpX = -forwardY;
      const perpY = forwardX;
      ctx.lineTo(streamEndX + perpX * 22, streamEndY + perpY * 22);
      ctx.lineTo(streamEndX - perpX * 22, streamEndY - perpY * 22);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // 2. WATER DROPLETS & BLOOMING SPRAY CLOUDS
    drops.forEach((drop) => {
      ctx.save();
      // Drop ground shadow/scale based on altitude
      const altitudeRatio = Math.max(0.2, Math.min(1.2, drop.altitude / 100));
      const radius = drop.radius * altitudeRatio;

      const grad = ctx.createRadialGradient(drop.x, drop.y, 2, drop.x, drop.y, radius);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, '#38bdf8');
      grad.addColorStop(0.8, '#0284c7');
      grad.addColorStop(1, 'rgba(2, 132, 199, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Spray droplet flecks
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      for (let s = 0; s < 3; s++) {
        const offAngle = s * 2.1 + (drop.x % 5);
        const dist = radius * (0.6 + s * 0.35);
        ctx.beginPath();
        ctx.arc(drop.x + Math.cos(offAngle) * dist, drop.y + Math.sin(offAngle) * dist, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  private renderRotorWash(ctx: CanvasRenderingContext2D, heli: HelicopterState, city: CityData, dt: number) {
    if (heli.z > 140) return;

    // Strong rotor wash when hovering low
    const intensity = (1 - heli.z / 140) * (heli.rotorRpm / 100);
    if (Math.random() < intensity * 0.8) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 60;
      const isOverWater = city.waterBodies.some(
        (wb) => heli.x >= wb.x && heli.x <= wb.x + wb.width && heli.y >= wb.y && heli.y <= wb.y + wb.height
      );

      this.rotorWashParticles.push({
        x: heli.x + Math.cos(angle) * 12,
        y: heli.y + Math.sin(angle) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.6,
        size: isOverWater ? 8 : 4,
        isWater: isOverWater,
      });
    }

    for (let i = this.rotorWashParticles.length - 1; i >= 0; i--) {
      const p = this.rotorWashParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life += dt;
      p.size += dt * 8;

      if (p.life >= p.maxLife) {
        this.rotorWashParticles.splice(i, 1);
        continue;
      }

      const alpha = (1 - p.life / p.maxLife) * (p.isWater ? 0.6 : 0.3);
      ctx.strokeStyle = p.isWater ? `rgba(56, 189, 248, ${alpha})` : `rgba(203, 213, 225, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /**
   * Ground shadow offset strictly communicates altitude:
   * When landed, shadow sits directly beneath the skids with ZERO offset.
   * As the helicopter climbs, shadow shifts outward along sun vector and softens.
   */
  private renderHelicopterShadow(ctx: CanvasRenderingContext2D, heli: HelicopterState, city: CityData) {
    const isLanded = heli.isLanded || heli.z < 2;
    const altRatio = Math.min(1.0, Math.max(0, heli.z / 600));

    // When landed: 0px offset! When airborne: up to 75px offset along sun angle
    const shadowDist = isLanded ? 0 : altRatio * 75;
    const shadowScale = isLanded ? 1.0 : Math.max(0.65, 1.0 - altRatio * 0.35);
    const shadowAlpha = isLanded ? 0.55 : Math.max(0.14, 0.52 - altRatio * 0.36);

    ctx.save();
    ctx.translate(heli.x + shadowDist * 0.707, heli.y + shadowDist * 0.707);
    ctx.rotate(heli.heading);
    ctx.scale(shadowScale, shadowScale);

    ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;

    // Fuselage shadow
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail boom shadow
    ctx.fillRect(-2, 10, 4, 25);

    // Rotor disc shadow
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderRescueHoist(ctx: CanvasRenderingContext2D, heli: HelicopterState) {
    if (!heli.hoistDeployed) return;

    ctx.save();
    ctx.translate(heli.x, heli.y);

    // Steel Cable line dangling down
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    // Draw cable end
    const cableDist = (heli.hoistLength / 150) * 45;
    ctx.lineTo(8, cableDist);
    ctx.stroke();

    // Rescue harness hook
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(8, cableDist, 3, 0, Math.PI * 2);
    ctx.fill();

    // If victim is hooked to harness
    if (heli.hoistPayload) {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.arc(8, cableDist + 4, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderHelicopter(ctx: CanvasRenderingContext2D, heli: HelicopterState, model: HelicopterModel) {
    ctx.save();
    ctx.translate(heli.x, heli.y);
    ctx.rotate(heli.heading);

    // Visual altitude scale: 1.0 at ground level up to 1.75 at high altitude
    const altRatio = Math.min(1.0, Math.max(0, heli.z / 700));
    const altitudeScale = 1.0 + altRatio * 0.75;
    ctx.scale(altitudeScale, altitudeScale);

    // Dynamic bank & pitch scale skew
    const bankScaleX = Math.cos(heli.roll);
    const pitchScaleY = Math.cos(heli.pitch);
    ctx.scale(bankScaleX, pitchScaleY);

    // 1. Landing Skids
    ctx.fillStyle = '#475569';
    ctx.fillRect(-12, -18, 3, 36);
    ctx.fillRect(9, -18, 3, 36);
    // Crossbars
    ctx.fillRect(-12, -6, 24, 2);
    ctx.fillRect(-12, 12, 24, 2);

    // 2. Tail Boom & Fin
    ctx.fillStyle = model.color;
    ctx.fillRect(-2.5, 12, 5, 28);

    // Horizontal stabilizer
    ctx.fillStyle = '#334155';
    ctx.fillRect(-10, 32, 20, 2.5);

    // Tail Rotor spinning
    ctx.save();
    ctx.translate(5, 40);
    ctx.rotate(heli.tailRotorAngle);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-7, 0);
    ctx.lineTo(7, 0);
    ctx.stroke();
    ctx.restore();

    // 3. Helicopter Fuselage Body
    ctx.fillStyle = model.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 23, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 4. Cockpit Glass Canopy
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(0, -9, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Glass glare reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-2, -11, 4, 6, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // 4.5. High-Pressure Water Cannon / Monitor Nozzle (Protruding forward at the nose)
    if (model.hasWaterCannon || heli.waterMax > 0) {
      ctx.save();
      // Turret swivel base on forward fuselage
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-3.5, -23, 7, 5);

      // Metallic Cannon Barrel protruding forward past the helicopter nose
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-2, -35, 4, 13);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.strokeRect(-2, -35, 4, 13);

      // High-Pressure Brass / Red Fire Monitor Nozzle Tip
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-3, -38, 6, 4);

      // Water cannon forward targeting beam & aim reticle
      if (heli.water > 0) {
        // Dynamic water aiming guide
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(0, -38);
        ctx.lineTo(0, -115);
        ctx.stroke();
        ctx.setLineDash([]);

        // Forward aim point reticle
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(0, -115, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Crosshair tick marks
        ctx.beginPath();
        ctx.moveTo(-6, -115);
        ctx.lineTo(-2, -115);
        ctx.moveTo(2, -115);
        ctx.lineTo(6, -115);
        ctx.moveTo(0, -121);
        ctx.lineTo(0, -117);
        ctx.moveTo(0, -113);
        ctx.lineTo(0, -109);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 5. Emergency Siren Beacon
    if (heli.sirenActive) {
      const flash = Math.floor(Date.now() / 150) % 2 === 0;
      ctx.fillStyle = flash ? '#ef4444' : '#3b82f6';
      ctx.beginPath();
      ctx.arc(0, 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Main Rotor Hub & Spinning Blades
    ctx.save();
    ctx.rotate(heli.rotorAngle);

    // Hub
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Rotor Blades
    const bladeLen = 38;
    const numBlades = model.rotorBladeCount || 2;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.5;

    for (let b = 0; b < numBlades; b++) {
      const angle = (b * (Math.PI * 2)) / numBlades;
      ctx.save();
      ctx.rotate(angle);

      // Blade spar
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -bladeLen);
      ctx.stroke();

      // Blade yellow tip
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-1.5, -bladeLen, 3, 5);

      ctx.restore();
    }

    // Motion blur rotor disc ring at high RPM
    if (heli.rotorRpm > 40) {
      ctx.strokeStyle = `rgba(226, 232, 240, ${(heli.rotorRpm / 100) * 0.22})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, bladeLen, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore();
  }

  private renderSearchlightBeam(ctx: CanvasRenderingContext2D, heli: HelicopterState) {
    ctx.save();
    ctx.translate(heli.x, heli.y);
    ctx.rotate(heli.heading);

    const length = 260;
    const beamAngle = 0.45;

    const grad = ctx.createRadialGradient(0, -10, 5, 0, -length * 0.8, length);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.7)');
    grad.addColorStop(0.7, 'rgba(254, 240, 138, 0.25)');
    grad.addColorStop(1, 'rgba(254, 240, 138, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(-Math.sin(beamAngle) * length, -Math.cos(beamAngle) * length);
    ctx.lineTo(Math.sin(beamAngle) * length, -Math.cos(beamAngle) * length);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private renderAtmosphere(
    ctx: CanvasRenderingContext2D,
    cw: number,
    ch: number,
    weather: WeatherState,
    heli: HelicopterState,
    dt: number
  ) {
    // Night overlay darkness
    if (weather.ambientLight < 0.95) {
      const darkness = 1 - weather.ambientLight;
      ctx.fillStyle = `rgba(3, 7, 18, ${darkness * 0.75})`;
      ctx.fillRect(0, 0, cw, ch);
    }

    // Fog overlay
    if (weather.visibility < 0.85) {
      const fogDensity = (1 - weather.visibility) * 0.65;
      ctx.fillStyle = `rgba(203, 213, 225, ${fogDensity})`;
      ctx.fillRect(0, 0, cw, ch);
    }

    // Rain drops in screen space
    if (weather.rainIntensity > 0.05) {
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      this.rainDrops.forEach((drop) => {
        drop.y += drop.speed * weather.rainIntensity * dt;
        drop.x += weather.windSpeed * 3 * dt;
        if (drop.y > ch) drop.y = -20;
        if (drop.x > cw) drop.x = 0;
        if (drop.x < 0) drop.x = cw;

        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + weather.windSpeed * 0.08, drop.y + drop.length);
      });
      ctx.stroke();
    }

    // Lightning Flash
    if (weather.lightning > 0.1) {
      ctx.fillStyle = `rgba(255, 255, 255, ${weather.lightning * 0.6})`;
      ctx.fillRect(0, 0, cw, ch);
    }

    // FLIR Thermal Camera Mode
    if (heli.flirActive) {
      ctx.fillStyle = 'rgba(6, 182, 212, 0.25)';
      ctx.fillRect(0, 0, cw, ch);
      // Thermal scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < ch; y += 4) {
        ctx.fillRect(0, y, cw, 1);
      }
    }
  }

  /**
   * Preemptive Forward Obstacle Warning Radar Beam (EGPWS / TAWS projection)
   */
  private renderObstacleRadarBeam(ctx: CanvasRenderingContext2D, heli: HelicopterState, alert: ObstacleAlert) {
    if (heli.isLanded) return;
    const speed = Math.hypot(heli.vx, heli.vy);
    const dirX = speed > 12 ? heli.vx / speed : Math.sin(heli.heading);
    const dirY = speed > 12 ? heli.vy / speed : -Math.cos(heli.heading);
    const flightAngle = Math.atan2(dirY, dirX);

    ctx.save();
    ctx.translate(heli.x, heli.y);
    ctx.rotate(flightAngle);

    const isWarning = alert.severity === 'warning';
    const beamLen = Math.min(320, alert.distance + 40);
    const beamColor = isWarning ? 'rgba(239, 68, 68, 0.24)' : 'rgba(245, 158, 11, 0.16)';
    const strokeColor = isWarning ? 'rgba(239, 68, 68, 0.8)' : 'rgba(245, 158, 11, 0.65)';

    // Projected flight radar path corridor
    ctx.fillStyle = beamColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(beamLen, -24);
    ctx.lineTo(beamLen, 24);
    ctx.lineTo(0, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Radar distance tick marks
    ctx.strokeStyle = strokeColor;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(beamLen * 0.5, -18);
    ctx.lineTo(beamLen * 0.5, 18);
    ctx.moveTo(beamLen, -24);
    ctx.lineTo(beamLen, 24);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  /**
   * Directional Mission Waypoint Arrow orbiting close to the helicopter
   */
  private renderMissionArrow(ctx: CanvasRenderingContext2D, heli: HelicopterState, mission: Mission) {
    const dx = mission.x - heli.x;
    const dy = mission.y - heli.y;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    ctx.save();
    ctx.translate(heli.x, heli.y);

    const orbitRadius = 46 + Math.min(14, (heli.z / 600) * 14);
    const arrowX = Math.cos(angle) * orbitRadius;
    const arrowY = Math.sin(angle) * orbitRadius;

    ctx.save();
    ctx.translate(arrowX, arrowY);
    ctx.rotate(angle);

    // Color based on mission type
    const missionColor =
      mission.type === 'brush_fire' || mission.type === 'highrise_fire'
        ? '#f97316' // Vibrant Flame Orange
        : mission.type === 'water_rescue'
        ? '#38bdf8' // Sky Blue
        : mission.type === 'riot_control' || mission.type === 'suspect_pursuit'
        ? '#ef4444' // Police Red
        : '#10b981'; // Emerald Green (VIP / Hospital)

    // Pulsing halo glow
    const pulse = (Math.sin(Date.now() * 0.008) + 1) * 0.5;
    ctx.fillStyle = missionColor;
    ctx.shadowColor = missionColor;
    ctx.shadowBlur = 8 + pulse * 6;

    // Sleek aerodynamic chevron arrow pointing at the objective
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -7);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Distance label floating beside the arrow
    ctx.shadowBlur = 0;
    const distText = dist < 250 ? `${Math.round(dist * 3.28)} FT` : `${(dist / 300).toFixed(1)} MI`;
    const labelX = Math.cos(angle) * (orbitRadius + 22);
    const labelY = Math.sin(angle) * (orbitRadius + 22);

    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Label pill background
    const metrics = ctx.measureText(distText);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.strokeStyle = missionColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(labelX - metrics.width / 2 - 4, labelY - 7, metrics.width + 8, 14, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(distText, labelX, labelY);

    ctx.restore();
  }

  /**
   * 4. AIRPORT RUNWAYS, TAXIWAYS, MARKINGS & PARKED AIRCRAFT
   */
  private renderAirportAndPlanes(
    ctx: CanvasRenderingContext2D,
    city: CityData,
    weather: WeatherState,
    left: number,
    right: number,
    top: number,
    bottom: number
  ) {
    if (!city.airportRunways) return;
    const isDark = weather.ambientLight < 0.65 || weather.type === 'night';

    // 1. Runways & Markings
    city.airportRunways.forEach((rw) => {
      const dx = rw.x2 - rw.x1;
      const dy = rw.y2 - rw.y1;
      const len = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      // Cull if out of viewport
      const minX = Math.min(rw.x1, rw.x2) - 100;
      const maxX = Math.max(rw.x1, rw.x2) + 100;
      const minY = Math.min(rw.y1, rw.y2) - 100;
      const maxY = Math.max(rw.y1, rw.y2) + 100;
      if (maxX < left || minX > right || maxY < top || minY > bottom) return;

      ctx.save();
      ctx.translate(rw.x1, rw.y1);
      ctx.rotate(angle);

      // Heavy Asphalt Runway Base & Shoulders
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, -rw.width / 2 - 8, len, rw.width + 16);

      // Main Runway Tarmac
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, -rw.width / 2, len, rw.width);

      // White Runway Edge Fog Lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, -rw.width / 2 + 2);
      ctx.lineTo(len, -rw.width / 2 + 2);
      ctx.moveTo(0, rw.width / 2 - 2);
      ctx.lineTo(len, rw.width / 2 - 2);
      ctx.stroke();

      // Dashed Centerline Stripes
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.setLineDash([28, 20]);
      ctx.beginPath();
      ctx.moveTo(70, 0);
      ctx.lineTo(len - 70, 0);
      ctx.stroke();
      ctx.setLineDash([]);

      // Piano Keys (Threshold Bars) at Start & End
      ctx.fillStyle = '#ffffff';
      const numBars = 8;
      const barW = 32;
      const barH = 3;
      const gap = (rw.width - 20) / numBars;

      for (let i = 0; i < numBars; i++) {
        const yOff = -rw.width / 2 + 10 + i * gap;
        // Start threshold
        ctx.fillRect(15, yOff, barW, barH);
        // End threshold
        ctx.fillRect(len - 15 - barW, yOff, barW, barH);
      }

      // Runway Designation Numbers
      ctx.font = 'bold 20px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const labels = rw.headingLabel.split('/');
      const startNum = labels[0] ? labels[0].trim() : '09';
      const endNum = labels[1] ? labels[1].trim() : '27';

      ctx.save();
      ctx.translate(62, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillText(startNum, 0, 0);
      ctx.restore();

      ctx.save();
      ctx.translate(len - 62, 0);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(endNum, 0, 0);
      ctx.restore();

      // Touchdown Zone Aiming Point Markings
      ctx.fillRect(len * 0.25 - 20, -rw.width / 4 - 4, 40, 8);
      ctx.fillRect(len * 0.25 - 20, rw.width / 4 - 4, 40, 8);
      ctx.fillRect(len * 0.75 - 20, -rw.width / 4 - 4, 40, 8);
      ctx.fillRect(len * 0.75 - 20, rw.width / 4 - 4, 40, 8);

      // Runway Edge Lights along both margins
      for (let lx = 10; lx < len; lx += 80) {
        ctx.fillStyle = isDark ? '#f8fafc' : '#94a3b8';
        ctx.beginPath();
        ctx.arc(lx, -rw.width / 2 - 4, 2.5, 0, Math.PI * 2);
        ctx.arc(lx, rw.width / 2 + 4, 2.5, 0, Math.PI * 2);
        ctx.fill();

        if (isDark) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(lx, -rw.width / 2 - 4, 6, 0, Math.PI * 2);
          ctx.arc(lx, rw.width / 2 + 4, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    });

    // 2. Parked Aircraft on Tarmac & Apron
    if (city.parkedPlanes) {
      city.parkedPlanes.forEach((plane) => {
        if (plane.x < left - 100 || plane.x > right + 100 || plane.y < top - 100 || plane.y > bottom + 100) return;

        ctx.save();
        ctx.translate(plane.x, plane.y);
        ctx.rotate(plane.heading);

        const span = plane.wingspan;
        const len = plane.length;

        // Ground shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(3, 3, span / 2, len / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wings
        ctx.fillStyle = '#cbd5e1';
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -len * 0.15);
        ctx.lineTo(-span / 2, len * 0.18);
        ctx.lineTo(-span / 2 + 8, len * 0.22);
        ctx.lineTo(0, len * 0.08);
        ctx.lineTo(span / 2 - 8, len * 0.22);
        ctx.lineTo(span / 2, len * 0.18);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Jet Engines under wings
        ctx.fillStyle = '#475569';
        const engineOff = span * 0.25;
        ctx.fillRect(-engineOff - 3, -len * 0.02, 6, 15);
        ctx.fillRect(engineOff - 3, -len * 0.02, 6, 15);
        if (plane.type === 'cargo') {
          // Extra outer engines
          const eng2 = span * 0.38;
          ctx.fillRect(-eng2 - 3, 0, 6, 14);
          ctx.fillRect(eng2 - 3, 0, 6, 14);
        }

        // Horizontal Stabilizers (Tail Wings)
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(0, len * 0.38);
        ctx.lineTo(-span * 0.22, len * 0.48);
        ctx.lineTo(-span * 0.22 + 4, len * 0.5);
        ctx.lineTo(0, len * 0.45);
        ctx.lineTo(span * 0.22 - 4, len * 0.5);
        ctx.lineTo(span * 0.22, len * 0.48);
        ctx.closePath();
        ctx.fill();

        // Fuselage Body
        ctx.fillStyle = plane.color || '#ffffff';
        ctx.beginPath();
        ctx.ellipse(0, 0, span * 0.11, len * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Cockpit Glass
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.ellipse(0, -len * 0.42, span * 0.08, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Vertical Tail Fin
        ctx.fillStyle = plane.color === '#f8fafc' ? '#0284c7' : '#ef4444';
        ctx.fillRect(-2, len * 0.28, 4, len * 0.18);

        // Wingtip Navigation Lights
        ctx.fillStyle = '#ef4444'; // Red on port (left)
        ctx.beginPath();
        ctx.arc(-span / 2, len * 0.18, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#22c55e'; // Green on starboard (right)
        ctx.beginPath();
        ctx.arc(span / 2, len * 0.18, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });
    }
  }

  /**
   * 5. RAILROAD TRACKS, BALLAST GRAVEL & TRAIN STATIONS
   */
  private renderRailroadsAndStations(
    ctx: CanvasRenderingContext2D,
    city: CityData,
    left: number,
    right: number,
    top: number,
    bottom: number
  ) {
    if (!city.railroadTracks || !city.railroadTracks[0]) return;
    const track = city.railroadTracks[0];
    const points = track.points;
    if (!points || points.length < 2) return;

    // 1. Draw Gravel Ballast Bed
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 22;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // 2. Draw Wooden Crossties / Sleepers
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3.5;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const perpX = -Math.sin(angle) * 9;
      const perpY = Math.cos(angle) * 9;

      const steps = Math.floor(dist / 14);
      for (let s = 0; s <= steps; s++) {
        const ratio = s / Math.max(1, steps);
        const tx = p1.x + dx * ratio;
        const ty = p1.y + dy * ratio;

        if (tx < left - 20 || tx > right + 20 || ty < top - 20 || ty > bottom + 20) continue;

        ctx.beginPath();
        ctx.moveTo(tx - perpX, ty - perpY);
        ctx.lineTo(tx + perpX, ty + perpY);
        ctx.stroke();
      }
    }

    // 3. Twin Parallel Steel Rails
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const angle = Math.atan2(dy, dx);
      const perpX = -Math.sin(angle) * 4.5;
      const perpY = Math.cos(angle) * 4.5;

      ctx.moveTo(p1.x + perpX, p1.y + perpY);
      ctx.lineTo(p2.x + perpX, p2.y + perpY);
      ctx.moveTo(p1.x - perpX, p1.y - perpY);
      ctx.lineTo(p2.x - perpX, p2.y - perpY);
    }
    ctx.stroke();

    // 4. Train Stations along the loop
    if (city.trainStations) {
      city.trainStations.forEach((st) => {
        if (st.x + st.width < left || st.x > right || st.y + st.height < top || st.y > bottom) return;

        // Platform slab
        ctx.fillStyle = '#475569';
        ctx.fillRect(st.x, st.y, st.width, st.height);

        // Tactile yellow safety stripe on platform edge
        ctx.fillStyle = '#facc15';
        ctx.fillRect(st.x, st.y + st.height - 4, st.width, 4);

        // Modern Glass/Steel Canopy Roof
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(st.x + 20, st.y - 12, st.width - 40, 24);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(st.x + 20, st.y - 12, st.width - 40, 24);

        // Station Illuminated Sign
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(st.x + st.width / 2 - 50, st.y - 18, 100, 10);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(st.name.toUpperCase(), st.x + st.width / 2, st.y - 13);
      });
    }
  }

  /**
   * 6. ANIMATED COMMUTER TRAIN
   */
  private renderTrain(
    ctx: CanvasRenderingContext2D,
    city: CityData,
    weather: WeatherState,
    left: number,
    right: number,
    top: number,
    bottom: number
  ) {
    if (!city.trains || city.trains.length === 0) return;
    const isDark = weather.ambientLight < 0.65 || weather.type === 'night';

    city.trains.forEach((train) => {
      train.cars.forEach((car, idx) => {
        if (car.x < left - 60 || car.x > right + 60 || car.y < top - 60 || car.y > bottom + 60) return;

        ctx.save();
        ctx.translate(car.x, car.y);
        ctx.rotate(car.heading);

        const isLocomotive = idx === 0;
        const carLen = isLocomotive ? 42 : 36;
        const carWidth = 13;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(-carLen / 2 + 2, -carWidth / 2 + 2, carLen, carWidth);

        if (isLocomotive) {
          // --- DIESEL-ELECTRIC STREAMLINER LOCOMOTIVE ---
          // Navy blue and silver livery
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-carLen / 2, -carWidth / 2, carLen, carWidth);

          // Aerodynamic tapered nose
          ctx.fillStyle = '#0369a1';
          ctx.beginPath();
          ctx.moveTo(carLen / 2 - 8, -carWidth / 2);
          ctx.lineTo(carLen / 2, 0);
          ctx.lineTo(carLen / 2 - 8, carWidth / 2);
          ctx.closePath();
          ctx.fill();

          // Safety yellow tiger stripes on nose
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(carLen / 2 - 6, -carWidth / 2 + 2);
          ctx.lineTo(carLen / 2 - 1, 0);
          ctx.lineTo(carLen / 2 - 6, carWidth / 2 - 2);
          ctx.stroke();

          // Cockpit windshield
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(carLen / 2 - 12, -carWidth / 2 + 2, 3, carWidth - 4);

          // Roof exhaust vents & radiator fans
          ctx.fillStyle = '#475569';
          ctx.fillRect(-carLen / 2 + 8, -3, 14, 6);

          // Front Headlight Beam projecting along track
          ctx.save();
          const lightLen = isDark ? 140 : 80;
          const lightGrad = ctx.createRadialGradient(carLen / 2, 0, 2, carLen / 2 + lightLen * 0.8, 0, lightLen);
          lightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
          lightGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.35)');
          lightGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
          ctx.fillStyle = lightGrad;
          ctx.beginPath();
          ctx.moveTo(carLen / 2, 0);
          ctx.lineTo(carLen / 2 + lightLen, -24);
          ctx.lineTo(carLen / 2 + lightLen, 24);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else {
          // --- PASSENGER COACH CARS ---
          // Stainless steel commuter coach
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(-carLen / 2, -carWidth / 2, carLen, carWidth);
          ctx.strokeStyle = '#475569';
          ctx.lineWidth = 1;
          ctx.strokeRect(-carLen / 2, -carWidth / 2, carLen, carWidth);

          // Blue center transit stripe
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(-carLen / 2, -1.5, carLen, 3);

          // Illuminated passenger windows
          ctx.fillStyle = isDark ? '#fef08a' : '#1e293b';
          for (let wx = -carLen / 2 + 4; wx < carLen / 2 - 4; wx += 6) {
            ctx.fillRect(wx, -carWidth / 2 + 1, 3.5, 2);
            ctx.fillRect(wx, carWidth / 2 - 3, 3.5, 2);
          }

          // Articulated Coupler between cars
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(-carLen / 2 - 4, -2, 4, 4);
        }

        ctx.restore();
      });
    });
  }

  /**
   * 7. ROUNDABOUTS WITH CENTRAL MONUMENTS & FOUNTAINS
   */
  private renderRoundabouts(ctx: CanvasRenderingContext2D, city: CityData) {
    if (!city.roundabouts) return;

    city.roundabouts.forEach((rb) => {
      // 1. Outer Roadway Ring
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(rb.x, rb.y, rb.radius, 0, Math.PI * 2);
      ctx.fill();

      // Outer Granite Curb
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Dashed lane circle
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.arc(rb.x, rb.y, (rb.radius + rb.innerRadius) / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Directional circular traffic arrows
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 2) {
        const midR = (rb.radius + rb.innerRadius) / 2;
        const ax = rb.x + Math.cos(a) * midR;
        const ay = rb.y + Math.sin(a) * midR;
        ctx.save();
        ctx.translate(ax, ay);
        ctx.rotate(a + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-4, -4);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-4, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 2. Central Island
      ctx.fillStyle = rb.id.includes('airport') ? '#0284c7' : '#15803d';
      ctx.beginPath();
      ctx.arc(rb.x, rb.y, rb.innerRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.stroke();

      // 3. Monument in Center
      if (rb.id === 'rb-civic') {
        // Civic Victory Monument (Stepped marble base + golden obelisk)
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(rb.x - 14, rb.y - 14, 28, 28);
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(rb.x, rb.y, 8, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Airport Grand Fountain (Tiered basin with blue water & animated jets)
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(rb.x, rb.y, rb.innerRadius * 0.65, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(rb.x, rb.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  /**
   * 8. TRAFFIC LIGHTS, PEDESTRIAN CROSSWALKS & BUS STOPS
   */
  private renderTrafficLightsAndCrosswalks(ctx: CanvasRenderingContext2D, city: CityData, weather: WeatherState) {
    const isDark = weather.ambientLight < 0.65 || weather.type === 'night';

    // 1. Crosswalks (White Zebra Stripes across intersection approaches)
    if (city.trafficLights) {
      city.trafficLights.forEach((tl) => {
        const span = 22;
        const width = 28;

        // North-South zebra stripes
        ctx.fillStyle = '#ffffff';
        for (let i = -width / 2; i <= width / 2; i += 6) {
          ctx.fillRect(tl.x + i, tl.y - span - 10, 3.5, 8);
          ctx.fillRect(tl.x + i, tl.y + span + 2, 3.5, 8);
        }
        // East-West zebra stripes
        for (let i = -width / 2; i <= width / 2; i += 6) {
          ctx.fillRect(tl.x - span - 10, tl.y + i, 8, 3.5);
          ctx.fillRect(tl.x + span + 2, tl.y + i, 8, 3.5);
        }
      });
    }

    // 2. Bus Stops along roads
    city.roads.forEach((road) => {
      if (road.hasBusStop && road.busStopX && road.busStopY) {
        // Yellow bus bay road marking
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(road.busStopX - 16, road.busStopY - 6, 32, 12);

        // Modern Glass Passenger Shelter
        ctx.fillStyle = '#334155';
        ctx.fillRect(road.busStopX - 12, road.busStopY - 14, 24, 7);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.fillRect(road.busStopX - 10, road.busStopY - 12, 20, 4);

        // Transit icon dot
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(road.busStopX + 16, road.busStopY - 10, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // 3. Traffic Light Gantries & Signals
    if (city.trafficLights) {
      city.trafficLights.forEach((tl) => {
        // Mast arm pole
        ctx.fillStyle = '#475569';
        ctx.fillRect(tl.x - 2, tl.y - 2, 4, 4);

        // Signal Heads for NS and EW
        const isNsGreen = tl.state === 'green_ns';
        const isNsYellow = tl.state === 'yellow_ns';
        const isEwGreen = tl.state === 'green_ew';
        const isEwYellow = tl.state === 'yellow_ew';

        // North-South Signal Light
        const nsColor = isNsGreen ? '#22c55e' : isNsYellow ? '#f59e0b' : '#ef4444';
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(tl.x - 4, tl.y - 18, 8, 12);
        ctx.fillStyle = nsColor;
        ctx.beginPath();
        ctx.arc(tl.x, tl.y - 12, 3, 0, Math.PI * 2);
        ctx.fill();

        // East-West Signal Light
        const ewColor = isEwGreen ? '#22c55e' : isEwYellow ? '#f59e0b' : '#ef4444';
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(tl.x + 6, tl.y - 4, 12, 8);
        ctx.fillStyle = ewColor;
        ctx.beginPath();
        ctx.arc(tl.x + 12, tl.y, 3, 0, Math.PI * 2);
        ctx.fill();

        if (isDark) {
          ctx.fillStyle = nsColor === '#22c55e' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
          ctx.beginPath();
          ctx.arc(tl.x, tl.y - 12, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }

  /**
   * 9. MILITARY BASE (FORT SENTINEL) & RESTRICTED NO-FLY AIRSPACE
   */
  private renderMilitaryBaseAndNoFlyZone(ctx: CanvasRenderingContext2D, city: CityData, heli: HelicopterState) {
    // 1. Fort Sentinel Base Perimeter Fence
    ctx.save();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(980, 6750, 480, 520);

    // Watchtowers at corners
    const towers = [
      { x: 980, y: 6750 },
      { x: 1460, y: 6750 },
      { x: 980, y: 7270 },
      { x: 1460, y: 7270 },
    ];
    towers.forEach((t) => {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(t.x - 8, t.y - 8, 16, 16);
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Rotating Radar Dish
    const radarAngle = Date.now() * 0.002;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(1380, 6860, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(1380, 6860);
    ctx.lineTo(1380 + Math.cos(radarAngle) * 18, 6860 + Math.sin(radarAngle) * 18);
    ctx.stroke();

    // 2. Prohibited Airspace (No-Fly Zone) Cylindrical Boundary
    if (city.noFlyZones) {
      city.noFlyZones.forEach((nfz) => {
        const distToHeli = Math.hypot(heli.x - nfz.x, heli.y - nfz.y);
        const isInside = distToHeli <= nfz.radius && heli.z <= nfz.ceilingAltitude;
        const pulse = (Math.sin(Date.now() * 0.006) + 1) * 0.5;

        // Semi-transparent red protective dome
        ctx.fillStyle = isInside ? `rgba(239, 68, 68, ${0.14 + pulse * 0.08})` : 'rgba(239, 68, 68, 0.06)';
        ctx.beginPath();
        ctx.arc(nfz.x, nfz.y, nfz.radius, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing red border ring
        ctx.strokeStyle = isInside ? '#ef4444' : `rgba(239, 68, 68, ${0.45 + pulse * 0.35})`;
        ctx.lineWidth = isInside ? 3.5 : 2;
        ctx.setLineDash([16, 12]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Overhead Warning Badge
        ctx.fillStyle = isInside ? 'rgba(185, 28, 28, 0.95)' : 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(nfz.x - 140, nfz.y - nfz.radius - 16, 280, 24);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(nfz.x - 140, nfz.y - nfz.radius - 16, 280, 24);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚠ PROHIBITED AIRSPACE R-4402 - NO FLY ZONE', nfz.x, nfz.y - nfz.radius - 4);
      });
    }

    ctx.restore();
  }

  /**
   * 11. STREET LIGHT POLES & NOCTURNAL AMBER LIGHT POOLS
   */
  private renderStreetLights(
    ctx: CanvasRenderingContext2D,
    city: CityData,
    weather: WeatherState,
    left: number,
    right: number,
    top: number,
    bottom: number
  ) {
    if (!city.streetLights) return;
    const isDark = weather.ambientLight < 0.65 || weather.type === 'night';

    city.streetLights.forEach((sl) => {
      if (sl.x < left - 40 || sl.x > right + 40 || sl.y < top - 40 || sl.y > bottom + 40) return;

      // Lamppost pole
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(sl.x, sl.y, 2, 0, Math.PI * 2);
      ctx.fill();

      // At night / dark: cast soft circular warm amber pool of light onto tarmac
      if (isDark) {
        const poolRadius = 42;
        const grad = ctx.createRadialGradient(sl.x, sl.y, 2, sl.x, sl.y, poolRadius);
        grad.addColorStop(0, 'rgba(254, 240, 138, 0.32)');
        grad.addColorStop(0.5, 'rgba(254, 240, 138, 0.12)');
        grad.addColorStop(1, 'rgba(254, 240, 138, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sl.x, sl.y, poolRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  /**
   * 15 & 22. DRIFTING CLOUDS (Shadows on ground + Atmospheric cloud puffs in sky)
   */
  private renderDriftingClouds(
    ctx: CanvasRenderingContext2D,
    city: CityData,
    weather: WeatherState,
    left: number,
    right: number,
    top: number,
    bottom: number,
    shadowsOnly: boolean
  ) {
    if (!city.driftingClouds) return;

    city.driftingClouds.forEach((cloud) => {
      // Offset shadows slightly to simulate sunlight
      const cx = shadowsOnly ? cloud.x + 45 : cloud.x;
      const cy = shadowsOnly ? cloud.y + 45 : cloud.y;

      if (cx + cloud.radius < left - 100 || cx - cloud.radius > right + 100 || cy + cloud.radius < top - 100 || cy - cloud.radius > bottom + 100) return;

      ctx.save();
      cloud.puffs.forEach((puff) => {
        const px = cx + puff.ox;
        const py = cy + puff.oy;

        if (shadowsOnly) {
          // Soft ground shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
          ctx.beginPath();
          ctx.arc(px, py, puff.r, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Atmospheric white/gray cloud puff drifting overhead
          const grad = ctx.createRadialGradient(px, py, 4, px, py, puff.r);
          grad.addColorStop(0, `rgba(255, 255, 255, ${cloud.opacity * 0.65})`);
          grad.addColorStop(0.6, `rgba(241, 245, 249, ${cloud.opacity * 0.45})`);
          grad.addColorStop(1, 'rgba(241, 245, 249, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, puff.r, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.restore();
    });
  }
}
