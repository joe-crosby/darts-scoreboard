import { BaseGame } from './baseGame.js';

export class StandardCountDown extends BaseGame{
  constructor(players, startScore=501, {doubleIn = false, doubleOut = false} = {}){
    super(players);
    this.startScore = startScore;
    this.players.forEach(p=>p.score = startScore);
    this.doubleIn = Boolean(doubleIn);
    this.doubleOut = Boolean(doubleOut);
    this.players.forEach((p) => {
      p.meta.isDoubledIn = !this.doubleIn;
    });
    this.variant = String(startScore);
  }

  // handle a throw: {playerId, score, multiplier, rawTarget}
  onThrow(scoreObj){
    const player = this.currentPlayer();
    let turnReset = false;
    let turnResetReason = null;
    if(this.throwsThisTurn === 0){
      player.meta.turnStartScore = player.score;
    }

    if(this.doubleIn && !player.meta.isDoubledIn && !scoreObj.isDouble){
      this.log.push({type:'blocked-double-in',player:player.name});
      this.throwsThisTurn++;
      let endedTurn = false;
      if(this.throwsThisTurn >= 3){
        endedTurn = true;
      }
      if(endedTurn && !this.finished){
        this.nextPlayer();
      }
      return {
        player,
        finished:this.finished,
        winner:this.winners[0] ?? null,
        endedTurn,
        message:`${player.name} needs a double to get in`
      };
    }

    if(this.doubleIn && !player.meta.isDoubledIn && scoreObj.isDouble){
      player.meta.isDoubledIn = true;
    }

    const sc = scoreObj.score;
    player.score = player.score - sc;
    let endedTurn = false;
    let message = `${player.name} scored ${sc}`;

    if(player.score < 0){
      player.score = player.meta.turnStartScore;
      this.log.push({type:'bust',player:player.name,score:sc});
      message = `${player.name} busted and returns to ${player.score}`;
      endedTurn = true;
    } else if(player.score === 0){
      if(this.doubleOut && !scoreObj.isDouble){
        player.score = player.meta.turnStartScore;
        this.log.push({type:'double-out-required',player:player.name});
        message = `${player.name} must finish on a double. Score stays ${player.score}`;
        turnReset = true;
        turnResetReason = 'double-out-required';
        endedTurn = true;
      } else {
        this.log.push({type:'finish',player:player.name});
        this.finished = true;
        this.winners = [player];
        message = `${player.name} finishes ${this.startScore}`;
      }
    } else {
      this.log.push({type:'score',player:player.name,amount:sc});
      this.throwsThisTurn++;
      if(this.throwsThisTurn >= 3){
        endedTurn = true;
      }
    }

    if(endedTurn && !this.finished){
      this.nextPlayer();
      if(this.doubleOut && this.players.every((p) => p.score === 1)){
        this.finished = true;
        message = 'No player can finish from 1 — game over, no winner.';
      }
    }

    return {
      player,
      finished:this.finished,
      winner:this.winners[0] ?? null,
      endedTurn,
      message,
      turnReset,
      turnResetReason
    };
  }
}
