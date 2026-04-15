import { BaseGame } from './baseGame.js';
import {
  getShanghaiAwardedScore,
  normalizeShanghaiScoringMode
} from './shanghaiScoring.js';

// Standard Shanghai: rounds 1 through 20. Only the active round number scores.
// A player wins instantly if they hit the single, double, and triple of the round number in one turn.
export class Shanghai extends BaseGame{
  constructor(players, maxRound=20, scoringMode='Standard (Multiplier) Scoring'){
    super(players);
    this.round = 1;
    this.maxRound = maxRound;
    this.scoringMode = normalizeShanghaiScoringMode(scoringMode);
    this.variant = 'shanghai';
    this.turnSegments = {S:false,D:false,T:false};
    this.tiebreakMode = false;
    this.tiebreakPlayers = [];
    // this.tiebreakRound removed; use this.round for all phases
    this.tiebreakTarget = null;
    this.tiebreakReason = null;
    this.tiebreakScores = new Map();
    this.tieBreakerHistory = null;
    // Track triples for each player for tiebreaking
    this.players.forEach(p=> p.meta.triples = 0);
  }

  getCurrentTarget(){
    return this.tiebreakMode ? this.tiebreakTarget : this.round;
  }

  getRoundForRecord(){
    return this.round;
  }

  getTieBreakerThrowMeta(){
    if(!this.tiebreakMode){
      return null;
    }
    return {
      isTieBreaker: true,
      tieBreakerTarget: this.tiebreakTarget,
      tieBreakerReason: this.tiebreakReason
    };
  }

  getThrowRecordMeta(){
    return {
      round: this.getRoundForRecord(),
      shanghaiTarget: this.getCurrentTarget(),
      ...(this.getTieBreakerThrowMeta() || {})
    };
  }

  getAwardedScoreForThrow({ hit }){
    const target = this.getCurrentTarget();
    return getShanghaiAwardedScore(
      target,
      hit?.target,
      hit?.multiplier,
      hit?.score,
      this.scoringMode
    );
  }

  startTieBreaker(players, reason){
    this.finished = false;
    this.winners = [];
    this.tiebreakMode = true;
    this.tiebreakPlayers = [...players];
    this.tiebreakReason = reason;
    this.tiebreakTarget = ((this.round - 1) % 20) + 1;
    this.tiebreakScores = new Map(this.tiebreakPlayers.map((player) => [player.id, 0]));
    this.currentPlayerIndex = this.players.indexOf(this.tiebreakPlayers[0]);
    this.throwsThisTurn = 0;
    this.tieBreakerHistory = {
      reason,
      startingTarget: this.tiebreakTarget,
      rounds: []
    };
  }

  getActivePlayers(){
    return this.tiebreakMode ? this.tiebreakPlayers : this.players;
  }

  moveToNextActivePlayer(currentPlayer){
    const activePlayers = this.getActivePlayers();
    const currentIndex = activePlayers.findIndex((player) => player.id === currentPlayer.id);
    if(currentIndex < 0){
      this.currentPlayerIndex = this.players.indexOf(activePlayers[0]);
      this.throwsThisTurn = 0;
      return { cycleCompleted: false, realigned: true };
    }

    const nextIndex = (currentIndex + 1) % activePlayers.length;
    this.currentPlayerIndex = this.players.indexOf(activePlayers[nextIndex]);
    this.throwsThisTurn = 0;
    return { cycleCompleted: nextIndex === 0, realigned: false };
  }

  resolveMainGameEnd(currentPlayer){
    this.finished = true;
    const maxScore = Math.max(...this.players.map((player) => player.score || 0));
    const tiedPlayers = this.players.filter((player) => (player.score || 0) === maxScore);

    if(tiedPlayers.length === 1){
      this.winners = tiedPlayers;
      this.log.push({type:'finish',player:tiedPlayers[0].name,mode:'shanghai'});
      return {
        player: currentPlayer,
        finished: true,
        winners: this.winners,
        winner: this.winners[0] ?? null,
        message: `${tiedPlayers[0].name} wins on points`
      };
    }

    const maxTriples = Math.max(...tiedPlayers.map((player) => player.meta.triples || 0));
    const tripleLeaders = tiedPlayers.filter((player) => (player.meta.triples || 0) === maxTriples);

    if(tripleLeaders.length === 1){
      this.winners = tripleLeaders;
      this.log.push({type:'finish',player:tripleLeaders[0].name,mode:'shanghai'});
      return {
        player: currentPlayer,
        finished: true,
        winners: this.winners,
        winner: this.winners[0],
        message: `${tripleLeaders[0].name} wins the tiebreaker with ${maxTriples} triple(s)`
      };
    }

    const reason = maxTriples === 0 ? 'equal-score-no-triples' : 'equal-score-equal-triples';
    this.startTieBreaker(tripleLeaders, reason);
    const names = tripleLeaders.map((player) => player.name).join(' vs ');
    return {
      player: currentPlayer,
      finished: false,
      winner: null,
      message: `Tiebreaker round: ${names}. Play on target ${this.tiebreakTarget}.`
    };
  }

  evaluateTieBreakerRound(){
    const maxRoundScore = Math.max(...this.tiebreakPlayers.map((player) => this.tiebreakScores.get(player.id) || 0));
    const roundLeaders = this.tiebreakPlayers.filter((player) => (this.tiebreakScores.get(player.id) || 0) === maxRoundScore);

    const roundSummary = {
      round: this.round,
      target: this.tiebreakTarget,
      leaders: roundLeaders.map((player) => player.name),
      highScore: maxRoundScore,
      scores: this.tiebreakPlayers.map((player) => ({
        player: player.name,
        score: this.tiebreakScores.get(player.id) || 0
      }))
    };
    this.tieBreakerHistory?.rounds.push(roundSummary);
    this.log.push({ type: 'tiebreak-round-complete', ...roundSummary, reason: this.tiebreakReason });

    if(roundLeaders.length === 1){
      this.finished = true;
      this.winners = roundLeaders;
      this.tieBreakerHistory = {
        ...this.tieBreakerHistory,
        winner: roundLeaders[0].name,
        resolvedRound: this.round,
        resolvedTarget: this.tiebreakTarget
      };
      this.log.push({type:'finish',player:roundLeaders[0].name,mode:'shanghai-tiebreak'});
      return {
        finished: true,
        winners: this.winners,
        winner: this.winners[0],
        message: `${roundLeaders[0].name} wins the tiebreaker on target ${this.tiebreakTarget}`
      };
    }

    this.round++;
    this.tiebreakTarget = (this.tiebreakTarget % 20) + 1;
    this.tiebreakPlayers = roundLeaders;
    this.tiebreakScores = new Map(this.tiebreakPlayers.map((player) => [player.id, 0]));
    this.currentPlayerIndex = this.players.indexOf(this.tiebreakPlayers[0]);
    const names = this.tiebreakPlayers.map((player) => player.name).join(' vs ');
    return {
      finished: false,
      message: `Tiebreaker continues (${names}) on target ${this.tiebreakTarget}`
    };
  }

  onThrow({playerId, target, multiplier}){
    const p = this.players[playerId];
    let message = `${p.name} scored 0`;
    const activeTarget = this.getCurrentTarget();
    const score = getShanghaiAwardedScore(activeTarget, target, multiplier, target * multiplier, this.scoringMode);
    const hitActiveTarget = target === activeTarget;

    if(score > 0){
      p.score = (p.score||0) + score;
      if(this.tiebreakMode){
        this.tiebreakScores.set(p.id, (this.tiebreakScores.get(p.id) || 0) + score);
      }
      this.log.push({type:'score',player:p.name,amount:score});
      if(hitActiveTarget){
        if(multiplier === 1){
          this.turnSegments.S = true;
        } else if(multiplier === 2){
          this.turnSegments.D = true;
        } else if(multiplier === 3){
          this.turnSegments.T = true;
          p.meta.triples++;
        }
      } else if(multiplier === 3){
        p.meta.triples++;
      }
      message = `${p.name} scored ${score} on round ${activeTarget}`;

      if(this.turnSegments.S && this.turnSegments.D && this.turnSegments.T){
        this.finished = true;
        this.winners = [p];
        this.log.push({type:'finish',player:p.name,mode:'shanghai'});
        return {
          player:p,
          finished:true,
          winner:p,
          message:`${p.name} wins with a Shanghai on ${activeTarget}`,
          shanghaiFinishRound: activeTarget
        };
      }
    } else {
      this.log.push({type:'miss',player:p.name,target});
    }

    this.throwsThisTurn++;
    if(this.throwsThisTurn>=3){
      const turnAdvance = this.moveToNextActivePlayer(p);

      if(turnAdvance.realigned){
        this.turnSegments = {S:false,D:false,T:false};
        return {player:p,finished:this.finished,winner:this.winners[0] ?? null,message:'Tiebreak state realigned.'};
      }

      if(this.tiebreakMode){
        // Evaluate once every remaining tiebreak player has completed the target.
        if(turnAdvance.cycleCompleted){
          const tiebreakResult = this.evaluateTieBreakerRound();
          if(tiebreakResult.finished){
            return {
              player: p,
              finished: true,
              winners: tiebreakResult.winners,
              winner: tiebreakResult.winner,
              message: tiebreakResult.message
            };
          }
          message = tiebreakResult.message;
        }
      } else if(turnAdvance.cycleCompleted){
        // move this to a function this.round++;
        if(this.round + 1>this.maxRound){
          return this.resolveMainGameEnd(p);
        }
        // this.round++;
        // if(this.round>this.maxRound){
        //   return this.resolveMainGameEnd(p);
        // }
      }
      this.turnSegments = {S:false,D:false,T:false};
    }
    return {player:p,finished:this.finished,winner:this.winners[0] ?? null,message};
  }

  incrementRound(){
    if (this.currentPlayerIndex === 0 && this.throwsThisTurn === 0) {
      this.round++;
    }
  }
}
