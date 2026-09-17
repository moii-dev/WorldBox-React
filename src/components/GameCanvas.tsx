import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../game/core/GameEngine';
import {
  ToolType,
  SimulationStats,
  HumanEntity,
  BuildingEntity,
  SettlementEntity,
  KingdomEntity,
  WorldEvent,
  WorldGenPreset,
} from '../game/types';
import { Toolbar } from './ui/Toolbar';
import { StatsBar } from './ui/StatsBar';
import { CivilizationInspector } from './ui/CivilizationInspector';
import { EventLog } from './ui/EventLog';
import { HelpOverlay } from './ui/HelpOverlay';

interface Toast {
  id: number;
  message: string;
}

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // UI state synchronized with engine
  const [activeTool, setActiveTool] = useState<ToolType>('land');
  const [brushSize, setBrushSize] = useState<number>(5);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showPoliticalMap, setShowPoliticalMap] = useState<boolean>(false);
  const [stats, setStats] = useState<SimulationStats | null>(null);

  const [selectedHuman, setSelectedHuman] = useState<HumanEntity | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingEntity | null>(null);
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementEntity | null>(null);
  const [selectedKingdom, setSelectedKingdom] = useState<KingdomEntity | null>(null);

  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Initial canvas size
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    // Instantiate game engine
    const engine = new GameEngine(canvas);
    engineRef.current = engine;

    // Initial events
    setWorldEvents([...engine.simulation.historyManager.eventsList]);

    // Subscribe to engine events
    const unsubStats = engine.events.on('statsUpdated', (newStats: SimulationStats) => {
      setStats(newStats);
      setIsPaused(newStats.isPaused);
      setSimSpeed(newStats.simSpeed);
    });

    const unsubHumanSelected = engine.events.on('humanSelected', (human: HumanEntity | null) => {
      setSelectedHuman(human ? { ...human } : null);
      if (human) {
        setSelectedBuilding(null);
      }
    });

    const unsubBuildingSelected = engine.events.on('buildingSelected', (bld: BuildingEntity | null) => {
      setSelectedBuilding(bld ? { ...bld } : null);
      if (bld) {
        setSelectedHuman(null);
      }
    });

    const unsubPoliticalMap = engine.events.on('politicalMapToggled', (active: boolean) => {
      setShowPoliticalMap(active);
    });

    const unsubWorldEvent = engine.events.on('worldEventLogged', () => {
      setWorldEvents([...engine.simulation.historyManager.eventsList]);
    });

    const unsubPlacementFailed = engine.events.on(
      'placementFailed',
      (data: { reason: string }) => {
        addToast(data.reason);
      }
    );

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          engine.resize(Math.floor(w), Math.floor(h));
        }
      }
    });

    resizeObserver.observe(container);

    // Periodic sync of selected human / building / settlement / kingdom to update UI
    const inspectorSyncInterval = setInterval(() => {
      if (engine.entityManager.selectedHumanId) {
        const h = engine.entityManager.getSelectedHuman();
        if (h) {
          setSelectedHuman({
            id: h.id,
            name: h.name,
            sex: h.sex,
            age: h.age,
            lifeStage: h.lifeStage,
            profession: h.profession,
            health: h.health,
            maxHealth: h.maxHealth,
            homeId: h.homeId,
            settlementId: h.settlementId,
            kingdomId: h.kingdomId,
            partnerId: h.partnerId,
            parents: h.parents,
            children: h.children,
            kills: h.kills,
            x: h.x,
            y: h.y,
            targetX: h.targetX,
            targetY: h.targetY,
            targetResourceId: h.targetResourceId,
            targetBuildingId: h.targetBuildingId,
            targetEnemyId: h.targetEnemyId,
            state: h.state,
            inventory: { ...h.inventory },
            path: h.path,
            stateTimer: h.stateTimer,
            walkFrame: h.walkFrame,
            facing: h.facing,
            gatherProgress: h.gatherProgress,
            buildProgress: h.buildProgress,
            attackCooldownTimer: h.attackCooldownTimer,
            isAttackingAnim: h.isAttackingAnim,
            hitFlashTimer: h.hitFlashTimer,
            colorTheme: h.colorTheme,
          });

          if (h.settlementId) {
            const s = engine.simulation.settlementManager.getSettlement(h.settlementId);
            setSelectedSettlement(s || null);
          } else {
            setSelectedSettlement(null);
          }

          if (h.kingdomId) {
            const k = engine.simulation.kingdomManager.getKingdom(h.kingdomId);
            setSelectedKingdom(k || null);
          } else {
            setSelectedKingdom(null);
          }
        } else {
          setSelectedHuman(null);
        }
      }

      if (engine.simulation.buildingManager.selectedBuildingId) {
        const b = engine.simulation.buildingManager.getSelectedBuilding();
        if (b) {
          setSelectedBuilding({
            id: b.id,
            type: b.type,
            x: b.x,
            y: b.y,
            width: b.width,
            height: b.height,
            settlementId: b.settlementId,
            kingdomId: b.kingdomId,
            constructionProgress: b.constructionProgress,
            isCompleted: b.isCompleted,
            woodNeeded: b.woodNeeded,
            woodDelivered: b.woodDelivered,
            stoneNeeded: b.stoneNeeded,
            stoneDelivered: b.stoneDelivered,
            occupants: [...b.occupants],
            maxOccupants: b.maxOccupants,
            captureProgress: b.captureProgress,
            capturingKingdomId: b.capturingKingdomId,
          });

          if (b.settlementId) {
            const s = engine.simulation.settlementManager.getSettlement(b.settlementId);
            setSelectedSettlement(s || null);
          }
          if (b.kingdomId) {
            const k = engine.simulation.kingdomManager.getKingdom(b.kingdomId);
            setSelectedKingdom(k || null);
          }
        } else {
          setSelectedBuilding(null);
        }
      }
    }, 100);

    return () => {
      clearInterval(inspectorSyncInterval);
      resizeObserver.disconnect();
      unsubStats();
      unsubHumanSelected();
      unsubBuildingSelected();
      unsubPoliticalMap();
      unsubWorldEvent();
      unsubPlacementFailed();
      engine.destroy();
      engineRef.current = null;
    };
  }, [addToast]);

  // UI Handlers
  const handleSelectTool = (tool: ToolType) => {
    setActiveTool(tool);
    if (engineRef.current) {
      engineRef.current.setTool(tool);
    }
  };

  const handleChangeBrushSize = (size: number) => {
    setBrushSize(size);
    if (engineRef.current) {
      engineRef.current.setBrushRadius(size);
    }
  };

  const handleTogglePause = () => {
    if (engineRef.current) {
      engineRef.current.togglePause();
    }
  };

  const handleChangeSpeed = (speed: number) => {
    if (engineRef.current) {
      engineRef.current.setSpeed(speed);
    }
  };

  const handleGenerateWorld = (preset: WorldGenPreset) => {
    if (engineRef.current) {
      engineRef.current.generateWorld(preset);
      engineRef.current.spawnInitialPioneers();
      addToast(`Generated new ${preset} world`);
    }
  };

  const handleClearWorld = () => {
    if (engineRef.current) {
      engineRef.current.clearWorld();
      addToast('World cleared');
    }
  };

  const handleCenterCamera = (worldX: number, worldY: number) => {
    if (engineRef.current) {
      engineRef.current.camera.setPosition(
        worldX,
        worldY,
        engineRef.current.world.width,
        engineRef.current.world.height
      );
    }
  };

  const handleCloseInspector = () => {
    setSelectedHuman(null);
    setSelectedBuilding(null);
    setSelectedSettlement(null);
    setSelectedKingdom(null);
    if (engineRef.current) {
      engineRef.current.entityManager.selectHuman(null);
      engineRef.current.simulation.buildingManager.selectBuilding(null);
    }
  };

  const handleTogglePoliticalMap = () => {
    if (engineRef.current) {
      engineRef.current.events.emit('togglePoliticalMap', null);
    }
  };

  return (
    <div
      ref={containerRef}
      id="game-container"
      className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none font-sans"
    >
      {/* HTML5 Canvas for fast pixel sandbox render */}
      <canvas
        ref={canvasRef}
        id="game-canvas"
        className="block w-full h-full cursor-crosshair"
      />

      {/* Top Stats and Demographics Bar */}
      <StatsBar stats={stats} />

      {/* World Chronicle / Event Log */}
      <EventLog events={worldEvents} />

      {/* Inspector for Humans, Buildings, Settlements, Kingdoms */}
      <CivilizationInspector
        human={selectedHuman}
        building={selectedBuilding}
        settlement={selectedSettlement}
        kingdom={selectedKingdom}
        onClose={handleCloseInspector}
        onCenterCamera={handleCenterCamera}
      />

      {/* Bottom Sandbox Toolbar */}
      <Toolbar
        activeTool={activeTool}
        onSelectTool={handleSelectTool}
        brushSize={brushSize}
        onChangeBrushSize={handleChangeBrushSize}
        simSpeed={simSpeed}
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
        onChangeSpeed={handleChangeSpeed}
        onGenerateWorld={handleGenerateWorld}
        onClearWorld={handleClearWorld}
        showPoliticalMap={showPoliticalMap}
        onTogglePoliticalMap={handleTogglePoliticalMap}
      />

      {/* Controls & Interaction Guide Overlay */}
      <HelpOverlay />

      {/* Floating Notifications / Toasts */}
      <div className="absolute bottom-24 right-4 z-40 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-amber-300 text-xs shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-right duration-200"
          >
            ⚠️ {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
};
