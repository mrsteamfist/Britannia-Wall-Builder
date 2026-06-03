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

// ── Draggable citizen (only in Town zone) ─────────────────────────────────
function DraggableCitizen({ idx }: { idx: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `citizen-${idx}`,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.15 : 1,
    touchAction: "none" as const,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="select-none cursor-grab active:cursor-grabbing"
      data-testid={`citizen-${idx}`}
    >
      <MeeplePiece className="w-7 h-9 text-amber-700 drop-shadow-md" />
    </div>
  );
}

// ── Non-draggable pending citizen (in Farm or Quarry) ─────────────────────
function PendingCitizen() {
  return (
    <div className="relative select-none">
      <MeeplePiece className="w-7 h-9 text-amber-700/50" />
      <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-600 rounded-full flex items-center justify-center">
        <span className="text-[7px] text-white font-bold">1</span>
      </div>
    </div>
  );
}

// ── Droppable board zone overlay ───────────────────────────────────────────
type DropZoneId = "garrison" | "farm" | "quarry";

function DroppableZone({
  id,
  children,
  topPct,
  heightPct,
  className = "",
}: {
  id: DropZoneId;
  children: React.ReactNode;
  topPct: number;
  heightPct: number;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ top: `${topPct}%`, height: `${heightPct}%` }}
      className={`absolute inset-x-0 transition-all duration-100 flex flex-wrap gap-1 items-center justify-center p-1 ${
        isOver
          ? "bg-white/25 outline outline-2 outline-white/80 outline-offset-[-2px]"
          : "bg-transparent hover:bg-white/5"
      } ${className}`}
      data-testid={`zone-${id}`}
    >
      {children}
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white text-[10px] font-serif italic opacity-80 bg-black/40 px-2 py-0.5">
            Release to assign
          </span>
        </div>
      )}
    </div>
  );
}

// ── Display-only zone (Town source, Picts) ────────────────────────────────
function DisplayZone({
  children,
  topPct,
  heightPct,
}: {
  children: React.ReactNode;
  topPct: number;
  heightPct: number;
}) {
  return (
    <div
      style={{ top: `${topPct}%`, height: `${heightPct}%` }}
      className="absolute inset-x-0 flex flex-wrap gap-1 items-center justify-center p-1"
    >
      {children}
    </div>
  );
}

// ── Pict danger indicator ─────────────────────────────────────────────────
function PictMeter({ picts, max = 4 }: { picts: number; max?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-1">
        {[...Array(max)].map((_, i) => (
          <motion.div
            key={i}
            animate={{
              backgroundColor: i < picts ? "hsl(var(--destructive))" : "transparent",
              scale: i < picts && i === picts - 1 ? [1, 1.2, 1] : 1,
            }}
            transition={{ duration: 0.3 }}
            className="w-5 h-5 border-2 border-destructive/60 rounded-sm"
            data-testid={`pict-meter-${i}`}
          />
        ))}
      </div>
      <span
        className={`text-xs font-serif font-bold ${
          picts >= 3 ? "text-destructive animate-pulse" : picts >= 2 ? "text-orange-500" : "text-foreground/60"
        }`}
      >
        {picts}/4 Picts
      </span>
    </div>
  );
}

// ── Stat counter badge ────────────────────────────────────────────────────
function StatBadge({
  label,
  value,
  accent = false,
  danger = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center border-2 px-3 py-1.5 ${
        danger ? "border-destructive/70 bg-destructive/10" : accent ? "border-primary/60 bg-primary/10" : "border-border bg-card/60"
      }`}
    >
      <span className={`text-xl md:text-2xl font-serif font-bold ${danger ? "text-destructive" : accent ? "text-primary" : ""}`}>
        {value}
      </span>
      <span className="text-[9px] uppercase tracking-wider opacity-60 font-bold">{label}</span>
    </div>
  );
}

// ── Stats + controls panel ────────────────────────────────────────────────
type GameStateType = ReturnType<typeof gameReducer>;

function StatsPanel({
  state,
  onRestart,
}: {
  state: GameStateType;
  onRestart: () => void;
}) {
  const isDangerous = state.picts >= 3;
  const noMoves = state.status === 'playing' && state.town === 0;

  return (
    <div className="flex flex-col gap-3 p-3 md:p-4">

      {/* Action hint */}
      <div className={`text-center text-xs font-serif italic border-2 border-border px-3 py-2 bg-card ${
        state.status !== 'playing' ? 'opacity-40' : ''
      }`}>
        {state.status === 'playing'
          ? state.town > 0
            ? "Drag a citizen from Town ↑ to Garrison, Farm, or Quarry"
            : "⚠ No citizens in Town — no moves available"
          : state.status === 'win'
            ? "The Wall is built. Britannia is secure."
            : "Britannia has fallen to the Picts."}
      </div>

      {/* Key counters */}
      <div className="grid grid-cols-4 gap-1.5">
        <StatBadge label="Town" value={state.town} accent />
        <StatBadge label="Soldiers" value={state.soldiers} />
        <StatBadge label="Picts" value={state.picts} danger={state.picts >= 3} />
        <StatBadge label="Wall" value={state.wallSections} accent />
      </div>

      {/* Pict danger bar */}
      <div className={`flex items-center justify-between border-2 px-3 py-2 ${
        isDangerous ? "border-destructive/60 bg-destructive/5" : "border-border bg-card/40"
      }`}>
        <PictMeter picts={state.picts} />
        {state.picts >= 2 && state.status === 'playing' && (
          <span className="text-[9px] text-destructive font-bold uppercase tracking-wider animate-pulse">
            ⚠ Raid!
          </span>
        )}
      </div>

      {/* Wall progress */}
      <section>
        <h3 className="text-[10px] font-serif uppercase tracking-widest mb-1 opacity-60">
          The Wall — {state.wallSections} / {state.maxWallSections}
        </h3>
        <div
          className="flex gap-1 p-2 border-4 border-border bg-card/60 justify-center"
          data-testid="wall-display"
        >
          {[...Array(state.maxWallSections)].map((_, i) => (
            <div key={i} className="w-9 h-12 md:w-11 md:h-14 flex-shrink-0">
              <WallSegment built={i < state.wallSections} className="w-full h-full text-secondary" />
            </div>
          ))}
        </div>
      </section>

      {/* Farm / Quarry state */}
      <div className="grid grid-cols-2 gap-2">
        <div className="border-2 border-border bg-card/40 p-2 text-center">
          <div className="text-[9px] uppercase tracking-wider opacity-50 mb-1">Farms</div>
          <div className="text-lg font-serif font-bold text-primary">{state.farm}/2</div>
          <div className="text-[9px] opacity-40 font-serif">
            {state.farm === 0 ? "Send 2 → +3 to Town" : "1 more to recruit!"}
          </div>
        </div>
        <div className="border-2 border-border bg-card/40 p-2 text-center">
          <div className="text-[9px] uppercase tracking-wider opacity-50 mb-1">Quarry</div>
          <div className="text-lg font-serif font-bold text-primary">{state.quarry}/2</div>
          <div className="text-[9px] opacity-40 font-serif">
            {state.quarry === 0 ? "Send 2 → +1 wall" : "1 more to build!"}
          </div>
        </div>
      </div>

      {/* Battle log */}
      <div className="border-4 border-border bg-card">
        <div className="p-2 border-b-2 border-border">
          <h3 className="font-serif uppercase tracking-widest text-[10px]">Annals of Britannia</h3>
        </div>
        <ScrollArea className="h-28 md:h-36 p-2">
          <div className="flex flex-col gap-1">
            {[...state.battleLog].reverse().map((log, i) => (
              <p
                key={i}
                className={`font-serif ${
                  i === 0 ? "text-xs font-bold" : "text-[10px] opacity-50"
                } ${
                  log.includes("RAID") || log.includes("Pict") || log.includes("falls")
                    ? i === 0 ? "text-destructive" : ""
                    : ""
                }`}
              >
                {log}
              </p>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Restart always visible at bottom */}
      <Button
        variant="outline"
        size="sm"
        className="w-full font-serif tracking-wider border-2"
        onClick={onRestart}
        data-testid="btn-restart"
      >
        New Game
      </Button>
    </div>
  );
}

// ── Desktop board (landscape image) ───────────────────────────────────────
function DesktopBoard({ state }: { state: GameStateType }) {
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "1136 / 1024" }}>
      <img
        src={boardDesktop}
        alt="Hadrian's Wall board"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* Pict Raiders zone 0–22%: display Pict warriors */}
      <DisplayZone topPct={0} heightPct={22}>
        {state.picts === 0 ? (
          <span className="text-white/40 text-[10px] font-serif italic">No Picts yet</span>
        ) : (
          [...Array(Math.min(state.picts, 8))].map((_, i) => (
            <PictWarrior key={i} className="w-6 h-6 text-destructive drop-shadow" />
          ))
        )}
        {state.picts > 8 && (
          <span className="text-destructive font-bold text-sm">+{state.picts - 8}</span>
        )}
      </DisplayZone>

      {/* Garrison droppable 22–47%: shows soldiers */}
      <DroppableZone id="garrison" topPct={22} heightPct={25}>
        {state.soldiers === 0 ? (
          <span className="text-white/30 text-[9px] font-serif italic pt-5">
            Drop citizen to enlist as soldier
          </span>
        ) : (
          [...Array(Math.min(state.soldiers, 12))].map((_, i) => (
            <SoldierPiece key={i} className="w-5 h-5 text-primary drop-shadow" />
          ))
        )}
        {state.soldiers > 12 && (
          <span className="text-primary text-xs font-bold">+{state.soldiers - 12}</span>
        )}
      </DroppableZone>

      {/* Farm droppable 47–63%: shows pending + awaiting */}
      <DroppableZone id="farm" topPct={47} heightPct={16}>
        {state.farm === 0 ? (
          <span className="text-white/30 text-[9px] font-serif italic">
            Drop 2 citizens → +1 recruit
          </span>
        ) : (
          <PendingCitizen />
        )}
      </DroppableZone>

      {/* Town zone 63–80%: draggable citizens (source) */}
      <DisplayZone topPct={63} heightPct={17}>
        {state.town === 0 ? (
          <span className="text-white/40 text-[9px] font-serif italic">Town empty</span>
        ) : (
          [...Array(state.town)].map((_, i) => (
            <DraggableCitizen key={i} idx={i} />
          ))
        )}
      </DisplayZone>

      {/* Quarry droppable 80–100%: shows pending */}
      <DroppableZone id="quarry" topPct={80} heightPct={20}>
        {state.quarry === 0 ? (
          <span className="text-white/30 text-[9px] font-serif italic">
            Drop 2 citizens → +1 wall
          </span>
        ) : (
          <PendingCitizen />
        )}
      </DroppableZone>
    </div>
  );
}

// ── Mobile board (portrait image) ─────────────────────────────────────────
function MobileBoard({ state }: { state: GameStateType }) {
  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "400 / 1024" }}>
      <img
        src={boardMobile}
        alt="Hadrian's Wall board"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* Pict Raiders 0–20% */}
      <DisplayZone topPct={0} heightPct={20}>
        {state.picts === 0 ? (
          <span className="text-white/40 text-[9px] font-serif italic">No Picts</span>
        ) : (
          [...Array(Math.min(state.picts, 6))].map((_, i) => (
            <PictWarrior key={i} className="w-5 h-5 text-destructive drop-shadow" />
          ))
        )}
        {state.picts > 6 && <span className="text-destructive font-bold text-xs">+{state.picts - 6}</span>}
      </DisplayZone>

      {/* Garrison 20–42% */}
      <DroppableZone id="garrison" topPct={20} heightPct={22}>
        {state.soldiers === 0 ? (
          <span className="text-white/30 text-[8px] font-serif italic pt-4">
            Drop to enlist soldier
          </span>
        ) : (
          [...Array(Math.min(state.soldiers, 8))].map((_, i) => (
            <SoldierPiece key={i} className="w-5 h-5 text-primary drop-shadow" />
          ))
        )}
        {state.soldiers > 8 && <span className="text-primary text-xs font-bold">+{state.soldiers - 8}</span>}
      </DroppableZone>

      {/* Farm 42–60% */}
      <DroppableZone id="farm" topPct={42} heightPct={18}>
        {state.farm === 0 ? (
          <span className="text-white/30 text-[8px] font-serif italic">2 → +1 recruit</span>
        ) : (
          <PendingCitizen />
        )}
      </DroppableZone>

      {/* Town 60–76%: draggable citizens */}
      <DisplayZone topPct={60} heightPct={16}>
        {state.town === 0 ? (
          <span className="text-white/40 text-[8px] font-serif italic">Town empty</span>
        ) : (
          [...Array(state.town)].map((_, i) => (
            <DraggableCitizen key={i} idx={i} />
          ))
        )}
      </DisplayZone>

      {/* Quarry 76–100% */}
      <DroppableZone id="quarry" topPct={76} heightPct={24}>
        {state.quarry === 0 ? (
          <span className="text-white/30 text-[8px] font-serif italic">2 → +1 wall section</span>
        ) : (
          <PendingCitizen />
        )}
      </DroppableZone>
    </div>
  );
}

// ── Instructions modal ────────────────────────────────────────────────────
function InstructionsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="border-4 border-border rounded-none bg-background max-w-md mx-3"
        aria-describedby="instr-desc"
      >
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-primary text-center">
            Governor's Mandate
          </DialogTitle>
        </DialogHeader>
        <div id="instr-desc" className="font-serif space-y-3 text-sm leading-relaxed">
          <p>
            <strong>Goal:</strong> Build all 6 sections of Hadrian's Wall before the Picts overwhelm the province.
          </p>
          <p className="text-[11px] italic opacity-70">
            Each time you drag a citizen to a zone, one Pict arrives at the border.
          </p>
          <div className="space-y-2.5 text-[13px]">
            <div className="flex gap-2">
              <span className="text-amber-700 font-bold min-w-[70px]">Town</span>
              <span>Your pool of available citizens. Drag them to any zone.</span>
            </div>
            <div className="flex gap-2">
              <span className="text-primary font-bold min-w-[70px]">Garrison</span>
              <span>
                A citizen becomes a <em>permanent soldier</em>. Each raid: 50% success → 2 Picts
                driven off; 50% fail → soldier dies, 1 Pict retreats.
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-green-700 font-bold min-w-[70px]">Farm</span>
              <span>
                Send 2 citizens → both return to Town <em>plus 1 new citizen</em> (net +1).
              </span>
            </div>
            <div className="flex gap-2">
              <span className="text-stone-600 font-bold min-w-[70px]">Quarry</span>
              <span>Send 2 citizens → both return to Town and build 1 wall section.</span>
            </div>
          </div>
          <div className="border-2 border-destructive/50 bg-destructive/5 p-2 text-xs space-y-1">
            <p className="font-bold text-destructive">Raid rule (triggers at 2 Picts):</p>
            <p>With soldier: 50% repel (2 Picts gone) or 50% fail (1 soldier + 1 Pict gone).</p>
            <p>Without soldier: 2 Picts raid — 1 citizen is slain (Farm → Town → Quarry priority).</p>
          </div>
          <div className="border-2 border-destructive/40 bg-destructive/5 p-2 text-xs">
            <p className="font-bold text-destructive">Lose if:</p>
            <p>4 Picts ever gather · All Romans are gone · No citizens left in Town</p>
          </div>
          <p className="text-xs opacity-50 italic">
            Tip: Enlist 1–2 soldiers early so raids don't devastate your workforce.
          </p>
        </div>
        <div className="flex justify-end mt-1">
          <Button onClick={onClose} className="rounded-none font-serif tracking-widest" data-testid="btn-dismiss">
            I Understand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Game component ───────────────────────────────────────────────────
export default function Game() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
  const [showInstructions, setShowInstructions] = useState(true);
  const [activeCitizenIdx, setActiveCitizenIdx] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const id = String(e.active.id);
    const idx = parseInt(id.replace("citizen-", ""), 10);
    setActiveCitizenIdx(isNaN(idx) ? null : idx);
  }, []);

  const handleDragEnd = useCallback((e: DragEndEvent) => {
    setActiveCitizenIdx(null);
    if (!e.over) return;
    const dest = e.over.id as string;
    if (dest === "garrison" || dest === "farm" || dest === "quarry") {
      dispatch({ type: "ASSIGN", destination: dest });
    }
  }, []);

  const handleDragCancel = useCallback(() => setActiveCitizenIdx(null), []);

  function handleRestart() {
    dispatch({ type: "RESTART" });
  }

  return (
    <div className="min-h-dvh w-full flex flex-col bg-background text-foreground overflow-x-hidden">

      {/* ── Header ── */}
      <header className="px-3 py-2 md:px-5 md:py-3 border-b-4 border-border flex justify-between items-center bg-card shadow-md flex-shrink-0 gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-base md:text-xl font-serif text-primary uppercase tracking-widest font-bold">
            Hadrian's Wall
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Compact status in header */}
          <div className="flex gap-1.5 items-center text-xs font-serif">
            <span className="opacity-60">
              🧱 {state.wallSections}/{state.maxWallSections}
            </span>
            <span className={state.picts >= 3 ? "text-destructive font-bold animate-pulse" : "opacity-60"}>
              👹 {state.picts}/4
            </span>
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
              {/* Desktop: landscape board */}
              <div className="flex-1 flex items-center justify-center bg-stone-950/20 p-3">
                <div className="w-full max-w-2xl">
                  <DesktopBoard state={state} />
                  <p className="text-center text-[10px] font-serif italic opacity-35 mt-1">
                    Drag citizens from Town to Garrison · Farm · Quarry
                  </p>
                </div>
              </div>
              {/* Desktop: stats right */}
              <div className="md:w-72 lg:w-80 flex-shrink-0 border-l-4 border-border overflow-y-auto">
                <StatsPanel state={state} onRestart={handleRestart} />
              </div>
            </>
          ) : (
            /* Mobile: portrait board + stats below */
            <div className="flex flex-col">
              <MobileBoard state={state} />
              <StatsPanel state={state} onRestart={handleRestart} />
            </div>
          )}
        </main>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={null}>
          {activeCitizenIdx !== null && (
            <MeeplePiece className="w-10 h-12 text-amber-700 drop-shadow-2xl rotate-6" />
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
              state.status === "win" ? "bg-secondary/90" : "bg-destructive/90"
            }`}
            data-testid="outcome-overlay"
          >
            <div className="max-w-sm w-full bg-background border-8 border-border p-6 text-center shadow-2xl">
              <h2 className="text-2xl md:text-3xl font-serif mb-3 uppercase tracking-widest text-primary">
                {state.status === "win" ? "Roma Victrix!" : "Britannia Falls"}
              </h2>
              <p className="text-sm md:text-base font-serif mb-2 italic">
                {state.status === "win"
                  ? "Hadrian's Wall stands eternal. The north is secured."
                  : "The Picts have overcome the province. Britannia is lost."}
              </p>
              <div className="text-xs opacity-60 font-serif mb-5 space-y-0.5">
                <p>Wall: {state.wallSections}/{state.maxWallSections} sections</p>
                <p>Soldiers: {state.soldiers} · Citizens: {state.town + state.farm + state.quarry}</p>
                <p>Picts at end: {state.picts}</p>
              </div>
              <Button
                size="lg"
                className="rounded-none border-2 border-border font-serif tracking-wider"
                onClick={handleRestart}
                data-testid="btn-play-again"
              >
                {state.status === "win" ? "Govern Again" : "Try Again"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <InstructionsModal open={showInstructions} onClose={() => setShowInstructions(false)} />
    </div>
  );
}
