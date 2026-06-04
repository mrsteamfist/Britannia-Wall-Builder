import { useReducer, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
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

// ── Draggable citizen ──────────────────────────────────────────────────────
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
      zoneClass = "ring-4 ring-inset ring-amber-300 bg-amber-400/30 shadow-inner shadow-amber-200/50";
    } else {
      zoneClass = "ring-2 ring-inset ring-amber-400/70 bg-amber-500/12 animate-pulse";
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

// ── Display-only zone ─────────────────────────────────────────────────────
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

type FloatEvent = {
  id: string;
  text: string;
  topPct: number;
  kind: "success" | "warning" | "danger";
};

type DyingPiece = {
  id: string;
  zone: "garrison" | "town";
};

type RaidTarget = "garrison" | "town" | "border";

type PendingRaid = {
  events: FloatEvent[];
  dying: DyingPiece[];
  target: RaidTarget;
};

// ── Pict raid animation — warrior slides to attack zone then retreats ──────
function RaidAnimationOverlay({ target, onDone }: { target: RaidTarget; onDone: () => void }) {
  const startTop = "6%";
  const peakTop = target === "town" ? "62%" : target === "garrison" ? "24%" : "17%";

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 46, pointerEvents: "none" }}>
      <motion.div
        style={{ position: "absolute", left: "38%" }}
        initial={{ top: startTop, opacity: 1 }}
        animate={{ top: peakTop, opacity: [1, 1, 0] }}
        transition={{ duration: 0.45, times: [0, 0.65, 1], ease: "easeIn" }}
        onAnimationComplete={onDone}
      >
        <div style={{ filter: "drop-shadow(0 0 14px rgba(220,38,38,0.9))" }}>
          <PictWarrior className="w-[120px] h-[144px]" />
        </div>
      </motion.div>
    </div>
  );
}

// ── Floating raid label ────────────────────────────────────────────────────
function FloatingLabel({ event, onDone }: { event: FloatEvent; onDone: (id: string) => void }) {
  const color =
    event.kind === "danger" ? "#fca5a5"
    : event.kind === "success" ? "#86efac"
    : "#fcd34d";

  return (
    <div
      style={{
        position: "absolute",
        top: `${event.topPct}%`,
        left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 40,
      }}
    >
      <motion.div
        initial={{ opacity: 1, y: 0 }}
        animate={{ opacity: 0, y: -42 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        onAnimationComplete={() => onDone(event.id)}
        className="font-serif font-bold tracking-widest uppercase whitespace-nowrap"
        style={{
          color,
          fontSize: "clamp(11px, 1.4vw, 15px)",
          textShadow: "0 0 10px rgba(0,0,0,1), 0 1px 4px rgba(0,0,0,1), 0 0 3px rgba(0,0,0,1)",
        }}
      >
        {event.text}
      </motion.div>
    </div>
  );
}

// ── Dying piece ghost ──────────────────────────────────────────────────────
function DyingPieceGhost({ piece, onDone }: { piece: DyingPiece; onDone: (id: string) => void }) {
  const topPct = piece.zone === "garrison" ? 29 : 64;
  const Piece = piece.zone === "garrison" ? SoldierPiece : MeeplePiece;

  return (
    <div
      style={{
        position: "absolute",
        top: `${topPct}%`,
        left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "none",
        zIndex: 35,
      }}
    >
      <motion.div
        initial={{ opacity: 1, scale: 1 }}
        animate={{ opacity: 0, scale: 0.15 }}
        transition={{ duration: 0.85, ease: "easeIn" }}
        onAnimationComplete={() => onDone(piece.id)}
        className="relative"
      >
        <Piece className="w-[120px] h-[144px]" />
        <div
          className="absolute inset-0"
          style={{
            background: "rgba(220,38,38,0.55)",
            mixBlendMode: "multiply",
            borderRadius: "50%",
          }}
        />
      </motion.div>
    </div>
  );
}

// ── Sidebar panel (transparent, floating over board) ───────────────────────
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

  const shadow = "0 1px 4px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.8)";

  return (
    <div className="flex flex-col gap-2 p-2">

      <h1
        className="font-serif font-bold text-center tracking-widest uppercase text-amber-200 text-xs leading-tight pt-0.5"
        style={{ textShadow: shadow }}
      >
        Hadrian's Wall
      </h1>

      <div className="border-t border-white/20" />

      <div className="grid grid-cols-2 gap-1">
        {[
          { label: "Town", value: state.town, accent: true, danger: false },
          { label: "Soldiers", value: state.soldiers, accent: false, danger: false },
          { label: "Picts", value: `${state.picts}/6`, accent: false, danger: state.picts >= 4 },
          { label: "Wall", value: `${state.wallSections}/6`, accent: true, danger: false },
        ].map(({ label, value, accent, danger: d }) => (
          <div
            key={label}
            className={`flex flex-col items-center py-1 border-2 ${
              d ? "border-red-400/70 bg-black/65"
                : accent ? "border-amber-300/60 bg-black/60"
                  : "border-stone-400/40 bg-black/55"
            }`}
          >
            <span
              className={`text-lg font-serif font-bold leading-none ${
                d ? "text-red-300" : accent ? "text-amber-200" : "text-stone-200"
              }`}
              style={{ textShadow: shadow }}
            >
              {value}
            </span>
            <span
              className="text-[8px] uppercase tracking-wider text-stone-400 mt-0.5"
              style={{ textShadow: "0 1px 2px rgba(0,0,0,0.9)" }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {lastLog && (
        <p
          className={`text-[9px] font-serif italic text-center px-1 leading-tight line-clamp-2 ${
            lastLog.includes("🔥") || lastLog.includes("slain") || lastLog.includes("lost")
              ? "text-red-300"
              : "text-stone-300"
          }`}
          style={{ textShadow: shadow }}
        >
          {lastLog}
        </p>
      )}

      {danger && (
        <p
          className="text-[9px] font-bold font-serif text-center text-red-300 tracking-wide"
          style={{ textShadow: shadow }}
        >
          ⚠ Barbarians at the gates!
        </p>
      )}

      <div className="flex-1 min-h-[4px]" />

      <Button
        variant="outline"
        size="sm"
        className="w-full font-serif tracking-wider border-2 border-amber-300/50 text-amber-100 bg-black/50 text-xs py-1 hover:bg-black/70"
        onClick={onRestart}
        data-testid="btn-restart"
      >
        New Game
      </Button>
      <button
        onClick={onHelp}
        className="text-[9px] font-serif text-stone-400 hover:text-stone-200 text-center py-0.5 tracking-wide"
        style={{ textShadow: shadow }}
      >
        Rules
      </button>
    </div>
  );
}

// ── Mobile stat strip ──────────────────────────────────────────────────────
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
      <h1 className="font-serif font-bold text-center tracking-widest uppercase text-primary text-[11px] leading-none pb-0.5">
        Hadrian's Wall
      </h1>
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
      {lastLog && (
        <p className={`text-[9px] font-serif italic text-center opacity-60 leading-tight line-clamp-2 ${
          lastLog.includes("🔥") || lastLog.includes("slain") || lastLog.includes("lost") ? "text-destructive opacity-80" : ""
        }`}>
          {lastLog}
        </p>
      )}
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

// ── Desktop board ──────────────────────────────────────────────────────────
function DesktopBoard({
  state,
  isDragging,
  shakeKey,
  floatEvents,
  dyingPieces,
  onFloatDone,
  onDyingDone,
  raidAnim,
  isAnimating,
  onRaidAnimDone,
}: {
  state: GameStateType;
  isDragging: boolean;
  shakeKey: number;
  floatEvents: FloatEvent[];
  dyingPieces: DyingPiece[];
  onFloatDone: (id: string) => void;
  onDyingDone: (id: string) => void;
  raidAnim: RaidTarget | null;
  isAnimating: boolean;
  onRaidAnimDone: () => void;
}) {
  const controls = useAnimation();
  const prevShakeRef = useRef(0);

  useEffect(() => {
    if (shakeKey !== prevShakeRef.current) {
      prevShakeRef.current = shakeKey;
      void controls.start({
        x: [0, -9, 9, -6, 6, -3, 3, 0],
        transition: { duration: 0.48, times: [0, 0.12, 0.25, 0.38, 0.52, 0.65, 0.82, 1] },
      });
    }
  }, [shakeKey, controls]);

  const validZones = {
    garrison: state.town >= 1,
    farm: state.town >= 1,
    quarry: state.town >= 2,
  };

  return (
    <motion.div
      animate={controls}
      className="relative h-full overflow-hidden"
      style={{ aspectRatio: "1082 / 1024" }}
    >
      <img
        src={boardDesktop}
        alt="Hadrian's Wall board"
        className="absolute inset-0 w-full h-full object-cover object-left"
        draggable={false}
      />
      <div className="absolute inset-0 bg-black/5 pointer-events-none" />

      {/* ── Wall segments overlay in garrison band ── */}
      <div
        style={{
          position: "absolute",
          top: "23%",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "3px",
          zIndex: 8,
          pointerEvents: "none",
          width: "48.4%",
        }}
        data-testid="wall-display"
      >
        {[...Array(state.maxWallSections)].map((_, i) => (
          <div key={i} style={{ flex: 1, aspectRatio: "3 / 5" }}>
            <WallSegment built={i < state.wallSections} className="w-full h-full" />
          </div>
        ))}
      </div>

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
      <DroppableZone id="garrison" topPct={23} heightPct={22} isDragging={isDragging} isValid={validZones.garrison} className="!items-end pb-2">
        {[...Array(Math.min(state.soldiers, 8))].map((_, i) => (
          <SoldierPiece key={i} className="w-[120px] h-[144px] drop-shadow" />
        ))}
        {state.soldiers > 8 && (
          <span className="text-primary text-xs font-bold">+{state.soldiers - 8}</span>
        )}
      </DroppableZone>

      {/* Farm droppable 45–60% */}
      <DroppableZone id="farm" topPct={45} heightPct={15} isDragging={isDragging} isValid={validZones.farm}>
        {state.lastAction === "farm" && (
          <MeeplePiece className="w-[100px] h-[120px] opacity-45 drop-shadow" />
        )}
      </DroppableZone>

      {/* Town 60–80%: draggable citizens */}
      <DisplayZone topPct={60} heightPct={20}>
        {state.town === 0 ? (
          <span className="text-white/40 text-[9px] font-serif italic">Town empty</span>
        ) : (
          [...Array(state.town)].map((_, i) => (
            <DraggableCitizen key={i} idx={i} />
          ))
        )}
      </DisplayZone>

      {/* Quarry droppable 82–100% */}
      <DroppableZone id="quarry" topPct={82} heightPct={18} isDragging={isDragging} isValid={validZones.quarry}>
        {state.lastAction === "quarry" && (
          <MeeplePiece className="w-[100px] h-[120px] opacity-45 drop-shadow" />
        )}
      </DroppableZone>

      {/* ── Dying piece ghosts ── */}
      {dyingPieces.map((p) => (
        <DyingPieceGhost key={p.id} piece={p} onDone={onDyingDone} />
      ))}

      {/* ── Floating raid labels ── */}
      {floatEvents.map((e) => (
        <FloatingLabel key={e.id} event={e} onDone={onFloatDone} />
      ))}

      {/* ── Pict attack animation ── */}
      {raidAnim && <RaidAnimationOverlay target={raidAnim} onDone={onRaidAnimDone} />}

      {/* ── Interaction blocker during animation ── */}
      {isAnimating && (
        <div style={{ position: "absolute", inset: 0, zIndex: 30, cursor: "wait" }} />
      )}
    </motion.div>
  );
}

// ── Mobile board ───────────────────────────────────────────────────────────
function MobileBoard({
  state,
  isDragging,
  shakeKey,
  floatEvents,
  dyingPieces,
  onFloatDone,
  onDyingDone,
  raidAnim,
  isAnimating,
  onRaidAnimDone,
}: {
  state: GameStateType;
  isDragging: boolean;
  shakeKey: number;
  floatEvents: FloatEvent[];
  dyingPieces: DyingPiece[];
  onFloatDone: (id: string) => void;
  onDyingDone: (id: string) => void;
  raidAnim: RaidTarget | null;
  isAnimating: boolean;
  onRaidAnimDone: () => void;
}) {
  const controls = useAnimation();
  const prevShakeRef = useRef(0);

  useEffect(() => {
    if (shakeKey !== prevShakeRef.current) {
      prevShakeRef.current = shakeKey;
      void controls.start({
        x: [0, -9, 9, -6, 6, -3, 3, 0],
        transition: { duration: 0.48, times: [0, 0.12, 0.25, 0.38, 0.52, 0.65, 0.82, 1] },
      });
    }
  }, [shakeKey, controls]);

  const validZones = {
    garrison: state.town >= 1,
    farm: state.town >= 1,
    quarry: state.town >= 2,
  };

  return (
    <motion.div
      animate={controls}
      className="relative w-full"
      style={{ aspectRatio: "400 / 1024" }}
    >
      <img
        src={boardMobile}
        alt="Hadrian's Wall board"
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />

      {/* Wall segments strip overlay at top of garrison zone */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: "2px",
          width: "88%",
          zIndex: 8,
          pointerEvents: "none",
        }}
        data-testid="wall-display-mobile"
      >
        {[...Array(state.maxWallSections)].map((_, i) => (
          <div key={i} style={{ flex: 1, aspectRatio: "3 / 5" }}>
            <WallSegment built={i < state.wallSections} className="w-full h-full" />
          </div>
        ))}
      </div>

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
      <DroppableZone id="garrison" topPct={20} heightPct={22} isDragging={isDragging} isValid={validZones.garrison} className="!items-end pb-2">
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

      {/* Town 60–76% */}
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

      {/* Dying piece ghosts */}
      {dyingPieces.map((p) => (
        <DyingPieceGhost key={p.id} piece={p} onDone={onDyingDone} />
      ))}

      {/* Floating raid labels */}
      {floatEvents.map((e) => (
        <FloatingLabel key={e.id} event={e} onDone={onFloatDone} />
      ))}

      {/* Pict attack animation */}
      {raidAnim && <RaidAnimationOverlay target={raidAnim} onDone={onRaidAnimDone} />}

      {/* Interaction blocker during animation */}
      {isAnimating && (
        <div style={{ position: "absolute", inset: 0, zIndex: 30, cursor: "wait" }} />
      )}
    </motion.div>
  );
}

// ── Warning modal ──────────────────────────────────────────────────────────
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

// ── Instructions modal ─────────────────────────────────────────────────────
function InstructionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
                    A citizen tends the land, drawing two new settlers to the province.
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

// ── Main Game component ────────────────────────────────────────────────────
export default function Game() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE);
  const [showInstructions, setShowInstructions] = useState(true);
  const [activeCitizenIdx, setActiveCitizenIdx] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<DropDest | null>(null);
  const [warning, setWarning] = useState<{ message: string; isFatal: boolean } | null>(null);

  // ── Animation state ──
  const [shakeKey, setShakeKey] = useState(0);
  const [floatEvents, setFloatEvents] = useState<FloatEvent[]>([]);
  const [dyingPieces, setDyingPieces] = useState<DyingPiece[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [pendingRaid, setPendingRaid] = useState<PendingRaid | null>(null);
  const eventCounter = useRef(0);
  const getId = () => String(++eventCounter.current);

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

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setActiveCitizenIdx(null);
      if (!e.over) return;
      const dest = e.over.id as string;
      if (dest !== "garrison" && dest !== "farm" && dest !== "quarry") return;
      const typedDest = dest as DropDest;
      if (typedDest === "quarry" && state.town < 2) return;
      const w = getWarning(state, typedDest);
      if (w) {
        setPendingAction(typedDest);
        setWarning(w);
        return;
      }
      dispatch({ type: "ASSIGN", destination: typedDest });
    },
    [state]
  );

  const handleDragCancel = useCallback(() => setActiveCitizenIdx(null), []);

  const handleWarningConfirm = useCallback(() => {
    if (pendingAction) dispatch({ type: "ASSIGN", destination: pendingAction });
    setPendingAction(null);
    setWarning(null);
  }, [pendingAction]);

  const handleWarningCancel = useCallback(() => {
    setPendingAction(null);
    setWarning(null);
  }, []);

  function handleRestart() {
    dispatch({ type: "RESTART" });
    setFloatEvents([]);
    setDyingPieces([]);
    setPendingRaid(null);
    setIsAnimating(false);
    setShowInstructions(true);
  }

  // ── Raid event detection — must run BEFORE prevRef update ──
  const prevRef = useRef<GameStateType>(state);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev === state) return;

    const newLogs = state.battleLog.slice(prev.battleLog.length);
    const hasRaid = newLogs.some(
      (l) => l.includes("⚔") || l.includes("🔥") || l.toLowerCase().includes("raid")
    );

    if (hasRaid) {
      const evts: FloatEvent[] = [];
      const dying: DyingPiece[] = [];
      let target: RaidTarget = "border";

      evts.push({ id: getId(), text: "Raid!", topPct: 5, kind: "warning" });

      // Soldier lost — pict reached garrison
      if (state.soldiers < prev.soldiers) {
        evts.push({ id: getId(), text: "Soldier lost!", topPct: 31, kind: "danger" });
        dying.push({ id: getId(), zone: "garrison" });
        target = "garrison";
      }

      // Citizen slain by raid (🔥 in new log entries) — pict broke through to town
      if (newLogs.some((l) => l.includes("🔥"))) {
        evts.push({ id: getId(), text: "Citizen slain!", topPct: 66, kind: "danger" });
        dying.push({ id: getId(), zone: "town" });
        target = "town";
      }

      // Pict driven back: expected picts = prev.picts + 1 (action), if actual is less, a pict fled
      if (state.picts < prev.picts + 1) {
        evts.push({ id: getId(), text: "Pict driven back!", topPct: 14, kind: "success" });
      }

      // Trigger animation first; effects fire after animation completes
      setPendingRaid({ events: evts, dying, target });
      setIsAnimating(true);
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update prevRef AFTER detection effect
  useEffect(() => {
    prevRef.current = state;
  }, [state]);

  const handleRaidAnimDone = useCallback(() => {
    setPendingRaid((pr) => {
      if (pr) {
        setShakeKey((k) => k + 1);
        setFloatEvents((e) => [...e, ...pr.events]);
        if (pr.dying.length) setDyingPieces((d) => [...d, ...pr.dying]);
      }
      return null;
    });
    setIsAnimating(false);
  }, []);

  const handleFloatDone = useCallback((id: string) => {
    setFloatEvents((e) => e.filter((ev) => ev.id !== id));
  }, []);

  const handleDyingDone = useCallback((id: string) => {
    setDyingPieces((d) => d.filter((p) => p.id !== id));
  }, []);

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
            <div className="flex-1 min-w-0 flex items-center justify-center relative">
              <DesktopBoard
                state={state}
                isDragging={isDragging}
                shakeKey={shakeKey}
                floatEvents={floatEvents}
                dyingPieces={dyingPieces}
                onFloatDone={handleFloatDone}
                onDyingDone={handleDyingDone}
                raidAnim={pendingRaid?.target ?? null}
                isAnimating={isAnimating}
                onRaidAnimDone={handleRaidAnimDone}
              />
              {/* Transparent floating sidebar */}
              <div className="absolute top-3 right-3 w-44 overflow-y-auto max-h-[95%]">
                <SidePanel
                  state={state}
                  onRestart={handleRestart}
                  onHelp={() => setShowInstructions(true)}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex-shrink-0">
                <MobileBoard
                  state={state}
                  isDragging={isDragging}
                  shakeKey={shakeKey}
                  floatEvents={floatEvents}
                  dyingPieces={dyingPieces}
                  onFloatDone={handleFloatDone}
                  onDyingDone={handleDyingDone}
                  raidAnim={pendingRaid?.target ?? null}
                  isAnimating={isAnimating}
                  onRaidAnimDone={handleRaidAnimDone}
                />
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

      {/* Win / Loss overlay */}
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

      {/* Warning modal */}
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
