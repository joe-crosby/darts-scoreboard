import { BaseGame } from './baseGame.js';

// Standard Cricket sequence is 20 -> 19 -> 18 -> 17 -> 16 -> 15 -> Bull.
// In no-slop mode, only the current sequential target is valid.
const CRICKET_SEQUENCE = [20,19,18,17,16,15,'BULL'];
const CRICKET_NUMS = [15,16,17,18,19,20,'BULL'];

export class Cricket extends BaseGame{
  constructor(players, {allowSlop = false, scoreToOpponents = false, pointsEnabled = true} = {}){
    super(players);
    this.variant = 'cricket';
    this.allowSlop = allowSlop;
    this.scoreToOpponents = scoreToOpponents;
    // Cut-throat always uses points. Standard mode can toggle points.
    this.pointsEnabled = scoreToOpponents ? true : pointsEnabled;
    this.players.forEach((p) => {
      p.meta.hits = {};
      p.meta.markState = {};
    });
    CRICKET_NUMS.forEach((n) => {
      this.players.forEach((p) => {
        p.meta.hits[n] = 0;
        p.meta.markState[n] = 'empty';
      });
    });
  }

  updateMarkState(player, target, before, after, hits){
    if(before >= 3){
      return;
    }

    if(after >= 3){
      // Closed style depends on the close pattern:
      // - T first (single dart close) => empty circle
      // - S + (D or T) => slash in a circle
      // - all other closures => X in a circle
      if(before === 0 && hits >= 3){
        player.meta.markState[target] = 'closed-circle';
      } else if(before === 1 && hits >= 2){
        player.meta.markState[target] = 'closed-slash';
      } else {
        player.meta.markState[target] = 'closed-x';
      }
      return;
    }

    if(after === 2){
      player.meta.markState[target] = 'double';
    } else if(after === 1){
      player.meta.markState[target] = 'single';
    } else {
      player.meta.markState[target] = 'empty';
    }
  }

  nextRequiredTarget(player){
    return CRICKET_SEQUENCE.find((target) => (player.meta.hits[target] || 0) < 3) ?? null;
  }

  onThrow({playerId, target, multiplier}){
    const p = this.players[playerId];
    const val = (target==='BULL')?25:target;
    const hits = multiplier; // each dart counts as multiplier hits
    const requiredTarget = this.nextRequiredTarget(p);
    let message = `${p.name} missed scoring`;
    const isValidTarget = CRICKET_NUMS.includes(target);
    const isClosedByPlayer = (p.meta.hits[target] || 0) >= 3;
    // In no-slop mode, player must progress in sequence but may continue scoring on
    // numbers already closed by that same player (e.g. close 20, then score 20 again).
    const targetAllowedByMode = this.allowSlop || target === requiredTarget || isClosedByPlayer;

    if(!isValidTarget || !targetAllowedByMode){
      this.log.push({type:'miss',player:p.name});
      if(!this.allowSlop && requiredTarget !== null){
        message = `${p.name} must close ${requiredTarget} before ${target}`;
      }
    } else {
      const before = p.meta.hits[target];
      const totalMarks = before + hits;
      const overflowMarks = Math.max(0, totalMarks - 3);
      const after = Math.min(3, before + hits);
      p.meta.hits[target] = after;
      this.updateMarkState(p, target, before, after, hits);
      // Score only marks beyond closure.
      // This includes scoring on already-closed numbers and overflow marks from a closing dart.
      if(overflowMarks > 0 && this.pointsEnabled){
        const points = overflowMarks * val;
        const openOpponents = this.players.filter(op=> op!==p && op.meta.hits[target] < 3);
        if(openOpponents.length > 0){
          if(this.scoreToOpponents){
            openOpponents.forEach((opponent)=>{
              opponent.score = (opponent.score || 0) + points;
            });
          } else {
            p.score = (p.score || 0) + points;
          }
        }
      }
      message = `${p.name} hit ${target} for ${hits} mark${hits === 1 ? '' : 's'}`;
    }
    this.throwsThisTurn++;
    if(this.throwsThisTurn>=3) this.nextPlayer();
    const playerClosedAll = CRICKET_NUMS.every((number) => (p.meta.hits[number] || 0) >= 3);
    if(playerClosedAll){
      if(!this.scoreToOpponents){
        // Standard Cricket:
        // - 2 players with points enabled: must close all and be tied or ahead on points.
        // - >2 players or points disabled: close-all wins immediately.
        if(this.players.length === 2 && this.pointsEnabled){
          const opponent = this.players.find((player) => player !== p);
          if((p.score || 0) >= (opponent?.score || 0)){
            this.finished = true;
            this.winners = [p];
            this.log.push({type:'finish',player:p.name});
            message = `${p.name} closes all numbers and has enough points to win Cricket`;
          } else {
            message = `${p.name} closed all numbers but needs more points than ${opponent?.name}`;
          }
        } else {
          this.finished = true;
          this.winners = [p];
          this.log.push({type:'finish',player:p.name});
          message = `${p.name} closes all numbers and wins Cricket`;
        }
      } else {
        // Cut-throat: player must close all and have the lowest score.
        const closedPlayers = this.players.filter((player) =>
          CRICKET_NUMS.every((number) => (player.meta.hits[number] || 0) >= 3)
        );
        const minScore = Math.min(...this.players.map((player) => player.score || 0));
        const winner = closedPlayers.find((player) => (player.score || 0) === minScore);
        if(winner){
          this.finished = true;
          this.winners = [winner];
          this.log.push({type:'finish',player:winner.name});
          message = `${winner.name} closes all numbers with the lowest score and wins Cricket`;
        } else {
          message = `${p.name} closed all numbers but does not have the lowest score yet`;
        }
      }
    }
    return {player:p,finished:this.finished,winner:this.winners[0] ?? null,message};
  }
}
