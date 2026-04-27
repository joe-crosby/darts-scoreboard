import { escapeHtml } from '../utils.js';

function getVisitKey(visit){
  return `${visit.playerName}::${visit.visitNumber}`;
}

function getMatchStateForVisit(visit, stateByVisit){
  return stateByVisit.get(getVisitKey(visit)) || '—';
}

function buildMatchStateByVisit(record, visits){
  const gameType = record.game;
  const result = new Map();

  if(gameType === 'cricket'){
    const targetOrder = [20, 19, 18, 17, 16, 15, 'BULL'];
    const hitsByPlayer = new Map();

    for(const visit of visits){
      if(!hitsByPlayer.has(visit.playerName)){
        const initial = {};
        targetOrder.forEach((target) => {
          initial[target] = 0;
        });
        hitsByPlayer.set(visit.playerName, initial);
      }

      const hits = hitsByPlayer.get(visit.playerName);
      for(const throwRecord of visit.throws){
        if(throwRecord.target in hits){
          hits[throwRecord.target] += throwRecord.multiplier || 1;
        }
      }

      const closed = targetOrder
        .filter((target) => hits[target] >= 3)
        .map((target) => target === 'BULL' ? 'B' : String(target))
        .join(',');
      result.set(getVisitKey(visit), closed || '—');
    }
    return result;
  }

  if(gameType === 'shanghai'){
    const scoresByPlayer = new Map();
    for(const visit of visits){
      const previous = scoresByPlayer.get(visit.playerName) || 0;
      const scoredThisVisit = visit.throws.reduce((sum, throwRecord) => sum + (throwRecord.awardedScore ?? throwRecord.score ?? 0), 0);
      const total = previous + scoredThisVisit;
      scoresByPlayer.set(visit.playerName, total);
      result.set(getVisitKey(visit), String(total || '—'));
    }
    return result;
  }

  if(gameType === '501' || gameType === '301'){
    const startScore = gameType === '501' ? 501 : 301;
    const remainingByPlayer = new Map();
    for(const visit of visits){
      const currentRemaining = remainingByPlayer.has(visit.playerName)
        ? remainingByPlayer.get(visit.playerName)
        : startScore;

      const isBust = visit.throws.some((throwRecord) => (throwRecord.message || '').toLowerCase().includes('bust'));
      const isDoubleOutMiss = visit.throws.some((throwRecord) => throwRecord.turnResetReason === 'double-out-required');
      const isTurnReset = visit.throws.some((throwRecord) => throwRecord.turnReset === true);
      if(isBust){
        result.set(getVisitKey(visit), `${currentRemaining} BUST`);
        continue;
      }
      if(isDoubleOutMiss){
        result.set(getVisitKey(visit), `${currentRemaining} NO-DOUBLE-OUT`);
        continue;
      }
      if(isTurnReset){
        result.set(getVisitKey(visit), String(currentRemaining));
        continue;
      }

      const scoredThisVisit = visit.throws.reduce((sum, throwRecord) => sum + (throwRecord.awardedScore ?? throwRecord.score ?? 0), 0);
      const nextRemaining = Math.max(0, currentRemaining - scoredThisVisit);
      remainingByPlayer.set(visit.playerName, nextRemaining);
      result.set(getVisitKey(visit), String(nextRemaining));
    }
    return result;
  }

  for(const visit of visits){
    result.set(getVisitKey(visit), '—');
  }
  return result;
}

function isNonScoringGame(record){
  return record.scoringEnabled === false;
}

function getChronologicalThrows(record){
  return (record.throws || [])
    .map((throwRecord, index) => ({ ...throwRecord, __index: index }))
    .sort((left, right) => {
      if((left.at || 0) !== (right.at || 0)){
        return (left.at || 0) - (right.at || 0);
      }
      return left.__index - right.__index;
    });
}

function formatDartCompact(throwRecord){
  if(throwRecord.target === 'MISS' || throwRecord.multiplier === 0){
    return 'MISS';
  }
  const target = throwRecord.target === 'BULL' ? 'B' : throwRecord.target;
  const ring = throwRecord.ring || 'S';
  return `${ring}${target}`;
}

function buildVisitOrder(record){
  const chronologicalThrows = getChronologicalThrows(record);
  const nonScoring = isNonScoringGame(record);
  const playerVisitCount = new Map((record.players || []).map((player) => [player.name, 0]));
  const visits = [];
  let currentVisit = null;
  let visitSequence = 0;

  for(const throwRecord of chronologicalThrows){
    const playerName = throwRecord.playerName || 'Unknown';
    const throwNumber = Number(throwRecord.throwNumber || 1);

    if(!playerVisitCount.has(playerName)){
      playerVisitCount.set(playerName, 0);
    }

    if(!currentVisit || currentVisit.playerName !== playerName || throwNumber === 1){
      const nextVisit = (playerVisitCount.get(playerName) || 0) + 1;
      playerVisitCount.set(playerName, nextVisit);
      currentVisit = {
        round: Number(throwRecord.round || 0),
        playerName,
        visitNumber: nextVisit,
        sequence: visitSequence,
        throws: [],
        darts: [],
        total: 0
      };
      visitSequence += 1;
      visits.push(currentVisit);
    }

    const dartScore = nonScoring ? 0 : Number(throwRecord.awardedScore ?? throwRecord.score ?? 0);
    currentVisit.throws.push(throwRecord);
    currentVisit.darts.push({
      dart: throwNumber,
      label: formatDartCompact(throwRecord),
      score: dartScore
    });
    currentVisit.total += dartScore;
  }

  const playerCount = Math.max(1, (record.players || []).length || 1);
  visits.forEach((visit, index) => {
    if(!visit.round || Number.isNaN(visit.round)){
      visit.round = Math.floor(index / playerCount) + 1;
    }
  });

  visits.sort((left, right) => {
    if(left.sequence !== right.sequence){
      return left.sequence - right.sequence;
    }
    if(left.round !== right.round){
      return left.round - right.round;
    }
    return left.visitNumber - right.visitNumber;
  });

  return { visits, chronologicalThrows };
}

function buildPlayerPerformanceRows(record, visitData){
  const throwsByPlayer = new Map();
  for(const throwRecord of visitData.chronologicalThrows){
    const playerName = throwRecord.playerName || 'Unknown';
    if(!throwsByPlayer.has(playerName)){
      throwsByPlayer.set(playerName, []);
    }
    throwsByPlayer.get(playerName).push(throwRecord);
  }

  const visitsByPlayer = new Map();
  for(const visit of visitData.visits){
    if(!visitsByPlayer.has(visit.playerName)){
      visitsByPlayer.set(visit.playerName, []);
    }
    visitsByPlayer.get(visit.playerName).push(visit);
  }

  const nonScoring = isNonScoringGame(record);

  return (record.players || []).map((player) => {
    const playerThrows = throwsByPlayer.get(player.name) || [];
    const totalAwarded = nonScoring ? 0 : playerThrows.reduce((sum, throwRecord) => sum + Number(throwRecord.awardedScore ?? throwRecord.score ?? 0), 0);
    const firstNine = nonScoring ? 0 : playerThrows.slice(0, 9).reduce((sum, throwRecord) => sum + Number(throwRecord.awardedScore ?? throwRecord.score ?? 0), 0);
    const firstThree = nonScoring ? 0 : playerThrows.slice(0, 3).reduce((sum, throwRecord) => sum + Number(throwRecord.awardedScore ?? throwRecord.score ?? 0), 0);
    const firstThreePercent = totalAwarded > 0 ? ((firstThree / totalAwarded) * 100) : 0;
    const firstNinePercent = totalAwarded > 0 ? ((firstNine / totalAwarded) * 100) : 0;
    const playerVisits = visitsByPlayer.get(player.name) || [];
    const bestRound = playerVisits.reduce((best, visit) => Math.max(best, visit.total), 0);
    const doublesHit = playerThrows.filter((throwRecord) => throwRecord.ring === 'D').length;
    const triplesHit = playerThrows.filter((throwRecord) => throwRecord.ring === 'T').length;
    const bullsHit = playerThrows.filter((throwRecord) => throwRecord.target === 'BULL').length;

    return `
      <tr>
        <td>${escapeHtml(player.name)}</td>
        <td>${Number(player.score || 0)}</td>
        <td>${firstThreePercent.toFixed(1)}%</td>
        <td>${firstNinePercent.toFixed(1)}%</td>
        <td>${bestRound}</td>
        <td>${doublesHit}</td>
        <td>${triplesHit}</td>
        <td>${bullsHit}</td>
      </tr>
    `;
  }).join('');
}

export function getShanghaiFinishRound(record){
  if(record?.shanghaiFinishRound){
    return Number(record.shanghaiFinishRound) || null;
  }
  const message = record?.notes || '';
  const match = /wins with a shanghai on\s+(\d+)/i.exec(message);
  return match ? Number(match[1]) : null;
}

export function renderHistoryDetailHtml(record){
  const visitData = buildVisitOrder(record);
  const stateByVisit = buildMatchStateByVisit(record, visitData.visits);
  const roundOrderVisits = visitData.visits.filter((visit) => !visit.throws.some((throwRecord) => throwRecord.isTieBreaker === true));
  const shanghaiFinishRound = getShanghaiFinishRound(record);
  const tieBreakerSummary = record.tieBreakerSummary || null;
  const tieBreakerReasonLabelMap = {
    'equal-score-no-triples': 'Equal high score with no triples',
    'equal-score-equal-triples': 'Equal high score and equal triples'
  };
  const tieBreakerReasonLabel = tieBreakerSummary
    ? (tieBreakerReasonLabelMap[tieBreakerSummary.reason] || 'Tie-break required')
    : null;
  const winnerLabel = record.winners?.length > 1
    ? `Winners: ${record.winners.join(', ')}`
    : `Winner: ${record.winner || 'Tie'}`;
  const winnerFlair = shanghaiFinishRound
    ? `<span class="shanghai-finish-badge ms-2">SHANGHAI FINISH • ${shanghaiFinishRound}</span>`
    : '';

  // Get template
  const template = document.getElementById('history-detail-template');
  if (!template) return '';
  const node = template.content.firstElementChild.cloneNode(true);

  // Title
  node.querySelector('.history-detail-title').innerHTML = `<strong>${escapeHtml(record.gameLabel || record.game)}</strong>`;
  // Meta
  node.querySelector('.history-detail-meta').textContent = `Started ${new Date(record.startedAt).toLocaleString()} • Finished ${new Date(record.finishedAt).toLocaleString()}`;
  // Winner
  node.querySelector('.history-detail-winner').innerHTML = `<strong>${escapeHtml(winnerLabel)}</strong>${winnerFlair}`;

  // Player performance rows
  const playerRowsHtml = buildPlayerPerformanceRows(record, visitData);
  const playerRowsTbody = node.querySelector('.history-detail-player-rows');
  playerRowsTbody.innerHTML = playerRowsHtml || '<tr><td colspan="8">No player stats yet.</td></tr>';

  // Visit rows
  const visitRowsHtml = roundOrderVisits.map((visit) => {
    const matchState = getMatchStateForVisit(visit, stateByVisit);
    const formattedMatchState = (() => {
      if(typeof matchState === 'string' && matchState.endsWith(' BUST')){
        const value = escapeHtml(matchState.replace(/\s*BUST$/, '').trim());
        return `${value} <span class="turn-badge">BUST</span>`;
      }
      if(typeof matchState === 'string' && matchState.endsWith(' NO-DOUBLE-OUT')){
        const value = escapeHtml(matchState.replace(/\s*NO-DOUBLE-OUT$/, '').trim());
        return `${value} <span class="turn-badge turn-badge-double-out" title="Did not double out">NO D/O</span>`;
      }
      return escapeHtml(matchState);
    })();
    return `
      <tr>
        <td>R${visit.round}</td>
        <td>${escapeHtml(visit.playerName)}</td>
        <td>${visit.visitNumber}</td>
        <td>${visit.darts.map((dart) => dart.label).join(' • ')}</td>
        <td>${visit.total}</td>
        <td>${formattedMatchState}</td>
      </tr>
    `;
  }).join('');
  const visitRowsTbody = node.querySelector('.history-detail-visit-rows');
  visitRowsTbody.innerHTML = visitRowsHtml || '<tr><td colspan="6">No rounds recorded.</td></tr>';

  // Tie-breaker section
  const tiebreakerDiv = node.querySelector('.history-detail-tiebreaker');
  if (tieBreakerSummary) {
    const tieBreakerRows = (tieBreakerSummary?.rounds || []).map((round) => {
      const scoreLine = (round.scores || [])
        .map((entry) => `${escapeHtml(entry.player)}: ${Number(entry.score || 0)}`)
        .join(' | ');
      return `
        <tr>
          <td>${Number(round.round || 0)}</td>
          <td>${Number(round.target || 0)}</td>
          <td>${escapeHtml((round.leaders || []).join(', ') || '-')}</td>
          <td>${Number(round.highScore || 0)}</td>
          <td>${scoreLine || '-'}</td>
        </tr>
      `;
    }).join('');
    tiebreakerDiv.innerHTML = `
      <h3 class="h6">Tie-Breaker Data</h3>
      <div class="text-muted small mb-2">${escapeHtml(tieBreakerReasonLabel)} • Start Target ${Number(tieBreakerSummary.startingTarget || 0)} • Winner ${escapeHtml(tieBreakerSummary.winner || record.winner || 'N/A')}</div>
      <div class="table-responsive mb-3">
        <table class="table table-sm">
          <thead>
            <tr><th>TB Round</th><th>Target</th><th>Leaders</th><th>High Score</th><th>Per-Player Score</th></tr>
          </thead>
          <tbody>${tieBreakerRows || '<tr><td colspan="5">No tie-break rounds recorded.</td></tr>'}</tbody>
        </table>
      </div>
    `;
  } else {
    tiebreakerDiv.innerHTML = '';
  }

  // Return the outer HTML for compatibility with existing usage
  return node.outerHTML;
}

