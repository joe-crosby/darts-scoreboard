export function summarizeHistory(history){
  const totals = {
    players: {}
  };

  for(const gameRecord of history){
    const gameType = gameRecord.game;
    for(const player of gameRecord.players || []){
      if(!totals.players[player.name]){
        totals.players[player.name] = {
          games: 0,
          wins: 0,
          byGameType: {}
        };
      }

      if(!totals.players[player.name].byGameType[gameType]){
        totals.players[player.name].byGameType[gameType] = {
          games: 0,
          wins: 0,
          shanghaiFinishWins: 0
        };
      }

      totals.players[player.name].games += 1;
      totals.players[player.name].byGameType[gameType].games += 1;

      if((gameRecord.winners || []).includes(player.name) || gameRecord.winner === player.name){
        totals.players[player.name].wins += 1;
        totals.players[player.name].byGameType[gameType].wins += 1;
        const hasShanghaiFinish = gameType === 'shanghai' && Number(gameRecord.shanghaiFinishRound || 0) > 0;
        if(hasShanghaiFinish){
          totals.players[player.name].byGameType[gameType].shanghaiFinishWins += 1;
        }
      }
    }
  }

  return totals;
}

export function formatSummaryHtml(summary){
  const playerEntries = Object.entries(summary.players)
    .sort((left, right) => left[0].localeCompare(right[0], undefined, { sensitivity: 'base' }));

  const template = document.getElementById('game-stats-summary-template');
  if (!template) return '';
  const node = template.content.firstElementChild.cloneNode(true);
  const tbody = node.querySelector('.game-stats-summary-rows');

  let hasRows = false;
  playerEntries.forEach(([playerName, playerStats]) => {
    const gameEntries = Object.entries(playerStats.byGameType)
      .sort((left, right) => left[0].localeCompare(right[0], undefined, { sensitivity: 'base' }));

    if(gameEntries.length === 0){
      const tr = document.createElement('tr');
      tr.className = 'player-group-end';
      tr.innerHTML = `<td>${playerName}</td><td>—</td><td>0</td><td>0</td>`;
      tbody.appendChild(tr);
      hasRows = true;
      return;
    }

    gameEntries.forEach(([gameType, gameStats], index) => {
      const isStartOfGroup = index === 0;
      const isEndOfGroup = index === gameEntries.length - 1;
      const tr = document.createElement('tr');
      tr.className = `${isStartOfGroup ? 'player-group-start' : ''} ${isEndOfGroup ? 'player-group-end' : ''}`;
      let playerCell = '';
      if (index === 0) {
        playerCell = `<td rowspan="${gameEntries.length}">${playerName}</td>`;
      }
      tr.innerHTML = `
        ${playerCell}
        <td>${gameType}${gameType === 'shanghai' && gameStats.shanghaiFinishWins > 0 ? ` (${gameStats.shanghaiFinishWins} Shanghai finish${gameStats.shanghaiFinishWins === 1 ? '' : 'es'})` : ''}</td>
        <td>${gameStats.games}</td>
        <td>${gameStats.wins}</td>
      `;
      tbody.appendChild(tr);
      hasRows = true;
    });
  });

  if (!hasRows) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="4">No player stats yet.</td>';
    tbody.appendChild(tr);
  }

  return node.outerHTML;
}
