export class BaseGame{
  constructor(players){
    this.players = players.map((p,i)=>({id:i,name:p,score:0,meta:{}}));
    this.currentPlayerIndex = 0;
    this.throwsThisTurn = 0;
    this.log = [];
    this.finished = false;
    this.winners = [];
    this.variant = 'base';
  }
  nextPlayer(){
    this.currentPlayerIndex = (this.currentPlayerIndex+1)%this.players.length;
    this.throwsThisTurn = 0;
  }
  currentPlayer(){
    return this.players[this.currentPlayerIndex];
  }
  activePlayerName(){
    return this.currentPlayer().name;
  }
}
