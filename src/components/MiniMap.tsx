/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Maximize2, Minimize2, Move } from 'lucide-react';
import { CityData, HelicopterState, Mission } from '../types/game';

interface MiniMapProps {
  city: CityData;
  heli: HelicopterState;
  mission: Mission | null;
}

export const MiniMap: React.FC<MiniMapProps> = ({ city, heli, mission }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number } | null>(null);

  const size = isExpanded ? 220 : 120;

  // Strict clamp so the minimap is ALWAYS 100% visible on screen, never cut off
  const clampPos = useCallback((x: number, y: number, s: number) => {
    const minX = 8;
    const maxX = Math.max(minX, window.innerWidth - s - 12);
    const minY = 48;
    const maxY = Math.max(minY, window.innerHeight - s - 38);
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  }, []);

  // Re-clamp position on window resize or when size changes
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => (prev ? clampPos(prev.x, prev.y, size) : null));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPos, size]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      const nextSize = next ? 220 : 120;
      setPosition((currentPos) => (currentPos ? clampPos(currentPos.x, currentPos.y, nextSize) : null));
      return next;
    });
  }, [clampPos]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, size, size);

    // Grid coordinate scale
    const scale = size / city.width;

    // 1. Draw Park Zones
    if (city.parkZones) {
      city.parkZones.forEach((pz) => {
        ctx.fillStyle = pz.color || '#143828';
        ctx.fillRect(pz.x * scale, pz.y * scale, pz.width * scale, pz.height * scale);
      });
    }

    // 2. Draw Water Bodies
    city.waterBodies.forEach((wb) => {
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(wb.x * scale, wb.y * scale, wb.width * scale, wb.height * scale);
    });

    // 3. Draw Bridges
    if (city.bridges) {
      city.bridges.forEach((b) => {
        ctx.fillStyle = '#475569';
        ctx.fillRect(b.x * scale, b.y * scale, b.width * scale, b.height * scale);
      });
    }

    // 4. Draw Major Roads
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    city.roads.forEach((road) => {
      ctx.beginPath();
      ctx.moveTo(road.x1 * scale, road.y1 * scale);
      ctx.lineTo(road.x2 * scale, road.y2 * scale);
      ctx.stroke();
    });

    // 5. Draw Hospital Helipad (Red Cross)
    const hospital = city.helipads.find((h) => h.type === 'hospital');
    if (hospital) {
      const hx = hospital.x * scale;
      const hy = hospital.y * scale;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hx - 1, hy - 3, 2, 6);
      ctx.fillRect(hx - 3, hy - 1, 6, 2);
    }

    // 6. Draw Heliport HQ (Green H)
    const heliport = city.helipads.find((h) => h.type === 'hangar');
    if (heliport) {
      const hx = heliport.x * scale;
      const hy = heliport.y * scale;
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(hx, hy, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 7. Active Fires (Flashing Orange/Red)
    const fireFlash = Math.floor(Date.now() / 250) % 2 === 0;
    city.fires.forEach((fire) => {
      ctx.fillStyle = fireFlash ? '#f97316' : '#ef4444';
      ctx.beginPath();
      ctx.arc(fire.x * scale, fire.y * scale, 3.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 8. Active Mission Objective Beacon
    if (mission) {
      const mx = mission.x * scale;
      const my = mission.y * scale;
      const pulse = 4 + (Math.sin(Date.now() * 0.008) + 1) * 3;

      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mx, my, pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(mx, my, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 9. Player Helicopter
    const px = heli.x * scale;
    const py = heli.y * scale;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(heli.heading);

    // Helicopter heading wedge / triangle
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 4);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // Radar sweep ring border
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, size, size);
  }, [city, heli.x, heli.y, heli.heading, mission, isExpanded, size]);

  // Pointer drag events
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: rect.left,
      initY: rect.top,
    };
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setPosition(clampPos(dragStartRef.current.initX + dx, dragStartRef.current.initY + dy, size));
  }, [isDragging, size, clampPos]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  }, [isDragging]);

  const defaultStyle: React.CSSProperties = position
    ? { position: 'fixed', left: `${position.x}px`, top: `${position.y}px`, width: `${size}px` }
    : { position: 'fixed', right: '12px', top: '78px', width: `${size}px` };

  return (
    <div
      ref={containerRef}
      style={defaultStyle}
      className="pointer-events-auto z-30 select-none touch-none"
    >
      <div className="relative rounded-2xl overflow-hidden bg-slate-900/95 border-2 border-slate-700/90 shadow-2xl backdrop-blur-md">
        {/* Draggable Header Bar */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className={`flex items-center justify-between px-2 py-1 bg-slate-950/90 border-b border-slate-800 text-[10px] font-mono text-slate-300 cursor-grab active:cursor-grabbing transition-colors ${
            isDragging ? 'bg-sky-950/80 border-sky-500/50 text-sky-200' : ''
          }`}
          title="Drag anywhere to reposition GPS Map"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <Move className="w-3 h-3 text-sky-400" />
            <span className="text-[9px] tracking-wider uppercase">GPS RADAR</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
            className="flex items-center justify-center h-4 w-4 rounded text-slate-400 hover:text-white"
            title="Toggle Map Size"
          >
            {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
        </div>

        {/* Canvas Display */}
        <canvas
          ref={canvasRef}
          style={{ width: `${size}px`, height: `${size}px` }}
          className="block cursor-pointer"
          onClick={toggleExpanded}
        />
      </div>
    </div>
  );
};
