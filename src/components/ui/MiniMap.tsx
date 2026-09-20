import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../../game/core/GameEngine';
import { Map, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { TileType } from '../../game/types';

interface MiniMapProps {
  engine: GameEngine | null;
  showPoliticalMap: boolean;
}

export const MiniMap: React.FC<MiniMapProps> = ({ engine, showPoliticalMap }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Cached world image data
  const worldImgRef = useRef<ImageData | null>(null);
  const lastWorldGenRef = useRef<number>(0);

  const renderMinimap = useCallback(() => {
    if (!engine || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const world = engine.world;
    const camera = engine.camera;
    const mapW = canvas.width;
    const mapH = canvas.height;

    // 1. Prepare / update low-res world texture
    if (!worldImgRef.current || worldImgRef.current.width !== mapW || worldImgRef.current.height !== mapH) {
      worldImgRef.current = ctx.createImageData(mapW, mapH);
    }

    const imgData = worldImgRef.current;
    const data = imgData.data;
    const scaleX = world.width / mapW;
    const scaleY = world.height / mapH;

    // Sample world tiles
    for (let my = 0; my < mapH; my++) {
      const wy = Math.floor(my * scaleY);
      for (let mx = 0; mx < mapW; mx++) {
        const wx = Math.floor(mx * scaleX);
        const tile = world.getTile(wx, wy);
        const idx = (my * mapW + mx) * 4;

        if (showPoliticalMap && engine.simulation.territoryManager) {
          const ownerId = engine.simulation.territoryManager.getTileOwner(wx, wy);
          if (ownerId) {
            const kingdom = engine.simulation.kingdomManager.getKingdom(ownerId);
            if (kingdom) {
              // Parse kingdom hex color
              const hex = kingdom.color.replace('#', '');
              const cr = parseInt(hex.substring(0, 2), 16) || 120;
              const cg = parseInt(hex.substring(2, 4), 16) || 120;
              const cb = parseInt(hex.substring(4, 6), 16) || 120;
              data[idx] = cr;
              data[idx + 1] = cg;
              data[idx + 2] = cb;
              data[idx + 3] = 255;
              continue;
            }
          }
        }

        // Biome / terrain colors
        if (tile === TileType.WATER) {
          data[idx] = 20;
          data[idx + 1] = 50;
          data[idx + 2] = 110;
        } else if (tile === TileType.SHALLOW_WATER) {
          data[idx] = 45;
          data[idx + 1] = 95;
          data[idx + 2] = 165;
        } else if (tile === TileType.SAND) {
          data[idx] = 217;
          data[idx + 1] = 180;
          data[idx + 2] = 100;
        } else if (tile === TileType.LAND) {
          data[idx] = 58;
          data[idx + 1] = 140;
          data[idx + 2] = 65;
        } else if (tile === TileType.FOREST) {
          data[idx] = 24;
          data[idx + 1] = 92;
          data[idx + 2] = 40;
        } else if (tile === TileType.MOUNTAIN) {
          data[idx] = 125;
          data[idx + 1] = 120;
          data[idx + 2] = 115;
        } else if (tile === TileType.SNOW) {
          data[idx] = 240;
          data[idx + 1] = 245;
          data[idx + 2] = 250;
        } else {
          data[idx] = 60;
          data[idx + 1] = 120;
          data[idx + 2] = 60;
        }
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // 2. Draw settlements as small bright markers
    for (const s of engine.simulation.settlementManager.settlements.values()) {
      const smx = Math.floor((s.centerX / world.width) * mapW);
      const smy = Math.floor((s.centerY / world.height) * mapH);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(smx - 1, smy - 1, 3, 3);
    }

    // 3. Draw Camera Viewport Rectangle
    const viewWorldW = engine.renderer.canvas.width / camera.zoom;
    const viewWorldH = engine.renderer.canvas.height / camera.zoom;
    const camLeft = camera.x - viewWorldW / 2;
    const camTop = camera.y - viewWorldH / 2;

    const rectX = (camLeft / world.width) * mapW;
    const rectY = (camTop / world.height) * mapH;
    const rectW = (viewWorldW / world.width) * mapW;
    const rectH = (viewWorldH / world.height) * mapH;

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rectX, rectY, rectW, rectH);

    ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.fillRect(rectX, rectY, rectW, rectH);
  }, [engine, showPoliticalMap]);

  useEffect(() => {
    if (!engine) return;

    let animId: number;
    let lastRenderTime = 0;

    const loop = (time: number) => {
      // Throttle minimap updates to ~20 FPS for crisp performance
      if (time - lastRenderTime > 50) {
        lastRenderTime = time;
        renderMinimap();
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [engine, renderMinimap]);

  const handlePointerInteraction = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!engine || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = Math.max(0, Math.min(canvasRef.current.width, e.clientX - rect.left));
    const py = Math.max(0, Math.min(canvasRef.current.height, e.clientY - rect.top));

    const worldX = (px / canvasRef.current.width) * engine.world.width;
    const worldY = (py / canvasRef.current.height) * engine.world.height;

    engine.camera.setPosition(worldX, worldY, engine.world.width, engine.world.height);
    engine.camera.vx = 0;
    engine.camera.vy = 0;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    handlePointerInteraction(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    handlePointerInteraction(e);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // safe fallback
    }
  };

  return (
    <div
      id="mini-map-container"
      className="absolute top-4 right-4 z-20 flex flex-col items-end pointer-events-auto select-none"
    >
      {/* Header bar */}
      <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-2.5 py-1.5 rounded-t-lg shadow-xl text-xs text-slate-300">
        <Map className="w-3.5 h-3.5 text-sky-400" />
        <span className="font-semibold text-slate-200 tracking-wide">Миникарта</span>
        <button
          id="btn-toggle-minimap"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="ml-2 text-slate-400 hover:text-white transition-colors p-0.5"
          title={isCollapsed ? 'Развернуть карту' : 'Свернуть карту'}
        >
          {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Map body */}
      {!isCollapsed && (
        <div className="bg-slate-900/95 backdrop-blur-md border-x border-b border-slate-800 p-1.5 rounded-b-lg shadow-2xl flex flex-col items-center">
          <canvas
            id="mini-map-canvas"
            ref={canvasRef}
            width={140}
            height={140}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="rounded border border-slate-700/80 cursor-crosshair bg-slate-950 block shadow-inner"
            title="Кликните или потяните для перемещения камеры"
          />
          <div className="w-full flex justify-between items-center px-1 pt-1 text-[10px] text-slate-400">
            <span>{engine ? `${engine.world.width} × ${engine.world.height}` : '—'}</span>
            <span className="text-sky-400">Перемещение</span>
          </div>
        </div>
      )}
    </div>
  );
};
