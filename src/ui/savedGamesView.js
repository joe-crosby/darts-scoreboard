import { escapeHtml } from '../utils.js';

function formatSnapshotLabel(snapshot){
  const gameLabel = escapeHtml(snapshot.gameLabel || snapshot.game || 'Game');
  const players = (snapshot.players || []).map((player) => player.name).filter(Boolean).join(', ');
  const startedAt = snapshot.startedAt ? new Date(snapshot.startedAt).toLocaleString() : 'Unknown start';
  return `${gameLabel} • ${startedAt}${players ? ` • ${escapeHtml(players)}` : ''}`;
}

export function renderResumeList(snapshotCache){
  const resumeListEl = document.getElementById('resume-list');
  if(!resumeListEl){
    return;
  }

  resumeListEl.innerHTML = '';

  if(snapshotCache.length === 0){
    resumeListEl.innerHTML = '<li class="list-group-item"><span class="text-muted">No saved games yet.</span></li>';
    return;
  }

  const template = document.getElementById('resume-list-entry-template');
  const sorted = [...snapshotCache].sort((left, right) => (right.startedAt || 0) - (left.startedAt || 0));
  for(const snapshot of sorted){
    if (!template) return;
    const row = template.content.firstElementChild.cloneNode(true);
    row.querySelector('.resume-label').textContent = formatSnapshotLabel(snapshot);
    const resumeBtn = row.querySelector('.resume-btn');
    const deleteBtn = row.querySelector('.delete-btn');
    if (resumeBtn) resumeBtn.setAttribute('data-id', snapshot.id);
    if (deleteBtn) deleteBtn.setAttribute('data-id', snapshot.id);
    resumeListEl.appendChild(row);
  }
}
