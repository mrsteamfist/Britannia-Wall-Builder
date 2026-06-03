import { useReducer, useState, useCallback, useEffect, useRef } from "react";
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
import { WallSegment } from "@/components/game/WallSegment";
import { SoldierPiece } from "@/components/game/SoldierPiece";
import { PictWarrior } from "@/components/game/PictWarrior";
import { MeeplePiece } from "@/components/game/MeeplePiece";
import boardDesktop from "@assets/board_desktop.png";
import boardMobile from "@assets/board_mobile.png";
import scrollBg from "@assets/scroll_nobg.png";
import continueBtn from "@assets/continue_btn_nobg.png";

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
      <MeeplePiece className="w-12 h-14 drop-shadow-md" />
    </div>
  );
}

// ── Non-draggable pending citizen (in Farm or Quarry) ─────────────────────
function PendingCitizen() {
  return (
    <div className="relative select-none">
      <MeeplePiece className="w-12 h-14 opacity-60" />
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
      className={`absolute inset-x-0 transition-all duration-150 flex flex-wrap gap-3 items-center justify-center p-1 ${
        isOver
          ? "bg-amber-100/30 outline outline-2 outline-amber-300/80 outline-offset-[-2px]"
          : "bg-transparent hover:bg-white/10"
      } ${className}`}
      data-testid={`zone-${id}`}
    >
      {children}
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white text-[10px] font-serif font-bold tracking-wide opacity-90 bg-black/50 px-2 py-1">
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
      className="absolute inset-x-0 flex flex-wrap gap-3 items-center justify-center p-1 pointer-events-none"
    >
      {children}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────
type GameStateType = ReturnType<typeof gameReducer>;

// ── Compact sidebar panel (desktop) ───────────────────────────────────────
function SidePanel({
  state,
  onRestart,
  onHelp,
}: {
  state: GameStateType;
  onRestart: () => void;
  onHelp: () => void;
}) {
  const lastLog = [...state.battleLog].reverse()[0] ?? "";
  const danger = state.picts >= 3;

  return (
    <div className="flex flex-col gap-2 p-2 h-full">

      {/* Status line */}
      <p className={`font-serif text-[10px] italic text-center px-1 leading-tight ${
        danger ? "text-destructive font-semibold" : "opacity-60"
      }`}>
        {state.status === "win"
          ? "Roma Victrix! The Wall stands."
          : state.status === "loss"
            ? "Britannia is lost."
            : state.picts >= 2
              ? "⚠ Raid incoming!"
              : state.town > 0
                ? "Drag citizens ↑ to assign"
                : "Town empty — no moves"}
      </p>

      {/* 4 counters */}
      <div className="grid grid-cols-2 gap-1">
        {[
          { label: "Town", value: state.town, hi: true, danger: false },
          { label: "Soldiers", value: state.soldiers, hi: false, danger: false },
          { label: "Picts", value: state.picts, hi: false, danger: state.picts >= 3 },
          { label: "Wall", value: `${state.wallSections}/${state.maxWallSections}`, hi: true, danger: false },
        ].map(({ label, value, hi, danger: d }) => (
          <div
            key={label}
            className={`flex flex-col items-center py-1 border-2 ${
              d ? "border-destructive/70 bg-destructive/10"
                : hi ? "border-primary/50 bg-primary/8"
                  : "border-border bg-card/50"
            }`}
          >
            <span className={`text-lg font-serif font-bold leading-none ${d ? "text-destructive" : hi ? "text-primary" : ""}`}>
              {value}
            </span>
            <span className="text-[8px] uppercase tracking-wider opacity-50 mt-0.5">{label}</span>
          </div>
        ))}
      </div>

      {/* Pict threat dots */}
      <div className="flex items-center gap-1 justify-center">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 border-2 transition-colors ${
              i < state.picts
                ? "bg-destructive border-destructive"
                : "border-border/50"
            }`}
          />
        ))}
        <span className={`text-[9px] font-serif ml-1 ${state.picts >= 3 ? "text-destructive animate-pulse font-bold" : "opacity-40"}`}>
          Picts
        </span>
      </div>

      {/* Wall segments */}
      <div>
        <p className="text-[8px] uppercase tracking-widest opacity-40 text-center mb-0.5">The Wall</p>
        <div className="flex gap-0.5 justify-center" data-testid="wall-display">
          {[...Array(state.maxWallSections)].map((_, i) => (
            <div key={i} className="w-6 h-8 flex-shrink-0">
              <WallSegment built={i < state.wallSections} className="w-full h-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Farm / Quarry inline */}
      <div className="flex gap-1 text-[9px] font-serif justify-center opacity-60">
        <span>Farm {state.farm}/2</span>
        <span className="opacity-30">·</span>
        <span>Quarry {state.quarry}/2</span>
      </div>

      {/* Last log line */}
      {lastLog && (
        <p className={`text-[9px] font-serif italic text-center px-1 leading-tight opacity-50 line-clamp-2 ${
          lastLog.includes("RAID") || lastLog.includes("slain") ? "text-destructive opacity-80" : ""
        }`}>
          {lastLog}
        </p>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Buttons */}
      <Button
        variant="outline"
        size="sm"
        className="w-full font-serif tracking-wider border-2 text-xs py-1"
        onClick={onRestart}
        data-testid="btn-restart"
      >
        New Game
      </Button>
      <button
        onClick={onHelp}
        className="text-[9px] font-serif opacity-40 hover:opacity-80 text-center py-0.5"
      >
        ? Rules
      </button>
    </div>
  );
}

// ── Compact mobile stat strip (below board) ────────────────────────────────
function MobileStatStrip({
  state,
  onRestart,
  onHelp,
}: {
  state: GameStateType;
  onRestart: () => void;
  onHelp: () => void;
}) {
  const lastLog = [...state.battleLog].reverse()[0] ?? "";
  return (
    <div className="flex flex-col gap-1.5 px-2 py-2 bg-card border-t-4 border-border">
      {/* 4 counters in a row */}
      <div className="grid grid-cols-4 gap-1">
        {[
          { label: "Town", value: state.town, danger: false, accent: true },
          { label: "Soldiers", value: state.soldiers, danger: false, accent: false },
          { label: "Picts", value: state.picts, danger: state.picts >= 3, accent: false },
          { label: `${state.wallSections}/6`, value: null, danger: false, accent: true, sub: "Wall" },
        ].map(({ label, value, danger, accent, sub }) => (
          <div
            key={label}
            className={`flex flex-col items-center py-1 border-2 ${
              danger ? "border-destructive/70 bg-destructive/10"
                : accent ? "border-primary/50"
                  : "border-border"
            }`}
          >
            <span className={`text-base font-serif font-bold leading-none ${danger ? "text-destructive" : accent ? "text-primary" : ""}`}>
              {value ?? label}
            </span>
            <span className="text-[8px] uppercase tracking-wider opacity-40">{sub ?? label}</span>
          </div>
        ))}
      </div>

      {/* Wall segments */}
      <div className="flex gap-0.5 justify-center" data-testid="wall-display-mobile">
        {[...Array(state.maxWallSections)].map((_, i) => (
          <div key={i} className="w-8 h-10 flex-shrink-0">
            <WallSegment built={i < state.wallSections} className="w-full h-full" />
          </div>
        ))}
      </div>

      {/* Last log */}
      {lastLog && (
        <p className={`text-[9px] font-serif italic text-center opacity-50 leading-tight ${
          lastLog.includes("RAID") || lastLog.includes("slain") ? "text-destructive opacity-80" : ""
        }`}>
          {lastLog}
        </p>
      )}

      {/* Actions row */}
      <div className="flex gap-1.5">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 font-serif text-xs border-2 py-1"
          onClick={onRestart}
          data-testid="btn-restart"
        >
          New Game
        </Button>
        <button
          onClick={onHelp}
          className="font-serif text-xs border border-border px-3 opacity-60 hover:opacity-100"
        >
          ? Rules
        </button>
      </div>
    </div>
  );
}

// ── Desktop board (landscape image) ───────────────────────────────────────
function DesktopBoard({ state }: { state: GameStateType }) {
  return (
    <div className="relative h-full overflow-hidden" style={{ aspectRatio: "1136 / 1024" }}>
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
          [...Array(Math.min(state.picts, 6))].map((_, i) => (
            <PictWarrior key={i} className="w-11 h-14 drop-shadow" />
          ))
        )}
        {state.picts > 6 && (
          <span className="text-destructive font-bold text-sm">+{state.picts - 6}</span>
        )}
      </DisplayZone>

      {/* Garrison droppable 22–47%: shows soldiers */}
      <DroppableZone id="garrison" topPct={22} heightPct={25}>
        {state.soldiers === 0 ? (
          <span className="text-white/30 text-[9px] font-serif italic pt-5">
            Drop citizen to enlist as soldier
          </span>
        ) : (
          [...Array(Math.min(state.soldiers, 8))].map((_, i) => (
            <SoldierPiece key={i} className="w-11 h-14 drop-shadow" />
          ))
        )}
        {state.soldiers > 8 && (
          <span className="text-primary text-xs font-bold">+{state.soldiers - 8}</span>
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
          [...Array(Math.min(state.picts, 5))].map((_, i) => (
            <PictWarrior key={i} className="w-10 h-12 drop-shadow" />
          ))
        )}
        {state.picts > 5 && <span className="text-destructive font-bold text-xs">+{state.picts - 5}</span>}
      </DisplayZone>

      {/* Garrison 20–42% */}
      <DroppableZone id="garrison" topPct={20} heightPct={22}>
        {state.soldiers === 0 ? (
          <span className="text-white/30 text-[8px] font-serif italic pt-4">
            Drop to enlist soldier
          </span>
        ) : (
          [...Array(Math.min(state.soldiers, 5))].map((_, i) => (
            <SoldierPiece key={i} className="w-10 h-12 drop-shadow" />
          ))
        )}
        {state.soldiers > 5 && <span className="text-primary text-xs font-bold">+{state.soldiers - 5}</span>}
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
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.82)" }}
          data-testid="instructions-overlay"
        >
          {/*
           * Scroll container.
           * The new scroll PNG has a transparent background — the scroll itself
           * is portrait (≈820×1024 px, ratio ≈0.80). We allow it to grow to
           * 580 px wide on desktop so the text isn't cramped.
           */}
          <motion.div
            initial={{ scale: 0.93, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.93, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative"
            style={{
              width: "min(580px, 92vw)",
              /* cap height so the scroll never overflows the viewport */
              maxHeight: "96vh",
            }}
          >
            {/* ── Scroll frame image ──────────────────────────────────── */}
            <img
              src={scrollBg}
              alt=""
              draggable={false}
              className="w-full h-auto block select-none pointer-events-none"
            />

            {/*
             * ── Parchment text area ─────────────────────────────────────
             * The usable parchment inside the new scroll:
             *   top rod + eagle  ≈ 11 %
             *   bottom rod       ≈ 12 %
             *   left columns     ≈ 13 %
             *   right columns    ≈ 13 %
             *
             * We leave an extra 17 % at the bottom for the stone button so
             * neither overlaps. Text scrolls internally only if necessary.
             */}
            <div
              className="absolute overflow-y-auto"
              style={{
                top: "12%",
                bottom: "29%",   /* button sits in the lower 17 % of parchment */
                left: "14%",
                right: "14%",
              }}
            >
              <div
                className="font-serif select-none"
                style={{ color: "#3b1a09", lineHeight: 1.4 }}
              >
                {/* Title */}
                <h2
                  className="text-center font-bold tracking-wide mb-2"
                  style={{ fontSize: "clamp(13px, 2.4vw, 17px)" }}
                >
                  Governor's Mandate
                </h2>

                {/* Goal + mechanic in one block */}
                <p
                  className="font-semibold mb-1"
                  style={{ fontSize: "clamp(10px, 1.85vw, 13px)" }}
                >
                  Build all 6 wall sections before the Picts overwhelm the province.
                </p>
                <p
                  className="italic mb-2 opacity-70"
                  style={{ fontSize: "clamp(9px, 1.65vw, 11px)" }}
                >
                  Each citizen you assign to a zone adds 1 Pict to the border.
                </p>

                {/* Zone rules — compact */}
                <div
                  className="mb-2"
                  style={{ fontSize: "clamp(9px, 1.75vw, 12px)", display: "grid", gap: "4px" }}
                >
                  <p><span className="font-bold">Town —</span> Your citizen pool. Drag citizens to any zone.</p>
                  <p><span className="font-bold">Garrison —</span> Citizen becomes a soldier. Raid (2 Picts): 50 % repel (2 Picts gone) or 50 % fail (soldier + 1 Pict lost).</p>
                  <p><span className="font-bold">Farm —</span> Send 2 → both return with a new recruit (+3 to Town).</p>
                  <p><span className="font-bold">Quarry —</span> Send 2 → both return + 1 wall section built.</p>
                </div>

                {/* Raid callout */}
                <div
                  className="border px-2 py-1 mb-1.5"
                  style={{
                    fontSize: "clamp(9px, 1.6vw, 11px)",
                    borderColor: "rgba(139,32,32,0.45)",
                    background: "rgba(139,32,32,0.06)",
                  }}
                >
                  <span className="font-bold" style={{ color: "#8b2020" }}>No soldier at raid: </span>
                  2 Picts strike — 1 citizen slain (Farm → Town → Quarry priority).
                </div>

                {/* Loss + tip inline */}
                <div
                  className="border px-2 py-1"
                  style={{
                    fontSize: "clamp(9px, 1.6vw, 11px)",
                    borderColor: "rgba(139,32,32,0.40)",
                  }}
                >
                  <span className="font-bold" style={{ color: "#8b2020" }}>Lose if: </span>
                  4 Picts gather · All Romans gone · Town empty
                </div>

                <p
                  className="italic opacity-50 mt-1.5"
                  style={{ fontSize: "clamp(8px, 1.5vw, 10px)" }}
                >
                  Tip: Enlist 1–2 soldiers early to protect your workforce from raids.
                </p>
              </div>
            </div>

            {/*
             * ── Stone "I Understand" button ─────────────────────────────
             * Positioned inside the lower parchment area (above the bottom rod).
             * The PNG already has a transparent background — no CSS bg needed.
             * Clickable area matches the image exactly.
             */}
            <button
              onClick={onClose}
              className="absolute left-1/2 focus:outline-none transition-filter duration-150 ease-out hover:brightness-110 active:brightness-90"
              style={{
                bottom: "14%",
                width: "58%",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transform: "translateX(-50%)",
              }}
              data-testid="btn-dismiss"
              aria-label="I Understand"
            >
              <img
                src={continueBtn}
                alt="I Understand"
                draggable={false}
                className="w-full h-auto block select-none drop-shadow-lg"
              />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Main Game component ───────────────────────────────────────────────────
export default function Game() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
  const [showInstructions, setShowInstructions] = useState(false);
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

  /* Game feedback flash state (ready for UI wiring) */
  const prevRef = useRef<GameStateType>(state);
  useEffect(() => {
    prevRef.current = state;
  }, [state]);

  return (
    <div className="h-dvh w-full flex flex-col bg-background text-foreground overflow-hidden">

      {/* ── Header ── */}
      <header className="px-3 py-1.5 border-b-2 border-border flex justify-between items-center bg-card flex-shrink-0">
        <h1 className="text-sm md:text-base font-serif text-primary uppercase tracking-widest font-bold">
          Hadrian's Wall
        </h1>
        <div className="flex gap-1.5 items-center font-serif text-[11px]">
          <span className={state.picts >= 3 ? "text-destructive font-bold animate-pulse" : "opacity-50"}>
            👹 {state.picts}/4
          </span>
          <span className="opacity-40">·</span>
          <span className="opacity-50">🧱 {state.wallSections}/{state.maxWallSections}</span>
        </div>
      </header>

      {/* ── Main layout ── */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <main className="flex-1 flex flex-col md:flex-row min-h-0">
          {isDesktop ? (
            <>
              {/* Board — fills all remaining space */}
              <div className="flex-1 min-w-0 flex items-center justify-center relative">
                <DesktopBoard state={state} />
                {/* Floating sidebar card */}
                <div className="absolute top-3 right-3 w-44 border-2 border-border bg-card/95 shadow-xl overflow-y-auto max-h-[92%]">
                  <SidePanel
                    state={state}
                    onRestart={handleRestart}
                    onHelp={() => setShowInstructions(true)}
                  />
                </div>
              </div>
            </>
          ) : (
            /* Mobile: board then compact strip */
            <div className="flex flex-col min-h-0">
              <div className="flex-1 min-h-0">
                <MobileBoard state={state} />
              </div>
              <MobileStatStrip
                state={state}
                onRestart={handleRestart}
                onHelp={() => setShowInstructions(true)}
              />
            </div>
          )}
        </main>

        {/* Drag overlay */}
        <DragOverlay dropAnimation={null}>
          {activeCitizenIdx !== null && (
            <MeeplePiece className="w-16 h-20 drop-shadow-2xl" />
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
