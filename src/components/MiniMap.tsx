/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Maximize2, Minimize2, Navigation } from 'lucide-react';
import { CityData, HelicopterState, Mission } from '../types/game';

interface MiniMapProps {
  city: CityData;
  heli: HelicopterState;
  mission: Mission | null;
}

export const MiniMap: React.FC<MiniMapProps> = ({ city, heli, mission }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const size = isExpanded ? 220 : 120;

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

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

  return (
    <div
      style={{ position: 'fixed', right: '10px', top: '46px', width: `${size}px` }}
      className="pointer-events-auto z-30 select-none"
    >
      <div className="relative rounded-2xl overflow-hidden bg-slate-900/95 border-2 border-slate-700/90 shadow-2xl backdrop-blur-md">
        {/* Fixed Header Bar with Resize Toggle */}
        <div
          className="flex items-center justify-between px-2 py-1 bg-slate-950/90 border-b border-slate-800 text-[10px] font-mono text-slate-300"
        >
          <div className="flex items-center gap-1.5 font-bold">
            <Navigation className="w-3 h-3 text-sky-400" />
            <span className="text-[9px] tracking-wider uppercase">GPS RADAR</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
            className="flex items-center justify-center h-4 w-4 rounded text-slate-400 hover:text-white transition-colors"
            title={isExpanded ? 'Minimize Map Size' : 'Expand Map Size'}
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
          title="Click to toggle map size"
        />
      </div>
    </div>
  );
};
