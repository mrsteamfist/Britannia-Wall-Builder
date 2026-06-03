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
import gameBoardBg from "@assets/game_board_bg.png";

type Zone = "pool" | "garrison" | "build" | "recruit";

// ── Draggable meeple piece ──────────────────────────────────────────────────
function DraggableMeeple({ id, size = "md" }: { id: number; size?: "sm" | "md" | "lg" }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.2 : 1,
    touchAction: "none" as const,
    zIndex: isDragging ? 0 : 1,
  };
  const sizeClass =
    size === "sm" ? "w-7 h-9" : size === "lg" ? "w-12 h-16" : "w-9 h-12";
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="select-none cursor-grab active:cursor-grabbing relative"
      data-testid={`meeple-${id}`}
    >
      <MeeplePiece className={`${sizeClass} text-primary drop-shadow-md`} />
    </div>
  );
}

// ── Board zone overlaid on the image ───────────────────────────────────────
function BoardZone({
  zoneId,
  ids,
  topPct,
  heightPct,
  label,
  sublabel,
  accentColor,
  showCount = true,
}: {
  zoneId: Zone;
  ids: number[];
  topPct: number;
  heightPct: number;
  label: string;
  sublabel?: string;
  accentColor: string;
  showCount?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zoneId });
  return (
    <div
      ref={setNodeRef}
      style={{ top: `${topPct}%`, height: `${heightPct}%` }}
      className={`absolute inset-x-0 transition-all duration-150 ${
        isOver
          ? "bg-white/20 outline outline-2 outline-white/70 outline-offset-[-3px]"
          : "bg-transparent hover:bg-white/5"
      }`}
      data-testid={`zone-${zoneId}`}
    >
      {/* Zone badge */}
      <div
        className={`absolute top-1 left-2 flex items-center gap-1 px-1.5 py-0.5 text-[10px] md:text-xs font-serif font-bold uppercase tracking-wider rounded-sm bg-black/55 ${accentColor}`}
      >
        {label}
        {showCount && ids.length > 0 && (
          <span className="ml-1 bg-white/20 rounded px-1">{ids.length}</span>
        )}
      </div>
      {sublabel && (
        <div className="absolute top-1 right-2 px-1.5 py-0.5 text-[9px] md:text-[11px] font-serif italic opacity-70 bg-black/40 text-white rounded-sm">
          {sublabel}
        </div>
      )}

      {/* Meeples inside this zone */}
      <div className="absolute inset-0 flex flex-wrap gap-1 md:gap-1.5 content-center justify-center pt-5 px-2 pb-1">
        {ids.map((id) => (
          <DraggableMeeple key={id} id={id} size="sm" />
        ))}
        {ids.length === 0 && isOver && (
          <span className="text-white/60 text-[10px] font-serif italic mt-4">
            Drop citizens here
          </span>
        )}
      </div>
    </div>
  );
}

// ── Pict Raiders display (non-droppable, shows enemy strength) ────────────
function PictRaidersZone({
  attack,
  topPct,
  heightPct,
}: {
  attack: number;
  topPct: number;
  heightPct: number;
}) {
  return (
    <div
      style={{ top: `${topPct}%`, height: `${heightPct}%` }}
      className="absolute inset-x-0 flex items-center justify-center pointer-events-none"
    >
      <motion.div
        key={attack}
        initial={{ scale: 1.4 }}
        animate={{ scale: 1 }}
        className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-sm border border-destructive/60"
        data-testid="pict-attack"
      >
        <div className="flex gap-0.5">
          {[...Array(Math.min(attack, 8))].map((_, i) => (
            <PictWarrior key={i} className="w-4 h-4 text-destructive" />
          ))}
          {attack > 8 && (
            <span className="text-destructive text-xs font-bold ml-1">+{attack - 8}</span>
          )}
        </div>
        <span className="text-white font-serif font-bold text-base">
          Attack {attack}
        </span>
      </motion.div>
    </div>
  );
}

// ── Main Game component ────────────────────────────────────────────────────
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

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveMeepleId(e.active.id as number);
  }, []);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveMeepleId(null);
    const { active, over } = e;
    if (!over) return;
    const id = active.id as number;
    const zone = over.id as Zone;
    setMeepleZones((prev) => {
      const next = [...prev];
      next[id] = zone;
      return next;
    });
  }, []);

  const handleDragCancel = useCallback(() => setActiveMeepleId(null), []);

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

  const defenceThisTurn = garrisonIds.length * 2 + state.garrisonTroops;
  const netDamage = Math.max(0, state.pictAttack - defenceThisTurn);

  return (
    <div className="min-h-dvh w-full flex flex-col bg-background text-foreground overflow-x-hidden">

      {/* ── Header ── */}
      <header className="px-3 py-2 md:px-5 md:py-3 border-b-4 border-border flex flex-wrap justify-between items-center bg-card shadow-md gap-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg md:text-2xl font-serif text-primary uppercase tracking-widest font-bold">
            Hadrian's Wall
          </h1>
          <span className="text-sm md:text-lg font-serif text-foreground/50">Year {state.turn}</span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex flex-col items-center">
            <span className="text-[9px] md:text-xs font-bold uppercase tracking-wider mb-0.5">City Health</span>
            <div className="flex gap-0.5">
              {[...Array(state.maxCityHealth)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-2.5 h-3.5 md:w-3.5 md:h-5 border border-border ${
                    i < state.cityHealth ? "bg-primary" : "bg-transparent opacity-25"
                  }`}
                  initial={false}
                  animate={{ opacity: i < state.cityHealth ? 1 : 0.2 }}
                  transition={{ duration: 0.3 }}
                  data-testid={`health-bar-${i}`}
                />
              ))}
            </div>
          </div>
          <button
            onClick={() => setShowInstructions(true)}
            className="text-xs font-serif border border-border px-2 py-1 hover:bg-card/80 opacity-70 hover:opacity-100"
            data-testid="btn-help"
          >
            ? Help
          </button>
        </div>
      </header>

      {/* ── Main layout ── */}
      <main className="flex-1 flex flex-col md:flex-row gap-0 overflow-hidden">

        {/* ── Board column (image + overlaid zones) ── */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="md:flex-shrink-0 md:w-[340px] lg:w-[380px] flex flex-col">
            {/* Board image with overlaid drop zones */}
            <div
              className="relative w-full flex-shrink-0 overflow-hidden border-b-4 md:border-b-0 md:border-r-4 border-border"
              style={{ aspectRatio: "9 / 16" }}
            >
              {/* Background image */}
              <img
                src={gameBoardBg}
                alt="Hadrian's Wall game board"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />

              {/* Slight darkening overlay so meeples pop */}
              <div className="absolute inset-0 bg-black/10 pointer-events-none" />

              {/* ── Pict Raiders zone (top ~20%) — display only ── */}
              <PictRaidersZone attack={state.pictAttack} topPct={0} heightPct={20} />

              {/* ── Garrison drop zone (~20–41%) ── */}
              <BoardZone
                zoneId="garrison"
                ids={garrisonIds}
                topPct={20}
                heightPct={21}
                label="Garrison"
                sublabel="×2 defence each"
                accentColor="text-red-200"
              />

              {/* ── Farms / Recruit drop zone (~41–62%) ── */}
              <BoardZone
                zoneId="recruit"
                ids={recruitIds}
                topPct={41}
                heightPct={21}
                label="Farms · Recruit"
                sublabel="+1 permanent soldier"
                accentColor="text-green-200"
              />

              {/* ── Town / Pool drop zone (~62–80%) ── */}
              <BoardZone
                zoneId="pool"
                ids={poolIds}
                topPct={62}
                heightPct={19}
                label="Town · Available"
                accentColor="text-amber-200"
                showCount={false}
              />

              {/* ── Quarry / Build drop zone (~81–100%) ── */}
              <BoardZone
                zoneId="build"
                ids={buildIds}
                topPct={81}
                heightPct={19}
                label="Quarry · Build"
                sublabel="+1 wall section"
                accentColor="text-stone-200"
              />
            </div>

            {/* Hint below board on mobile */}
            <div className="md:hidden text-center text-[10px] font-serif italic opacity-50 py-1.5 bg-card border-b-2 border-border">
              Drag citizens between zones, then End Turn
            </div>
          </div>

          {/* Drag overlay — floats above everything */}
          <DragOverlay dropAnimation={null}>
            {activeMeepleId !== null ? (
              <MeeplePiece className="w-11 h-14 text-primary drop-shadow-2xl opacity-90 rotate-6" />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* ── Right / bottom panel ── */}
        <div className="flex-1 flex flex-col gap-3 p-3 md:p-4 overflow-y-auto">

          {/* Wall progress */}
          <section>
            <h2 className="text-xs md:text-sm font-serif uppercase tracking-widest mb-1.5 opacity-70">
              The Great Wall — {state.wallPieces} / {state.maxWallPieces}
            </h2>
            <div
              className="flex gap-1 md:gap-1.5 p-2 border-4 border-border bg-card/50 shadow-inner justify-center"
              data-testid="wall-display"
            >
              {[...Array(state.maxWallPieces)].map((_, i) => (
                <div key={i} className="w-10 h-14 md:w-14 md:h-20 flex-shrink-0">
                  <WallSegment built={i < state.wallPieces} className="w-full h-full text-secondary" />
                </div>
              ))}
            </div>
          </section>

          {/* Garrison troops */}
          <section className="border-4 border-border bg-card p-3">
            <h3 className="font-serif font-bold uppercase tracking-wider text-xs md:text-sm mb-2 border-b border-border pb-1">
              Standing Garrison
            </h3>
            <div className="flex flex-wrap gap-1 justify-center min-h-[32px] items-center mb-1.5">
              {state.garrisonTroops === 0 && (
                <span className="text-xs italic opacity-40 font-serif">No standing garrison yet</span>
              )}
              {[...Array(Math.min(state.garrisonTroops, 16))].map((_, i) => (
                <SoldierPiece key={i} className="w-4 h-4 text-primary" />
              ))}
              {state.garrisonTroops > 16 && (
                <span className="text-xs opacity-60 font-serif">+{state.garrisonTroops - 16}</span>
              )}
            </div>
            <p className="text-xs text-center opacity-50 font-serif" data-testid="garrison-troops">
              {state.garrisonTroops} troops — auto-defend each turn
            </p>
          </section>

          {/* Defence readout */}
          <section className="border-4 border-border bg-card p-3 text-center">
            <div className="text-[10px] uppercase tracking-wider opacity-60 font-bold mb-0.5">
              Defence this turn
            </div>
            <div className="text-2xl md:text-3xl font-serif font-bold text-primary">
              {defenceThisTurn}
            </div>
            <div className="text-xs opacity-60 font-serif">
              vs Pict attack&nbsp;
              <span className="text-destructive font-bold">{state.pictAttack}</span>
              {netDamage > 0 && (
                <span className="text-destructive ml-1">— {netDamage} dmg this turn!</span>
              )}
              {netDamage === 0 && (
                <span className="text-green-700 ml-1">— holding!</span>
              )}
            </div>
            <div className="text-[10px] opacity-40 mt-0.5 font-serif">
              Garrison ×2 ({garrisonIds.length * 2}) + troops ({state.garrisonTroops})
            </div>
          </section>

          {/* End Turn */}
          <Button
            size="lg"
            className="w-full text-base md:text-lg font-serif uppercase tracking-widest h-12 md:h-14 border-4 border-primary rounded-none shadow-md"
            onClick={handleEndTurn}
            disabled={state.status !== "playing"}
            data-testid="btn-end-turn"
          >
            End Turn · Year {state.turn}
          </Button>

          {/* Battle log */}
          <div className="border-4 border-border bg-card flex-1 min-h-[100px]">
            <div className="p-2 border-b-2 border-border bg-card/80">
              <h3 className="font-serif uppercase tracking-widest text-xs">Annals of Britannia</h3>
            </div>
            <ScrollArea className="h-24 md:h-36 p-3">
              <div className="flex flex-col gap-1.5">
                {[...state.battleLog].reverse().map((log, i) => (
                  <div
                    key={i}
                    className={`font-serif ${
                      i === 0 ? "text-sm font-bold text-foreground" : "text-xs opacity-55"
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </main>

      {/* ── Win / Loss overlays ── */}
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
            <div className="max-w-sm w-full bg-background border-8 border-border p-6 text-center shadow-2xl">
              <h2 className="text-3xl font-serif mb-3 uppercase tracking-widest text-primary">
                {state.status === "win" ? "Roma Victrix!" : "Defeat"}
              </h2>
              <p className="text-base font-serif mb-3 italic">
                {state.status === "win"
                  ? "The Wall stands eternal. The province is safe."
                  : "The Picts have overrun Eboracum! The province is lost."}
              </p>
              <p className="text-sm font-serif opacity-60 mb-5">
                {state.status === "win"
                  ? `Completed in ${state.turn - 1} years · ${state.garrisonTroops} garrison troops`
                  : `${state.wallPieces} of ${state.maxWallPieces} sections built`}
              </p>
              <Button
                size="lg"
                className="rounded-none border-2 border-border font-serif tracking-wider"
                onClick={handleRestart}
                data-testid="btn-restart"
              >
                {state.status === "win" ? "Govern Again" : "Try Again"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Instructions modal ── */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent
          className="border-4 border-border rounded-none bg-background max-w-md mx-3"
          aria-describedby="instructions-desc"
        >
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-primary text-center">
              Governor's Mandate
            </DialogTitle>
          </DialogHeader>
          <div id="instructions-desc" className="font-serif space-y-3 text-sm leading-relaxed">
            <p>
              Build Hadrian's Wall before the Picts destroy Eboracum.
              <strong> Complete all 6 wall sections to win.</strong>
            </p>
            <p className="text-xs italic opacity-60">
              Drag your citizens (meeples) between the five zones on the board, then press End Turn.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2 items-start">
                <span className="text-destructive font-bold min-w-[72px]">Garrison</span>
                <span>Station citizens on the Wall. Each grants ×2 defence this turn.</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-green-700 font-bold min-w-[72px]">Farms</span>
                <span>Send citizens to recruit. Each trains 1 permanent soldier (auto-defends forever).</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-amber-700 font-bold min-w-[72px]">Town</span>
                <span>Unassigned citizens wait here. Drag them up or down each turn.</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-stone-600 font-bold min-w-[72px]">Quarry</span>
                <span>Send citizens to build. Each completes 1 wall section.</span>
              </div>
            </div>
            <p className="text-destructive font-bold text-sm">
              The Pictish war band grows stronger every year.
            </p>
            <p className="text-xs opacity-50 italic">
              Tip: Recruits compound — a full garrison means you can focus on building later.
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
