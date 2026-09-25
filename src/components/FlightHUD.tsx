/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Flame,
  Fuel,
  Heart,
  Users,
  Wind,
  Droplet,
  Waves,
  HelpCircle,
  Radio,
  Settings,
  ShieldAlert,
  ArrowDown,
  ArrowUp,
  Maximize,
  Minimize,
  Compass,
  Anchor,
  Sun,
  Moon,
  CloudFog,
  CloudLightning,
  Navigation,
} from 'lucide-react';
import { CityData, HelicopterModel, HelicopterState, Mission, WeatherState } from '../types/game';
import { ObstacleAlert } from '../game/physics';

interface FlightHUDProps {
  heli: HelicopterState;
  model: HelicopterModel;
  weather: WeatherState;
  mission: Mission | null;
  city?: CityData;
  obstacleAlert?: ObstacleAlert | null;
  isAutoHoverActive?: boolean;
  inNoFlyZone?: boolean;
  onOpenRadio: () => void;
  onOpenHangar: () => void;
  onOpenSettings: () => void;
  onOpenMissions: () => void;
  onOpenHelp: () => void;
  onToggleEngine: () => void;
}

export const FlightHUD: React.FC<FlightHUDProps> = ({
  heli,
  model,
  weather,
  mission,
  city,
  obstacleAlert,
  isAutoHoverActive = false,
  inNoFlyZone = false,
  onOpenRadio,
  onOpenHangar,
  onOpenSettings,
  onOpenMissions,
  onOpenHelp,
  onToggleEngine,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Flight telemetry
  const altitudeMsl = Math.floor(heli.z);
  const verticalSpeed = Math.floor(heli.vz); // ft/min
  const horizontalKnots = Math.floor(Math.hypot(heli.vx, heli.vy) * 0.45);
  const headingDeg = Math.floor(((heli.heading * 180) / Math.PI) % 360);
  const fuelPercent = Math.max(0, Math.min(100, Math.floor((heli.fuel / heli.fuelMax) * 100)));
  const waterPercent = Math.max(0, Math.min(100, Math.floor((heli.water / heli.waterMax) * 100)));
  const healthPercent = Math.max(0, Math.min(100, Math.floor(heli.health)));

  // Surface detection (Ground / Rooftop / Water)
  let surfaceUnderneathHeight = 0;
  let surfaceName: string | null = null;
  let isOverWater = false;

  if (city) {
    isOverWater = city.waterBodies.some(
      (wb) => heli.x >= wb.x && heli.x <= wb.x + wb.width && heli.y >= wb.y && heli.y <= wb.y + wb.height
    );

    const bridge = (city.bridges || []).find(
      (b) => heli.x >= b.x && heli.x <= b.x + b.width && heli.y >= b.y && heli.y <= b.y + b.height
    );
    if (bridge) {
      isOverWater = false;
      surfaceUnderneathHeight = bridge.deckHeight;
      surfaceName = bridge.name;
    }

    const pier = (city.piers || []).find(
      (p) => heli.x >= p.x && heli.x <= p.x + p.width && heli.y >= p.y && heli.y <= p.y + p.height
    );
    if (pier) {
      isOverWater = false;
      surfaceUnderneathHeight = 6;
      surfaceName = pier.name;
    }

    for (const b of city.buildings) {
      if (
        heli.x >= b.x &&
        heli.x <= b.x + b.width &&
        heli.y >= b.y &&
        heli.y <= b.y + b.height
      ) {
        surfaceUnderneathHeight = b.roofHeight;
        surfaceName = b.name || `Building (${b.roofHeight} FT)`;
        break;
      }
    }
  }

  const radarAgl = Math.max(0, Math.floor(heli.z - surfaceUnderneathHeight));

  // Colored Drop Rate (Descent rate indicator for safe landing)
  let dropRateColor = 'text-slate-400';
  let dropRateBg = 'bg-slate-900/90 border-slate-700';
  let dropRateLabel = 'LEVEL';

  if (verticalSpeed > 80) {
    dropRateColor = 'text-sky-400';
    dropRateBg = 'bg-sky-950/90 border-sky-500/50';
    dropRateLabel = 'CLIMB';
  } else if (verticalSpeed < -750) {
    dropRateColor = 'text-red-400';
    dropRateBg = 'bg-red-950/95 border-red-500 animate-pulse';
    dropRateLabel = 'DANGER SINK';
  } else if (verticalSpeed < -450) {
    dropRateColor = 'text-amber-400';
    dropRateBg = 'bg-amber-950/90 border-amber-500/70';
    dropRateLabel = 'CAUTION SINK';
  } else if (verticalSpeed < -40) {
    dropRateColor = 'text-emerald-400';
    dropRateBg = 'bg-emerald-950/90 border-emerald-500/60';
    dropRateLabel = 'SAFE SINK';
  }

  // Warning states
  const isSinkRateWarning = verticalSpeed < -750 && radarAgl < 200 && !heli.isLanded;
  const isLowFuelWarning = fuelPercent < 20;
  const isWaterDanger = isOverWater && radarAgl < 25 && !heli.isLanded;
  const isWaterScooping = isOverWater && radarAgl >= 10 && radarAgl <= 35 && waterPercent < 100;

  // Weather icon & wind telemetry
  const windAngleDeg = Math.round((weather.windDirection * 180) / Math.PI);
  const hour = Math.floor(weather.timeOfDay ?? 12);
  const min = Math.floor(((weather.timeOfDay ?? 12) % 1) * 60);
  const timeFormatted = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  const phaseLabel = weather.timePhase ? weather.timePhase.toUpperCase() : 'DAY';

  const getWeatherIcon = () => {
    switch (weather.type) {
      case 'clear':
        return <Sun className="w-3.5 h-3.5 text-amber-400" />;
      case 'windy':
        return <Wind className="w-3.5 h-3.5 text-teal-400" />;
      case 'fog':
        return <CloudFog className="w-3.5 h-3.5 text-slate-300" />;
      case 'storm':
        return <CloudLightning className="w-3.5 h-3.5 text-yellow-400" />;
      case 'night':
        return <Moon className="w-3.5 h-3.5 text-indigo-300" />;
      default:
        return <Sun className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  const noFlyAlert = city?.noFlyZones?.find((nfz) => {
    const dist = Math.hypot(heli.x - nfz.x, heli.y - nfz.y);
    return dist <= nfz.radius && heli.z <= nfz.ceilingAltitude;
  });

  // Cardinal Heading
  const cardinal =
    headingDeg >= 337 || headingDeg < 23
      ? 'N'
      : headingDeg < 68
      ? 'NE'
      : headingDeg < 113
      ? 'E'
      : headingDeg < 158
      ? 'SE'
      : headingDeg < 203
      ? 'S'
      : headingDeg < 248
      ? 'SW'
      : headingDeg < 293
      ? 'W'
      : 'NW';

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-1.5 sm:p-2.5 text-slate-100 select-none overflow-hidden text-xs">
      {/* ========================================================================= */}
      {/* --- TOP ZONE: Streamlined Header, Quick Actions & Primary Telemetry --- */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          {/* LEFT: Callsign, Engine Start/Stop & Time/Weather/Speed Line */}
          <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap">
            {/* Callsign Badge */}
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-2 py-1 shadow-md">
              <span
                className={`h-2 w-2 rounded-full ${
                  heli.engineStarted ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span className="text-[11px] font-mono font-bold text-sky-300">
                {model.callsign}
              </span>
            </div>

            {/* Compact Engine Start/Stop Button */}
            <button
              onClick={onToggleEngine}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-mono font-bold shadow-md active:scale-95 transition ${
                heli.engineStarted
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
              }`}
              title="Ignite / Stop Turbine Engine (Key [I])"
            >
              {heli.engineStarted ? 'Stop' : 'Start'}
            </button>

            {/* Time of Day, Weather, Wind & SPEED Line (User requested: speed in same line as time of day) */}
            <div
              className="flex items-center gap-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 text-[10px] sm:text-[11px] font-mono shadow-md"
              title={`Local Time: ${timeFormatted} (${phaseLabel}) | Speed: ${horizontalKnots} KT | Weather: ${weather.type.toUpperCase()} | Wind: ${Math.round(weather.windSpeed)} KT`}
            >
              <span className="font-bold text-amber-300">{timeFormatted}</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-300 uppercase font-semibold">
                {phaseLabel}
              </span>
              <span className="text-slate-600">·</span>
              {getWeatherIcon()}
              <span className="text-slate-300 font-bold uppercase hidden xs:inline">{weather.type}</span>
              <span className="text-slate-600 hidden xs:inline">·</span>
              <Navigation
                className="w-3 h-3 text-sky-400 transition-transform"
                style={{ transform: `rotate(${windAngleDeg}deg)` }}
              />
              <span className="font-bold text-white">{Math.round(weather.windSpeed)} KT</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-400">SPD:</span>
              <strong className="text-white font-bold">{horizontalKnots} KT</strong>
            </div>
          </div>

          {/* RIGHT: Quick Action Buttons (Settings, Hangar, Missions, etc.) + Active Mission Badge */}
          <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 flex-wrap">
            {mission && (
              <div className="rounded-lg bg-red-950/90 border border-red-500/70 px-2 py-1 text-[11px] font-mono text-slate-200 flex items-center gap-1.5 shadow-md">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-red-300 font-bold max-w-[120px] truncate">{mission.title}</span>
                <span className="text-emerald-400 font-bold">{Math.floor(mission.timeRemaining)}s</span>
              </div>
            )}

            <button
              onClick={onOpenMissions}
              className="flex items-center gap-1 rounded-lg bg-red-600 hover:bg-red-500 text-white px-2 py-1 text-[11px] font-bold shadow-md active:scale-95 transition"
            >
              <Flame className="w-3 h-3 text-yellow-300" />
              <span>Dispatch</span>
              {mission && <span className="h-1.5 w-1.5 rounded-full bg-yellow-300 animate-ping" />}
            </button>

            <button
              onClick={onOpenHangar}
              className="rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 px-2 py-1 text-[11px] text-slate-200 active:scale-95 transition"
            >
              Hangar
            </button>

            <button
              onClick={onOpenRadio}
              className="rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 p-1 text-sky-400 active:scale-95 transition"
              title="Radio Player"
            >
              <Radio className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onOpenHelp}
              className="rounded-lg bg-sky-950/90 hover:bg-sky-900 border border-sky-600/70 p-1 text-sky-300 active:scale-95 transition"
              title="Pilot Manual & Help"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>

            {/* Quick Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 p-1 text-slate-300 active:scale-95 transition"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enable Fullscreen'}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5 text-amber-300" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onOpenSettings}
              className="rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 p-1 text-slate-300 active:scale-95 transition"
              title="Settings"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* LEFT SIDE STACK: AGL, Compass, Status Indicators, and Stacked Gauges (Hull, Fuel, Water, PAX) */}
        <div className="pointer-events-auto flex flex-col gap-1.5 max-w-[165px] sm:max-w-[180px]">
          {/* AGL & Compass Header Pill */}
          <div className="flex items-center justify-between px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-[10px] sm:text-[11px] font-mono shadow-md">
            <div>
              <span className="text-slate-400">AGL:</span>{' '}
              <strong className={radarAgl < 25 ? 'text-amber-400' : 'text-emerald-400'}>{radarAgl}</strong>
              <span className="text-[9px] text-slate-400"> FT</span>
            </div>
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <Compass className="w-3 h-3 text-amber-400" />
              <span>{headingDeg}° {cardinal}</span>
            </div>
          </div>

          {/* Active Flight Status Indicators */}
          {(isAutoHoverActive || heli.sirenActive || heli.searchlightActive) && (
            <div className="flex items-center gap-1 flex-wrap">
              {isAutoHoverActive && (
                <div
                  className="flex items-center gap-1 rounded-md bg-cyan-950/90 border border-cyan-400/80 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300 shadow-sm animate-pulse"
                  title="Auto-Hover Active: Position & Altitude Stabilized"
                >
                  <Anchor className="w-2.5 h-2.5" />
                  <span>HOVER</span>
                </div>
              )}
              {heli.sirenActive && (
                <div
                  className="flex items-center gap-1 rounded-md bg-red-950/90 border border-red-400 px-1.5 py-0.5 text-[9px] font-bold text-red-300 shadow-sm animate-pulse"
                  title="Emergency Siren Active (Key [X])"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping inline-block" />
                  <span>SIREN</span>
                </div>
              )}
              {heli.searchlightActive && (
                <div
                  className="flex items-center gap-1 rounded-md bg-yellow-950/90 border border-yellow-400 px-1.5 py-0.5 text-[9px] font-bold text-yellow-300 shadow-sm"
                  title="High-Intensity Searchlight Active (Key [L])"
                >
                  <span>BEAM</span>
                </div>
              )}
            </div>
          )}

          {/* Stacked Gauges (Hull, Fuel, Water, Passengers - stacked one below the other) */}
          <div className="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-[10px] font-mono shadow-md">
            {/* 1. Hull Integrity */}
            <div className="flex flex-col gap-0.5" title={`Hull Integrity: ${Math.round(healthPercent)}%`}>
              <div className="flex items-center justify-between text-[9px]">
                <span className="flex items-center gap-1 text-slate-300 font-semibold">
                  <Heart className="w-3 h-3 text-red-500 fill-current" />
                  <span>HULL</span>
                </span>
                <span className={healthPercent < 30 ? 'text-red-400 font-bold animate-pulse' : 'text-slate-300'}>
                  {Math.round(healthPercent)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-950/90 overflow-hidden border border-slate-800">
                <div
                  className={`h-full ${healthPercent < 30 ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`}
                  style={{ width: `${healthPercent}%` }}
                />
              </div>
            </div>

            {/* 2. Fuel Tank */}
            <div className="flex flex-col gap-0.5" title={`Fuel: ${Math.round(fuelPercent)}%`}>
              <div className="flex items-center justify-between text-[9px]">
                <span className="flex items-center gap-1 text-slate-300 font-semibold">
                  <Fuel className="w-3 h-3 text-amber-400" />
                  <span>FUEL</span>
                </span>
                <span className={fuelPercent < 20 ? 'text-red-400 font-bold animate-pulse' : 'text-slate-300'}>
                  {Math.round(fuelPercent)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-950/90 overflow-hidden border border-slate-800">
                <div
                  className={`h-full ${fuelPercent < 20 ? 'bg-red-500 animate-pulse' : 'bg-amber-400'}`}
                  style={{ width: `${fuelPercent}%` }}
                />
              </div>
            </div>

            {/* 3. Water Cannon Tank */}
            <div className="flex flex-col gap-0.5" title={`Water Cannon Tank: ${Math.round(waterPercent)}%`}>
              <div className="flex items-center justify-between text-[9px]">
                <span className="flex items-center gap-1 text-slate-300 font-semibold">
                  <Droplet className="w-3 h-3 text-sky-400 fill-current" />
                  <span>WATER</span>
                </span>
                <span className="text-sky-300">{Math.round(waterPercent)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-950/90 overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-sky-400"
                  style={{ width: `${waterPercent}%` }}
                />
              </div>
            </div>

            {/* 4. Passengers */}
            <div className="flex items-center justify-between text-[9px] pt-0.5 border-t border-slate-800" title="Passenger Capacity">
              <span className="flex items-center gap-1 text-slate-300 font-semibold">
                <Users className="w-3 h-3 text-emerald-400" />
                <span>PAX</span>
              </span>
              <span className="font-bold text-white text-[10px]">
                {heli.passengers.length} / {model.passengerCapacity}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* --- CENTER WARNING BANNERS & RADAR ALERTS --- */}
      {/* ========================================================================= */}
      <div className="flex flex-col items-center gap-1.5 pointer-events-none mt-1 mb-auto">
        {obstacleAlert && (
          <div
            className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 shadow-xl backdrop-blur-md animate-pulse text-xs font-bold ${
              obstacleAlert.severity === 'warning'
                ? 'bg-red-600/95 border-red-200 text-white'
                : 'bg-amber-600/95 border-amber-200 text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span>
              {obstacleAlert.severity === 'warning' ? '🚨 PULL UP! OBSTACLE' : '⚠ TERRAIN AHEAD'}:{' '}
              <strong>{obstacleAlert.buildingName}</strong> in <strong>{obstacleAlert.timeToImpact}s</strong>!
            </span>
            <span className="bg-black/30 px-1.5 py-0.5 rounded text-yellow-300">
              +{obstacleAlert.heightDeficit} FT
            </span>
          </div>
        )}

        {(noFlyAlert || inNoFlyZone) && (
          <div className="flex items-center gap-2 rounded-xl border-2 border-yellow-400 bg-red-700/95 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-white shadow-2xl animate-pulse">
            <ShieldAlert className="w-4 h-4 text-yellow-300 flex-shrink-0" />
            <span>
              🚨 PROHIBITED AIRSPACE: {noFlyAlert ? noFlyAlert.name : 'RESTRICTED MILITARY ZONE'} — CEILING {noFlyAlert ? noFlyAlert.ceilingAltitude : 350} FT! TURN BACK!
            </span>
          </div>
        )}

        {heli.isLanded && (
          <div className="rounded-xl bg-emerald-600/95 border border-emerald-300 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white shadow-lg">
            TOUCHDOWN — {heli.landedHelipad ? heli.landedHelipad.label : surfaceName || 'GROUND SECURED'}
          </div>
        )}

        {isWaterDanger && (
          <div className="flex items-center gap-1.5 rounded-xl bg-red-600/95 border border-red-300 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white shadow-xl animate-pulse">
            <Waves className="w-4 h-4" />
            <span>WATER HAZARD! CANNOT LAND ON WATER — CLIMB!</span>
          </div>
        )}

        {isWaterScooping && (
          <div className="flex items-center gap-1.5 rounded-xl bg-sky-600/95 border border-sky-300 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white shadow-lg">
            <Droplet className="w-4 h-4 animate-bounce fill-current" />
            <span>SCOOPING WATER ({waterPercent}%)</span>
          </div>
        )}

        {isSinkRateWarning && (
          <div className="rounded-xl bg-red-600/95 border border-red-300 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white shadow-lg animate-pulse">
            ⚠ SINK RATE! PULL UP!
          </div>
        )}

        {isLowFuelWarning && (
          <div className="rounded-xl bg-amber-600/95 border border-amber-300 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white shadow-lg animate-pulse">
            LOW FUEL WARNING — RETURN TO HQ
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* --- ALWAYS-VISIBLE AVIATION ALTITUDE SIDE BAR & COLORED DROP RATE GAUGE --- */}
      {/* Positioned directly above Auto-Hover and Collective on right edge */}
      {/* ========================================================================= */}
      <div className="pointer-events-auto absolute right-3 sm:right-5 bottom-[208px] sm:bottom-[232px] flex flex-col items-center z-20">
        <div className="flex flex-col items-center w-12 sm:w-13 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-1.5 shadow-xl font-mono text-[9px]">
          <span className="text-[8px] font-bold text-slate-400 tracking-wider mb-0.5">ALT</span>

          {/* Vertical Altitude Ladder Tape */}
          <div className="relative h-28 sm:h-32 w-full bg-slate-950/95 rounded-lg border border-slate-800 overflow-hidden flex flex-col justify-between py-0.5 px-0.5">
            {/* Height zone tick markers */}
            <div className="absolute top-0.5 right-0.5 text-[7px] text-slate-500 font-bold">600</div>
            <div className="absolute top-1/4 right-0.5 text-[7px] text-slate-500 font-bold">450</div>
            <div className="absolute top-2/4 right-0.5 text-[7px] text-slate-500 font-bold">300</div>
            <div className="absolute top-3/4 right-0.5 text-[7px] text-slate-500 font-bold">150</div>
            <div className="absolute bottom-0.5 right-0.5 text-[7px] text-slate-500 font-bold">0</div>

            {/* Skyscraper Hazard Zone (above 300 FT) */}
            <div className="absolute top-0 inset-x-0 h-1/2 bg-red-950/25 border-b border-red-500/25 pointer-events-none" />

            {/* Ground / Surface Elevation Block */}
            {surfaceUnderneathHeight > 0 && (
              <div
                className="absolute inset-x-0 bg-slate-600/80 border-t border-amber-400 pointer-events-none transition-all"
                style={{
                  bottom: '0%',
                  height: `${Math.min(100, (surfaceUnderneathHeight / 600) * 100)}%`,
                }}
                title={`Surface Height: ${surfaceUnderneathHeight} FT`}
              />
            )}

            {/* Real-time Altitude Indicator Needle */}
            <div
              className="absolute inset-x-0 h-1 bg-sky-400 border border-white shadow-md flex items-center justify-center transition-all"
              style={{
                bottom: `${Math.min(96, Math.max(2, (heli.z / 600) * 100))}%`,
              }}
            >
              <div className="h-2 w-2 rotate-45 bg-sky-300 border border-white" />
            </div>
          </div>

          {/* Digital Readout */}
          <div className="mt-1 text-center font-bold text-white text-[10px]">
            {altitudeMsl}<span className="text-[8px] text-slate-400">FT</span>
          </div>

          {/* Colored Drop Rate Badge */}
          <div
            className={`mt-1 w-full px-0.5 py-0.5 rounded border text-[8px] font-bold text-center leading-tight ${dropRateBg} ${dropRateColor}`}
            title="Descent Rate (Green: Safe, Yellow: Caution, Red: Danger)"
          >
            <div>{verticalSpeed > 0 ? `+${verticalSpeed}` : verticalSpeed}</div>
            <div className="text-[6.5px] tracking-tight">{dropRateLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
