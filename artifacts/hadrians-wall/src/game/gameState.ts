// ── Types ────────────────────────────────────────────────────────────────
export type GameState = {
  town: number;         // draggable citizens waiting in Town
  farm: number;         // pending citizens in Farms (0 or 1; at 2 → resolves)
  quarry: number;       // pending citizens in Quarry (0 or 1; at 2 → resolves)
  soldiers: number;     // permanent soldiers in Garrison
  picts: number;        // Picts gathered (2 = raid, 4 = loss)
  wallSections: number; // wall sections built (6 = win)
  maxWallSections: number;
  battleLog: string[];
  status: 'playing' | 'win' | 'loss';
};

export type GameAction =
  | { type: 'ASSIGN'; destination: 'farm' | 'quarry' | 'garrison' }
  | { type: 'RESTART' };

// ── Initial state ────────────────────────────────────────────────────────
export const INITIAL_STATE: GameState = {
  town: 4,
  farm: 0,
  quarry: 0,
  soldiers: 0,
  picts: 0,
  wallSections: 0,
  maxWallSections: 6,
  battleLog: [
    "Year I — The Emperor's edict arrives: build Hadrian's Wall and hold the northern frontier.",
    "4 citizens await your orders in the Town.",
  ],
  status: 'playing',
};

// ── Narrative lines ──────────────────────────────────────────────────────
const RAID_WIN = [
  "The legionaries repelled the raid — blood of the north retreats.",
  "Roman shields held fast. The Picts are scattered.",
  "A volley of pilum drove the raiders back. Wall holds.",
  "The garrison answered steel with steel. Two Picts fall.",
];
const RAID_LOSS = [
  "The wall buckled — a soldier lies slain, but one Pict is driven off.",
  "A brave legionary fell defending the breach. One Pict retreats.",
  "Through shield and spear a warrior died for Rome. One Pict flees.",
];
const RAID_UNDEFENDED = [
  "The raiders swept through uncontested — a Roman life is lost.",
  "No sword rose to meet the Picts. A citizen pays the price.",
  "The barbarians struck where Rome was weakest. One falls.",
];

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Reducer ──────────────────────────────────────────────────────────────
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'RESTART':
      return INITIAL_STATE;

    case 'ASSIGN': {
      if (state.status !== 'playing') return state;
      if (state.town <= 0) return state;

      const { destination } = action;
      const logs = [...state.battleLog];

      const MAX_TOWN = 9;
      // The assigned citizen returns to the Town after issuing the command,
      // so the Town pool is never drained by assigning (only by raids).
      let town = state.town;
      let farm = state.farm;
      let quarry = state.quarry;
      let soldiers = state.soldiers;
      let picts = state.picts + 1; // a new Pict appears
      let wallSections = state.wallSections;
      let status: GameState['status'] = 'playing';

      // ── Step 1: Apply the citizen's assignment ────────────────────────
      if (destination === 'garrison') {
        soldiers += 1;
        logs.push(
          `A citizen enlists — now ${soldiers} soldier${soldiers !== 1 ? 's' : ''} guard the Wall.`
        );
      } else if (destination === 'farm') {
        farm += 1;
        logs.push(
          farm === 1
            ? 'A citizen heads to the Farms. One more needed to complete recruitment.'
            : 'A second citizen joins the Farms.'
        );
      } else {
        quarry += 1;
        logs.push(
          quarry === 1
            ? 'A citizen heads to the Quarry. One more needed to build a wall section.'
            : 'A second citizen joins the Quarry.'
        );
      }

      logs.push(`A Pict scout is spotted at the border. Picts: ${picts}.`);

      // ── Step 2: Zone completions ──────────────────────────────────────
      if (farm >= 2) {
        farm = 0;
        if (town < MAX_TOWN) {
          town = Math.min(MAX_TOWN, town + 1); // a new recruit joins the Town
          logs.push('Farm work complete! A new recruit joins the Town. (+1)');
        } else {
          logs.push(`Farm work complete, but the Town is already full (${MAX_TOWN}).`);
        }
      }

      if (quarry >= 2) {
        quarry = 0;
        wallSections += 1;
        logs.push(
          `Wall section ${wallSections}/${state.maxWallSections} complete!`
        );
      }

      // ── Step 3: Resolve raids ─────────────────────────────────────────
      let safetyLimit = 8;
      while (picts >= 2 && status === 'playing' && safetyLimit-- > 0) {
        if (soldiers > 0) {
          if (Math.random() < 0.5) {
            picts -= 2;
            logs.push('⚔ RAID REPELLED — ' + pick(RAID_WIN));
          } else {
            picts -= 1;
            soldiers -= 1;
            logs.push('💀 RAID FAILED — ' + pick(RAID_LOSS));
          }
        } else {
          // No soldiers: a Town citizen is lost. Farm/Quarry are progress
          // counters now (citizens return to Town), so they can't be slain.
          picts -= 2;
          if (town > 0) {
            town -= 1;
            logs.push('🔥 UNDEFENDED RAID — ' + pick(RAID_UNDEFENDED) + ' (town citizen slain)');
          } else {
            logs.push('🔥 UNDEFENDED RAID — No Romans remain to defend.');
          }
        }

        // Check catastrophe after each raid resolves
        if (picts >= 4) {
          status = 'loss';
          logs.push('4 PICTS AT THE GATES — Eboracum is overwhelmed. Britannia falls.');
          break;
        }
        if (town + soldiers === 0) {
          status = 'loss';
          logs.push('Every Roman has fallen. The province is lost to the Picts.');
          break;
        }
      }

      // ── Step 4: Win check ─────────────────────────────────────────────
      if (status === 'playing' && wallSections >= state.maxWallSections) {
        status = 'win';
        logs.push("HADRIAN'S WALL STANDS COMPLETE! The north is secured forever. Roma Victrix!");
      }

      // ── Step 5: Remaining loss conditions ────────────────────────────
      if (status === 'playing') {
        if (picts >= 4) {
          status = 'loss';
          logs.push('4 PICTS AT THE GATES — Eboracum is overwhelmed. Britannia falls.');
        } else if (town + soldiers === 0) {
          status = 'loss';
          logs.push('Every Roman has fallen. The province is lost.');
        } else if (town === 0) {
          // No citizens left to assign — player is stuck
          status = 'loss';
          logs.push('No citizens remain in Town. No more moves are possible. The province cannot hold.');
        }
      }

      return {
        ...state,
        town,
        farm,
        quarry,
        soldiers,
        picts,
        wallSections,
        battleLog: logs,
        status,
      };
    }

    default:
      return state;
  }
}
