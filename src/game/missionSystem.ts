/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CityData, FireNode, Mission, MissionType, Pedestrian } from '../types/game';

export class MissionSystem {
  public activeMission: Mission | null = null;
  public availableMissions: Mission[] = [];
  public completedMissionsCount = 0;
  private missionCounter = 101;

  public generateMission(city: CityData): Mission {
    const types: MissionType[] = [
      'highrise_fire',
      'water_rescue',
      'highway_pileup',
      'riot_control',
      'suspect_pursuit',
      'vip_transport',
      'brush_fire',
      'traffic_jam',
      'roadside_ambulance',
      'air_taxi',
      'car_crash',
    ];

    const type = types[Math.floor(Math.random() * types.length)];
    const code = `10-${Math.floor(40 + Math.random() * 59)}`;
    const id = `mission-${this.missionCounter++}`;

    switch (type) {
      case 'highrise_fire': {
        // Pick a tall skyscraper
        const tallBuildings = city.buildings.filter((b) => b.type === 'skyscraper' && b.roofHeight >= 180);
        const targetB = tallBuildings[Math.floor(Math.random() * tallBuildings.length)] || city.buildings[0];
        const tx = targetB.x + targetB.width / 2;
        const ty = targetB.y + targetB.height / 2;

        // Spawn fire nodes on roof
        const fires: FireNode[] = [];
        for (let i = 0; i < 3; i++) {
          const fid = `fire-${id}-${i}`;
          fires.push({
            id: fid,
            x: tx + (Math.random() - 0.5) * 30,
            y: ty + (Math.random() - 0.5) * 30,
            altitude: targetB.roofHeight,
            intensity: 80,
            spreadRate: 0.2,
            maxRadius: 36,
            radius: 20,
            smokeParticles: 12,
          });
          city.fires.push(fires[fires.length - 1]);
        }

        // Spawn 2 trapped victims on roof
        const victims: Pedestrian[] = [];
        for (let i = 0; i < 2; i++) {
          const vid = `victim-${id}-${i}`;
          const victim: Pedestrian = {
            id: vid,
            x: tx + (Math.random() - 0.5) * 20,
            y: ty + (Math.random() - 0.5) * 20,
            vx: 0,
            vy: 0,
            state: 'stranded',
            role: 'patient',
            health: 80,
            speechBubble: 'HELP! WE ARE TRAPPED!',
          };
          victims.push(victim);
          city.pedestrians.push(victim);
        }

        return {
          id,
          title: 'High-Rise Tower Inferno',
          code,
          type,
          description: `Massive 3-alarm fire raging atop ${targetB.name || 'Financial Tower'}. Multiple workers trapped on roof! Scoop water from river to douse flames, hoist victims, and medevac to General Hospital ER.`,
          briefingAudioText: `Dispatch to Air Unit 1: 3-alarm structure fire at Financial District. Trapped occupants on rooftop. Immediate water drops and extraction required.`,
          urgency: 'critical',
          x: tx,
          y: ty,
          rewardCash: 4500,
          rewardReputation: 350,
          timeLimit: 240,
          timeRemaining: 240,
          state: 'available',
          targetsRemaining: 5, // 3 fires + 2 rescues
          targetsTotal: 5,
          associatedFires: fires.map((f) => f.id),
          associatedVictims: victims.map((v) => v.id),
        };
      }

      case 'water_rescue': {
        const river = city.waterBodies[0];
        const tx = river.x + river.width / 2 + (Math.random() - 0.5) * 100;
        const ty = 800 + Math.random() * (city.height - 1600);

        const victims: Pedestrian[] = [];
        for (let i = 0; i < 2; i++) {
          const vid = `swimmer-${id}-${i}`;
          const v: Pedestrian = {
            id: vid,
            x: tx + (Math.random() - 0.5) * 40,
            y: ty + (Math.random() - 0.5) * 40,
            vx: 0,
            vy: 12, // drifting downriver
            state: 'drowning',
            role: 'patient',
            health: 70,
            speechBubble: 'MAYDAY! CAPSIGHT VESSEL!',
          };
          victims.push(v);
          city.pedestrians.push(v);
        }

        return {
          id,
          title: 'Capsized Vessel & Drowning Swimmers',
          code,
          type,
          description: `Recreational speedboat capsized in Metro River. Two hypothermic victims drifting rapidly downstream. Deploy rescue hoist in turbulent water and rush victims to Metro Hospital.`,
          briefingAudioText: `Coast Guard alert: Boater in distress near river channel. Deploy rescue hoist harness and transport survivors to Hospital trauma deck.`,
          urgency: 'urgent',
          x: tx,
          y: ty,
          rewardCash: 3600,
          rewardReputation: 280,
          timeLimit: 180,
          timeRemaining: 180,
          state: 'available',
          targetsRemaining: 2,
          targetsTotal: 2,
          associatedVictims: victims.map((v) => v.id),
        };
      }

      case 'highway_pileup': {
        const road = city.roads[Math.floor(Math.random() * city.roads.length)];
        const tx = (road.x1 + road.x2) / 2;
        const ty = (road.y1 + road.y2) / 2;

        const victim: Pedestrian = {
          id: `pileup-patient-${id}`,
          x: tx + 10,
          y: ty,
          vx: 0,
          vy: 0,
          state: 'injured',
          role: 'patient',
          health: 60,
          speechBubble: 'Need paramedic!',
        };
        city.pedestrians.push(victim);

        return {
          id,
          title: 'Major Interstate Gridlock & Pileup',
          code,
          type,
          description: `Multi-car collision on arterial avenue. Ground ambulances blocked by severe traffic gridlock. Sound megaphone to order vehicles aside, touch down on asphalt, and medevac critical casualty.`,
          briefingAudioText: `Attention Air Patrol: Major pileup blocking expressway. Use PA siren to part traffic, land or hoist critical casualty to Metro Hospital ER.`,
          urgency: 'urgent',
          x: tx,
          y: ty,
          rewardCash: 3200,
          rewardReputation: 250,
          timeLimit: 200,
          timeRemaining: 200,
          state: 'available',
          targetsRemaining: 1,
          targetsTotal: 1,
          associatedVictims: [victim.id],
        };
      }

      case 'riot_control': {
        const plaza = city.parkZones?.find((p) => p.type === 'plaza');
        const tx = plaza ? plaza.x + plaza.width / 2 : 1600;
        const ty = plaza ? plaza.y + plaza.height / 2 : 3350;

        const rioters: Pedestrian[] = [];
        for (let i = 0; i < 5; i++) {
          const r: Pedestrian = {
            id: `rioter-${id}-${i}`,
            x: tx + (Math.random() - 0.5) * 60,
            y: ty + (Math.random() - 0.5) * 60,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            state: 'rioting',
            role: 'rioter',
            health: 100,
            speechBubble: 'WE WILL NOT MOVE!',
          };
          rioters.push(r);
          city.pedestrians.push(r);
        }

        return {
          id,
          title: 'Civil Disturbance & Plaza Riot',
          code,
          type,
          description: `Civil unrest reported at Civic Plaza. Unruly crowd blocking transit lanes. Blare PA megaphone orders to disperse and release water drops to quell unrest without harm.`,
          briefingAudioText: `Dispatch to Air Unit: 10-53 civil disturbance at Civic Plaza. Disperse the crowd using megaphone announcements and water cannon drops.`,
          urgency: 'routine',
          x: tx,
          y: ty,
          rewardCash: 2800,
          rewardReputation: 220,
          timeLimit: 210,
          timeRemaining: 210,
          state: 'available',
          targetsRemaining: 5,
          targetsTotal: 5,
          associatedVictims: rioters.map((r) => r.id),
        };
      }

      case 'vip_transport': {
        const hqPad = city.helipads.find((h) => h.type === 'hangar') || city.helipads[0];
        const targetPad = city.helipads.find((h) => h.type === 'hospital' || h.type === 'civilian') || city.helipads[1];

        return {
          id,
          title: 'Priority VIP & Dignitary Airlift',
          code,
          type,
          phase: 'pickup',
          description: `VIP Diplomatic Envoy awaiting pickup at ${hqPad.label}. Touch down to board passenger, then expedite safe transit to ${targetPad.label}. Maintain level flight envelope!`,
          briefingAudioText: `Priority VIP Transport: Land at ${hqPad.label} to board the diplomat, then fly directly to ${targetPad.label}.`,
          urgency: 'critical',
          x: hqPad.x,
          y: hqPad.y,
          targetHelipadId: targetPad.id,
          targetName: targetPad.label,
          rewardCash: 4500,
          rewardReputation: 350,
          timeLimit: 180,
          timeRemaining: 180,
          state: 'available',
          targetsRemaining: 1,
          targetsTotal: 1,
        };
      }

      case 'traffic_jam': {
        const freeway = city.roads.find((r) => r.isFreeway) || city.roads[0];
        const tx = (freeway.x1 + freeway.x2) / 2;
        const ty = freeway.y1;

        return {
          id,
          title: 'I-95 Interstate Freeway Gridlock',
          code,
          type,
          description: `Severe multi-lane traffic bottleneck paralyzed on Interstate 95 Expressway. Hover low (< 140 FT) over the gridlock, sound siren [X] and broadcast megaphone [P] instructions to restore traffic flow!`,
          briefingAudioText: `Traffic Division: Major bottleneck on I-95 Expressway. Hover overhead, use PA megaphone to guide vehicles and clear the jam.`,
          urgency: 'urgent',
          x: tx,
          y: ty,
          rewardCash: 3100,
          rewardReputation: 260,
          timeLimit: 160,
          timeRemaining: 160,
          state: 'available',
          targetsRemaining: 1,
          targetsTotal: 1,
        };
      }

      case 'roadside_ambulance': {
        // Roadside medical emergency requiring landing on or right beside a roadway
        const road = city.roads.find((r) => !r.isFreeway) || city.roads[1];
        const tx = (road.x1 + road.x2) / 2 + 30;
        const ty = road.y1 + 18;

        const victim: Pedestrian = {
          id: `roadside-pt-${id}`,
          x: tx,
          y: ty,
          vx: 0,
          vy: 0,
          state: 'injured',
          role: 'patient',
          health: 55,
          speechBubble: 'Critically injured! Land on asphalt!',
        };
        city.pedestrians.push(victim);

        const hospitalPad = city.helipads.find((h) => h.type === 'hospital') || city.helipads[0];

        return {
          id,
          title: 'Roadside Flying Ambulance Medevac',
          code,
          type,
          phase: 'pickup',
          description: `Urgent pedestrian hit-and-run on avenue shoulder. Ground ambulances cannot reach scene in time. Touch down directly on the asphalt roadway beside the patient to load stretcher, then rush to Metro Hospital trauma deck!`,
          briefingAudioText: `Air Ambulance Dispatch: Critical casualty on avenue shoulder. Land carefully on the road or use hoist, then transport to Metro Hospital ER immediately.`,
          urgency: 'critical',
          x: tx,
          y: ty,
          targetHelipadId: hospitalPad.id,
          targetName: hospitalPad.label,
          rewardCash: 4200,
          rewardReputation: 340,
          timeLimit: 190,
          timeRemaining: 190,
          state: 'available',
          targetsRemaining: 1,
          targetsTotal: 1,
          associatedVictims: [victim.id],
        };
      }

      case 'air_taxi': {
        const hotelPad = city.helipads.find((h) => h.id.includes('hotel') || h.type === 'civilian') || city.helipads[1];
        const targetPad = city.helipads.find((h) => h.type === 'hangar') || city.helipads[0];

        return {
          id,
          title: 'Urban Air Taxi Executive Express',
          code,
          type,
          phase: 'pickup',
          description: `Corporate executive requested luxury helicopter charter from ${hotelPad.label} to ${targetPad.label}. Touch down smoothly to board passenger, avoid excessive G-forces during flight!`,
          briefingAudioText: `Metro Air Taxi: Corporate pickup requested at ${hotelPad.label}. Land, board client, and fly smoothly to ${targetPad.label}.`,
          urgency: 'routine',
          x: hotelPad.x,
          y: hotelPad.y,
          targetHelipadId: targetPad.id,
          targetName: targetPad.label,
          rewardCash: 3500,
          rewardReputation: 280,
          timeLimit: 170,
          timeRemaining: 170,
          state: 'available',
          targetsRemaining: 1,
          targetsTotal: 1,
        };
      }

      case 'car_crash': {
        const road = city.roads[Math.floor(Math.random() * city.roads.length)];
        const tx = (road.x1 + road.x2) / 2;
        const ty = (road.y1 + road.y2) / 2;

        // Vehicle blaze
        const carFire: FireNode = {
          id: `carfire-${id}`,
          x: tx,
          y: ty,
          altitude: 0,
          intensity: 85,
          spreadRate: 0.1,
          maxRadius: 28,
          radius: 18,
          smokeParticles: 14,
        };
        city.fires.push(carFire);

        const driver: Pedestrian = {
          id: `driver-${id}`,
          x: tx + 24,
          y: ty,
          vx: 0,
          vy: 0,
          state: 'injured',
          role: 'patient',
          health: 65,
          speechBubble: 'Vehicle on fire! Help!',
        };
        city.pedestrians.push(driver);

        return {
          id,
          title: 'High-Impact Vehicle Crash & Fire',
          code,
          type,
          description: `Severe 2-car collision with burning wreckage on roadway. Aim water cannon (Key [F]) to douse vehicle fire, touch down on road to rescue trapped motorist, and airlift to trauma center!`,
          briefingAudioText: `Emergency 911: Vehicle fire and casualty from collision. Use forward water cannon to extinguish fire, extract victim to Hospital.`,
          urgency: 'critical',
          x: tx,
          y: ty,
          rewardCash: 4800,
          rewardReputation: 380,
          timeLimit: 220,
          timeRemaining: 220,
          state: 'available',
          targetsRemaining: 2, // 1 fire + 1 rescue
          targetsTotal: 2,
          associatedFires: [carFire.id],
          associatedVictims: [driver.id],
        };
      }

      case 'brush_fire':
      default: {
        const tx = 3400 + Math.random() * 600;
        const ty = 1100 + Math.random() * 400;

        const fires: FireNode[] = [];
        for (let i = 0; i < 4; i++) {
          const fid = `brushfire-${id}-${i}`;
          fires.push({
            id: fid,
            x: tx + (Math.random() - 0.5) * 70,
            y: ty + (Math.random() - 0.5) * 70,
            altitude: 0,
            intensity: 75,
            spreadRate: 0.15,
            maxRadius: 40,
            radius: 24,
            smokeParticles: 16,
          });
          city.fires.push(fires[fires.length - 1]);
        }

        return {
          id,
          title: 'Suburban Wildfire Containment',
          code,
          type: 'brush_fire',
          description: `Wildfire outbreak threatening East Park suburban residential sector. High wind spreading embers! Refill at nearby reservoir lake and perform aerial drops to extinguish perimeter.`,
          briefingAudioText: `Wildland Fire Alert: Spreading brush fire near East Lake residences. Multiple water drops required immediately to protect homes.`,
          urgency: 'urgent',
          x: tx,
          y: ty,
          rewardCash: 3800,
          rewardReputation: 300,
          timeLimit: 220,
          timeRemaining: 220,
          state: 'available',
          targetsRemaining: 4,
          targetsTotal: 4,
          associatedFires: fires.map((f) => f.id),
        };
      }
    }
  }

  public acceptMission(mission: Mission, city?: CityData) {
    this.activeMission = mission;
    mission.state = 'active';

    // Remove from available queue so user cannot re-select an already active mission
    this.availableMissions = this.availableMissions.filter((m) => m.id !== mission.id);

    // FIX FOR WILDFIRE PRE-EXTINGUISHING BUG:
    // If the player put out fires before opening dispatch and clicking accept:
    if (city && mission.associatedFires && mission.associatedFires.length > 0) {
      const activeFires = city.fires.filter((f) => mission.associatedFires?.includes(f.id));
      if (activeFires.length === 0) {
        // Fires were already put out before accepting! Respawn fresh active blaze so the mission is playable and completable!
        const newFires: FireNode[] = [];
        for (let i = 0; i < 3; i++) {
          const fid = `fire-${mission.id}-flare-${i}`;
          const f: FireNode = {
            id: fid,
            x: mission.x + (Math.random() - 0.5) * 60,
            y: mission.y + (Math.random() - 0.5) * 60,
            altitude: mission.type === 'highrise_fire' ? 180 : 0,
            intensity: 80,
            spreadRate: 0.15,
            maxRadius: 36,
            radius: 22,
            smokeParticles: 14,
          };
          city.fires.push(f);
          newFires.push(f);
        }
        mission.associatedFires = newFires.map((f) => f.id);
        mission.targetsRemaining = newFires.length;
        mission.targetsTotal = newFires.length;
      } else {
        mission.targetsRemaining = activeFires.length;
      }
    }
  }

  public update(dt: number, onComplete: (m: Mission) => void, onFail: (m: Mission) => void) {
    if (!this.activeMission) return;

    this.activeMission.timeRemaining -= dt;
    if (this.activeMission.timeRemaining <= 0) {
      this.activeMission.state = 'failed';
      onFail(this.activeMission);
      this.activeMission = null;
      return;
    }

    if (this.activeMission.targetsRemaining <= 0) {
      this.activeMission.state = 'completed';
      this.completedMissionsCount++;
      onComplete(this.activeMission);
      this.activeMission = null;
    }
  }
}
