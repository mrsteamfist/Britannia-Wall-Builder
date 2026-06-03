import { useReducer, useState, useCallback, useEffect } from "react";
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
import boardDesktop from "@assets/board_desktop.png";
import boardMobile from "@assets/board_mobile.png";

// ── Types ──────────────────────────────────────────────────────────────────
type Zone = "pool" | "garrison" | "build" | "recruit";

// ── Responsive hook ────────────────────────────────────────────────────────
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false
  );
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

// ── Draggable meeple ───────────────────────────────────────────────────────
function DraggableMeeple({ id, size = "sm" }: { id: number; size?: "sm" | "md" }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.15 : 1,
    touchAction: "none" as const,
  };
  const sz = size === "md" ? "w-8 h-10" : "w-6 h-8";
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="select-none cursor-grab active:cursor-grabbing"
      data-testid={`meeple-${id}`}
    >
      <MeeplePiece className={`${sz} text-primary drop-shadow-md`} />
    </div>
  );
}

// ── Droppable zone overlay on the board image ──────────────────────────────
function BoardZone({
  zoneId,
  ids,
  topPct,
  heightPct,
}: {
  zoneId: Zone;
  ids: number[];
  topPct: number;
  heightPct: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: zoneId });
  return (
    <div
      ref={setNodeRef}
      style={{ top: `${topPct}%`, height: `${heightPct}%` }}
      className={`absolute inset-x-0 transition-all duration-100 ${
        isOver
          ? "bg-white/20 outline outline-2 outline-white/70 outline-offset-[-2px]"
          : "bg-transparent hover:bg-white/5"
      }`}
      data-testid={`zone-${zoneId}`}
    >
      <div className="absolute inset-0 flex flex-wrap gap-1 items-center justify-center p-1">
        {ids.map((id) => (
          <DraggableMeeple key={id} id={id} size="sm" />
        ))}
        {ids.length === 0 && isOver && (
          <span className="text-white/60 text-[9px] font-serif italic pointer-events-none">
            Drop here
          </span>
        )}
      </div>
    </div>
  );
}

// ── Pict attack display (read-only zone at top of board) ──────────────────
function PictZone({
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
      className="absolute inset-x-0 flex items-end justify-center pb-1.5 pointer-events-none"
    >
      <motion.div
        key={attack}
        initial={{ scale: 1.25 }}
        animate={{ scale: 1 }}
        className="flex items-center gap-2 bg-black/65 px-3 py-1 border border-destructive/70"
        data-testid="pict-attack"
      >
        <div className="flex gap-0.5 flex-wrap max-w-[100px] justify-center">
          {[...Array(Math.min(attack, 10))].map((_, i) => (
            <PictWarrior key={i} className="w-3 h-3 text-destructive" />
          ))}
          {attack > 10 && (
            <span className="text-destructive text-[9px] font-bold">+{attack - 10}</span>
          )}
        </div>
        <span className="text-white font-serif font-bold text-sm tracking-wide">
          ATK {attack}
        </span>
      </motion.div>
    </div>
  );
}

// ── Shared stats panel ─────────────────────────────────────────────────────
function StatsPanel({
  state,
  garrisonIds,
  buildIds,
  defenceThisTurn,
  netDamage,
  onEndTurn,
  compact = false,
}: {
  state: ReturnType<typeof gameReducer>;
  garrisonIds: number[];
  buildIds: number[];
  defenceThisTurn: number;
  netDamage: number;
  onEndTurn: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-3 ${compact ? "p-2" : "p-4"}`}>
      {/* Wall progress */}
      <section>
        <h2 className="text-[10px] md:text-xs font-serif uppercase tracking-widest mb-1.5 opacity-70">
          The Wall — {state.wallPieces}/{state.maxWallPieces}
        </h2>
        <div
          className="flex gap-1 p-2 border-4 border-border bg-card/60 shadow-inner justify-center"
          data-testid="wall-display"
        >
          {[...Array(state.maxWallPieces)].map((_, i) => (
            <div key={i} className="w-9 h-12 md:w-12 md:h-16 flex-shrink-0">
              <WallSegment built={i < state.wallPieces} className="w-full h-full text-secondary" />
            </div>
          ))}
        </div>
      </section>

      {/* Garrison + Defence */}
      <section className="border-4 border-border bg-card p-2 md:p-3">
        <h3 className="font-serif font-bold uppercase tracking-wider text-[10px] md:text-xs mb-1.5 border-b border-border pb-1">
          Standing Garrison
        </h3>
        <div className="flex flex-wrap gap-0.5 justify-center min-h-[24px] items-center mb-1">
          {state.garrisonTroops === 0 && (
            <span className="text-[10px] italic opacity-40 font-serif">No standing garrison</span>
          )}
          {[...Array(Math.min(state.garrisonTroops, 20))].map((_, i) => (
            <SoldierPiece key={i} className="w-3.5 h-3.5 text-primary" />
          ))}
          {state.garrisonTroops > 20 && (
            <span className="text-[10px] opacity-60 font-serif">+{state.garrisonTroops - 20}</span>
          )}
        </div>
        <p
          className="text-[10px] text-center opacity-50 font-serif"
          data-testid="garrison-troops"
        >
          {state.garrisonTroops} troops — auto-defend each turn
        </p>
      </section>

      {/* Defence readout */}
      <section className="border-4 border-border bg-card p-2 md:p-3 text-center">
        <div className="text-[9px] uppercase tracking-wider opacity-60 font-bold mb-0.5">
          Defence this turn
        </div>
        <div className="text-2xl font-serif font-bold text-primary">{defenceThisTurn}</div>
        <div className="text-[10px] opacity-60 font-serif">
          vs Pict attack{" "}
          <span className="text-destructive font-bold">{state.pictAttack}</span>
          {netDamage > 0 ? (
            <span className="text-destructive ml-1">— {netDamage} dmg incoming!</span>
          ) : (
            <span className="text-green-700 ml-1">— holding!</span>
          )}
        </div>
        <div className="text-[9px] opacity-40 mt-0.5 font-serif">
          Citizens on wall ×2 ({garrisonIds.length * 2}) + troops ({state.garrisonTroops})
        </div>
      </section>

      {/* End Turn */}
      <Button
        size="lg"
        className="w-full text-base font-serif uppercase tracking-widest h-12 border-4 border-primary rounded-none shadow-md"
        onClick={onEndTurn}
        disabled={state.status !== "playing"}
        data-testid="btn-end-turn"
      >
        End Turn · Year {state.turn}
      </Button>

      {/* Battle log */}
      <div className="border-4 border-border bg-card flex-1">
        <div className="p-2 border-b-2 border-border bg-card/80">
          <h3 className="font-serif uppercase tracking-widest text-[10px]">Annals of Britannia</h3>
        </div>
        <ScrollArea className="h-24 md:h-32 p-3">
          <div className="flex flex-col gap-1.5">
            {[...state.battleLog].reverse().map((log, i) => (
              <div
                key={i}
                className={`font-serif ${
                  i === 0 ? "text-xs font-bold text-foreground" : "text-[10px] opacity-55"
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// ── Desktop board with landscape image ────────────────────────────────────
function DesktopBoard({
  state,
  garrisonIds,
  buildIds,
  recruitIds,
  poolIds,
}: {
  state: ReturnType<typeof gameReducer>;
  garrisonIds: number[];
  buildIds: number[];
  recruitIds: number[];
  poolIds: number[];
}) {
  return (
    /* 1136×1024 ≈ 9:8 ratio */
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: "1136 / 1024" }}
    >
      <img
        src={boardDesktop}
        alt="Hadrian's Wall board"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-black/8 pointer-events-none" />

      {/* Pict Raiders — 0–22% */}
      <PictZone attack={state.pictAttack} topPct={0} heightPct={22} />

      {/* Garrison — 22–47% */}
      <BoardZone zoneId="garrison" ids={garrisonIds} topPct={22} heightPct={25} />

      {/* Farms / Recruit — 47–63% */}
      <BoardZone zoneId="recruit" ids={recruitIds} topPct={47} heightPct={16} />

      {/* Town / Pool — 63–80% */}
      <BoardZone zoneId="pool" ids={poolIds} topPct={63} heightPct={17} />

      {/* Quarry / Build — 80–100% */}
      <BoardZone zoneId="build" ids={buildIds} topPct={80} heightPct={20} />
    </div>
  );
}

// ── Mobile board with portrait image ──────────────────────────────────────
function MobileBoard({
  state,
  garrisonIds,
  buildIds,
  recruitIds,
  poolIds,
}: {
  state: ReturnType<typeof gameReducer>;
  garrisonIds: number[];
  buildIds: number[];
  recruitIds: number[];
  poolIds: number[];
}) {
  return (
    /* 400×1024 ≈ 5:13 ratio */
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: "400 / 1024" }}
    >
      <img
        src={boardMobile}
        alt="Hadrian's Wall board"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-black/8 pointer-events-none" />

      {/* Pict Raiders — 0–20% */}
      <PictZone attack={state.pictAttack} topPct={0} heightPct={20} />

      {/* Garrison — 20–42% */}
      <BoardZone zoneId="garrison" ids={garrisonIds} topPct={20} heightPct={22} />

      {/* Farms / Recruit — 42–60% */}
      <BoardZone zoneId="recruit" ids={recruitIds} topPct={42} heightPct={18} />

      {/* Town / Pool — 60–76% */}
      <BoardZone zoneId="pool" ids={poolIds} topPct={60} heightPct={16} />

      {/* Quarry / Build — 76–100% */}
      <BoardZone zoneId="build" ids={buildIds} topPct={76} heightPct={24} />
    </div>
  );
}

// ── Main Game ─────────────────────────────────────────────────────────────
export default function Game() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
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

  const poolIds = meepleZones.flatMap((z, i) => (z === "pool" ? [i] : []));
  const garrisonIds = meepleZones.flatMap((z, i) => (z === "garrison" ? [i] : []));
  const buildIds = meepleZones.flatMap((z, i) => (z === "build" ? [i] : []));
  const recruitIds = meepleZones.flatMap((z, i) => (z === "recruit" ? [i] : []));

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveMeepleId(e.active.id as number);
  }, []);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
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
    },
    []
  );

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

  const boardProps = { state, garrisonIds, buildIds, recruitIds, poolIds };
  const statProps = {
    state,
    garrisonIds,
    buildIds,
    defenceThisTurn,
    netDamage,
    onEndTurn: handleEndTurn,
  };

  return (
    <div className="min-h-dvh w-full flex flex-col bg-background text-foreground overflow-x-hidden">

      {/* ── Header ── */}
      <header className="px-3 py-2 md:px-5 md:py-3 border-b-4 border-border flex flex-wrap justify-between items-center bg-card shadow-md gap-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg md:text-2xl font-serif text-primary uppercase tracking-widest font-bold">
            Hadrian's Wall
          </h1>
          <span className="text-sm md:text-base font-serif text-foreground/50 italic">
            Year {state.turn}
          </span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex flex-col items-center">
            <span className="text-[9px] md:text-xs font-bold uppercase tracking-wider mb-0.5">
              City Health
            </span>
            <div className="flex gap-0.5">
              {[...Array(state.maxCityHealth)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-2.5 h-3.5 md:w-3.5 md:h-5 border border-border ${
                    i < state.cityHealth ? "bg-primary" : "bg-transparent opacity-20"
                  }`}
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
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden">

          {isDesktop ? (
            <>
              {/* Desktop: landscape board on left */}
              <div className="flex-1 flex items-center justify-center bg-stone-950/30 p-2 md:p-4">
                <div className="w-full max-w-2xl">
                  <DesktopBoard {...boardProps} />
                  <p className="text-center text-[10px] font-serif italic opacity-40 mt-1.5">
                    Drag citizens between zones · Then press End Turn
                  </p>
                </div>
              </div>

              {/* Desktop: stats on right */}
              <div className="md:w-72 lg:w-80 flex-shrink-0 flex flex-col border-l-4 border-border overflow-y-auto">
                <StatsPanel {...statProps} compact={false} />
              </div>
            </>
          ) : (
            <>
              {/* Mobile: portrait board + stats stacked */}
              <div className="flex flex-col">
                <MobileBoard {...boardProps} />
                <StatsPanel {...statProps} compact={true} />
              </div>
            </>
          )}
        </main>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={null}>
          {activeMeepleId !== null && (
            <MeeplePiece className="w-10 h-12 text-primary drop-shadow-2xl rotate-6" />
          )}
        </DragOverlay>
      </DndContext>

      {/* ── Win / Loss overlay ── */}
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
              Build Hadrian's Wall before the Picts destroy Eboracum.{" "}
              <strong>Complete all 6 wall sections to win.</strong>
            </p>
            <p className="text-xs italic opacity-60">
              Drag your citizens between the five zones on the board, then press End Turn.
            </p>
            <div className="space-y-2">
              <div className="flex gap-2 items-start">
                <span className="text-destructive font-bold min-w-[68px]">Garrison</span>
                <span className="text-sm">Station citizens on the Wall. Each grants ×2 defence this turn.</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-green-700 font-bold min-w-[68px]">Farms</span>
                <span className="text-sm">Send citizens to recruit — trains 1 permanent soldier who auto-defends forever.</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-amber-700 font-bold min-w-[68px]">Town</span>
                <span className="text-sm">Unassigned citizens wait here ready to be moved each turn.</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-stone-600 font-bold min-w-[68px]">Quarry</span>
                <span className="text-sm">Send citizens to build — each one completes 1 wall section.</span>
              </div>
            </div>
            <p className="text-destructive font-bold text-sm">
              The Pictish war band grows stronger every year. Plan ahead.
            </p>
            <p className="text-xs opacity-50 italic">
              Tip: Early recruits compound — a full garrison lets you focus on building later.
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
