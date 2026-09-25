/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WeatherState, WeatherType } from '../types/game';

export class WeatherEngine {
  public state: WeatherState;
  private weatherTimer = 0;
  private lightningTimer = 0;
  private autoCycle = true;

  constructor(initialType: WeatherType = 'clear') {
    this.state = this.createWeather(initialType);
  }

  public setWeather(type: WeatherType) {
    this.state = this.createWeather(type);
  }

  public setAutoCycle(enabled: boolean) {
    this.autoCycle = enabled;
  }

  private createWeather(type: WeatherType): WeatherState {
    const clouds: WeatherState['clouds'] = [];
    for (let i = 0; i < 24; i++) {
      clouds.push({
        x: Math.random() * 5000,
        y: Math.random() * 5000,
        radius: 180 + Math.random() * 220,
        speed: 20 + Math.random() * 30,
        opacity: type === 'storm' ? 0.85 : type === 'fog' ? 0.75 : 0.35,
      });
    }

    switch (type) {
      case 'windy':
        return {
          type,
          windSpeed: 28 + Math.random() * 16, // 28 - 44 knots
          windDirection: Math.random() * Math.PI * 2,
          windGust: 0.7,
          visibility: 0.9,
          rainIntensity: 0,
          ambientLight: 0.9,
          lightning: 0,
          clouds,
        };
      case 'fog':
        return {
          type,
          windSpeed: 4 + Math.random() * 6,
          windDirection: Math.random() * Math.PI * 2,
          windGust: 0.1,
          visibility: 0.3, // Heavy low visibility!
          rainIntensity: 0.15,
          ambientLight: 0.6,
          lightning: 0,
          clouds,
        };
      case 'storm':
        return {
          type,
          windSpeed: 32 + Math.random() * 20, // Violent squalls
          windDirection: Math.random() * Math.PI * 2,
          windGust: 0.95,
          visibility: 0.45,
          rainIntensity: 0.9,
          ambientLight: 0.35,
          lightning: 0,
          clouds,
        };
      case 'night':
        return {
          type,
          windSpeed: 8 + Math.random() * 10,
          windDirection: Math.random() * Math.PI * 2,
          windGust: 0.25,
          visibility: 0.85,
          rainIntensity: 0,
          ambientLight: 0.16, // Deep night!
          lightning: 0,
          clouds,
        };
      case 'clear':
      default:
        return {
          type: 'clear',
          windSpeed: 6 + Math.random() * 8, // Light calm breeze
          windDirection: Math.random() * Math.PI * 2,
          windGust: 0.15,
          visibility: 1.0,
          rainIntensity: 0,
          ambientLight: 1.0,
          lightning: 0,
          clouds,
        };
    }
  }

  public update(dt: number, onThunder?: () => void) {
    this.weatherTimer += dt;

    // Optional dynamic weather cycle every 3-4 minutes
    if (this.autoCycle && this.weatherTimer > 210) {
      this.weatherTimer = 0;
      const order: WeatherType[] = ['clear', 'windy', 'storm', 'fog', 'night'];
      const nextIdx = (order.indexOf(this.state.type) + 1) % order.length;
      this.setWeather(order[nextIdx]);
    }

    // Move cloud shadows
    const wx = Math.cos(this.state.windDirection) * this.state.windSpeed;
    const wy = Math.sin(this.state.windDirection) * this.state.windSpeed;

    this.state.clouds.forEach((cloud) => {
      cloud.x += wx * dt * 0.8;
      cloud.y += wy * dt * 0.8;
      if (cloud.x > 5000) cloud.x -= 5000;
      if (cloud.x < 0) cloud.x += 5000;
      if (cloud.y > 5000) cloud.y -= 5000;
      if (cloud.y < 0) cloud.y += 5000;
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
