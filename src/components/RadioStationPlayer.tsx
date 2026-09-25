/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Music, Radio, Volume2, VolumeX, X } from 'lucide-react';
import { soundManager } from '../game/audioSystem';

interface RadioStationPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  volume: number;
  onVolumeChange: (v: number) => void;
}

const STATIONS = [
  { id: 0, name: 'Radio OFF', genre: 'Mute', desc: 'Silence the cockpit FM player.' },
  { id: 1, name: 'Classical 98.5 FM', genre: 'Baroque & Orchestral', desc: 'SimCopter classic synthesized string & harpsichord masterpieces.' },
  { id: 2, name: 'Skyway Lounge 104.2', genre: 'Smooth Jazz', desc: 'Vibraphone and Rhodes keyboard chords for serene municipal patrols.' },
  { id: 3, name: 'Metro Action 80s', genre: 'Synthwave & Drive', desc: 'Pulsing basslines and synth arpeggios for high-octane pursuits.' },
];

export const RadioStationPlayer: React.FC<RadioStationPlayerProps> = ({
  isOpen,
  onClose,
  volume,
  onVolumeChange,
}) => {
  const [currentStation, setCurrentStation] = useState(() => soundManager.getRadioStation());

  if (!isOpen) return null;

  const handleSelectStation = (id: number) => {
    setCurrentStation(id);
    soundManager.setRadioStation(id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 text-slate-100 animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold font-mono text-white">COCKPIT FM TUNER</h2>
              <p className="text-[11px] text-slate-400">In-flight Synthesized Radio Channels</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Station List */}
        <div className="mt-4 space-y-2.5">
          {STATIONS.map((station) => {
            const isSelected = currentStation === station.id;
            return (
              <button
                key={station.id}
                onClick={() => handleSelectStation(station.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition ${
                  isSelected
                    ? 'bg-sky-950/40 border-sky-400 shadow-md shadow-sky-950/40'
                    : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center h-9 w-9 rounded-lg ${
                      isSelected ? 'bg-sky-500 text-white animate-pulse' : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {station.id === 0 ? <VolumeX className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      {station.name}
                      {isSelected && (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500 text-white font-bold">
                          ON AIR
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{station.genre}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Volume Slider */}
        <div className="mt-5 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-sky-400" /> Radio Volume
            </span>
            <span className="font-mono">{Math.round(volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 text-xs font-semibold"
          >
            Close Tuner
          </button>
        </div>
      </div>
    </div>
  );
};
