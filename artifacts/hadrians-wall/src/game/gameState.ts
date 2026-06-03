export type GameState = {
  turn: number;
  cityHealth: number;
  maxCityHealth: number;
  pictAttack: number;
  wallPieces: number;
  maxWallPieces: number;
  garrisonTroops: number;
  availableWorkers: number;
  totalWorkers: number;
  allocations: {
    fight: number;
    build: number;
    recruit: number;
  };
  battleLog: string[];
  status: 'playing' | 'win' | 'loss';
};

export type GameAction =
  | { type: 'ALLOCATE_WORKER'; task: 'fight' | 'build' | 'recruit' }
  | { type: 'DEALLOCATE_WORKER'; task: 'fight' | 'build' | 'recruit' }
  | { type: 'END_TURN' }
  | { type: 'RESTART' };

const INITIAL_STATE: GameState = {
  turn: 1,
  cityHealth: 10,
  maxCityHealth: 10,
  pictAttack: 2,
  wallPieces: 0,
  maxWallPieces: 6,
  garrisonTroops: 0,
  availableWorkers: 4,
  totalWorkers: 4,
  allocations: {
    fight: 0,
    build: 0,
    recruit: 0,
  },
  battleLog: ["In the first year of Hadrian's rule, the Picts gather at the border..."],
  status: 'playing',
};

const romanProseWin = [
  "Our legionaries held the line with valor.",
  "The barbarians were repelled by Roman steel.",
  "The wall grows higher, a testament to Rome.",
  "Eboracum breathes easier as the threat subsides.",
  "A victory for the Emperor, a defeat for the savages."
];

const romanProseLoss = [
  "The wild men broke through our lines, shedding Roman blood.",
  "A dark day for the province. The Picts struck with fearsome fury.",
  "Our defenses buckled under the barbarian tide.",
  "Flames rise in the distance. The enemy grows bolder.",
  "The governor's pleas for reinforcements fall on deaf ears."
];

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ALLOCATE_WORKER': {
      if (state.availableWorkers > 0) {
        return {
          ...state,
          availableWorkers: state.availableWorkers - 1,
          allocations: {
            ...state.allocations,
            [action.task]: state.allocations[action.task] + 1,
          },
        };
      }
      return state;
    }
    case 'DEALLOCATE_WORKER': {
      if (state.allocations[action.task] > 0) {
        return {
          ...state,
          availableWorkers: state.availableWorkers + 1,
          allocations: {
            ...state.allocations,
            [action.task]: state.allocations[action.task] - 1,
          },
        };
      }
      return state;
    }
    case 'END_TURN': {
      if (state.status !== 'playing') return state;

      const defense = (state.allocations.fight * 2) + state.garrisonTroops;
      let newHealth = state.cityHealth;
      let logs = [...state.battleLog];
      
      const dmg = state.pictAttack - defense;
      if (dmg > 0) {
        newHealth = Math.max(0, state.cityHealth - dmg);
        logs.push(`Year ${state.turn}: ${romanProseLoss[Math.floor(Math.random() * romanProseLoss.length)]} (${dmg} damage taken)`);
      } else {
        logs.push(`Year ${state.turn}: ${romanProseWin[Math.floor(Math.random() * romanProseWin.length)]}`);
      }

      const newWallPieces = Math.min(state.maxWallPieces, state.wallPieces + state.allocations.build);
      const newTroops = state.garrisonTroops + state.allocations.recruit;
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
        availableWorkers: state.totalWorkers,
        allocations: { fight: 0, build: 0, recruit: 0 },
        battleLog: logs,
      };
    }
    case 'RESTART':
      return INITIAL_STATE;
    default:
      return state;
  }
}

export const useGameState = () => {
  return INITIAL_STATE;
}