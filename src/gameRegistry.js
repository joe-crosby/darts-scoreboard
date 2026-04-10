import { StandardCountDown } from './games/standardCountDown.js';
import { Cricket } from './games/cricket.js';
import { Shanghai } from './games/shanghai.js';

export const GAME_REGISTRY = {
  '501': {
    key: '501',
    label: '501',
    description: 'Standard x01 with straight-out finishing.',
    create(players, options = {}){
      return new StandardCountDown(players, 501, {
        doubleIn: Boolean(options.x01DoubleIn),
        doubleOut: Boolean(options.x01DoubleOut)
      });
    }
  },
  '301': {
    key: '301',
    label: '301',
    description: 'Shorter x01 with straight-out finishing.',
    create(players, options = {}){
      return new StandardCountDown(players, 301, {
        doubleIn: Boolean(options.x01DoubleIn),
        doubleOut: Boolean(options.x01DoubleOut)
      });
    }
  },
  cricket: {
    key: 'cricket',
    label: 'Cricket',
    description: 'Close sequentially 20->15 then Bull, then win with the lead.',
    create(players, options = {}){
      return new Cricket(players, {
        allowSlop: Boolean(options.cricketSlop),
        scoreToOpponents: Boolean(options.cricketCutthroat),
        pointsEnabled: Boolean(options.cricketPoints)
      });
    }
  },
  shanghai: {
    key: 'shanghai',
    label: 'Shanghai',
    description: 'Rounds 1-20 (or chosen), instant win with single, double, triple in one turn.',
    create(players, options = {}){
      const rounds = options.shangaiRounds || 20;
      return new Shanghai(players, rounds, options.shanghaiScoringMode);
    }
  }
};

export function listGames(){
  return Object.values(GAME_REGISTRY);
}
