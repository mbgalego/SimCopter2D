/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Droplet, Waypoints, Siren, Anchor } from 'lucide-react';
import { FlightInputs } from '../game/physics';

interface TouchControlsProps {
  onInputUpdate: (updater: (prev: FlightInputs) => FlightInputs) => void;
  waterRemaining: number;
  waterMax: number;
  isSirenActive: boolean;
  isMegaphoneActive: boolean;
  isSearchlightActive: boolean;
  isFLIRActive: boolean;
  isHoistDeployed: boolean;
  collective: number;
  isAutoHoverActive?: boolean;
  onToggleAutoHover?: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onInputUpdate,
  waterRemaining,
  isSirenActive,
  isHoistDeployed,
  collective,
  isAutoHoverActive = false,
  onToggleAutoHover,
}) => {
  // Dynamic floating joystick state
  const touchZoneRef = useRef<HTMLDivElement>(null);
  const [stickActive, setStickActive] = useState(false);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });
  const stickPointerIdRef = useRef<number | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);

  // Collective slider state
  const collectiveSliderRef = useRef<HTMLDivElement>(null);
  const collectivePointerIdRef = useRef<number | null>(null);

  // Trigger subtle haptic buzz
  const triggerHaptic = (ms = 15) => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(ms);
      }
    } catch {}
  };

  // Joystick touch handlers
  const handleZonePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    stickPointerIdRef.current = e.pointerId;

    const startX = e.clientX;
    const startY = e.clientY;
    const newOrigin = { x: startX, y: startY };
    originRef.current = newOrigin;
    setOrigin(newOrigin);
    setStickActive(true);
    setStickOffset({ x: 0, y: 0 });
    triggerHaptic(12);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handleZonePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickPointerIdRef.current !== e.pointerId || !originRef.current) return;
    e.preventDefault();

    const maxRadius = 46;
    let dx = e.clientX - originRef.current.x;
    let dy = e.clientY - originRef.current.y;
    const dist = Math.hypot(dx, dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setStickOffset({ x: dx, y: dy });

    const normX = dx / maxRadius;
    const normY = dy / maxRadius; // negative is forward, positive is back

    onInputUpdate((prev) => ({
      ...prev,
      cyclicX: normX,
      cyclicY: normY,
    }));
  };

  const handleZonePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (stickPointerIdRef.current === e.pointerId) {
      stickPointerIdRef.current = null;
      originRef.current = null;
      setStickActive(false);
      setStickOffset({ x: 0, y: 0 });
      onInputUpdate((prev) => ({
        ...prev,
        cyclicX: 0,
        cyclicY: 0,
      }));
    }
  };

  // Collective pointer handlers
  const updateCollectivePos = useCallback(
    (clientY: number) => {
      if (!collectiveSliderRef.current) return;
      const rect = collectiveSliderRef.current.getBoundingClientRect();
      const clampedY = Math.max(rect.top, Math.min(rect.bottom, clientY));
      const ratio = 1 - (clampedY - rect.top) / rect.height;

      onInputUpdate((prev) => ({
        ...prev,
        collective: Math.max(0, Math.min(1, ratio)),
      }));
    },
    [onInputUpdate]
  );

  const handleCollectivePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      collectivePointerIdRef.current = e.pointerId;
      triggerHaptic(10);
      updateCollectivePos(e.clientY);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {}
    },
    [updateCollectivePos]
  );

  // Global window pointermove & pointerup for collective slider
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerId === collectivePointerIdRef.current) {
        updateCollectivePos(e.clientY);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerId === collectivePointerIdRef.current) {
        collectivePointerIdRef.current = null;
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [updateCollectivePos]);

  return (
    <>
      {/* ========================================================================= */}
      {/* --- DYNAMIC FLOATING JOYSTICK TOUCH ZONE (Lower-Left Screen Area) --- */}
      {/* ========================================================================= */}
      <div
        ref={touchZoneRef}
        onPointerDown={handleZonePointerDown}
        onPointerMove={handleZonePointerMove}
        onPointerUp={handleZonePointerUp}
        onPointerCancel={handleZonePointerUp}
        className="pointer-events-auto absolute left-0 bottom-0 w-[44vw] max-w-[360px] h-[48vh] max-h-[400px] touch-none z-20 flex items-end p-4 select-none"
        title="Touch and drag anywhere in this zone to fly"
      >
        {/* Subtle idle guidance hint when not touched */}
        {!stickActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/40 border border-slate-700/40 text-slate-400/80 backdrop-blur-xs transition opacity-60 pointer-events-none">
            <div className="h-2 w-2 rounded-full bg-sky-400/70 animate-pulse" />
            <span className="text-[10px] font-mono tracking-wider uppercase font-semibold">
              Touch to Fly
            </span>
          </div>
        )}

        {/* Dynamic Semi-Transparent Virtual Joystick rendered at touch point */}
        {stickActive && origin && (
          <div
            className="fixed pointer-events-none z-30 transition-opacity"
            style={{
              left: `${origin.x}px`,
              top: `${origin.y}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Outer Base Ring */}
            <div className="relative flex items-center justify-center h-28 w-28 rounded-full bg-slate-950/50 border-2 border-sky-400/60 backdrop-blur-md shadow-2xl">
              {/* Inner crosshairs */}
              <div className="absolute inset-x-3 top-1/2 h-px bg-sky-400/30" />
              <div className="absolute inset-y-3 left-1/2 w-px bg-sky-400/30" />
              <div className="h-12 w-12 rounded-full border border-sky-400/20" />

              {/* Center thumbstick knob */}
              <div
                className="absolute flex items-center justify-center h-13 w-13 rounded-full bg-sky-500/80 border-2 border-sky-200 shadow-lg shadow-sky-500/50 transition-transform"
                style={{
                  transform: `translate(${stickOffset.x}px, ${stickOffset.y}px)`,
                }}
              >
                <div className="h-3.5 w-3.5 rounded-full bg-white/80" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* --- RIGHT THUMB: Actions, Auto-Hover Button & Collective Slider --- */}
      {/* ========================================================================= */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-end p-3 sm:p-5 select-none pb-safe z-20">
        <div className="pointer-events-auto flex items-end gap-3 mr-1 mb-1 touch-none">
          {/* Contextual Mission Action Buttons */}
          <div className="flex flex-col items-center gap-2 mb-0.5">
            {/* Water Drop Cannon Button */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                triggerHaptic(20);
                onInputUpdate((p) => ({ ...p, dropWater: true }));
              }}
              onPointerUp={(e) => {
                e.preventDefault();
                onInputUpdate((p) => ({ ...p, dropWater: false }));
              }}
              className={`flex flex-col items-center justify-center h-14 w-14 rounded-2xl border shadow-xl active:scale-95 transition ${
                waterRemaining > 0
                  ? 'bg-sky-600 hover:bg-sky-500 text-white border-sky-300 shadow-sky-950/60'
                  : 'bg-slate-900/80 text-slate-500 border-slate-800'
              }`}
              title="Drop Water from Nose Cannon (Key [F])"
            >
              <Droplet className="w-5 h-5 fill-current" />
              <span className="text-[9px] font-mono font-bold mt-0.5">DROP</span>
            </button>

            {/* Rescue Hoist Button */}
            <button
              onClick={() => {
                triggerHaptic(15);
                onInputUpdate((p) => ({ ...p, toggleHoist: !p.toggleHoist }));
              }}
              className={`flex flex-col items-center justify-center h-13 w-14 rounded-2xl border shadow-xl active:scale-95 transition ${
                isHoistDeployed
                  ? 'bg-amber-500 text-slate-950 border-amber-200 font-bold animate-pulse'
                  : 'bg-slate-900/85 text-slate-300 border-slate-700/80 hover:text-white'
              }`}
              title="Deploy/Retract Winch Hoist (Key [R])"
            >
              <Waypoints className="w-5 h-5" />
              <span className="text-[9px] font-mono font-bold mt-0.5">
                {isHoistDeployed ? 'RETRACT' : 'HOIST'}
              </span>
            </button>

            {/* Emergency Siren Toggle */}
            <button
              onClick={() => {
                triggerHaptic(12);
                onInputUpdate((p) => ({
                  ...p,
                  toggleSiren: !p.toggleSiren,
                  toggleSearchlight: !p.toggleSiren,
                }));
              }}
              className={`flex items-center justify-center h-8 w-14 rounded-xl border shadow-md active:scale-95 transition ${
                isSirenActive
                  ? 'bg-red-600 text-white border-red-300 animate-pulse'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:text-white'
              }`}
              title="Toggle Siren & Searchlight (Key [X])"
            >
              <Siren className="w-3.5 h-3.5 mr-1" />
              <span className="text-[9px] font-mono font-bold">SIREN</span>
            </button>
          </div>

          {/* Collective Slider with Auto-Hover Toggle Button right on top */}
          <div className="flex flex-col items-center">
            {/* Auto-Hover Toggle Button (User requested: right on top of collective) */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                triggerHaptic(18);
                onToggleAutoHover?.();
              }}
              className={`mb-2 w-12 sm:w-13 py-1.5 rounded-xl border flex flex-col items-center justify-center transition-all active:scale-95 shadow-lg ${
                isAutoHoverActive
                  ? 'bg-cyan-600 text-white border-cyan-300 shadow-cyan-950 ring-2 ring-cyan-400/60 animate-pulse'
                  : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:text-white hover:border-slate-500'
              }`}
              title="Toggle Auto-Hover Altitude & Drift Lock (Key [Z])"
            >
              <Anchor className="w-3.5 h-3.5 mb-0.5" />
              <span className="text-[8px] font-mono font-bold leading-none uppercase">
                {isAutoHoverActive ? 'HOVER' : 'AUTO'}
              </span>
              <span className="text-[7px] font-mono opacity-80 leading-none uppercase mt-0.5">
                {isAutoHoverActive ? 'ON' : 'HOVER'}
              </span>
            </button>

            {/* Collective (Altitude / Lift) Slider */}
            <div
              ref={collectiveSliderRef}
              onPointerDown={handleCollectivePointerDown}
              className="relative h-36 w-12 sm:h-40 sm:w-13 rounded-2xl bg-slate-950/85 border-2 border-slate-700/90 backdrop-blur-md shadow-2xl overflow-hidden cursor-pointer"
            >
              {/* Collective Fill Bar */}
              <div
                className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-emerald-600 via-sky-500 to-amber-500 transition-all"
                style={{ height: `${collective * 100}%` }}
              />

              {/* Hover Level Line (50%) */}
              <div className="absolute top-1/2 inset-x-0 h-0.5 bg-white/70" />

              {/* Tactile Slider Knob */}
              <div
                className="absolute inset-x-1 h-7 rounded-xl bg-white border border-slate-300 shadow-lg flex items-center justify-center pointer-events-none transition-all"
                style={{
                  bottom: `calc(${collective * 100}% - 14px)`,
                }}
              >
                <div className="h-1 w-4 rounded-full bg-slate-700" />
              </div>
            </div>
            <span className="mt-1 text-[10px] font-mono font-bold tracking-wider text-slate-300 uppercase">
              ALTITUDE
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
