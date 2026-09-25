/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimePhase, WeatherState, WeatherType } from '../types/game';

export class WeatherEngine {
  public state: WeatherState;
  private weatherTimer = 0;
  private lightningTimer = 0;
  private autoCycle = true;
  private timeSpeed = 0.04; // 0.04 hours per real-time sec (10-min 24h cycle)

  constructor(initialType: WeatherType = 'clear', initialHour = 6.8) {
    this.state = this.createWeather(initialType, initialHour);
  }

  public setWeather(type: WeatherType) {
    const currentHour = this.state?.timeOfDay ?? (type === 'night' ? 22.0 : 11.5);
    const targetHour = type === 'night' && (currentHour >= 5.5 && currentHour <= 19.5) ? 22.0 : currentHour;
    this.state = this.createWeather(type, targetHour);
  }

  public setAutoCycle(enabled: boolean) {
    this.autoCycle = enabled;
  }

  public setTimeOfDay(hour: number) {
    this.state.timeOfDay = ((hour % 24) + 24) % 24;
    this.updateAtmosphereProperties(0);
  }

  public setTimeSpeed(speed: number) {
    this.timeSpeed = Math.max(0, speed);
  }

  public getTimeSpeed(): number {
    return this.timeSpeed;
  }

  public getTimeString(): string {
    const hours = Math.floor(this.state.timeOfDay);
    const mins = Math.floor((this.state.timeOfDay % 1) * 60);
    const hStr = hours.toString().padStart(2, '0');
    const mStr = mins.toString().padStart(2, '0');
    return `${hStr}:${mStr}`;
  }

  private createWeather(type: WeatherType, initialHour = 6.8): WeatherState {
    const clouds: WeatherState['clouds'] = [];
    for (let i = 0; i < 28; i++) {
      clouds.push({
        x: Math.random() * 8400,
        y: Math.random() * 8400,
        radius: 200 + Math.random() * 260,
        speed: 20 + Math.random() * 32,
        opacity: type === 'storm' ? 0.88 : type === 'fog' ? 0.78 : 0.42,
      });
    }

    const hour = type === 'night' ? 22.0 : initialHour;
    const baseState: WeatherState = {
      type,
      windSpeed: type === 'windy' ? 32 : type === 'storm' ? 38 : type === 'fog' ? 5 : 8,
      windDirection: 0.75, // NE breeze default
      windGust: type === 'storm' ? 0.9 : type === 'windy' ? 0.7 : 0.15,
      visibility: type === 'fog' ? 0.32 : type === 'storm' ? 0.45 : 1.0,
      rainIntensity: type === 'storm' ? 0.92 : type === 'fog' ? 0.15 : 0,
      ambientLight: 1.0,
      lightning: 0,
      clouds,
      timeOfDay: hour,
      timePhase: 'morning',
      sunAngle: 0,
      sunAltitude: 0.5,
      skyAtmosphere: {
        r: 255,
        g: 255,
        b: 255,
        alpha: 0,
        description: 'Daylight',
      },
    };

    this.calculateAtmosphere(baseState);
    return baseState;
  }

  private calculateAtmosphere(state: WeatherState) {
    const hour = state.timeOfDay;

    // Determine Time Phase
    let phase: TimePhase = 'noon';
    let baseAmbient = 1.0;
    let r = 255;
    let g = 255;
    let b = 255;
    let alpha = 0;
    let desc = 'Bright Daylight';

    if (hour >= 21.5 || hour < 4.5) {
      // Night: rich moonlight ambient with clear visibility of city, helicopter, and ground
      phase = 'night';
      baseAmbient = 0.42;
      r = 15;
      g = 23;
      b = 42;
      alpha = 0.28;
      desc = 'Midnight Sky';
    } else if (hour >= 4.5 && hour < 6.5) {
      // Dawn / Sunrise
      phase = 'dawn';
      const progress = (hour - 4.5) / 2.0; // 0 to 1
      baseAmbient = 0.42 + progress * 0.38; // 0.42 -> 0.80
      // Blend night dark navy into radiant morning peach/amber/rose
      r = Math.round(245 + progress * 10);
      g = Math.round(110 + progress * 40);
      b = Math.round(60 + progress * 20);
      alpha = Math.max(0.08, 0.28 - progress * 0.16);
      desc = 'Dawn Sunrise Glow';
    } else if (hour >= 6.5 && hour < 11.5) {
      // Morning
      phase = 'morning';
      const progress = (hour - 6.5) / 5.0;
      baseAmbient = 0.80 + progress * 0.18; // 0.80 -> 0.98
      r = 254;
      g = 243;
      b = 199;
      alpha = Math.max(0, 0.10 - progress * 0.10);
      desc = 'Morning Golden Light';
    } else if (hour >= 11.5 && hour < 14.5) {
      // Midday / High Noon
      phase = 'noon';
      baseAmbient = 1.0;
      r = 255;
      g = 255;
      b = 255;
      alpha = 0.0;
      desc = 'Clear Midday Sun';
    } else if (hour >= 14.5 && hour < 17.5) {
      // Afternoon
      phase = 'afternoon';
      const progress = (hour - 14.5) / 3.0;
      baseAmbient = 1.0 - progress * 0.20; // 1.0 -> 0.80
      r = 251;
      g = 191;
      b = 36;
      alpha = progress * 0.08;
      desc = 'Afternoon Amber Sun';
    } else if (hour >= 17.5 && hour < 19.5) {
      // Golden Hour & Sunset
      phase = 'sunset';
      const progress = (hour - 17.5) / 2.0;
      baseAmbient = 0.80 - progress * 0.22; // 0.80 -> 0.58
      // Fiery burnt orange to crimson magenta sunset
      r = Math.round(234 - progress * 40);
      g = Math.round(88 - progress * 30);
      b = Math.round(12 + progress * 90);
      alpha = 0.12 + progress * 0.12;
      desc = 'Sunset Golden Hour';
    } else {
      // 19.5 to 21.5: Twilight / Blue Hour
      phase = 'twilight';
      const progress = (hour - 19.5) / 2.0;
      baseAmbient = 0.58 - progress * 0.16; // 0.58 -> 0.42
      // Deep cobalt sapphire into night
      r = Math.round(35 - progress * 20);
      g = Math.round(40 - progress * 17);
      b = Math.round(95 - progress * 53);
      alpha = 0.20 + progress * 0.08;
      desc = 'Twilight Blue Hour';
    }

    // Weather impact on lighting
    let weatherAmbientFactor = 1.0;
    if (state.type === 'storm') {
      weatherAmbientFactor = 0.80;
      r = Math.round(r * 0.6 + 30);
      g = Math.round(g * 0.6 + 40);
      b = Math.round(b * 0.7 + 60);
      alpha = Math.min(0.40, alpha + 0.15);
    } else if (state.type === 'fog') {
      weatherAmbientFactor = 0.88;
      r = Math.round(r * 0.7 + 70);
      g = Math.round(g * 0.7 + 75);
      b = Math.round(b * 0.7 + 85);
      alpha = Math.min(0.30, alpha + 0.10);
    } else if (state.type === 'night') {
      baseAmbient = Math.min(baseAmbient, 0.42);
    }

    state.ambientLight = Math.max(0.35, Math.min(1.0, baseAmbient * weatherAmbientFactor));
    state.timePhase = phase;
    state.skyAtmosphere = { r, g, b, alpha, description: desc };

    // Sun altitude & directional angle
    if (hour >= 5.5 && hour <= 18.5) {
      state.sunAltitude = Math.sin(((hour - 5.5) / 13.0) * Math.PI);
    } else {
      state.sunAltitude = 0;
    }

    // Sun angle for shadows: at dawn (hour ~6) shadow points west (PI), at noon (12) points north-east (-PI/3), at sunset (18) points east (0)
    state.sunAngle = ((hour - 6.0) / 24.0) * Math.PI * 2;
  }

  private updateAtmosphereProperties(dt: number) {
    if (this.timeSpeed > 0 && dt > 0) {
      this.state.timeOfDay = (this.state.timeOfDay + this.timeSpeed * dt) % 24;
    }
    this.calculateAtmosphere(this.state);
  }

  public update(dt: number, onThunder?: () => void) {
    this.weatherTimer += dt;

    // Advance dynamic time of day cycle
    this.updateAtmosphereProperties(dt);

    // Weather type rotation if auto cycle is active (every 4-5 minutes)
    if (this.autoCycle && this.weatherTimer > 240) {
      this.weatherTimer = 0;
      const order: WeatherType[] = ['clear', 'windy', 'storm', 'fog'];
      const currentIdx = order.indexOf(this.state.type);
      const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % order.length;
      this.setWeather(order[nextIdx]);
    }

    // Move cloud shadows & drift
    const wx = Math.cos(this.state.windDirection) * this.state.windSpeed;
    const wy = Math.sin(this.state.windDirection) * this.state.windSpeed;

    this.state.clouds.forEach((cloud) => {
      cloud.x += wx * dt * 0.8;
      cloud.y += wy * dt * 0.8;
      if (cloud.x > 8400) cloud.x -= 8400;
      if (cloud.x < 0) cloud.x += 8400;
      if (cloud.y > 8400) cloud.y -= 8400;
      if (cloud.y < 0) cloud.y += 8400;
    });

    // Dynamic wind gust oscillation
    const gustOscillation = Math.sin(Date.now() * 0.002) * (this.state.windGust * 12);
    this.state.windSpeed = Math.max(2, this.state.windSpeed + gustOscillation * dt * 0.5);

    // Storm lightning flashes
    if (this.state.type === 'storm') {
      this.lightningTimer += dt;
      if (this.lightningTimer > 4 + Math.random() * 7) {
        this.lightningTimer = 0;
        this.state.lightning = 1.0;
        if (onThunder) {
          setTimeout(onThunder, 300 + Math.random() * 600);
        }
      }

      if (this.state.lightning > 0) {
        this.state.lightning = Math.max(0, this.state.lightning - dt * 4.5);
      }
    } else {
      this.state.lightning = 0;
    }
  }
}
