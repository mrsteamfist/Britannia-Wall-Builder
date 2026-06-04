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
      <MeeplePiece className="w-[120px] h-[144px] drop-shadow-md" />
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
  isDragging,
  isValid,
  className = "",
}: {
  id: DropZoneId;
  children: React.ReactNode;
  topPct: number;
  heightPct: number;
  isDragging: boolean;
  isValid: boolean;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  let zoneClass = "";
  if (isDragging) {
    if (!isValid) {
      zoneClass = "ring-1 ring-inset ring-stone-600/20 bg-black/20 opacity-50";
    } else if (isOver) {
      zoneClass =
        "ring-4 ring-inset ring-amber-300 bg-amber-400/30 shadow-inner shadow-amber-200/50";
    } else {
      zoneClass =
        "ring-2 ring-inset ring-amber-400/70 bg-amber-500/12 animate-pulse";
    }
  } else {
    zoneClass = "ring-1 ring-inset ring-white/15 bg-transparent";
  }

  return (
    <div
      ref={setNodeRef}
      style={{ top: `${topPct}%`, height: `${heightPct}%` }}
      className={`absolute inset-x-0 transition-all duration-150 flex flex-wrap gap-3 items-center justify-center p-1 ${zoneClass} ${className}`}
      data-testid={`zone-${id}`}
    >
      {children}
      {isOver && isValid && (
        <div className="absolute inset-0 flex items-end justify-center pb-1.5 pointer-events-none">
          <span
            className="text-amber-100 text-[9px] font-serif font-bold tracking-widest uppercase"
            style={{ textShadow: "0 0 8px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,1)" }}
          >
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
      className="absolute inset-x-0 flex flex-wrap gap-3 items-center justify-center p-1"
    >
      {children}
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────
type GameStateType = ReturnType<typeof gameReducer>;

// ── Atmospheric status text ────────────────────────────────────────────────
function getStatusText(state: GameStateType) {
  if (state.status === "win") return "Roma Victrix! The Wall stands eternal.";
  if (state.status === "loss") return "Britannia has fallen to the north.";
  if (state.picts >= 5) return "⚠⚠ The north is aflame — disaster looms!";
  if (state.picts >= 4) return "⚠ Barbarians mass at the gates!";
  if (state.picts >= 3) return "Unrest stirs across the frontier.";
  if (state.picts >= 2) return "A shadow moves in the northern hills.";
  if (state.picts >= 1) return "A scout has been spotted.";
  if (state.town === 0) return "The Town is empty — no moves remain.";
  return "Drag a citizen upward to issue orders.";
}

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
  const danger = state.picts >= 4;
  const statusText = getStatusText(state);

  return (
    <div className="flex flex-col gap-2 p-2 h-full min-h-0">

      {/* Title */}
      <h1 className="font-serif font-bold text-center tracking-widest uppercase text-primary text-xs leading-tight pt-0.5">
        Hadrian's Wall
      </h1>

      <div className="border-t border-border/40" />

      {/* 4 counters */}
      <div className="grid grid-cols-2 gap-1">
        {[
          { label: "Town", value: state.town, hi: true, danger: false },
          { label: "Soldiers", value: state.soldiers, hi: false, danger: false },
          { label: "Picts", value: `${state.picts}/6`, hi: false, danger: state.picts >= 4 },
          { label: "Wall", value: `${state.wallSections}/6`, hi: true, danger: false },
        ].map(({ label, value, hi, danger: d }) => (
          <div
            key={label}
            className={`flex flex-col items-center py-1 border-2 ${
              d ? "border-destructive/70 bg-destructive/10"
                : hi ? "border-primary/50 bg-primary/5"
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

      {/* Wall segments */}
      <div>
        <p className="text-[8px] uppercase tracking-widest opacity-30 text-center mb-0.5">The Wall</p>
        <div className="flex gap-0.5 justify-center" data-testid="wall-display">
          {[...Array(state.maxWallSections)].map((_, i) => (
            <div key={i} className="w-6 h-8 flex-shrink-0">
              <WallSegment built={i < state.wallSections} className="w-full h-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Status */}
      <p className={`font-serif text-[10px] italic text-center px-1 leading-tight ${
        danger ? "text-destructive font-semibold" : "opacity-60"
      }`}>
        {statusText}
      </p>

      {/* Last log line */}
      {lastLog && (
        <p className={`text-[9px] font-serif italic text-center px-1 leading-tight opacity-50 line-clamp-2 ${
          lastLog.includes("RAID") || lastLog.includes("slain") || lastLog.includes("🔥") ? "text-destructive opacity-80" : ""
        }`}>
          {lastLog}
        </p>
      )}

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
        className="text-[9px] font-serif opacity-40 hover:opacity-80 text-center py-0.5 tracking-wide"
      >
        Rules
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
  const statusText = getStatusText(state);
  return (
    <div className="flex flex-col gap-1.5 px-2 py-2 bg-card border-t-4 border-border">

      {/* Title row */}
      <h1 className="font-serif font-bold text-center tracking-widest uppercase text-primary text-[11px] leading-none pb-0.5">
        Hadrian's Wall
      </h1>

      {/* 4 counters in a row */}
      <div className="grid grid-cols-4 gap-1">
        {[
          { label: "Town", value: state.town, danger: false, accent: true },
          { label: "Soldiers", value: state.soldiers, danger: false, accent: false },
          { label: "Picts", value: `${state.picts}/6`, danger: state.picts >= 4, accent: false },
          { label: "Wall", value: `${state.wallSections}/6`, danger: false, accent: true },
        ].map(({ label, value, danger, accent }) => (
          <div
            key={label}
            className={`flex flex-col items-center py-1 border-2 ${
              danger ? "border-destructive/70 bg-destructive/10"
                : accent ? "border-primary/50"
                  : "border-border"
            }`}
          >
            <span className={`text-base font-serif font-bold leading-none ${danger ? "text-destructive" : accent ? "text-primary" : ""}`}>
              {value}
            </span>
            <span className="text-[8px] uppercase tracking-wider opacity-40">{label}</span>
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

      {/* Status + last log */}
      <p className={`text-[9px] font-serif italic text-center opacity-60 leading-tight ${
        state.picts >= 4 ? "text-destructive opacity-80 font-semibold" : ""
      }`}>
        {statusText}
      </p>
      {lastLog && (
        <p className={`text-[9px] font-serif italic text-center opacity-50 leading-tight ${
          lastLog.includes("🔥") || lastLog.includes("slain") ? "text-destructive opacity-80" : ""
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
          className="font-serif text-xs border border-border px-3 opacity-60 hover:opacity-100 tracking-wide"
        >
          Rules
        </button>
      </div>
    </div>
  );
}

// ── Desktop board (landscape image) ───────────────────────────────────────
function DesktopBoard({ state, isDragging }: { state: GameStateType; isDragging: boolean }) {
  const validZones = {
    garrison: state.town >= 1,
    farm: state.town >= 1,
    quarry: state.town >= 2,
  };

  return (
    <div className="relative h-full overflow-hidden" style={{ aspectRatio: "1082 / 1024" }}>
      <img
        src={boardDesktop}
        alt="Hadrian's Wall board"
        className="absolute inset-0 w-full h-full object-cover object-left"
        draggable={false}
      />
      <div className="absolute inset-0 bg-black/5 pointer-events-none" />

      {/* Pict Raiders 0–23% */}
      <DisplayZone topPct={0} heightPct={23}>
        {state.picts === 0 ? (
          <span className="text-white/30 text-[10px] font-serif italic">No Picts yet</span>
        ) : (
          [...Array(Math.min(state.picts, 6))].map((_, i) => (
            <PictWarrior key={i} className="w-[120px] h-[144px] drop-shadow" />
          ))
        )}
        {state.picts > 6 && (
          <span className="text-destructive font-bold text-sm">+{state.picts - 6}</span>
        )}
      </DisplayZone>

      {/* Garrison droppable 23–45% */}
      <DroppableZone id="garrison" topPct={23} heightPct={22} isDragging={isDragging} isValid={validZones.garrison}>
        {[...Array(Math.min(state.soldiers, 8))].map((_, i) => (
          <SoldierPiece key={i} className="w-[120px] h-[144px] drop-shadow" />
        ))}
        {state.soldiers > 8 && (
          <span className="text-primary text-xs font-bold">+{state.soldiers - 8}</span>
        )}
      </DroppableZone>

      {/* Farm droppable 45–60%: ghost worker if last action was farm */}
      <DroppableZone id="farm" topPct={45} heightPct={15} isDragging={isDragging} isValid={validZones.farm}>
        {state.lastAction === "farm" && (
          <MeeplePiece className="w-[100px] h-[120px] opacity-45 drop-shadow" />
        )}
      </DroppableZone>

      {/* Town zone 60–80%: draggable citizens (source) */}
      <DisplayZone topPct={60} heightPct={20}>
        {state.town === 0 ? (
          <span className="text-white/40 text-[9px] font-serif italic">Town empty</span>
        ) : (
          [...Array(state.town)].map((_, i) => (
            <DraggableCitizen key={i} idx={i} />
          ))
        )}
      </DisplayZone>

      {/* Quarry droppable 82–100%: ghost worker if last action was quarry */}
      <DroppableZone id="quarry" topPct={82} heightPct={18} isDragging={isDragging} isValid={validZones.quarry}>
        {state.lastAction === "quarry" && (
          <MeeplePiece className="w-[100px] h-[120px] opacity-45 drop-shadow" />
        )}
      </DroppableZone>
    </div>
  );
}

// ── Mobile board (portrait image) ─────────────────────────────────────────
function MobileBoard({ state, isDragging }: { state: GameStateType; isDragging: boolean }) {
  const validZones = {
    garrison: state.town >= 1,
    farm: state.town >= 1,
    quarry: state.town >= 2,
  };

  return (
    <div className="relative w-full" style={{ aspectRatio: "400 / 1024" }}>
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
            <PictWarrior key={i} className="w-[120px] h-[144px] drop-shadow" />
          ))
        )}
        {state.picts > 5 && <span className="text-destructive font-bold text-xs">+{state.picts - 5}</span>}
      </DisplayZone>

      {/* Garrison 20–42% */}
      <DroppableZone id="garrison" topPct={20} heightPct={22} isDragging={isDragging} isValid={validZones.garrison}>
        {[...Array(Math.min(state.soldiers, 5))].map((_, i) => (
          <SoldierPiece key={i} className="w-[120px] h-[144px] drop-shadow" />
        ))}
        {state.soldiers > 5 && <span className="text-primary text-xs font-bold">+{state.soldiers - 5}</span>}
      </DroppableZone>

      {/* Farm 42–60% */}
      <DroppableZone id="farm" topPct={42} heightPct={18} isDragging={isDragging} isValid={validZones.farm}>
        {state.lastAction === "farm" && (
          <MeeplePiece className="w-[90px] h-[108px] opacity-45 drop-shadow" />
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
      <DroppableZone id="quarry" topPct={76} heightPct={24} isDragging={isDragging} isValid={validZones.quarry}>
        {state.lastAction === "quarry" && (
          <MeeplePiece className="w-[90px] h-[108px] opacity-45 drop-shadow" />
        )}
      </DroppableZone>
    </div>
  );
}

// ── Warning / confirmation modal ───────────────────────────────────────────
function WarningModal({
  message,
  isFatal,
  onConfirm,
  onCancel,
}: {
  message: string;
  isFatal: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="max-w-xs w-full bg-card border-4 border-destructive/60 p-5 text-center shadow-2xl"
      >
        <div className="text-2xl mb-2">{isFatal ? "☠" : "⚠"}</div>
        <h3 className="font-serif font-bold text-sm text-primary uppercase tracking-widest mb-3">
          {isFatal ? "Grave Warning" : "Dangerous Territory"}
        </h3>
        <p className="font-serif text-xs leading-relaxed opacity-80 mb-5">{message}</p>
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            className="font-serif text-xs border-2 px-4"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className={`font-serif text-xs px-4 ${isFatal ? "bg-destructive hover:bg-destructive/90" : "bg-amber-700 hover:bg-amber-600"}`}
            onClick={onConfirm}
          >
            {isFatal ? "Proceed Anyway" : "Proceed"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
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
          <motion.div
            initial={{ scale: 0.93, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.93, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative select-none"
            style={{ width: "min(580px, 92vw)" }}
          >
            <img
              src={scrollBg}
              alt=""
              draggable={false}
              className="w-full h-auto block select-none pointer-events-none"
            />

            <div
              className="absolute overflow-y-auto"
              style={{ top: "12%", bottom: "29%", left: "14%", right: "14%" }}
            >
              <div className="font-serif select-none" style={{ color: "#3b1a09", lineHeight: 1.45 }}>

                <h2
                  className="text-center font-bold tracking-wide mb-2"
                  style={{ fontSize: "clamp(13px, 2.4vw, 17px)" }}
                >
                  Governor's Mandate
                </h2>

                <p
                  className="italic mb-2 opacity-75 text-center"
                  style={{ fontSize: "clamp(9px, 1.6vw, 11px)" }}
                >
                  By Imperial decree, you are charged with raising Hadrian's Wall before the northern
                  tribes overwhelm the province of Britannia.
                </p>

                <p
                  className="font-semibold mb-2"
                  style={{ fontSize: "clamp(10px, 1.85vw, 13px)" }}
                >
                  Build all 6 wall sections. Each season, drag one citizen to an assignment:
                </p>

                <div
                  className="mb-2"
                  style={{ fontSize: "clamp(9px, 1.75vw, 12px)", display: "grid", gap: "5px" }}
                >
                  <p>
                    <span className="font-bold">Garrison —</span>{" "}
                    A citizen enlists as a permanent soldier, forming your line of defence.
                  </p>
                  <p>
                    <span className="font-bold">Farm —</span>{" "}
                    A citizen tends the land, drawing another settler to the province.
                  </p>
                  <p>
                    <span className="font-bold">Quarry —</span>{" "}
                    Two citizens hew stone to raise one wall section. Costs 2 citizens total.
                  </p>
                </div>

                <div
                  className="border px-2 py-1.5 mb-1.5"
                  style={{
                    fontSize: "clamp(9px, 1.6vw, 11px)",
                    borderColor: "rgba(139,32,32,0.45)",
                    background: "rgba(139,32,32,0.06)",
                  }}
                >
                  <span className="font-bold" style={{ color: "#8b2020" }}>Lose if: </span>
                  The Town empties · Six Picts gather at the border
                </div>

                <p
                  className="italic opacity-60 mt-1"
                  style={{ fontSize: "clamp(8px, 1.5vw, 10px)" }}
                >
                  The northern clans grow bolder each season. Watch the frontier — and keep
                  citizens in the Town at all costs.
                </p>
              </div>
            </div>

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

// ── Warning helper ─────────────────────────────────────────────────────────
type DropDest = "garrison" | "farm" | "quarry";

function getWarning(
  state: GameStateType,
  dest: DropDest
): { message: string; isFatal: boolean } | null {
  const { town, picts } = state;

  if (dest === "garrison" && town === 1) {
    return {
      message:
        "Your last citizen will permanently enlist as a soldier. The Town will be empty and the province will fall immediately.",
      isFatal: true,
    };
  }
  if (dest === "quarry" && town === 2) {
    return {
      message:
        "The Quarry demands two citizens. This will empty the Town entirely — the province will fall immediately.",
      isFatal: true,
    };
  }
  if (picts === 5) {
    return {
      message:
        "Six Picts may soon mass at the border. The province teeters on the edge — proceed at your own peril.",
      isFatal: false,
    };
  }
  return null;
}

// ── Main Game component ───────────────────────────────────────────────────
export default function Game() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
  const [showInstructions, setShowInstructions] = useState(true);
  const [activeCitizenIdx, setActiveCitizenIdx] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<DropDest | null>(null);
  const [warning, setWarning] = useState<{ message: string; isFatal: boolean } | null>(null);

  const isDragging = activeCitizenIdx !== null;

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
    if (dest !== "garrison" && dest !== "farm" && dest !== "quarry") return;

    const typedDest = dest as DropDest;

    // Block quarry when not enough citizens
    if (typedDest === "quarry" && state.town < 2) return;

    // Check for dangerous-action warning
    const w = getWarning(state, typedDest);
    if (w) {
      setPendingAction(typedDest);
      setWarning(w);
      return;
    }

    dispatch({ type: "ASSIGN", destination: typedDest });
  }, [state]);

  const handleDragCancel = useCallback(() => setActiveCitizenIdx(null), []);

  const handleWarningConfirm = useCallback(() => {
    if (pendingAction) {
      dispatch({ type: "ASSIGN", destination: pendingAction });
    }
    setPendingAction(null);
    setWarning(null);
  }, [pendingAction]);

  const handleWarningCancel = useCallback(() => {
    setPendingAction(null);
    setWarning(null);
  }, []);

  function handleRestart() {
    dispatch({ type: "RESTART" });
    setShowInstructions(true);
  }

  const prevRef = useRef<GameStateType>(state);
  useEffect(() => {
    prevRef.current = state;
  }, [state]);

  return (
    <div className="h-dvh w-full flex flex-col bg-background text-foreground overflow-hidden">

      <main className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          {isDesktop ? (
            <>
              <div className="flex-1 min-w-0 flex items-center justify-center relative">
                <DesktopBoard state={state} isDragging={isDragging} />
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
            <div className="flex flex-col">
              <div className="flex-shrink-0">
                <MobileBoard state={state} isDragging={isDragging} />
              </div>
              <MobileStatStrip
                state={state}
                onRestart={handleRestart}
                onHelp={() => setShowInstructions(true)}
              />
            </div>
          )}

          <DragOverlay dropAnimation={null}>
            {activeCitizenIdx !== null && (
              <MeeplePiece className="w-[120px] h-[144px] drop-shadow-2xl" />
            )}
          </DragOverlay>
        </DndContext>
      </main>

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
                <p>Soldiers: {state.soldiers} · Citizens: {state.town}</p>
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

      {/* ── Warning modal ── */}
      <AnimatePresence>
        {warning && (
          <WarningModal
            message={warning.message}
            isFatal={warning.isFatal}
            onConfirm={handleWarningConfirm}
            onCancel={handleWarningCancel}
          />
        )}
      </AnimatePresence>

      <InstructionsModal open={showInstructions} onClose={() => setShowInstructions(false)} />
    </div>
  );
}
