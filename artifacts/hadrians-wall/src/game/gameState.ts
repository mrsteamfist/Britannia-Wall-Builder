export type GameState = {
  turn: number;
  cityHealth: number;
  maxCityHealth: number;
  pictAttack: number;
  wallPieces: number;
  maxWallPieces: number;
  garrisonTroops: number;
  totalWorkers: number;
  battleLog: string[];
  status: 'playing' | 'win' | 'loss';
};

export type GameAction =
  | { type: 'END_TURN'; garrison: number; build: number; recruit: number }
  | { type: 'RESTART' };

export const INITIAL_STATE: GameState = {
  turn: 1,
  cityHealth: 10,
  maxCityHealth: 10,
  pictAttack: 2,
  wallPieces: 0,
  maxWallPieces: 6,
  garrisonTroops: 0,
  totalWorkers: 4,
  battleLog: ["In the first year of Hadrian's rule, the Picts gather at the border..."],
  status: 'playing',
};

const romanProseWin = [
  "Our legionaries held the line with valor.",
  "The barbarians were repelled by Roman steel.",
  "The wall grows higher, a testament to Rome.",
  "Eboracum breathes easier as the threat subsides.",
  "A victory for the Emperor, a defeat for the savages.",
];

const romanProseLoss = [
  "The wild men broke through our lines, shedding Roman blood.",
  "A dark day for the province. The Picts struck with fearsome fury.",
  "Our defenses buckled under the barbarian tide.",
  "Flames rise in the distance. The enemy grows bolder.",
  "The governor's pleas for reinforcements fall on deaf ears.",
];

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'END_TURN': {
      if (state.status !== 'playing') return state;

      const { garrison, build, recruit } = action;
      const defense = garrison * 2 + state.garrisonTroops;
      let newHealth = state.cityHealth;
      const logs = [...state.battleLog];

      const dmg = state.pictAttack - defense;
      if (dmg > 0) {
        newHealth = Math.max(0, state.cityHealth - dmg);
        logs.push(
          `Year ${state.turn}: ${romanProseLoss[Math.floor(Math.random() * romanProseLoss.length)]} (${dmg} damage taken)`
        );
      } else {
        logs.push(`Year ${state.turn}: ${romanProseWin[Math.floor(Math.random() * romanProseWin.length)]}`);
      }

      const newWallPieces = Math.min(state.maxWallPieces, state.wallPieces + build);
      const newTroops = state.garrisonTroops + recruit;
      const newPictAttack = state.pictAttack + 1;

      let newStatus = state.status;
      if (newWallPieces >= state.maxWallPieces) {
        newStatus = 'win';
      } else if (newHealth <= 0) {
        newStatus = 'loss';
      }

      return {
        ...state,
        turn: state.turn + 1,
        cityHealth: newHealth,
        wallPieces: newWallPieces,
        garrisonTroops: newTroops,
        pictAttack: newPictAttack,
        status: newStatus,
        battleLog: logs,
      };
    }
    case 'RESTART':
      return INITIAL_STATE;
    default:
      return state;
  }
}
