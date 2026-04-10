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

  const rows = playerEntries
    .flatMap(([playerName, playerStats]) => {
      const gameEntries = Object.entries(playerStats.byGameType)
        .sort((left, right) => left[0].localeCompare(right[0], undefined, { sensitivity: 'base' }));

      if(gameEntries.length === 0){
        return [`
          <tr class="player-group-end">
            <td class="player-group-cell">${playerName}</td>
            <td>—</td>
            <td>0</td>
            <td>0</td>
          </tr>
        `];
      }

      return gameEntries.map(([gameType, gameStats], index) => {
        const isStartOfGroup = index === 0;
        const isEndOfGroup = index === gameEntries.length - 1;
        const playerCell = index === 0
          ? `<td class="player-group-cell" rowspan="${gameEntries.length}">${playerName}</td>`
          : '';
        return `
          <tr class="${isStartOfGroup ? 'player-group-start' : ''} ${isEndOfGroup ? 'player-group-end' : ''}">
            ${playerCell}
            <td>${gameType}${gameType === 'shanghai' && gameStats.shanghaiFinishWins > 0 ? ` (${gameStats.shanghaiFinishWins} Shanghai finish${gameStats.shanghaiFinishWins === 1 ? '' : 'es'})` : ''}</td>
            <td>${gameStats.games}</td>
            <td>${gameStats.wins}</td>
          </tr>
        `;
      });
    })
    .join('');

  return `
    <div class="table-responsive">
      <table class="table table-sm">
        <thead>
          <tr><th>Player</th><th>Games</th><th># Played</th><th># Wins</th></tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="4">No player stats yet.</td></tr>'}</tbody>
      </table>
    </div>
  `;
}
