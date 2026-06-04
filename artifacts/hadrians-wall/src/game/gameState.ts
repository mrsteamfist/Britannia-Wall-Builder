// ── Types ────────────────────────────────────────────────────────────────
export type GameState = {
  town: number;
  soldiers: number;
  picts: number;
  wallSections: number;
  maxWallSections: number;
  lastAction: 'garrison' | 'farm' | 'quarry' | null;
  battleLog: string[];
  status: 'playing' | 'win' | 'loss';
};

export type GameAction =
  | { type: 'ASSIGN'; destination: 'farm' | 'quarry' | 'garrison' }
  | { type: 'RESTART' };

// ── Initial state ────────────────────────────────────────────────────────
export const INITIAL_STATE: GameState = {
  town: 4,
  soldiers: 0,
  picts: 0,
  wallSections: 0,
  maxWallSections: 6,
  lastAction: null,
  battleLog: [
    "Year I — The Emperor's edict arrives: raise Hadrian's Wall and hold the north.",
    "4 citizens await your orders in the Town.",
  ],
  status: 'playing',
};

// ── Narrative lines ──────────────────────────────────────────────────────
const RAID_HELD = [
  "The garrison held fast — one Pict driven back.",
  "Roman shields answered the charge. The north retreats.",
  "A volley of pilum scattered the raiders.",
];
const RAID_COST_SOLDIER = [
  "A brave legionary fell in the breach. One Pict driven off.",
  "A soldier traded his life for the province. One Pict flees.",
  "Through shield and spear, a warrior died for Rome. One Pict retreats.",
];
const RAID_UNDEFENDED = [
  "The raiders swept through unopposed — a Roman life is lost.",
  "No sword rose to meet them. A citizen pays the price.",
  "Barbarians struck where Rome was weakest. One falls.",
];

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rollD3minus1(): 0 | 1 | 2 {
  return Math.floor(Math.random() * 3) as 0 | 1 | 2;
}

// ── Reducer ──────────────────────────────────────────────────────────────
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'RESTART':
      return { ...INITIAL_STATE };

    case 'ASSIGN': {
      if (state.status !== 'playing') return state;
      if (state.town <= 0) return state;

      const { destination } = action;
      const logs = [...state.battleLog];
      const MAX_TOWN = 9;

      let town = state.town;
      let soldiers = state.soldiers;
      let picts = state.picts;
      let wallSections = state.wallSections;
      let status: GameState['status'] = 'playing';

      // ── Step 1: Apply the citizen's assignment ────────────────────────
      if (destination === 'garrison') {
        // Remove 1 citizen permanently; create 1 soldier
        town -= 1;
        soldiers += 1;
        logs.push(
          `A citizen enlists — ${soldiers} soldier${soldiers !== 1 ? 's' : ''} now guard the Wall.`
        );
      } else if (destination === 'farm') {
        // Return the sent citizen plus 1 additional = net +2 (cap 9)
        town = Math.min(MAX_TOWN, town + 2);
        logs.push('The farms are tended — fertile lands draw another settler to the province.');
      } else {
        // Quarry: remove 2 citizens (the sent one + 1 additional), build 1 wall section
        town = Math.max(0, town - 2);
        wallSections += 1;
        logs.push(
          `Stone is cut and set — wall section ${wallSections}/${state.maxWallSections} rises.`
        );
      }

      // ── Step 2: Pict advance ──────────────────────────────────────────
      picts += 1;

      // ── Step 3: Raid roll (D3 − 1: 0 = none, 1 = light, 2 = heavy) ──
      const roll = rollD3minus1();

      if (roll === 0) {
        logs.push('All is quiet at the frontier... for now.');
      } else if (roll === 1) {
        // Light: remove 1 Pict; if no soldier, also remove 1 citizen
        picts -= 1;
        if (soldiers > 0) {
          logs.push('⚔ ' + pick(RAID_HELD));
        } else {
          if (town > 0) town -= 1;
          logs.push('🔥 ' + pick(RAID_UNDEFENDED));
        }
      } else {
        // Heavy (roll === 2): remove 1 Pict;
        // if another Pict remains AND soldier exists → lose a soldier;
        // else if no soldier → lose a citizen
        picts -= 1;
        if (picts > 0 && soldiers > 0) {
          soldiers -= 1;
          logs.push('⚔ ' + pick(RAID_COST_SOLDIER));
        } else if (soldiers === 0) {
          if (town > 0) town -= 1;
          logs.push('🔥 ' + pick(RAID_UNDEFENDED));
        } else {
          logs.push('⚔ ' + pick(RAID_HELD));
        }
      }

      // ── Step 4: Loss checks (before win — loss overrides) ─────────────
      if (picts >= 6) {
        status = 'loss';
        logs.push('Six Picts mass at the wall — the province is overwhelmed. Britannia falls.');
      } else if (town <= 0) {
        status = 'loss';
        logs.push('No citizens remain in the Town. The province cannot sustain itself. Britannia is lost.');
      }

      // ── Step 5: Win check (only if no loss yet) ───────────────────────
      if (status === 'playing' && wallSections >= state.maxWallSections) {
        status = 'win';
        logs.push("HADRIAN'S WALL STANDS COMPLETE! The north is secured for all time. Roma Victrix!");
      }

      return {
        ...state,
        town,
        soldiers,
        picts,
        wallSections,
        lastAction: destination,
        battleLog: logs,
        status,
      };
    }

    default:
      return state;
  }
}
