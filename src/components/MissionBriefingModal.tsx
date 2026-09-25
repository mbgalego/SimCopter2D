/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Award, Clock, DollarSign, Radio, X, Info } from 'lucide-react';
import { Mission } from '../types/game';

interface MissionBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableMissions: Mission[];
  activeMission: Mission | null;
  onAcceptMission: (mission: Mission) => void;
  onCancelMission: () => void;
}

function getMissionTactic(type: string): string {
  switch (type) {
    case 'brush_fire':
    case 'highrise_fire':
      return 'Tactic: Scoop water from river/lake (< 35 FT) & aim Water Cannon at flames (Key [F]).';
    case 'car_crash':
      return 'Tactic: Aim Water Cannon (Key [F]) to douse burning vehicle, land on road to extract casualty.';
    case 'water_rescue':
      return 'Tactic: Hover over victim in water, lower Hoist (Key [R]), deliver to Hospital [H+].';
    case 'riot_control':
      return 'Tactic: Fly to Civic Plaza, activate Siren & Megaphone (Key [X] / [P]) to disperse crowd.';
    case 'traffic_jam':
      return 'Tactic: Hover low (< 140 FT) over I-95 freeway, blare Megaphone/Siren to restore traffic flow.';
    case 'vip_transport':
    case 'air_taxi':
      return 'Tactic: Touch down at pickup helipad to board VIP passenger, then fly swiftly to destination pad.';
    case 'roadside_ambulance':
    case 'highway_pileup':
      return 'Tactic: Touch down safely on clear road pavement, load critical casualty, rush to Hospital [H+].';
    default:
      return 'Tactic: Follow the directional chevron arrow near your helicopter to incident scene.';
  }
}

export const MissionBriefingModal: React.FC<MissionBriefingModalProps> = ({
  isOpen,
  onClose,
  availableMissions,
  activeMission,
  onAcceptMission,
  onCancelMission,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-4 sm:p-6 text-slate-100 animate-in fade-in zoom-in duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-600/20 text-red-400 border border-red-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-mono text-white tracking-wide">
                911 EMERGENCY DISPATCH
              </h2>
              <p className="text-xs text-slate-400">
                Metropolitan Air Rescue & Incident Command
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center h-8 w-8 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Mission Banner */}
        {activeMission && (
          <div className="mt-4 rounded-2xl bg-red-950/50 border-2 border-red-500/60 p-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-red-600/30 text-red-300 border border-red-500/40 px-3 py-1 text-xs font-bold font-mono">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                ACTIVE INCIDENT #{activeMission.code}
              </span>
              <span className="text-xs sm:text-sm font-mono font-bold text-amber-400">
                {Math.floor(activeMission.timeRemaining)}s Remaining
              </span>
            </div>

            <h3 className="text-base font-bold text-white mt-2">{activeMission.title}</h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
              {activeMission.description}
            </p>

            {/* Tactical instruction badge */}
            <div className="mt-2.5 flex items-center gap-1.5 p-2 rounded-xl bg-red-900/40 border border-red-500/30 text-xs text-yellow-200">
              <Info className="w-4 h-4 flex-shrink-0 text-yellow-300" />
              <span>{getMissionTactic(activeMission.type)}</span>
            </div>

            <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-red-900/50">
              <div className="flex items-center gap-4 text-xs sm:text-sm font-mono font-bold">
                <span className="text-emerald-400">${activeMission.rewardCash.toLocaleString()}</span>
                <span className="text-sky-400">+{activeMission.rewardReputation} REP</span>
              </div>
              <button
                onClick={onCancelMission}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 text-red-300 text-xs px-3.5 py-1.5 font-bold border border-red-500/40 transition active:scale-95"
              >
                Abort Mission
              </button>
            </div>
          </div>
        )}

        {/* Available Dispatch Queue */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400 mb-2.5">
            Incoming Distress Calls ({availableMissions.length})
          </h4>

          {availableMissions.length === 0 && (
            <div className="py-10 text-center text-xs sm:text-sm text-slate-400 bg-slate-800/40 rounded-2xl border border-slate-800 p-4">
              All active emergencies cleared on scanner. Patrol the city airspace or monitor channel for incoming calls!
            </div>
          )}

          <div className="space-y-3">
            {availableMissions.map((m) => {
              const isCritical = m.urgency === 'critical';
              return (
                <div
                  key={m.id}
                  className="rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-sky-500/60 transition p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 shadow-md"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg ${
                          isCritical
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        CODE {m.code}
                      </span>
                      <h4 className="text-sm font-bold text-white">{m.title}</h4>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-snug">
                      {m.description}
                    </p>

                    {/* Mission tactic hint */}
                    <div className="mt-2 text-xs text-sky-300 font-mono bg-slate-900/80 px-2.5 py-1 rounded-xl border border-slate-700/60 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
                      <span>{getMissionTactic(m.type)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-700/60 text-xs sm:text-sm">
                    <div className="flex items-center gap-3 font-mono">
                      <span className="flex items-center gap-0.5 text-emerald-400 font-bold">
                        <DollarSign className="w-4 h-4" />
                        {m.rewardCash.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-0.5 text-sky-400 font-bold">
                        <Award className="w-4 h-4" />
                        {m.rewardReputation}
                      </span>
                      <span className="flex items-center gap-0.5 text-slate-400">
                        <Clock className="w-4 h-4" />
                        {m.timeLimit}s
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        onAcceptMission(m);
                        onClose();
                      }}
                      className="rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm px-4 py-2 shadow-lg shadow-red-950/60 transition active:scale-95"
                    >
                      Scramble Chopper
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 text-xs sm:text-sm font-medium transition"
          >
            Close Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
