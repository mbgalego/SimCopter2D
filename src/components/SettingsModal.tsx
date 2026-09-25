/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CloudRain, Compass, Eye, HelpCircle, Keyboard, Sliders, Volume2, Wind, X } from 'lucide-react';
import { GameSettings, WeatherType } from '../types/game';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GameSettings;
  onUpdateSettings: (updater: (prev: GameSettings) => GameSettings) => void;
  currentWeather: WeatherType;
  onChangeWeather: (type: WeatherType) => void;
  onRegenerateCity: () => void;
  onSetTimeOfDay?: (hour: number) => void;
  currentTimeOfDay?: number;
}

const TIME_OF_DAY_PRESETS = [
  { hour: 6.0, label: 'Dawn Sunrise', icon: '🌅' },
  { hour: 12.0, label: 'Midday Noon', icon: '☀️' },
  { hour: 18.5, label: 'Sunset Glow', icon: '🌇' },
  { hour: 23.0, label: 'Night Ops', icon: '🌙' },
];

const WEATHER_OPTIONS: Array<{ type: WeatherType; label: string; icon: string }> = [
  { type: 'clear', label: 'Clear Sky', icon: '☀️' },
  { type: 'windy', label: 'Gusty Winds', icon: '💨' },
  { type: 'fog', label: 'Dense Fog', icon: '🌫️' },
  { type: 'storm', label: 'Thunderstorm', icon: '⛈️' },
  { type: 'night', label: 'Night Ops', icon: '🌙' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  currentWeather,
  onChangeWeather,
  onRegenerateCity,
  onSetTimeOfDay,
  currentTimeOfDay,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 text-slate-100 animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold font-mono text-white">SIMULATION SETTINGS</h2>
              <p className="text-[11px] text-slate-400">Flight Physics, Weather & Controls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* Dynamic Weather Selector */}
          <div>
            <label className="font-bold text-slate-300 flex items-center gap-1.5 mb-2">
              <CloudRain className="w-4 h-4 text-sky-400" /> Dynamic Weather System
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {WEATHER_OPTIONS.map((w) => (
                <button
                  key={w.type}
                  onClick={() => onChangeWeather(w.type)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition ${
                    currentWeather === w.type
                      ? 'bg-sky-600/30 border-sky-400 text-white font-bold'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="text-base">{w.icon}</span>
                  <span className="text-[10px] mt-1">{w.label}</span>
                </button>
              ))}
            </div>

            {/* Time of Day Cycle Presets */}
            {onSetTimeOfDay && (
              <div className="mt-3">
                <div className="text-[11px] font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Time-of-Day Lighting Presets</span>
                  {currentTimeOfDay !== undefined && (
                    <span className="text-amber-300 font-mono">
                      {Math.floor(currentTimeOfDay).toString().padStart(2, '0')}:
                      {Math.floor((currentTimeOfDay % 1) * 60).toString().padStart(2, '0')}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {TIME_OF_DAY_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => onSetTimeOfDay(p.hour)}
                      className="flex flex-col items-center justify-center p-1.5 rounded-xl border border-slate-700/80 bg-slate-800/40 hover:bg-slate-800 hover:border-amber-400/60 text-slate-300 transition"
                    >
                      <span className="text-sm">{p.icon}</span>
                      <span className="text-[9px] mt-0.5">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-2.5 flex items-center justify-between bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
              <div>
                <div className="text-slate-200 font-semibold">Auto Dynamic Day/Night & Weather Transitions</div>
                <div className="text-[10px] text-slate-400">Gradual progression from sunrise to midday, sunset, and starry night</div>
              </div>
              <input
                type="checkbox"
                checked={settings.weatherCycle}
                onChange={(e) =>
                  onUpdateSettings((s) => ({ ...s, weatherCycle: e.target.checked }))
                }
                className="h-4 w-4 rounded accent-sky-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Flight Assists & Controls */}
          <div>
            <label className="font-bold text-slate-300 flex items-center gap-1.5 mb-2">
              <Compass className="w-4 h-4 text-emerald-400" /> Flight Dynamics & Assists
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
                <div>
                  <div className="font-semibold text-slate-200">Auto-Rudder Heading Assist</div>
                  <div className="text-[10px] text-slate-400">Helicopter automatically weathervanes toward travel direction</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoRudder}
                  onChange={(e) =>
                    onUpdateSettings((s) => ({ ...s, autoRudder: e.target.checked }))
                  }
                  className="h-4 w-4 rounded accent-sky-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-200">Touch Joystick Sensitivity</span>
                  <span className="font-mono text-sky-400">{Math.round(settings.touchSensitivity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.5"
                  step="0.05"
                  value={settings.touchSensitivity}
                  onChange={(e) =>
                    onUpdateSettings((s) => ({ ...s, touchSensitivity: parseFloat(e.target.value) }))
                  }
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Audio Levels */}
          <div>
            <label className="font-bold text-slate-300 flex items-center gap-1.5 mb-2">
              <Volume2 className="w-4 h-4 text-amber-400" /> Cockpit Audio Mix
            </label>
            <div className="space-y-2 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              <div>
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <span className="text-slate-300">Turbine & Rotor SFX</span>
                  <span className="font-mono">{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={(e) =>
                    onUpdateSettings((s) => ({ ...s, sfxVolume: parseFloat(e.target.value) }))
                  }
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <span className="text-slate-300">FM In-Flight Radio</span>
                  <span className="font-mono">{Math.round(settings.radioVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.radioVolume}
                  onChange={(e) =>
                    onUpdateSettings((s) => ({ ...s, radioVolume: parseFloat(e.target.value) }))
                  }
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Keyboard Controls Guide */}
          <div>
            <label className="font-bold text-slate-300 flex items-center gap-1.5 mb-2">
              <Keyboard className="w-4 h-4 text-sky-400" /> Keyboard Controls (Desktop)
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-800/40 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300">
              <div><strong className="text-white">W / S / Up / Down:</strong> Cyclic Pitch</div>
              <div><strong className="text-white">A / D / Left / Right:</strong> Cyclic Roll</div>
              <div><strong className="text-white">Shift / Space:</strong> Collective Climb</div>
              <div><strong className="text-white">Ctrl / C:</strong> Collective Descent</div>
              <div><strong className="text-white">Q / E:</strong> Yaw Tail Rudder</div>
              <div><strong className="text-white">F:</strong> Drop Water Cannon</div>
              <div><strong className="text-white">R:</strong> Winch Rescue Hoist</div>
              <div><strong className="text-white">X:</strong> Emergency Siren</div>
              <div><strong className="text-white">P:</strong> PA Megaphone</div>
              <div><strong className="text-white">L:</strong> Searchlight Beam</div>
            </div>
          </div>

          {/* City Generation & PWA */}
          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <PWAInstallButton />

            <button
              onClick={() => {
                onRegenerateCity();
                onClose();
              }}
              className="rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 font-bold px-3 py-1.5 text-xs transition active:scale-95"
            >
              Generate New Procedural City
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 text-xs font-semibold"
          >
            Save & Return
          </button>
        </div>
      </div>
    </div>
  );
};
