import { escapeHtml } from '../utils.js';
import { showConfirm } from './messageModalView.js';

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

function cloneTemplateElement(templateId){
  const template = document.getElementById(templateId);
  return template?.content?.firstElementChild?.cloneNode(true) || null;
}

function createPlayerPerformanceRow(player, stats){
  const row = cloneTemplateElement('history-player-row-template');
  if(!row){
    const fallback = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 8;
    cell.textContent = `Player ${player.name}`;
    fallback.appendChild(cell);
    return fallback;
  }

  row.querySelector('.history-player-name').textContent = player.name;
  row.querySelector('.history-player-score').textContent = Number(player.score || 0);
  row.querySelector('.history-player-first-three').textContent = `${stats.firstThreePercent.toFixed(1)}%`;
  row.querySelector('.history-player-first-nine').textContent = `${stats.firstNinePercent.toFixed(1)}%`;
  row.querySelector('.history-player-best-round').textContent = stats.bestRound;
  row.querySelector('.history-player-doubles').textContent = stats.doublesHit;
  row.querySelector('.history-player-triples').textContent = stats.triplesHit;
  row.querySelector('.history-player-bulls').textContent = stats.bullsHit;
  return row;
}

function createVisitRow(visit, formattedMatchStateHtml){
  const row = cloneTemplateElement('history-visit-row-template');
  if(!row){
    const fallback = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.textContent = `Round ${visit.round} ${visit.playerName}`;
    fallback.appendChild(cell);
    return fallback;
  }

  row.querySelector('.history-visit-round').textContent = `R${visit.round}`;
  row.querySelector('.history-visit-player').textContent = visit.playerName;
  row.querySelector('.history-visit-number').textContent = visit.visitNumber;
  row.querySelector('.history-visit-darts').textContent = visit.darts.map((dart) => dart.label).join(' • ');
  row.querySelector('.history-visit-total').textContent = visit.total;
  const matchStateCell = row.querySelector('.history-visit-match-state');
  matchStateCell.innerHTML = formattedMatchStateHtml;
  return row;
}

function createTieBreakerRow(round){
  const row = cloneTemplateElement('history-tiebreaker-row-template');
  if(!row){
    const fallback = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = `TB Round ${round.round}`;
    fallback.appendChild(cell);
    return fallback;
  }

  row.querySelector('.history-tiebreaker-round').textContent = Number(round.round || 0);
  row.querySelector('.history-tiebreaker-target').textContent = Number(round.target || 0);
  row.querySelector('.history-tiebreaker-leaders').textContent = (round.leaders || []).join(', ') || '-';
  row.querySelector('.history-tiebreaker-high-score').textContent = Number(round.highScore || 0);
  row.querySelector('.history-tiebreaker-scores').textContent = (round.scores || [])
    .map((entry) => `${entry.player}: ${Number(entry.score || 0)}`)
    .join(' | ') || '-';
  return row;
}

function formatMatchStateHtml(matchState){
  if(typeof matchState === 'string' && matchState.endsWith(' BUST')){
    const value = escapeHtml(matchState.replace(/\s*BUST$/, '').trim());
    return `${value} <span class="turn-badge">BUST</span>`;
  }
  if(typeof matchState === 'string' && matchState.endsWith(' NO-DOUBLE-OUT')){
    const value = escapeHtml(matchState.replace(/\s*NO-DOUBLE-OUT$/, '').trim());
    return `${value} <span class="turn-badge turn-badge-double-out" title="Did not double out">NO D/O</span>`;
  }
  return escapeHtml(matchState);
}

export function createHistoryEntryItem(record, onDelete){
  const template = document.getElementById('history-list-entry-template');
  if(!template) return null;
  const item = template.content.firstElementChild.cloneNode(true);
  const label = item.querySelector('.history-label');
  const players = (record.players || []).map((player) => player.name).join(', ');
  const shanghaiFinishRound = getShanghaiFinishRound(record);
  const winnerLabel = record.winners?.length > 1
    ? `Winners: ${record.winners.join(', ')}`
    : `Winner: ${record.winner}`;
  const winnerFlair = shanghaiFinishRound
    ? ` <span class="shanghai-finish-badge">SHANGHAI FINISH • ${shanghaiFinishRound}</span>`
    : '';

  if(label){
    label.innerHTML = `
      <div><strong>${escapeHtml(record.gameLabel || record.game)}</strong> • ${new Date(record.finishedAt).toLocaleString()}</div>
      <div class="text-muted small">${escapeHtml(winnerLabel)}${winnerFlair} • Players: ${escapeHtml(players)}</div>
    `;
  }

  const viewBtn = item.querySelector('.history-view-btn');
  const inlineDetail = item.querySelector('.history-inline-detail');
  if(viewBtn && inlineDetail){
    viewBtn.addEventListener('click', () => {
      const isOpen = !inlineDetail.hidden;
      inlineDetail.hidden = isOpen;
      viewBtn.textContent = isOpen ? 'View' : 'Hide';
      viewBtn.setAttribute('aria-expanded', String(!isOpen));
      if(!isOpen && !inlineDetail.dataset.rendered){
        inlineDetail.innerHTML = renderHistoryDetailHtml(record);
        inlineDetail.dataset.rendered = '1';
      }
    });
  }

  const deleteBtn = item.querySelector('.history-delete-btn');
  if(deleteBtn){
    deleteBtn.addEventListener('click', async () => {
      const confirmed = await showConfirm('Delete this history item? This cannot be undone.', 'Delete History');
      if (!confirmed) return;
      if(typeof onDelete === 'function'){
        await onDelete(record);
      }
    });
  }

  return item;
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

    return createPlayerPerformanceRow(player, {
      firstThreePercent,
      firstNinePercent,
      bestRound,
      doublesHit,
      triplesHit,
      bullsHit
    });
  });
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
  const playerRows = buildPlayerPerformanceRows(record, visitData);
  const playerRowsTbody = node.querySelector('.history-detail-player-rows');
  if(playerRows.length){
    playerRowsTbody.replaceChildren(...playerRows);
  } else {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 8;
    emptyCell.textContent = 'No player stats yet.';
    emptyRow.appendChild(emptyCell);
    playerRowsTbody.replaceChildren(emptyRow);
  }

  // Visit rows
  const visitRows = roundOrderVisits.map((visit) => {
    const matchState = getMatchStateForVisit(visit, stateByVisit);
    return createVisitRow(visit, formatMatchStateHtml(matchState));
  });
  const visitRowsTbody = node.querySelector('.history-detail-visit-rows');
  if(visitRows.length){
    visitRowsTbody.replaceChildren(...visitRows);
  } else {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 6;
    emptyCell.textContent = 'No rounds recorded.';
    emptyRow.appendChild(emptyCell);
    visitRowsTbody.replaceChildren(emptyRow);
  }

  // Tie-breaker section
  const tiebreakerDiv = node.querySelector('.history-detail-tiebreaker');
  if (tieBreakerSummary) {
    const tieTemplate = cloneTemplateElement('history-tiebreaker-template');
    if(tieTemplate){
      tieTemplate.querySelector('.history-tiebreaker-meta').textContent = `${escapeHtml(tieBreakerReasonLabel)} • Start Target ${Number(tieBreakerSummary.startingTarget || 0)} • Winner ${escapeHtml(tieBreakerSummary.winner || record.winner || 'N/A')}`;
      const tieRows = (tieBreakerSummary?.rounds || []).map(createTieBreakerRow);
      const tbody = tieTemplate.querySelector('.history-tiebreaker-rows');
      if(tieRows.length){
        tbody.replaceChildren(...tieRows);
      } else {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.colSpan = 5;
        emptyCell.textContent = 'No tie-break rounds recorded.';
        emptyRow.appendChild(emptyCell);
        tbody.replaceChildren(emptyRow);
      }
      tiebreakerDiv.replaceChildren(...Array.from(tieTemplate.childNodes));
    } else {
      tiebreakerDiv.textContent = `${tieBreakerReasonLabel} • Start Target ${Number(tieBreakerSummary.startingTarget || 0)} • Winner ${record.winner || 'N/A'}`;
    }
  } else {
    tiebreakerDiv.textContent = '';
  }

  // Return the outer HTML for compatibility with existing usage
  return node.outerHTML;
}

