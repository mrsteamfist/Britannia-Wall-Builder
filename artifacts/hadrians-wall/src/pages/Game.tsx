import { useReducer, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { gameReducer, INITIAL_STATE } from "../game/gameState";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WallSegment } from "@/components/game/WallSegment";
import { SoldierPiece } from "@/components/game/SoldierPiece";
import { PictWarrior } from "@/components/game/PictWarrior";
import { MeeplePiece } from "@/components/game/MeeplePiece";
import { WallFrescoBackground } from "@/components/game/WallFrescoBackground";

type Zone = "pool" | "garrison" | "build" | "recruit";

function DraggableMeeple({ id, small }: { id: number; small?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.25 : 1,
    touchAction: "none" as const,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="select-none cursor-grab active:cursor-grabbing"
      data-testid={`meeple-${id}`}
    >
      <MeeplePiece
        className={
          small
            ? "w-8 h-11 text-primary drop-shadow"
            : "w-10 h-[56px] md:w-12 md:h-16 text-primary drop-shadow"
        }
      />
    </div>
  );
}

function PoolZone({ ids }: { ids: number[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: "pool" });
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-wrap gap-2 justify-center items-center min-h-[72px] p-3 border-2 transition-colors duration-200 ${
        isOver ? "border-primary bg-primary/10" : "border-dashed border-border bg-background/40"
      }`}
      data-testid="zone-pool"
    >
      {ids.length === 0 ? (
        <span className="text-xs italic opacity-40 font-serif">All citizens deployed</span>
      ) : (
        ids.map((id) => <DraggableMeeple key={id} id={id} />)
      )}
    </div>
  );
}

function ActionZone({
  zoneId,
  ids,
  label,
  description,
  colorClass,
  icon,
}: {
  zoneId: Zone;
  ids: number[];
  label: string;
  description: string;
  colorClass: string;
  icon: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zoneId });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 flex flex-col items-center p-3 md:p-4 border-2 min-h-[150px] transition-all duration-200 ${
        isOver
          ? "border-primary bg-primary/15 scale-[1.02]"
          : "border-border bg-background/70"
      }`}
      data-testid={`zone-${zoneId}`}
    >
      <div className="mb-1">{icon}</div>
      <h3 className={`font-serif font-bold text-sm md:text-base mb-0.5 uppercase tracking-wide ${colorClass}`}>
        {label}
      </h3>
      <p className="text-xs text-center opacity-70 mb-2 leading-tight">{description}</p>
      <div className="flex flex-wrap gap-1.5 justify-center items-center flex-1 w-full min-h-[52px]">
        {ids.map((id) => (
          <DraggableMeeple key={id} id={id} small />
        ))}
        {ids.length === 0 && (
          <span className="text-xs italic opacity-35 font-serif">Drop citizens here</span>
        )}
      </div>
      <div
        className={`mt-1 text-xl font-serif font-bold ${colorClass}`}
        data-testid={`alloc-${zoneId}`}
      >
        {ids.length}
      </div>
    </div>
  );
}

export default function Game() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
  const [showInstructions, setShowInstructions] = useState(true);
  const [meepleZones, setMeepleZones] = useState<Zone[]>(() =>
    Array(INITIAL_STATE.totalWorkers).fill("pool")
  );
  const [activeMeepleId, setActiveMeepleId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  );

  const poolIds = meepleZones.map((z, i) => ({ z, i })).filter(({ z }) => z === "pool").map(({ i }) => i);
  const garrisonIds = meepleZones.map((z, i) => ({ z, i })).filter(({ z }) => z === "garrison").map(({ i }) => i);
  const buildIds = meepleZones.map((z, i) => ({ z, i })).filter(({ z }) => z === "build").map(({ i }) => i);
  const recruitIds = meepleZones.map((z, i) => ({ z, i })).filter(({ z }) => z === "recruit").map(({ i }) => i);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveMeepleId(event.active.id as number);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveMeepleId(null);
    const { active, over } = event;
    if (!over) return;
    const meepleId = active.id as number;
    const newZone = over.id as Zone;
    setMeepleZones((prev) => {
      const next = [...prev];
      next[meepleId] = newZone;
      return next;
    });
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveMeepleId(null);
  }, []);

  function handleEndTurn() {
    dispatch({
      type: "END_TURN",
      garrison: garrisonIds.length,
      build: buildIds.length,
      recruit: recruitIds.length,
    });
    setMeepleZones(Array(state.totalWorkers).fill("pool"));
  }

  function handleRestart() {
    dispatch({ type: "RESTART" });
    setMeepleZones(Array(INITIAL_STATE.totalWorkers).fill("pool"));
  }

  return (
    <div className="min-h-dvh w-full flex flex-col bg-background text-foreground overflow-x-hidden">

      {/* ── Header ── */}
      <header className="px-3 py-2 md:px-6 md:py-4 border-b-4 border-border flex flex-wrap justify-between items-center bg-card shadow-md gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl md:text-3xl font-serif text-primary uppercase tracking-widest font-bold drop-shadow-sm">
            Hadrian's Wall
          </h1>
          <span className="text-base md:text-xl font-serif text-foreground/60">Year {state.turn}</span>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex flex-col items-center">
            <span className="text-[10px] md:text-sm font-bold uppercase tracking-wider">City Health</span>
            <div className="flex gap-0.5 md:gap-1 mt-1">
              {[...Array(state.maxCityHealth)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-3 h-4 md:w-4 md:h-6 border-2 border-border ${i < state.cityHealth ? "bg-primary" : "bg-transparent"}`}
                  initial={false}
                  animate={{ opacity: i < state.cityHealth ? 1 : 0.25 }}
                  transition={{ duration: 0.3 }}
                  data-testid={`health-bar-${i}`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-[10px] md:text-sm font-bold uppercase tracking-wider text-destructive">
              Pict Attack
            </span>
            <motion.div
              key={state.pictAttack}
              initial={{ scale: 1.6 }}
              animate={{ scale: 1 }}
              className="text-xl md:text-2xl font-serif font-bold text-destructive flex items-center gap-1"
              data-testid="pict-attack"
            >
              <PictWarrior className="w-5 h-5 md:w-6 md:h-6 text-destructive" />
              {state.pictAttack}
            </motion.div>
          </div>
        </div>
      </header>

      {/* ── Main Board ── */}
      <main className="flex-1 flex flex-col gap-3 md:gap-5 p-3 md:p-6 max-w-5xl mx-auto w-full">

        {/* Wall Display */}
        <section className="flex flex-col items-center">
          <h2 className="text-base md:text-xl font-serif mb-2 tracking-widest uppercase">The Great Wall</h2>
          <div
            className="flex gap-1 md:gap-2 p-2 md:p-4 border-4 border-border bg-card/50 shadow-inner w-full justify-center"
            data-testid="wall-display"
          >
            {[...Array(state.maxWallPieces)].map((_, i) => (
              <div key={i} className="w-14 h-20 md:w-24 md:h-32 relative flex-shrink-0">
                <WallSegment built={i < state.wallPieces} className="w-full h-full text-secondary" />
              </div>
            ))}
          </div>
          <p className="text-sm font-serif mt-1 opacity-60">
            {state.wallPieces} / {state.maxWallPieces} sections complete
          </p>
        </section>

        {/* ── DnD Allocation Area with Fresco Background ── */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <section className="relative overflow-hidden border-4 border-border shadow-lg">
            {/* Fresco Background */}
            <div className="absolute inset-0 z-0">
              <WallFrescoBackground className="w-full h-full" />
              <div className="absolute inset-0 bg-background/30" />
            </div>

            {/* Allocation UI */}
            <div className="relative z-10 p-3 md:p-4 flex flex-col gap-3">

              {/* Pool header */}
              <div className="text-center">
                <span className="text-xs md:text-sm font-serif font-bold uppercase tracking-widest bg-card/80 px-3 py-1 border border-border">
                  Available Citizens — {poolIds.length} of {state.totalWorkers} unassigned
                </span>
              </div>

              {/* Pool droppable */}
              <PoolZone ids={poolIds} />

              <p className="text-center text-xs opacity-60 font-serif italic">
                Drag citizens into the orders below
              </p>

              {/* Three action zones — vertical on mobile, horizontal on md+ */}
              <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                <ActionZone
                  zoneId="garrison"
                  ids={garrisonIds}
                  label="Garrison"
                  description="Each citizen grants 2 defence this turn"
                  colorClass="text-destructive"
                  icon={<SoldierPiece className="w-8 h-8 md:w-10 md:h-10 text-destructive" />}
                />
                <ActionZone
                  zoneId="build"
                  ids={buildIds}
                  label="Build"
                  description="Each citizen completes 1 wall section"
                  colorClass="text-secondary"
                  icon={<SoldierPiece className="w-8 h-8 md:w-10 md:h-10 text-secondary" />}
                />
                <ActionZone
                  zoneId="recruit"
                  ids={recruitIds}
                  label="Recruit"
                  description="Each citizen trains 1 permanent soldier"
                  colorClass="text-primary"
                  icon={<SoldierPiece className="w-8 h-8 md:w-10 md:h-10 text-primary" />}
                />
              </div>
            </div>
          </section>

          {/* Drag Overlay — floats above everything during drag */}
          <DragOverlay dropAnimation={null}>
            {activeMeepleId !== null ? (
              <MeeplePiece className="w-12 h-16 text-primary drop-shadow-xl opacity-90 rotate-6" />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* ── Garrison Troops + End Turn ── */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 border-4 border-border bg-card shadow-md p-3 md:p-4">
            <h3 className="font-serif font-bold uppercase tracking-wider text-base mb-2 border-b-2 border-border pb-1">
              Garrison Troops
            </h3>
            <div className="flex flex-wrap gap-1.5 justify-center min-h-[40px] items-center mb-2">
              {state.garrisonTroops === 0 && (
                <span className="text-sm italic opacity-50 font-serif">No standing garrison yet</span>
              )}
              {[...Array(Math.min(state.garrisonTroops, 20))].map((_, i) => (
                <SoldierPiece key={i} className="w-5 h-5 text-primary" />
              ))}
              {state.garrisonTroops > 20 && (
                <span className="text-xs font-serif opacity-70">+{state.garrisonTroops - 20} more</span>
              )}
            </div>
            <div className="text-3xl font-serif text-center font-bold" data-testid="garrison-troops">
              {state.garrisonTroops}
            </div>
            <p className="text-xs text-center opacity-60 font-serif">Defend automatically every turn</p>
          </div>

          <div className="flex flex-col gap-2 md:w-48">
            <div className="bg-card border-4 border-border p-3 text-center font-serif text-sm">
              <div className="opacity-60 text-xs uppercase tracking-wider mb-1">Defence this turn</div>
              <div className="text-2xl font-bold text-primary">
                {garrisonIds.length * 2 + state.garrisonTroops}
              </div>
              <div className="opacity-50 text-xs">
                vs Pict attack {state.pictAttack}
              </div>
            </div>
            <Button
              size="lg"
              className="w-full text-base md:text-xl font-serif uppercase tracking-widest h-14 md:h-16 border-4 border-primary hover:bg-primary/90 rounded-none shadow-md flex-1"
              onClick={handleEndTurn}
              disabled={state.status !== "playing"}
              data-testid="btn-end-turn"
            >
              End Turn
            </Button>
          </div>
        </div>

        {/* ── Battle Log ── */}
        <div className="border-4 border-border bg-card shadow-md">
          <div className="p-2 md:p-3 border-b-2 border-border bg-card/80">
            <h3 className="font-serif tracking-widest text-base uppercase">Annals of Britannia</h3>
          </div>
          <ScrollArea className="h-28 md:h-36 p-3 md:p-4">
            <div className="flex flex-col gap-2">
              {[...state.battleLog].reverse().map((log, i) => (
                <div
                  key={i}
                  className={`text-sm font-serif ${i === 0 ? "font-bold text-foreground" : "opacity-60 text-xs"}`}
                >
                  {log}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </main>

      {/* ── Win / Loss Overlays ── */}
      <AnimatePresence>
        {state.status !== "playing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
              state.status === "win" ? "bg-secondary/90" : "bg-destructive/95"
            }`}
          >
            <div className="max-w-md w-full bg-background border-8 border-border p-6 md:p-8 text-center shadow-2xl">
              <h2 className="text-3xl md:text-4xl font-serif mb-4 uppercase tracking-widest text-primary">
                {state.status === "win" ? "Roma Victrix!" : "Defeat"}
              </h2>
              <p className="text-base md:text-xl font-serif mb-4 italic">
                {state.status === "win"
                  ? "The Wall stands eternal. The province is safe under your rule."
                  : "The Picts have overrun Eboracum! The province is lost to the savages."}
              </p>
              {state.status === "win" && (
                <p className="text-sm font-serif opacity-70 mb-6">
                  Completed in {state.turn - 1} years with a garrison of {state.garrisonTroops} soldiers.
                </p>
              )}
              {state.status === "loss" && (
                <p className="text-sm font-serif opacity-70 mb-6">
                  {state.wallPieces} of {state.maxWallPieces} wall sections were completed.
                </p>
              )}
              <Button
                size="lg"
                className="rounded-none border-2 border-border font-serif text-lg tracking-wider"
                onClick={handleRestart}
                data-testid="btn-restart"
              >
                {state.status === "win" ? "Govern Again" : "Try Again"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Instructions Modal ── */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent
          className="border-4 border-border rounded-none bg-background max-w-lg mx-3"
          aria-describedby="instructions-desc"
        >
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-primary text-center">
              Governor's Mandate
            </DialogTitle>
          </DialogHeader>
          <div id="instructions-desc" className="font-serif space-y-3 text-sm md:text-base leading-relaxed">
            <p>
              Welcome to Britannia, Governor. Build Hadrian's Wall before the Picts destroy Eboracum.
              <strong> Complete 6 wall sections to win.</strong>
            </p>
            <p className="text-xs opacity-70 italic">
              Drag your citizens (meeples) into the order zones each turn, then press End Turn.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Garrison:</strong> Each citizen fights, granting 2 defence this turn.
              </li>
              <li>
                <strong>Build:</strong> Each citizen completes 1 wall section. Build 6 to win.
              </li>
              <li>
                <strong>Recruit:</strong> Each citizen trains a permanent soldier — they defend every turn automatically.
              </li>
            </ul>
            <p className="text-destructive font-bold text-sm">
              Beware: The Pictish war band grows stronger every year.
            </p>
            <p className="text-xs opacity-60 italic">
              Tip: Recruits compound over time — a strong garrison means you can focus on building later.
            </p>
          </div>
          <div className="flex justify-end mt-2">
            <Button
              onClick={() => setShowInstructions(false)}
              className="rounded-none font-serif tracking-widest"
              data-testid="btn-dismiss-instructions"
            >
              I Understand
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
