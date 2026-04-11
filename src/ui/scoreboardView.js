import { getShanghaiRoundTotal } from '../games/shanghaiScoring.js';

function renderBoardLayout({
  players,
  currentPlayerIndex,
  isCompleted,
  centerHeader,
  rowLabels,
  cellFor,
  footerLabel,
  footerFor,
  hideRowLabels = false,
  noFooter = false,
  compactRows = false
}){
  const splitIndex = Math.ceil(players.length / 2);
  const leftPlayers = players.slice(0, splitIndex);
  const rightPlayers = players.slice(splitIndex);
  const columnSize = Math.max(leftPlayers.length, rightPlayers.length);

  const pad = (items) => {
    const padded = [...items];
    while(padded.length < columnSize){
      padded.push(null);
    }
    return padded;
  };

  const left = pad(leftPlayers);
  const right = pad(rightPlayers);
  const tableClass = compactRows ? 'dart-board-table compact-rows' : 'dart-board-table';
  let html = `<div class="dart-board"><table class="${tableClass}">`;

  html += '<thead><tr>';
  left.forEach((player) => {
    if(player){
      const activeClass = !isCompleted && player.id === currentPlayerIndex ? ' active-player-header' : '';
      html += `<th class="board-player-col${activeClass}">${player.name}</th>`;
    } else {
      html += '<th class="board-player-col board-spacer-col"></th>';
    }
  });
  html += `<th class="board-center-col">${centerHeader}</th>`;
  right.forEach((player) => {
    if(player){
      const activeClass = !isCompleted && player.id === currentPlayerIndex ? ' active-player-header' : '';
      html += `<th class="board-player-col${activeClass}">${player.name}</th>`;
    } else {
      html += '<th class="board-player-col board-spacer-col"></th>';
    }
  });
  html += '</tr></thead><tbody>';

  rowLabels.forEach((label, rowIndex) => {
    html += '<tr>';
    left.forEach((player) => {
      if(!player){
        html += '<td class="board-player-cell board-spacer-col"></td>';
        return;
      }
      const activeClass = !isCompleted && player.id === currentPlayerIndex ? ' active-player-cell' : '';
      html += `<td class="board-player-cell${activeClass}">${cellFor(player, rowIndex, label)}</td>`;
    });
    const rowLabel = hideRowLabels ? '&nbsp;' : label;
    html += `<td class="board-center-col board-row-label">${rowLabel}</td>`;
    right.forEach((player) => {
      if(!player){
        html += '<td class="board-player-cell board-spacer-col"></td>';
        return;
      }
      const activeClass = !isCompleted && player.id === currentPlayerIndex ? ' active-player-cell' : '';
      html += `<td class="board-player-cell${activeClass}">${cellFor(player, rowIndex, label)}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody>';
  if(!noFooter){
    html += '<tfoot><tr>';
    left.forEach((player) => {
      html += player
        ? `<td class="board-footer-cell">${footerFor(player)}</td>`
        : '<td class="board-footer-cell board-spacer-col"></td>';
    });
    html += `<td class="board-center-col board-footer-label">${footerLabel}</td>`;
    right.forEach((player) => {
      html += player
        ? `<td class="board-footer-cell">${footerFor(player)}</td>`
        : '<td class="board-footer-cell board-spacer-col"></td>';
    });
    html += '</tr></tfoot>';
  }
  html += '</table></div>';

  return html;
}

function cricketMarkForState(state, hits){
  if(state === 'closed-circle'){
    return `
      <svg class="cricket-icon cricket-icon-closed" viewBox="0 0 24 24" aria-label="closed with circle" role="img">
        <circle cx="12" cy="12" r="9" />
      </svg>
    `;
  }
  if(state === 'closed-x'){
    return `
      <svg class="cricket-icon cricket-icon-closed" viewBox="0 0 24 24" aria-label="closed with x" role="img">
        <circle cx="12" cy="12" r="9" />
        <line x1="7" y1="7" x2="17" y2="17" />
        <line x1="17" y1="7" x2="7" y2="17" />
      </svg>
    `;
  }
  if(state === 'closed-slash'){
    return `
      <svg class="cricket-icon cricket-icon-closed" viewBox="0 0 24 24" aria-label="closed with slash" role="img">
        <circle cx="12" cy="12" r="9" />
        <line x1="7" y1="17" x2="17" y2="7" />
      </svg>
    `;
  }
  if(hits >= 3){
    return `
      <svg class="cricket-icon cricket-icon-closed" viewBox="0 0 24 24" aria-label="closed" role="img">
        <circle cx="12" cy="12" r="9" />
      </svg>
    `;
  }
  if(state === 'double' || hits === 2){
    return `
      <svg class="cricket-icon cricket-icon-double" viewBox="0 0 24 24" aria-label="double" role="img">
        <line x1="7" y1="7" x2="17" y2="17" />
        <line x1="17" y1="7" x2="7" y2="17" />
      </svg>
    `;
  }
  if(state === 'single' || hits === 1){
    return `
      <svg class="cricket-icon cricket-icon-single" viewBox="0 0 24 24" aria-label="single" role="img">
        <line x1="7" y1="17" x2="17" y2="7" />
      </svg>
    `;
  }
  return '<span class="cricket-mark mark-empty"></span>';
}

function renderCricketCell(player, target){
  const hits = Math.min(3, player.meta.hits?.[target] || 0);
  const state = player.meta.markState?.[target] || 'empty';
  return `<div class="board-cell-inner cricket-cell-inner">${cricketMarkForState(state, hits)}</div>`;
}

function buildCountDownTurns(game, session){
  const startScore = game.startScore || Number.parseInt(session.gameKey, 10) || 0;
  const turnsByPlayer = new Map(game.players.map((player) => [player.id, []]));
  const remainingByPlayer = new Map(game.players.map((player) => [player.id, startScore]));
  let currentTurn = null;

  const pushTurn = () => {
    if(!currentTurn){
      return;
    }
    turnsByPlayer.get(currentTurn.playerId).push(currentTurn);
    currentTurn = null;
  };

  for(const throwRecord of session.throws){
    if(currentTurn && currentTurn.playerId !== throwRecord.playerId){
      pushTurn();
    }

    if(!currentTurn){
      const start = remainingByPlayer.get(throwRecord.playerId) ?? startScore;
      currentTurn = {
        playerId: throwRecord.playerId,
        start,
        end: start,
        bust: false
      };
    }

    const currentScore = remainingByPlayer.get(throwRecord.playerId) ?? startScore;
    const scored = Number(throwRecord.awardedScore ?? throwRecord.score ?? 0);
    const nextScore = currentScore - scored;
    const bust = String(throwRecord.message || '').toLowerCase().includes('bust');
    const turnReset = Boolean(throwRecord.turnReset);

    if(bust){
      currentTurn.bust = true;
      currentTurn.end = currentTurn.start;
      remainingByPlayer.set(throwRecord.playerId, currentTurn.start);
      pushTurn();
      continue;
    }

    if(turnReset){
      currentTurn.end = currentTurn.start;
      remainingByPlayer.set(throwRecord.playerId, currentTurn.start);
      pushTurn();
      continue;
    }

    remainingByPlayer.set(throwRecord.playerId, nextScore);
    currentTurn.end = nextScore;

    if(nextScore === 0 || throwRecord.throwNumber === 3){
      pushTurn();
    }
  }

  pushTurn();
  return { turnsByPlayer, startScore };
}

function buildShanghaiRounds(game, session){
  const roundsByPlayer = new Map(game.players.map((player) => [player.id, new Map()]));
  for(const throwRecord of session.throws){
    const roundKey = throwRecord.round || 1;
    const playerRounds = roundsByPlayer.get(throwRecord.playerId);
    if(!playerRounds.has(roundKey)){
      playerRounds.set(roundKey, []);
    }
    playerRounds.get(roundKey).push(throwRecord);
  }
  return roundsByPlayer;
}

export function renderScoreboardHtml(displayedState, gameRegistry){
  if(!displayedState){
    return '<div class="text-muted p-2">Start a game to see scores.</div>';
  }

  const { game, session, isCompleted } = displayedState;
  const descriptor = gameRegistry[session.gameKey];

  if(session.gameKey === 'cricket'){
    const targets = [20, 19, 18, 17, 16, 15, 'BULL'];
    return renderBoardLayout({
      players: game.players,
      currentPlayerIndex: game.currentPlayerIndex,
      isCompleted,
      centerHeader: descriptor.label,
      rowLabels: targets,
      cellFor: (player, _rowIndex, target) => renderCricketCell(player, target),
      footerLabel: 'Pts',
      footerFor: (player) => `<div class="board-footer-value">${player.score || 0}</div>`
    });
  }

  if(session.gameKey === 'shanghai'){
    const roundsByPlayer = buildShanghaiRounds(game, session);
    const configuredRounds = Number(game.maxRound || 20);
    const isLiveTieBreaker = !isCompleted && Boolean(game.tiebreakMode);
    const tieBreakerTarget = Number(game.tiebreakTarget || 1);
    const tieBreakerRound = Number(game.tiebreakRound || 1);
    const rowLabels = isLiveTieBreaker
      ? [tieBreakerTarget]
      : Array.from({ length: configuredRounds }, (_, index) => index + 1);

    return renderBoardLayout({
      players: game.players,
      currentPlayerIndex: game.currentPlayerIndex,
      isCompleted,
      centerHeader: isLiveTieBreaker ? `${descriptor.label} • Tiebreak` : descriptor.label,
      rowLabels,
      cellFor: (player, _rowIndex, roundLabel) => {
        const entries = isLiveTieBreaker
          ? session.throws.filter((entry) => (
            entry.playerId === player.id
            && entry.isTieBreaker === true
            && Number(entry.tieBreakerRound || 0) === tieBreakerRound
          ))
          : (roundsByPlayer.get(player.id)?.get(roundLabel) || []);

        if(entries.length === 0){
          return '<div class="board-cell-inner"></div>';
        }

        const total = isLiveTieBreaker
          ? entries.reduce((sum, entry) => sum + Number(entry.awardedScore || 0), 0)
          : getShanghaiRoundTotal(entries, roundLabel);

        return `
          <div class="board-cell-inner round-cell-inner">
            <div class="round-score">${total}</div>
          </div>
        `;
      },
      footerLabel: 'Tot',
      footerFor: (player) => `
        <div class="board-footer-value">${player.score || 0}</div>
        <div class="board-footer-meta">${player.meta.triples || 0}T</div>
      `
    });
  }

  const { turnsByPlayer, startScore } = buildCountDownTurns(game, session);

  const buildPlayerStack = (player) => {
    const turns = turnsByPlayer.get(player.id) || [];
    const items = [{ type: 'score', value: startScore }];
    for(const turn of turns){
      items.push(turn.bust ? { type: 'bust' } : { type: 'score', value: turn.end });
    }

    let lastScoreIdx = -1;
    for(let i = items.length - 1; i >= 0; i--){
      if(items[i].type === 'score'){
        lastScoreIdx = i;
        break;
      }
    }

    const stackHtml = items.map((item, i) => {
      if(item.type === 'bust'){
        return '<div class="turn-badge">BUST</div>';
      }
      const crossed = i < lastScoreIdx ? ' crossed-out-value' : '';
      return `<div class="turn-value${crossed}">${item.value}</div>`;
    }).join('');

    return `<div class="board-cell-inner countdown-cell"><div class="countdown-stack">${stackHtml}</div></div>`;
  };

  return renderBoardLayout({
    players: game.players,
    currentPlayerIndex: game.currentPlayerIndex,
    isCompleted,
    centerHeader: descriptor.label,
    rowLabels: [''],
    cellFor: (player) => buildPlayerStack(player),
    hideRowLabels: true,
    noFooter: true
  });
}
