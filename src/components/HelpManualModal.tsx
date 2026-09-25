/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Compass,
  Droplet,
  Flame,
  HelpCircle,
  MapPin,
  Power,
  ShieldCheck,
  Siren,
  Users,
  Waypoints,
  X,
  AlertTriangle,
  ArrowDown,
  Anchor,
  Navigation,
} from 'lucide-react';

interface HelpManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpManualModal: React.FC<HelpManualModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'missions' | 'controls' | 'landing' | 'map'>('missions');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-4 sm:p-6 text-slate-100 animate-in fade-in zoom-in duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-mono text-white tracking-wide">
                PILOT FLIGHT MANUAL & DISPATCH GUIDE
              </h2>
              <p className="text-xs text-slate-400">
                Official Flight Operations Handbook & Incident Response
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

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 pb-2 border-b border-slate-800/80 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('missions')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'missions'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950/50'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-yellow-300" />
            <span>Mission Objectives</span>
          </button>

          <button
            onClick={() => setActiveTab('controls')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'controls'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-950/50'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-sky-200" />
            <span>Flight Controls</span>
          </button>

          <button
            onClick={() => setActiveTab('landing')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'landing'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/50'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
            <span>Safe Landing & Radar</span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'map'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-indigo-200" />
            <span>City Landmarks</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1 text-xs sm:text-sm text-slate-200 space-y-4">
          {/* --- TAB 1: MISSION OBJECTIVES --- */}
          {activeTab === 'missions' && (
            <div className="space-y-3.5">
              <div className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-3.5">
                <div className="flex items-center gap-2 text-amber-400 font-bold font-mono text-sm">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Wildfire & High-Rise Firefighting</span>
                </div>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  1. <strong>Locate Target</strong>: Follow the glowing directional arrow orbiting your chopper.
                  <br />
                  2. <strong>Scoop Water</strong>: Fly over the <strong>Metro River</strong> or <strong>Emerald Lake</strong> and hover low (under 35 FT) until your tank is 100% full.
                  <br />
                  3. <strong>Drop Payload</strong>: Fly directly over the flames and press <span className="text-sky-300 font-bold bg-sky-950 px-1.5 py-0.5 rounded border border-sky-700">DROP</span> (or Key <strong>F</strong>) to extinguish the blaze.
                </p>
              </div>

              <div className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-3.5">
                <div className="flex items-center gap-2 text-sky-400 font-bold font-mono text-sm">
                  <Waypoints className="w-4 h-4 text-sky-300" />
                  <span>Search & Rescue (Winch Hoist)</span>
                </div>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  1. <strong>Locate Survivors</strong>: Stranded people wave on rooftops or from the water.
                  <br />
                  2. <strong>Deploy Hoist</strong>: Hover steadily directly above the victim and press <span className="text-amber-300 font-bold bg-amber-950 px-1.5 py-0.5 rounded border border-amber-700">HOIST</span> (or Key <strong>R</strong>).
                  <br />
                  3. <strong>Reel & Evacuate</strong>: Once hooked on the harness, they are winched into the cabin.
                  <br />
                  4. <strong>Hospital Medevac</strong>: Fly to the <strong>Hospital Trauma Helipad</strong> (marked with a red cross <span className="text-red-400 font-bold">H+</span>) and land gently to deliver patients and collect bounty!
                </p>
              </div>

              <div className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-3.5">
                <div className="flex items-center gap-2 text-red-400 font-bold font-mono text-sm">
                  <Siren className="w-4 h-4 text-red-400" />
                  <span>Riot Control & Police Dispatch</span>
                </div>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  1. Fly to <strong>Civic Plaza</strong> or the reported disturbance coordinate.
                  <br />
                  2. Activate your <span className="text-red-300 font-bold bg-red-950 px-1.5 py-0.5 rounded border border-red-700">SIREN</span> (or Key <strong>X</strong>) and megaphone to disperse crowds.
                  <br />
                  3. Buzz low overhead to break up unruly demonstrations and restore order.
                </p>
              </div>

              <div className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-3.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono text-sm">
                  <Users className="w-4 h-4 text-emerald-300" />
                  <span>VIP & Urban Air Taxi Passenger Transport</span>
                </div>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  1. <strong>Boarding</strong>: Touch down safely at the designated departure helipad. The passenger will automatically board upon landing!
                  <br />
                  2. <strong>Target Update</strong>: Once boarded, your navigation chevron instantly shifts to point to the destination helipad across the city.
                  <br />
                  3. <strong>Safe Disembarkation</strong>: Touch down at the destination pad before time runs out to complete the contract and receive payment.
                </p>
              </div>

              <div className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-3.5">
                <div className="flex items-center gap-2 text-rose-400 font-bold font-mono text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Roadside Flying Ambulance & Medevac</span>
                </div>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  1. <strong>Highway / Road Landing</strong>: Critical casualty located alongside the roadway. Touch down directly on the asphalt pavement near the victim.
                  <br />
                  2. <strong>Load Stretcher</strong>: The patient is loaded into the cabin upon landing.
                  <br />
                  3. <strong>Trauma Airlift</strong>: Expedite flight directly to the <strong>Hospital Trauma Helipad [H+]</strong> to deliver the casualty to emergency surgery!
                </p>
              </div>

              <div className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-3.5">
                <div className="flex items-center gap-2 text-sky-400 font-bold font-mono text-sm">
                  <Siren className="w-4 h-4 text-sky-400" />
                  <span>I-95 Freeway Traffic Jam Surveillance</span>
                </div>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  1. Fly to the <strong>6-Lane Interstate 95 Expressway</strong> gridlock location.
                  <br />
                  2. Hover low (&lt; 140 FT) directly over the congested lanes.
                  <br />
                  3. Activate your <strong>Siren [X]</strong> or <strong>Megaphone [P]</strong> to guide vehicles, parting gridlock and restoring traffic flow.
                </p>
              </div>

              <div className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-3.5">
                <div className="flex items-center gap-2 text-orange-400 font-bold font-mono text-sm">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Multi-Car Crash & Wreckage Fire</span>
                </div>
                <p className="text-slate-300 mt-1 leading-relaxed">
                  1. Follow the mission arrow to the multi-car pileup scene.
                  <br />
                  2. Use your <strong>Forward Water Cannon (Key [F])</strong> with targeting guide to extinguish vehicle flames.
                  <br />
                  3. Touch down on the road or lower the rescue hoist [R] to evacuate injured drivers to Metro Hospital!
                </p>
              </div>
            </div>
          )}

          {/* --- TAB 2: FLIGHT CONTROLS --- */}
          {activeTab === 'controls' && (
            <div className="space-y-3.5">
              <div className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-3.5">
                <h4 className="font-mono font-bold text-sky-400 text-sm mb-1.5">
                  🕹 Twin-Stick Intuitive Flight Controls
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/70">
                    <span className="font-bold text-white block mb-1">Left Thumb: Direction Joystick</span>
                    Pushing the joystick directs your helicopter nose and forward speed. Center the stick to level out and hold steady hover.
                    <div className="mt-1 text-slate-400 font-mono text-[11px]">Desktop: WASD or Arrow Keys</div>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/70">
                    <span className="font-bold text-white block mb-1">Right Thumb: Altitude (Collective)</span>
                    Slide UP to climb, CENTER to hover, and DOWN to descend gently onto helipads.
                    <div className="mt-1 text-slate-400 font-mono text-[11px]">Desktop: Shift / Ctrl or Space / C</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-3.5">
                <div className="flex items-center gap-2 font-mono font-bold text-amber-400 text-sm mb-1">
                  <Power className="w-4 h-4" />
                  <span>Turbine Engine Ignition (Start / Stop)</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Use the <strong>START ENG / ENG: ON</strong> button on the HUD (or Key <strong>I</strong>) to start or shut down the turbine.
                  <br />
                  When the engine is stopped on the ground, rotor RPM decelerates to zero. You must spool the rotor up to 80%+ RPM before collective lift is generated.
                </p>
              </div>

              <div className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-3.5">
                <div className="flex items-center gap-2 font-mono font-bold text-cyan-400 text-sm mb-1">
                  <Anchor className="w-4 h-4" />
                  <span>Auto-Hover Altitude & Drift Lock (Key [Z])</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Toggle Auto-Hover via the button above the collective slider or press Key <strong>Z</strong>. When active, autopilot damping eliminates wind drift and arrests horizontal velocity, stabilizing the aircraft for pinpoint rescue hoists and aerial firefighting.
                </p>
              </div>

              <div className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-3.5">
                <div className="flex items-center gap-2 font-mono font-bold text-purple-400 text-sm mb-1">
                  <Navigation className="w-4 h-4" />
                  <span>Directional Mission Navigation Arrow</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  A sleek navigational chevron orbits right beside your helicopter pointing directly toward the active mission objective, with real-time distance in feet/miles.
                </p>
              </div>
            </div>
          )}

          {/* --- TAB 3: SAFE LANDING & RADAR --- */}
          {activeTab === 'landing' && (
            <div className="space-y-3.5">
              <div className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-3.5">
                <div className="flex items-center gap-2 font-mono font-bold text-emerald-400 text-sm mb-2">
                  <ArrowDown className="w-4 h-4" />
                  <span>Colored Drop Rate (Safe Landing Speed)</span>
                </div>
                <p className="text-slate-300 mb-2 leading-relaxed">
                  Monitor the <strong>DROP RATE</strong> indicator on the primary telemetry strip and altitude side tape before touchdown:
                </p>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/50 p-2 rounded-xl text-emerald-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span><strong>GREEN (0 to -450 FT/MIN)</strong>: Smooth, safe touchdown. Recommended for all helipads.</span>
                  </div>
                  <div className="flex items-center gap-2 bg-amber-950/80 border border-amber-500/50 p-2 rounded-xl text-amber-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400 flex-shrink-0" />
                    <span><strong>AMBER (-450 to -750 FT/MIN)</strong>: Caution! Fast descent rate. Pull collective to cushion the landing.</span>
                  </div>
                  <div className="flex items-center gap-2 bg-red-950/80 border border-red-500/50 p-2 rounded-xl text-red-300">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-400 flex-shrink-0 animate-ping" />
                    <span><strong>RED (&lt; -750 FT/MIN)</strong>: Danger! Severe sink rate. High risk of airframe structural damage.</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-3.5">
                <div className="flex items-center gap-2 font-mono font-bold text-red-400 text-sm mb-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Preemptive Obstacle Avoidance Radar (TAWS)</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  The forward-looking collision radar scans ahead along your flight path for tall skyscrapers:
                  <br />
                  - A projected radar corridor appears on screen pointing at any building in your way.
                  <br />
                  - The obstacle building rooftop flashes with a neon warning border and height tag.
                  <br />
                  - If an alert triggers (<strong>PULL UP!</strong>), immediately raise your collective slider to clear the roof!
                </p>
              </div>

              <div className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-3.5">
                <div className="flex items-center gap-2 font-mono font-bold text-sky-400 text-sm mb-1">
                  <span>Water Landing Prohibition</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Helicopters cannot land on water. Touching down in open water causes an immediate fatal ditching. Safe landings are permitted on solid ground, asphalt roads, marked helipads, bridges, and piers.
                </p>
              </div>
            </div>
          )}

          {/* --- TAB 4: CITY LANDMARKS --- */}
          {activeTab === 'map' && (
            <div className="space-y-3.5">
              <div className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-3.5">
                <h4 className="font-mono font-bold text-white text-sm mb-2">
                  🗺 Key Helipads & Municipal Facilities
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold border border-emerald-500/30">
                      [H] HQ
                    </span>
                    <div>
                      <strong className="text-white">Central Heliport Base & Hangar Depot</strong>
                      <p className="text-slate-400">Spawn location. Free automatic refueling, repair, and fleet customization.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="px-2 py-0.5 rounded-lg bg-red-500/20 text-red-400 font-mono font-bold border border-red-500/30">
                      [H+] ER
                    </span>
                    <div>
                      <strong className="text-white">Metropolitan Hospital Trauma Center</strong>
                      <p className="text-slate-400">Drop off hoisted rescue victims and medevac patients here for major cash and reputation rewards.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-400 font-mono font-bold border border-sky-500/30">
                      RIVER
                    </span>
                    <div>
                      <strong className="text-white">Metro River & Emerald Lake</strong>
                      <p className="text-slate-400">Hover low (&lt; 35 FT) over any water body to refill your water tank for firefighting.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-400 font-mono font-bold border border-purple-500/30">
                      CIVIC
                    </span>
                    <div>
                      <strong className="text-white">City Hall & Civic Center Plaza</strong>
                      <p className="text-slate-400">Central hub for civil gatherings and riot control missions.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-slate-800/70 border border-slate-700/80 p-3.5">
                <h4 className="font-mono font-bold text-amber-400 text-sm mb-1">
                  Draggable GPS Mini-Map
                </h4>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Grab the header bar of the GPS Mini-Map to reposition it anywhere on your screen. Tap the expand button to toggle between compact radar and enlarged city navigation view!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-400">
            Press [H] or [?] anytime to toggle manual
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm px-5 py-2 shadow-lg transition active:scale-95"
          >
            Got It, Return to Flight
          </button>
        </div>
      </div>
    </div>
  );
};
