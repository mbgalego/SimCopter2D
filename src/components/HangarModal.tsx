/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Award, Check, DollarSign, Gauge, Shield, Users, Wrench, X, Zap } from 'lucide-react';
import { HELICOPTER_FLEET } from '../game/fleetData';
import { HelicopterModel, PilotProfile } from '../types/game';

interface HangarModalProps {
  isOpen: boolean;
  onClose: () => void;
  pilot: PilotProfile;
  currentChopper: HelicopterModel;
  onSelectChopper: (model: HelicopterModel) => void;
  onBuyChopper: (model: HelicopterModel) => void;
  onRepairChopper: () => void;
  heliHealth: number;
}

export const HangarModal: React.FC<HangarModalProps> = ({
  isOpen,
  onClose,
  pilot,
  currentChopper,
  onSelectChopper,
  onBuyChopper,
  onRepairChopper,
  heliHealth,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-5 text-slate-100 animate-in fade-in zoom-in duration-150 max-h-[90vh] flex flex-col">
        {/* Header with Career Cash */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold font-mono text-sky-400">CENTRAL HANGAR & FLEET</h2>
            <p className="text-xs text-slate-400">Municipal Aviation Depot & Maintenance</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 font-mono text-sm font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-xl">
              <DollarSign className="w-4 h-4" />
              <span>{pilot.cash.toLocaleString()}</span>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Fleet Roster */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
          {HELICOPTER_FLEET.map((chopper) => {
            const isOwned = pilot.ownedChopperIds.includes(chopper.id);
            const isCurrent = currentChopper.id === chopper.id;
            const canAfford = pilot.cash >= chopper.price;

            return (
              <div
                key={chopper.id}
                className={`rounded-2xl border p-4 transition ${
                  isCurrent
                    ? 'bg-sky-950/30 border-sky-500'
                    : isOwned
                    ? 'bg-slate-800/60 border-slate-700'
                    : 'bg-slate-900/60 border-slate-800 opacity-90'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{chopper.name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-700 text-sky-300">
                        {chopper.callsign}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500 text-white">
                          CURRENT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-md">
                      {chopper.description}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {isCurrent ? (
                      <button
                        disabled
                        className="rounded-xl bg-slate-800 text-sky-400 border border-sky-500/30 px-3 py-1.5 text-xs font-bold flex items-center gap-1 cursor-default"
                      >
                        <Check className="w-4 h-4" /> Ready to Fly
                      </button>
                    ) : isOwned ? (
                      <button
                        onClick={() => onSelectChopper(chopper)}
                        className="rounded-xl bg-sky-600 hover:bg-sky-500 text-white px-4 py-1.5 text-xs font-bold transition active:scale-95"
                      >
                        Switch Chopper
                      </button>
                    ) : (
                      <button
                        onClick={() => onBuyChopper(chopper)}
                        disabled={!canAfford}
                        className={`rounded-xl px-4 py-1.5 text-xs font-bold transition flex items-center gap-1 ${
                          canAfford
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-lg shadow-emerald-950/50'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        }`}
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Purchase ({chopper.price.toLocaleString()})
                      </button>
                    )}
                  </div>
                </div>

                {/* Specs Grid */}
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-800/80 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Gauge className="w-3.5 h-3.5 text-sky-400" />
                    <span>Speed: {chopper.maxSpeed} kts</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Water: {chopper.waterCapacity} gal</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cabin: {chopper.passengerCapacity} pax</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Shield className="w-3.5 h-3.5 text-red-400" />
                    <span>Hull: {chopper.durability} pts</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Repair Depot Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <Wrench className="w-4 h-4 text-amber-400" />
            <span className="text-slate-400">Current Airframe Integrity:</span>
            <span className={`font-mono font-bold ${heliHealth < 60 ? 'text-red-400' : 'text-emerald-400'}`}>
              {Math.floor(heliHealth)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            {heliHealth < 100 && (
              <button
                onClick={onRepairChopper}
                className="rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3 py-1.5 text-xs transition active:scale-95"
              >
                Full Depot Service & Repair ($500)
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-1.5 text-xs font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
