import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../game/core/GameEngine';
import {
  SimulationStats,
  HumanEntity,
  BuildingEntity,
  SettlementEntity,
  KingdomEntity,
  WorldEvent,
  WorldGenPreset,
  Animal,
} from '../game/types';
import { Toolbar } from './ui/Toolbar';
import { ToolContextPanel } from './ui/ToolContextPanel';
import { MiniMap } from './ui/MiniMap';
import { InspectorPanel } from './ui/InspectorPanel';
import { StatsBar } from './ui/StatsBar';
import { CivilizationInspector } from './ui/CivilizationInspector';
import { EventLog } from './ui/EventLog';
import { HelpOverlay } from './ui/HelpOverlay';
import { SaveLoadModal } from './ui/SaveLoadModal';

interface Toast {
  id: number;
  message: string;
}

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // UI state synchronized with engine
  const [activeTool, setActiveTool] = useState<string>('grassland');
  const [brushRadius, setBrushRadius] = useState<number>(5);
  const [brushHardness, setBrushHardness] = useState<number>(1.0);
  const [eraseLandToWater, setEraseLandToWater] = useState<boolean>(false);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);
  const [selectedCount, setSelectedCount] = useState<number>(0);
  const [inspectData, setInspectData] = useState<{ category: string; data: any } | null>(null);

  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showPoliticalMap, setShowPoliticalMap] = useState<boolean>(false);
  const [stats, setStats] = useState<SimulationStats | null>(null);

  const [selectedHuman, setSelectedHuman] = useState<HumanEntity | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingEntity | null>(null);
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [selectedSettlement, setSelectedSettlement] = useState<SettlementEntity | null>(null);
  const [selectedKingdom, setSelectedKingdom] = useState<KingdomEntity | null>(null);

  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState<boolean>(false);

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

    const unsubToolChanged = engine.events.on('activeToolChanged', (toolId: string) => {
      setActiveTool(toolId);
    });

    const unsubBrushRadius = engine.events.on('brushRadiusChanged', (r: number) => {
      setBrushRadius(r);
    });

    const unsubBrushHardness = engine.events.on('brushHardnessChanged', (h: number) => {
      setBrushHardness(h);
    });

    const unsubEraseLand = engine.events.on('eraseLandToWaterChanged', (val: boolean) => {
      setEraseLandToWater(val);
    });

    const unsubHistory = engine.events.on('historyChanged', (h: { canUndo: boolean; canRedo: boolean }) => {
      setCanUndo(h.canUndo);
      setCanRedo(h.canRedo);
    });

    const unsubMultipleSelected = engine.events.on('multipleSelected', (data: { count: number }) => {
      setSelectedCount(data.count);
    });

    const unsubSelectionCleared = engine.events.on('selectionCleared', () => {
      setSelectedCount(0);
    });

    const unsubInspectData = engine.events.on('inspectData', (data: { category: string; data: any }) => {
      setInspectData(data);
    });

    const unsubHumanSelected = engine.events.on('humanSelected', (human: HumanEntity | null) => {
      setSelectedHuman(human ? { ...human } : null);
      if (human) {
        setSelectedBuilding(null);
        setSelectedAnimal(null);
        setSelectedCount(1);
      }
    });

    const unsubBuildingSelected = engine.events.on('buildingSelected', (bld: BuildingEntity | null) => {
      setSelectedBuilding(bld ? { ...bld } : null);
      if (bld) {
        setSelectedHuman(null);
        setSelectedAnimal(null);
        setSelectedCount(1);
      }
    });

    const unsubAnimalSelected = engine.events.on('animalSelected', (animal: Animal | null) => {
      setSelectedAnimal(animal ? { ...animal } : null);
      if (animal) {
        setSelectedHuman(null);
        setSelectedBuilding(null);
        setSelectedCount(1);
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
            hunger: h.hunger,
            maxHunger: h.maxHunger,
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
            cropStage: b.cropStage,
            cropProgress: b.cropProgress,
            livestockIds: b.livestockIds ? [...b.livestockIds] : [],
            livestockCapacity: b.livestockCapacity,
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

      if (engine.simulation.animalManager.selectedAnimalId) {
        const a = engine.simulation.animalManager.getSelectedAnimal();
        if (a) {
          setSelectedAnimal({ ...a });
        } else {
          setSelectedAnimal(null);
        }
      }
    }, 100);

    return () => {
      clearInterval(inspectorSyncInterval);
      resizeObserver.disconnect();
      unsubStats();
      unsubToolChanged();
      unsubBrushRadius();
      unsubBrushHardness();
      unsubEraseLand();
      unsubHistory();
      unsubMultipleSelected();
      unsubSelectionCleared();
      unsubInspectData();
      unsubHumanSelected();
      unsubBuildingSelected();
      unsubAnimalSelected();
      unsubPoliticalMap();
      unsubWorldEvent();
      unsubPlacementFailed();
      engine.destroy();
      engineRef.current = null;
    };
  }, [addToast]);

  // UI Handlers
  const handleSelectTool = (toolId: string) => {
    setActiveTool(toolId);
    if (engineRef.current) {
      engineRef.current.setTool(toolId);
    }
  };

  const handleChangeBrushRadius = (radius: number) => {
    setBrushRadius(radius);
    if (engineRef.current) {
      engineRef.current.setBrushRadius(radius);
    }
  };

  const handleChangeBrushHardness = (hardness: number) => {
    setBrushHardness(hardness);
    if (engineRef.current) {
      engineRef.current.setBrushHardness(hardness);
    }
  };

  const handleToggleEraseLand = (val: boolean) => {
    setEraseLandToWater(val);
    if (engineRef.current) {
      engineRef.current.setEraseLandToWater(val);
    }
  };

  const handleUndo = () => {
    if (engineRef.current) {
      engineRef.current.undo();
    }
  };

  const handleRedo = () => {
    if (engineRef.current) {
      engineRef.current.redo();
    }
  };

  const handleClearSelection = () => {
    setSelectedCount(0);
    setSelectedHuman(null);
    setSelectedBuilding(null);
    setSelectedAnimal(null);
    if (engineRef.current) {
      engineRef.current.entityManager.selectHuman(null);
      engineRef.current.simulation.buildingManager.selectBuilding(null);
      engineRef.current.simulation.animalManager.selectAnimal(null);
      engineRef.current.renderer.selectedEntityIds.clear();
      engineRef.current.events.emit('selectionCleared', null);
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
      const presetNames: Record<string, string> = {
        CONTINENTS: 'Континенты',
        ISLANDS: 'Острова',
        PANGEA: 'Пангея',
        ARCHIPELAGO: 'Архипелаг',
      };
      addToast(`Сгенерирован новый мир: ${presetNames[preset] || preset}`);
    }
  };

  const handleClearWorld = () => {
    if (engineRef.current) {
      engineRef.current.clearWorld();
      addToast('Мир очищен (океан)');
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

  const handleSlaughterAnimal = (animalId: string) => {
    if (engineRef.current) {
      engineRef.current.slaughterAnimal(animalId);
      setSelectedAnimal(null);
      addToast('Животное забито для получения пищи');
    }
  };

  const handleDomesticateAnimal = (animalId: string) => {
    if (engineRef.current) {
      engineRef.current.domesticateAnimal(animalId);
      addToast('Животное приручено');
    }
  };

  const handleCloseInspector = () => {
    handleClearSelection();
    setSelectedSettlement(null);
    setSelectedKingdom(null);
    setInspectData(null);
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

      {/* Mini Map (Collapsible, Interactive) */}
      <MiniMap
        engine={engineRef.current}
        showPoliticalMap={showPoliticalMap}
      />

      {/* Inspector for Humans, Buildings, Settlements, Kingdoms */}
      <CivilizationInspector
        human={selectedHuman}
        building={selectedBuilding}
        animal={selectedAnimal}
        settlement={selectedSettlement}
        kingdom={selectedKingdom}
        onClose={handleCloseInspector}
        onCenterCamera={handleCenterCamera}
        onSlaughterAnimal={handleSlaughterAnimal}
        onDomesticateAnimal={handleDomesticateAnimal}
      />

      {/* Non-destructive Inspector Details Modal */}
      <InspectorPanel
        inspectData={inspectData}
        onClose={() => setInspectData(null)}
      />

      {/* Floating Bottom Toolbar & Context Panel */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
        {/* Dynamic Tool Context Panel */}
        <ToolContextPanel
          engine={engineRef.current}
          activeTool={activeTool}
          brushRadius={brushRadius}
          brushHardness={brushHardness}
          eraseLandToWater={eraseLandToWater}
          selectedCount={selectedCount}
          onSetBrushRadius={handleChangeBrushRadius}
          onSetBrushHardness={handleChangeBrushHardness}
          onToggleEraseLandToWater={handleToggleEraseLand}
          onClearSelection={handleClearSelection}
        />

        {/* Main Scalable Toolbar with ComboBoxes */}
        <div className="pointer-events-auto">
          <Toolbar
            activeTool={activeTool}
            onSelectTool={handleSelectTool}
            isPaused={isPaused}
            onTogglePause={handleTogglePause}
            simSpeed={simSpeed}
            onChangeSpeed={handleChangeSpeed}
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={handleUndo}
            onRedo={handleRedo}
            showPoliticalMap={showPoliticalMap}
            onTogglePoliticalMap={handleTogglePoliticalMap}
            onGenerateWorld={handleGenerateWorld}
            onClearWorld={handleClearWorld}
            onOpenSaveLoad={() => setIsSaveModalOpen(true)}
          />
        </div>
      </div>

      {/* Save / Load World Modal */}
      <SaveLoadModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        engine={engineRef.current}
        onWorldLoaded={() => {
          if (engineRef.current) {
            setWorldEvents([...engineRef.current.simulation.historyManager.eventsList]);
          }
        }}
        onToast={addToast}
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
