import test from 'node:test';
import assert from 'node:assert/strict';

import { StandardCountDown } from '../src/games/standardCountDown.js';
import { Cricket } from '../src/games/cricket.js';
import { Shanghai } from '../src/games/shanghai.js';
import {
  getShanghaiAwardedScore,
  getShanghaiRoundTotal,
  SHANGHAI_SCORING_MODE
} from '../src/games/shanghaiScoring.js';

test('501 bust reverts to turn start and passes turn', () => {
  const game = new StandardCountDown(['Alice', 'Bob'], 32);
  const player = game.currentPlayer();

  let result = game.onThrow({ score: 20, isDouble: false });
  assert.equal(player.score, 12);
  assert.equal(result.finished, false);

  result = game.onThrow({ score: 15, isDouble: false });
  assert.equal(player.score, 32);
  assert.equal(game.currentPlayer().name, 'Bob');
  assert.equal(result.finished, false);
});

test('x01 finishes on exact zero without requiring a double', () => {
  const game = new StandardCountDown(['Alice', 'Bob'], 32);

  const result = game.onThrow({ score: 32, isDouble: false });

  assert.equal(result.finished, true);
  assert.equal(result.winner?.name, 'Alice');
  assert.equal(game.players[0].score, 0);
});

test('x01 double-in blocks scoring until a double is hit', () => {
  const game = new StandardCountDown(['Alice', 'Bob'], 32, { doubleIn: true });

  game.onThrow({ score: 20, isDouble: false });
  assert.equal(game.players[0].score, 32);
  assert.equal(game.players[0].meta.isDoubledIn, false);

  game.onThrow({ score: 16, isDouble: true });
  assert.equal(game.players[0].score, 16);
  assert.equal(game.players[0].meta.isDoubledIn, true);
});

test('x01 double-out requires a double to finish', () => {
  const game = new StandardCountDown(['Alice', 'Bob'], 32, { doubleOut: true });

  const bustResult = game.onThrow({ score: 32, isDouble: false });
  assert.equal(bustResult.finished, false);
  assert.equal(game.players[0].score, 32);
  assert.equal(game.currentPlayer().name, 'Bob');
  assert.equal(Boolean(bustResult.turnReset), true);
  assert.equal(bustResult.turnResetReason, 'double-out-required');
  assert.equal(bustResult.message.includes('bust'), false);

  game.currentPlayerIndex = 0;
  game.throwsThisTurn = 0;
  const finishResult = game.onThrow({ score: 32, isDouble: true });
  assert.equal(finishResult.finished, true);
  assert.equal(finishResult.winner?.name, 'Alice');
});

test('Cricket no-slop requires closing 20 before lower numbers', () => {
  const game = new Cricket(['Alice', 'Bob'], { allowSlop: false });

  game.onThrow({ playerId: 0, target: 19, multiplier: 3 });
  assert.equal(game.players[0].meta.hits[19], 0);

  game.onThrow({ playerId: 0, target: 20, multiplier: 3 });
  assert.equal(game.players[0].meta.hits[20], 3);

  game.onThrow({ playerId: 0, target: 19, multiplier: 3 });
  assert.equal(game.players[0].meta.hits[19], 3);
});

test('Cricket slop mode allows out-of-sequence targets', () => {
  const game = new Cricket(['Alice', 'Bob'], { allowSlop: true });

  game.onThrow({ playerId: 0, target: 19, multiplier: 3 });
  assert.equal(game.players[0].meta.hits[19], 3);
});

test('Cricket cut-throat adds overflow points on a closing dart', () => {
  const game = new Cricket(['Alice', 'Bob'], { allowSlop: false, scoreToOpponents: true });

  game.onThrow({ playerId: 0, target: 20, multiplier: 1 });
  game.onThrow({ playerId: 0, target: 20, multiplier: 1 });
  game.onThrow({ playerId: 0, target: 20, multiplier: 3 });

  assert.equal(game.players[0].score || 0, 0);
  assert.equal(game.players[1].score || 0, 40);
});

test('Cricket standard awards overflow points for single then triple', () => {
  const game = new Cricket(['Alice', 'Bob'], { allowSlop: false, scoreToOpponents: false, pointsEnabled: true });

  game.onThrow({ playerId: 0, target: 20, multiplier: 1 });
  game.onThrow({ playerId: 0, target: 20, multiplier: 3 });

  assert.equal(game.players[0].meta.hits[20], 3);
  assert.equal(game.players[0].score || 0, 20);
  assert.equal(game.players[1].score || 0, 0);
});

test('Cricket no-slop allows scoring on a just-closed number in same turn', () => {
  const game = new Cricket(['Alice', 'Bob'], { allowSlop: false, scoreToOpponents: true });

  game.onThrow({ playerId: 0, target: 20, multiplier: 2 }); // 2 marks
  game.onThrow({ playerId: 0, target: 20, multiplier: 1 }); // close 20
  game.onThrow({ playerId: 0, target: 20, multiplier: 3 }); // extra 3 marks -> points to Bob

  assert.equal(game.players[0].meta.hits[20], 3);
  assert.equal(game.players[0].score || 0, 0);
  assert.equal(game.players[1].score || 0, 60);
});

test('Cricket standard mode ends immediately when a player closes 20 through Bull', () => {
  const game = new Cricket(['Alice', 'Bob'], { allowSlop: false, scoreToOpponents: false });
  const targets = [20, 19, 18, 17, 16, 15, 'BULL'];
  let result = null;

  for(const target of targets){
    game.throwsThisTurn = 0;
    result = game.onThrow({ playerId: 0, target, multiplier: 3 });
  }

  assert.equal(result?.finished, true);
  assert.equal(result?.winner?.name, 'Alice');
});

test('Cricket cut-throat does not auto-win on close-all unless score is lowest', () => {
  const game = new Cricket(['Alice', 'Bob'], { allowSlop: false, scoreToOpponents: true });

  // Give Alice points first so she is not the lowest when she closes all numbers.
  game.players[0].score = 80;
  game.players[1].score = 0;

  const targets = [20, 19, 18, 17, 16, 15, 'BULL'];
  let result = null;
  for(const target of targets){
    game.throwsThisTurn = 0;
    result = game.onThrow({ playerId: 0, target, multiplier: 3 });
  }

  assert.equal(result?.finished, false);
});

test('Cricket standard 2-player requires close-all and points lead', () => {
  const game = new Cricket(['Alice', 'Bob'], { allowSlop: false, scoreToOpponents: false, pointsEnabled: true });
  game.players[0].score = 10;
  game.players[1].score = 50;
  const targets = [20, 19, 18, 17, 16, 15, 'BULL'];
  let result = null;

  for(const target of targets){
    game.throwsThisTurn = 0;
    result = game.onThrow({ playerId: 0, target, multiplier: 3 });
  }

  assert.equal(result?.finished, false);
});

test('Cricket standard 3-player wins immediately on close-all', () => {
  const game = new Cricket(['Alice', 'Bob', 'Cara'], { allowSlop: false, scoreToOpponents: false, pointsEnabled: true });
  game.players[0].score = 0;
  game.players[1].score = 100;
  game.players[2].score = 200;
  const targets = [20, 19, 18, 17, 16, 15, 'BULL'];
  let result = null;

  for(const target of targets){
    game.throwsThisTurn = 0;
    result = game.onThrow({ playerId: 0, target, multiplier: 3 });
  }

  assert.equal(result?.finished, true);
  assert.equal(result?.winner?.name, 'Alice');
});

test('Cricket with points disabled does not award points after closure', () => {
  const game = new Cricket(['Alice', 'Bob'], { allowSlop: false, scoreToOpponents: true, pointsEnabled: false });

  game.onThrow({ playerId: 0, target: 20, multiplier: 2 });
  game.onThrow({ playerId: 0, target: 20, multiplier: 1 });
  game.onThrow({ playerId: 0, target: 20, multiplier: 3 });

  assert.equal(game.players[0].score || 0, 0);
  assert.equal(game.players[1].score || 0, 60);
});

test('Cricket standard with points disabled does not award points after closure', () => {
  const game = new Cricket(['Alice', 'Bob'], { allowSlop: false, scoreToOpponents: false, pointsEnabled: false });

  game.onThrow({ playerId: 0, target: 20, multiplier: 2 });
  game.onThrow({ playerId: 0, target: 20, multiplier: 1 });
  game.onThrow({ playerId: 0, target: 20, multiplier: 3 });

  assert.equal(game.players[0].score || 0, 0);
  assert.equal(game.players[1].score || 0, 0);
});

test('Shanghai standard game awards instant win for single-double-triple in a turn', () => {
  const game = new Shanghai(['Alice', 'Bob'], 20);
  game.onThrow({ playerId: 0, target: 1, multiplier: 1 });
  game.onThrow({ playerId: 0, target: 1, multiplier: 2 });
  const result = game.onThrow({ playerId: 0, target: 1, multiplier: 3 });

  assert.equal(result.finished, true);
  assert.equal(result.winner.name, 'Alice');
  assert.equal(game.players[0].score, 6);
});

test('Shanghai advances rounds after all players complete a turn', () => {
  const game = new Shanghai(['Alice', 'Bob'], 20);

  game.onThrow({ playerId: 0, target: 1, multiplier: 1 });
  game.onThrow({ playerId: 0, target: 2, multiplier: 1 });
  game.onThrow({ playerId: 0, target: 1, multiplier: 1 });
  assert.equal(game.round, 1);
  assert.equal(game.currentPlayer().name, 'Bob');

  game.onThrow({ playerId: 1, target: 1, multiplier: 1 });
  game.onThrow({ playerId: 1, target: 1, multiplier: 1 });
  game.onThrow({ playerId: 1, target: 1, multiplier: 1 });
  assert.equal(game.round, 2);
  assert.equal(game.currentPlayer().name, 'Alice');
});

test('Shanghai awarded score only counts hits on the active round', () => {
  assert.equal(
    getShanghaiAwardedScore(2, 2, 3, 6, SHANGHAI_SCORING_MODE.STANDARD),
    6
  );
  assert.equal(
    getShanghaiAwardedScore(2, 1, 3, 3, SHANGHAI_SCORING_MODE.STANDARD),
    0
  );
});

test('Shanghai flat scoring gives 1 point for any ring on active target only', () => {
  assert.equal(
    getShanghaiAwardedScore(7, 7, 1, 7, SHANGHAI_SCORING_MODE.FLAT),
    1
  );
  assert.equal(
    getShanghaiAwardedScore(7, 7, 3, 21, SHANGHAI_SCORING_MODE.FLAT),
    1
  );
  assert.equal(
    getShanghaiAwardedScore(7, 20, 3, 60, SHANGHAI_SCORING_MODE.FLAT),
    0
  );
});

test('Shanghai ring scoring uses multiplier points on active target only', () => {
  assert.equal(
    getShanghaiAwardedScore(7, 1, 1, 1, SHANGHAI_SCORING_MODE.RING),
    0
  );
  assert.equal(
    getShanghaiAwardedScore(7, 7, 2, 14, SHANGHAI_SCORING_MODE.RING),
    2
  );
  assert.equal(
    getShanghaiAwardedScore(7, 7, 3, 21, SHANGHAI_SCORING_MODE.RING),
    3
  );
  assert.equal(
    getShanghaiAwardedScore(7, 'MISS', 0, 0, SHANGHAI_SCORING_MODE.RING),
    0
  );
});

test('Shanghai game applies flat scoring mode', () => {
  const game = new Shanghai(['Alice', 'Bob'], 20, SHANGHAI_SCORING_MODE.FLAT);

  game.onThrow({ playerId: 0, target: 1, multiplier: 3 });
  game.onThrow({ playerId: 0, target: 1, multiplier: 2 });
  game.onThrow({ playerId: 0, target: 20, multiplier: 3 });

  assert.equal(game.players[0].score, 2);
});

test('Shanghai game applies ring scoring mode on active target only', () => {
  const game = new Shanghai(['Alice', 'Bob'], 20, SHANGHAI_SCORING_MODE.RING);

  game.onThrow({ playerId: 0, target: 20, multiplier: 1 });
  game.onThrow({ playerId: 0, target: 1, multiplier: 2 });
  game.onThrow({ playerId: 0, target: 1, multiplier: 3 });

  assert.equal(game.players[0].score, 5);
});

test('Shanghai defaults to standard multiplier scoring for unknown mode', () => {
  const game = new Shanghai(['Alice', 'Bob'], 20, 'Unknown Mode');

  game.onThrow({ playerId: 0, target: 1, multiplier: 3 });
  game.onThrow({ playerId: 0, target: 20, multiplier: 3 });

  assert.equal(game.players[0].score, 3);
});

test('Shanghai round total ignores off-target darts and prefers awarded score', () => {
  const roundEntries = [
    { target: 2, score: 2, awardedScore: 2 },
    { target: 5, score: 5, awardedScore: 0 },
    { target: 2, score: 4, awardedScore: 4 }
  ];

  assert.equal(getShanghaiRoundTotal(roundEntries, 2), 6);
});

test('Shanghai round total falls back correctly for older throws without awarded score', () => {
  const legacyRoundEntries = [
    { target: 2, score: 2 },
    { target: 5, score: 5 },
    { target: 2, score: 4 }
  ];

  assert.equal(getShanghaiRoundTotal(legacyRoundEntries, 2), 6);
});

test('Shanghai starts tie-break on next target when tied on points and triples', () => {
  const game = new Shanghai(['Alice', 'Bob'], 1);

  game.onThrow({ playerId: 0, target: 1, multiplier: 1 });
  game.onThrow({ playerId: 0, target: 1, multiplier: 1 });
  game.onThrow({ playerId: 0, target: 20, multiplier: 1 });

  game.onThrow({ playerId: 1, target: 1, multiplier: 1 });
  game.onThrow({ playerId: 1, target: 1, multiplier: 1 });
  const result = game.onThrow({ playerId: 1, target: 20, multiplier: 1 });

  assert.equal(result.finished, false);
  assert.equal(game.tiebreakMode, true);
  assert.equal(game.tiebreakTarget, 2);
  assert.equal(game.tiebreakPlayers.length, 2);
});

test('Shanghai tie-break target wraps from 20 to 1', () => {
  const game = new Shanghai(['Alice', 'Bob'], 20);
  game.players[0].score = 50;
  game.players[1].score = 50;
  game.players[0].meta.triples = 0;
  game.players[1].meta.triples = 0;
  game.round = 20;
  game.currentPlayerIndex = 1;
  game.throwsThisTurn = 2;

  const result = game.onThrow({ playerId: 1, target: 5, multiplier: 1 });

  assert.equal(result.finished, false);
  assert.equal(game.tiebreakMode, true);
  assert.equal(game.tiebreakTarget, 1);
});

test('Shanghai tie-break resolves by highest score in tie-break round', () => {
  const game = new Shanghai(['Alice', 'Bob'], 1);

  game.onThrow({ playerId: 0, target: 1, multiplier: 1 });
  game.onThrow({ playerId: 0, target: 1, multiplier: 1 });
  game.onThrow({ playerId: 0, target: 20, multiplier: 1 });

  game.onThrow({ playerId: 1, target: 1, multiplier: 1 });
  game.onThrow({ playerId: 1, target: 1, multiplier: 1 });
  game.onThrow({ playerId: 1, target: 20, multiplier: 1 });

  assert.equal(game.tiebreakMode, true);
  assert.equal(game.getCurrentTarget(), 2);
  assert.equal(game.getRoundForRecord(), 2);

  game.onThrow({ playerId: 0, target: 2, multiplier: 1 });
  game.onThrow({ playerId: 0, target: 20, multiplier: 1 });
  game.onThrow({ playerId: 0, target: 20, multiplier: 1 });

  game.onThrow({ playerId: 1, target: 20, multiplier: 1 });
  game.onThrow({ playerId: 1, target: 20, multiplier: 1 });
  const result = game.onThrow({ playerId: 1, target: 20, multiplier: 1 });

  assert.equal(result.finished, true);
  assert.equal(result.winner?.name, 'Alice');
  assert.equal(game.tieBreakerHistory?.winner, 'Alice');
});
