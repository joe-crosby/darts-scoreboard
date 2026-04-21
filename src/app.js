import { GAME_REGISTRY } from './gameRegistry.js';
import { renderScoreboardHtml } from './ui/scoreboardView.js';
import { getShanghaiFinishRound, renderHistoryDetailHtml } from './ui/historyView.js';
import { MessageModalController, initializeMessageModal, showMessage, showConfirm, showPrompt, closeMessage } from './ui/messageModalView.js';
import { createWinnerCelebrationModal } from './ui/winnerCelebrationView.js';
import { escapeHtml } from './utils.js';
import * as storage from './storage.js';
import { formatSummaryHtml, summarizeHistory } from './stats.js';

const header = document.querySelector('header');
const boardContainer = document.getElementById('board-container');
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const startBtn = document.getElementById('start-btn');
const newGameBtn = document.getElementById('new-game');
const restartGameBtn = document.getElementById('restart-game');
const showSavedGamesBtn = document.getElementById('show-saved-games');
const savedGamesEl = document.getElementById('saved-games');
const closeSavedGamesBtn = document.getElementById('close-saved-games');
const resumeListEl = document.getElementById('resume-list');
const themeSelectEl = document.getElementById('theme-select');
const pickExistingUsersBtn = document.getElementById('pick-existing-users');
const clearAddedUsersBtn = document.getElementById('clear-added-users');
const selectedExistingUsersSummaryEl = document.getElementById('selected-existing-users-summary');
const addPlayersModalEl = document.getElementById('add-players-modal');
const openAddPlayersModalBtn = document.getElementById('open-add-players-modal');
const addPlayersConfirmBtn = document.getElementById('add-players-confirm');
const addPlayersCancelBtn = document.getElementById('add-players-cancel');
const addedPlayersTableBody = document.querySelector('#added-players-table tbody');
const existingUsersModalEl = document.getElementById('existing-users-modal');
const existingUsersPickerListEl = document.getElementById('existing-users-picker-list');
const existingUsersPickerEmptyEl = document.getElementById('existing-users-picker-empty');
const existingUsersModeAddBtn = document.getElementById('existing-users-mode-add');
const existingUsersModeManageBtn = document.getElementById('existing-users-mode-manage');
const clearExistingUsersBtn = document.getElementById('clear-existing-users');
const closeExistingUsersBtn = document.getElementById('close-existing-users');
const applyExistingUsersBtn = document.getElementById('apply-existing-users');
const gameSelect = document.getElementById('game-select');
const cricketOptionsEl = document.getElementById('cricket-options');
const cricketModeEl = document.getElementById('cricket-mode');
const cricketSlopEl = document.getElementById('cricket-slop');
const x01OptionsEl = document.getElementById('x01-options');
const x01DoubleInEl = document.getElementById('x01-double-in');
const x01DoubleOutEl = document.getElementById('x01-double-out');
const shangaiOptionsEl = document.getElementById('shanghai-options');
const shangaiRoundsEl = document.getElementById('shanghai-rounds');
const shanghaiScoringModeEl = document.getElementById('shanghai-scoring-mode');
const gameMetaEl = document.getElementById('game-meta');
const currentPlayerEl = document.getElementById('current-player');
const aimingTargetEl = document.getElementById('aiming-target');
const pendingSelectionEl = document.getElementById('pending-selection');
const confirmThrowBtn = document.getElementById('confirm-throw');
const cancelThrowBtn = document.getElementById('cancel-throw');
const scoreboardEl = document.getElementById('scoreboard');
const scoreboardAreaEl = document.getElementById('scoreboard-area');
const scoreboardHintEl = document.getElementById('scoreboard-hint');
const scoringOverlayEl = document.getElementById('scoring-overlay');
const scoringOverlayBackdropEl = document.getElementById('scoring-overlay-backdrop');
const closeScoringOverlayBtn = document.getElementById('close-scoring-overlay');
const showHistoryBtn = document.getElementById('show-history');
const historyEl = document.getElementById('history');
const historyViewHistoryBtn = document.getElementById('history-view-history');
const historyViewStatsBtn = document.getElementById('history-view-stats');
const historyPlayerFilterInput = document.getElementById('history-player-filter');
const historyStatsEl = document.getElementById('history-stats');
const historyList = document.getElementById('history-list');
const historyDetail = document.getElementById('history-detail');
const closeHistory = document.getElementById('close-history');
const messageModal = document.getElementById('message-modal');
const messageBackdrop = document.getElementById('message-backdrop');
const messagePanel = document.getElementById('message-panel');
const messageBadge = document.getElementById('message-badge');
const messageTitleEl = document.getElementById('message-title');
const messageBodyEl = document.getElementById('message-body');
const messageOkBtn = document.getElementById('message-ok');
const messageYesBtn = document.getElementById('message-yes');
const messageNoBtn = document.getElementById('message-no');

const messageModalController = new MessageModalController({
  modalEl: messageModal,
  panelEl: messagePanel,
  badgeEl: messageBadge,
  titleEl: messageTitleEl,
  bodyEl: messageBodyEl,
  okBtn: messageOkBtn,
  yesBtn: messageYesBtn,
  noBtn: messageNoBtn
});

initializeMessageModal(messageModalController);

let game = null;
let session = null;
let completedGameView = null;
let historyCache = [];
let pendingSelections = [];
let lastGameSetup = null;
let historyViewMode = 'history';
let snapshotCache = [];
let sessionWasResumed = false;
let knownUsers = [];
let gamePlayers = [];
let selectedExistingUsers = [];
let existingUsersModalMode = 'add';
let toastHideTimer = null;

const APP_THEME_SETTING_ID = 'app-theme';
const APP_THEME_OPTIONS = new Set([
  'soft',
  'midnight-neon'
]);
const DARK_THEMES = new Set(['midnight-neon']);

function normalizeThemeName(theme){
  return APP_THEME_OPTIONS.has(theme) ? theme : 'soft';
}

function applyTheme(themeChoice){
  const normalizedThemeChoice = normalizeThemeName(themeChoice);
  document.documentElement.setAttribute('data-theme', normalizedThemeChoice);
  document.documentElement.setAttribute('data-theme-mode', DARK_THEMES.has(normalizedThemeChoice) ? 'dark' : 'light');
  if(themeSelectEl){
    themeSelectEl.value = normalizedThemeChoice;
  }
}

async function initializeTheme(){
  const storedTheme = await storage.getAppSetting(APP_THEME_SETTING_ID);
  applyTheme(storedTheme || 'soft');
}

async function onThemeChange(){
  const selectedTheme = normalizeThemeName(themeSelectEl?.value || 'soft');
  applyTheme(selectedTheme);
  await storage.saveAppSetting(APP_THEME_SETTING_ID, selectedTheme);
}

function normalizePlayerName(name){
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function playerNameKey(name){
  return normalizePlayerName(name).toLocaleLowerCase();
}

function parsePlayerNames(raw){
  return String(raw || '')
    .split(',')
    .map((name) => normalizePlayerName(name))
    .filter(Boolean);
}

function uniquePlayerNames(names){
  const seen = new Set();
  const unique = [];
  for(const name of names){
    const normalized = normalizePlayerName(name);
    if(!normalized){
      continue;
    }
    const key = playerNameKey(normalized);
    if(seen.has(key)){
      continue;
    }
    seen.add(key);
    unique.push(normalized);
  }
  return unique;
}

function findDuplicatePlayerNames(names){
  const counts = new Map();
  for(const name of names){
    const normalized = normalizePlayerName(name);
    if(!normalized){
      continue;
    }
    const key = playerNameKey(normalized);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const duplicates = [];
  for(const name of names){
    const normalized = normalizePlayerName(name);
    if(!normalized){
      continue;
    }
    const key = playerNameKey(normalized);
    if((counts.get(key) || 0) > 1 && !duplicates.includes(normalized)){
      duplicates.push(normalized);
    }
  }
  return duplicates;
}

async function loadKnownUsers(){
  const users = await storage.listKnownUsers();
  return uniquePlayerNames(users);
}

async function saveKnownUsers(users){
  const normalized = uniquePlayerNames(users);
  knownUsers = normalized;
  await storage.saveKnownUsers(normalized);
}

async function initializeKnownUsers(){
  knownUsers = await loadKnownUsers();
  renderKnownUsers();
}

function getSelectedExistingUsers(){
  // For compatibility, return the known users in the current game
  return gamePlayers.filter(name => knownUsers.some(u => playerNameKey(u) === playerNameKey(name)));
}

function updateSelectedExistingUsersSummary(){
  if(!selectedExistingUsersSummaryEl){
    return;
  }
  // Show how many of the current gamePlayers are known users
  const knownInGame = gamePlayers.filter(name => knownUsers.some(u => playerNameKey(u) === playerNameKey(name)));
  if(knownInGame.length === 0){
    selectedExistingUsersSummaryEl.textContent = 'No existing users included.';
    if(clearAddedUsersBtn){
      clearAddedUsersBtn.disabled = true;
    }
    return;
  }
  selectedExistingUsersSummaryEl.textContent = `${knownInGame.length} included: ${knownInGame.join(', ')}`;
  if(clearAddedUsersBtn){
    clearAddedUsersBtn.disabled = false;
  }
  renderAddedPlayersTable();
}

function renderAddedPlayersTable() {
  const flexContainer = document.getElementById('added-players-flex');
  if (!flexContainer) return;
  // Remove all chips except the caption
  Array.from(flexContainer.querySelectorAll('.player-chip, .no-players')).forEach(el => el.remove());
  if (gamePlayers.length === 0) {
    const empty = document.createElement('span');
    empty.className = 'no-players text-muted';
    empty.textContent = 'No players added.';
    flexContainer.appendChild(empty);
    return;
  }
  gamePlayers.forEach((name, idx) => {
    const chip = document.createElement('span');
    chip.className = 'player-chip d-inline-flex align-items-center';
    chip.textContent = name;

    // Add remove button
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-player ms-2 p-0 lh-1';
    removeBtn.setAttribute('aria-label', `Remove ${name}`);
    removeBtn.innerHTML = '<i class="bi bi-x-circle-fill"></i>';
    removeBtn.addEventListener('click', () => {
      gamePlayers.splice(idx, 1);
      renderAddedPlayersTable();
      updateSelectedExistingUsersSummary();
    });
    chip.appendChild(removeBtn);

    flexContainer.appendChild(chip);
  });
}

function clearAddedExistingUsers(){
  gamePlayers = [];
  updateSelectedExistingUsersSummary();
  renderKnownUsers([]);
  renderAddedPlayersTable();
}

function updateExistingUsersModalControls(){
  if(!existingUsersModeAddBtn || !existingUsersModeManageBtn){
    return;
  }
  const isAddMode = existingUsersModalMode === 'add';
  existingUsersModeAddBtn.classList.toggle('btn-primary', isAddMode);
  existingUsersModeAddBtn.classList.toggle('btn-outline-primary', !isAddMode);
  existingUsersModeAddBtn.setAttribute('aria-pressed', String(isAddMode));

  existingUsersModeManageBtn.classList.toggle('btn-primary', !isAddMode);
  existingUsersModeManageBtn.classList.toggle('btn-outline-primary', isAddMode);
  existingUsersModeManageBtn.setAttribute('aria-pressed', String(!isAddMode));

  if(applyExistingUsersBtn){
    applyExistingUsersBtn.hidden = !isAddMode;
  }
  if(clearExistingUsersBtn){
    clearExistingUsersBtn.hidden = !isAddMode;
  }
}

function setExistingUsersModalMode(mode){
  existingUsersModalMode = mode === 'manage' ? 'manage' : 'add';
  updateExistingUsersModalControls();
  renderKnownUsers(selectedExistingUsers);
  updateExistingUsersSelectionButtons();
}

function renderKnownUsers(selected = []){
  if(!existingUsersPickerListEl || !existingUsersPickerEmptyEl || !pickExistingUsersBtn){
    return;
  }
  const selectedKeys = new Set(uniquePlayerNames(selected).map((name) => playerNameKey(name)));
  existingUsersPickerListEl.innerHTML = '';

  if(knownUsers.length === 0){
    existingUsersPickerListEl.hidden = true;
    existingUsersPickerEmptyEl.hidden = false;
    pickExistingUsersBtn.disabled = true;
    selectedExistingUsers = [];
    updateSelectedExistingUsersSummary();
    updateExistingUsersSelectionButtons();
    return;
  }

  existingUsersPickerListEl.hidden = false;
  existingUsersPickerEmptyEl.hidden = true;
  pickExistingUsersBtn.disabled = false;

  knownUsers.forEach((userName, index) => {
    const wrapper = document.createElement('li');
    wrapper.className = 'existing-user-row';

    const main = document.createElement('div');
    main.className = 'existing-user-main';

    if(existingUsersModalMode === 'add'){
      wrapper.dataset.clickable = 'true';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'form-check-input';
      checkbox.id = `existing-user-${index}`;
      checkbox.value = userName;
      checkbox.checked = selectedKeys.has(playerNameKey(userName));

      const label = document.createElement('label');
      label.className = 'form-check-label existing-user-name';
      label.htmlFor = checkbox.id;
      label.textContent = userName;

      main.append(checkbox, label);
      wrapper.append(main);
    } else {
      const label = document.createElement('span');
      label.className = 'existing-user-name';
      label.textContent = userName;

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-secondary btn-sm';
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('data-action', 'delete-user');
      deleteBtn.setAttribute('data-user-name', userName);

      const renameBtn = document.createElement('button');
      renameBtn.type = 'button';
      renameBtn.className = 'btn btn-outline-primary btn-sm';
      renameBtn.textContent = 'Rename';
      renameBtn.setAttribute('data-action', 'rename-user');
      renameBtn.setAttribute('data-user-name', userName);

      const actions = document.createElement('div');
      actions.className = 'existing-user-actions d-flex gap-1';
      actions.append(renameBtn, deleteBtn);

      main.append(label);
      wrapper.append(main, actions);
    }

    existingUsersPickerListEl.appendChild(wrapper);
  });

  selectedExistingUsers = knownUsers.filter((userName) => selectedKeys.has(playerNameKey(userName)));
  updateSelectedExistingUsersSummary();
  updateExistingUsersSelectionButtons();
}

function openExistingUsersModal(){
  if(!existingUsersModalEl){
    return;
  }
  setExistingUsersModalMode('add');
  renderKnownUsers(selectedExistingUsers);
  existingUsersModalEl.hidden = false;
}

function closeExistingUsersModal(){
  if(!existingUsersModalEl){
    return;
  }
  existingUsersModalEl.hidden = true;
}

function getCheckedExistingUsersInModal(){
  if(!existingUsersPickerListEl){
    return [];
  }
  return Array.from(existingUsersPickerListEl.querySelectorAll('input[type="checkbox"]:checked'))
    .map((checkbox) => normalizePlayerName(checkbox.value))
    .filter(Boolean);
}

function updateExistingUsersSelectionButtons(){
  if(existingUsersModalMode !== 'add'){
    if(applyExistingUsersBtn){
      applyExistingUsersBtn.disabled = true;
    }
    if(clearExistingUsersBtn){
      clearExistingUsersBtn.disabled = true;
    }
    return;
  }

  const hasSelectedUsers = getCheckedExistingUsersInModal().length > 0;
  if(applyExistingUsersBtn){
    applyExistingUsersBtn.disabled = !hasSelectedUsers;
  }
  if(clearExistingUsersBtn){
    clearExistingUsersBtn.disabled = !hasSelectedUsers;
  }
}

function applyExistingUsersSelection(){
  if(!existingUsersPickerListEl){
    return;
  }
  const checked = getCheckedExistingUsersInModal();
  if(checked.length === 0){
    updateExistingUsersSelectionButtons();
    return;
  }
  // Add checked users to gamePlayers, avoiding duplicates
  gamePlayers = uniquePlayerNames([...gamePlayers, ...checked]);
  updateSelectedExistingUsersSummary();
  closeExistingUsersModal();
  renderAddedPlayersTable();
}

function clearExistingUsersSelection(){
  if(existingUsersPickerListEl){
    existingUsersPickerListEl.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = false;
    });
  }
  updateExistingUsersSelectionButtons();
}

async function deleteExistingUser(userName){
  const normalizedName = normalizePlayerName(userName);
  if(!normalizedName){
    return;
  }

  const confirmed = await showConfirm(
    `Delete user "${normalizedName}" from existing users?\n\nThis will also permanently delete all of their stats from game history. Game records will remain if other players participated. This cannot be undone.`,
    'Delete User'
  );
  if(!confirmed){
    return;
  }

  // Remove user from known users
  knownUsers = knownUsers.filter((name) => playerNameKey(name) !== playerNameKey(normalizedName));
  selectedExistingUsers = selectedExistingUsers.filter((name) => playerNameKey(name) !== playerNameKey(normalizedName));
  await saveKnownUsers(knownUsers);
  renderKnownUsers(selectedExistingUsers);


  // Remove user from all history records' players arrays
  const allHistory = await storage.listHistory();
  for(const record of allHistory) {
    if(Array.isArray(record.players)) {
      const newPlayers = record.players.filter(player => playerNameKey(player.name) !== playerNameKey(normalizedName));
      if(newPlayers.length !== record.players.length) {
        if(newPlayers.length === 0) {
          // If no players left, delete the record
          await storage.deleteHistory(record.id);
        } else {
          record.players = newPlayers;
          await storage.saveHistory(record);
        }
      }
    }
  }

  // Optionally, refresh the history list if visible
  if(typeof renderHistoryList === 'function'){
    historyCache = await storage.listHistory();
    renderHistoryList();
  }
}

async function renameExistingUser(userName){
  const previousName = normalizePlayerName(userName);
  if(!previousName){
    return;
  }

  const nextNameRaw = await showPrompt('Enter a new unique user name:', 'Rename User', previousName);
  if(nextNameRaw === null){
    return;
  }

  const nextName = normalizePlayerName(nextNameRaw);
  if(!nextName){
    await showMessage('Name cannot be empty.', 'Invalid Name', 'error');
    return;
  }

  if(playerNameKey(nextName) === playerNameKey(previousName)){
    return;
  }

  const conflict = knownUsers.some((name) => playerNameKey(name) === playerNameKey(nextName));
  if(conflict){
    await showMessage(`A user named \"${nextName}\" already exists.`, 'Duplicate Name', 'error');
    return;
  }

  knownUsers = knownUsers.map((name) => (
    playerNameKey(name) === playerNameKey(previousName) ? nextName : name
  ));
  selectedExistingUsers = selectedExistingUsers.map((name) => (
    playerNameKey(name) === playerNameKey(previousName) ? nextName : name
  ));
  await saveKnownUsers(knownUsers);
  renderKnownUsers(selectedExistingUsers);
}

function getCricketModeSelection(){
  const value = cricketModeEl?.value;
  if(value === 'cutthroat'){
    return { cricketCutthroat: true, cricketPoints: false };
  }
  if(value === 'standard-no-points'){
    return { cricketCutthroat: false, cricketPoints: false };
  }
  return { cricketCutthroat: false, cricketPoints: true };
}

function formatSnapshotLabel(snapshot){
  const gameLabel = escapeHtml(snapshot.gameLabel || snapshot.game || 'Game');
  const players = (snapshot.players || []).map((player) => player.name).filter(Boolean).join(', ');
  const startedAt = snapshot.startedAt ? new Date(snapshot.startedAt).toLocaleString() : 'Unknown start';
  return `${gameLabel} • ${startedAt}${players ? ` • ${escapeHtml(players)}` : ''}`;
}

function buildGameOptionsFromSnapshot(snapshot){
  if(!snapshot.gameOptions){
    throw new Error('Snapshot missing game options.');
  }
  return snapshot.gameOptions;
}

function renderResumeList(){
  if(!resumeListEl){
    return;
  }

  resumeListEl.innerHTML = '';

  if(snapshotCache.length === 0){
    resumeListEl.innerHTML = '<li class="list-group-item"><span class="text-muted">No saved games yet.</span></li>';
    return;
  }

  const sorted = [...snapshotCache].sort((left, right) => (right.startedAt || 0) - (left.startedAt || 0));
  for(const snapshot of sorted){
    const row = document.createElement('li');
    row.className = 'list-group-item resume-entry';
    row.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3">
        <div class="small">${formatSnapshotLabel(snapshot)}</div>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-primary" data-action="resume" data-id="${snapshot.id}">Resume</button>
          <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${snapshot.id}">Delete</button>
        </div>
      </div>
    `;
    resumeListEl.appendChild(row);
  }
}

async function refreshResumeList(){
  snapshotCache = await storage.listGames();
  renderResumeList();
}

function hydrateGameFromSnapshot(gameInstance, snapshot){
  gameInstance.players = (snapshot.players || []).map((player, index) => ({
    id: index,
    name: player.name,
    score: player.score || 0,
    meta: structuredClone(player.meta || {}),
    stats: structuredClone(player.stats || {throws: 0, doubles: 0, triples: 0, bulls: 0, totalScored: 0})
  }));
  gameInstance.currentPlayerIndex = Number(snapshot.currentPlayerIndex || 0);
  gameInstance.throwsThisTurn = Number(snapshot.throwsThisTurn || 0);
  gameInstance.round = Number(snapshot.round || gameInstance.round || 1);

  if(typeof snapshot.maxRound === 'number'){
    gameInstance.maxRound = snapshot.maxRound;
  }

  if(gameInstance.variant === 'shanghai'){
    gameInstance.turnSegments = structuredClone(snapshot.turnSegments || {S:false,D:false,T:false});
    gameInstance.tiebreakMode = Boolean(snapshot.tiebreakMode);
    gameInstance.tiebreakRound = Number(snapshot.tiebreakRound || 0);
    gameInstance.tiebreakTarget = snapshot.tiebreakTarget ?? null;
    gameInstance.tiebreakReason = snapshot.tiebreakReason || null;
    gameInstance.tiebreakPlayers = gameInstance.players.filter((player) =>
      (snapshot.tiebreakPlayerIds || []).includes(player.id)
    );
    gameInstance.tiebreakScores = new Map(snapshot.tiebreakScores || []);
    gameInstance.tieBreakerHistory = structuredClone(snapshot.tieBreakerHistory || null);
  }
}

async function resumeSnapshot(snapshotId){
  const snapshot = snapshotCache.find((entry) => entry.id === snapshotId);
  if(!snapshot){
    await showMessage('Snapshot not found.', 'Resume Error', 'error');
    return;
  }

  const definition = GAME_REGISTRY[snapshot.game];
  if(!definition){
    await showMessage('Snapshot game type is not available.', 'Resume Error', 'error');
    return;
  }

  const players = (snapshot.players || []).map((player) => player.name);
  const options = buildGameOptionsFromSnapshot(snapshot);

  completedGameView = null;
  game = definition.create(players, options);
  hydrateGameFromSnapshot(game, snapshot);
  session = {
    id: snapshot.id,
    gameKey: snapshot.game,
    gameLabel: snapshot.gameLabel || definition.label,
    startedAt: snapshot.startedAt,
    throws: structuredClone(snapshot.throws || []),
    gameOptions: options
  };
  lastGameSetup = { players, gameKey: snapshot.game, options };
  sessionWasResumed = true;

  resetSessionUI();
  showGameScreen();
  savedGamesEl.hidden = true;
  updateHUD(`Resumed ${session.gameLabel}`);
}

function getDisplayedGameState(){
  if(game && session){
    return { game, session, isCompleted: false };
  }
  if(completedGameView){
    return { ...completedGameView, isCompleted: true };
  }
  return null;
}

function syncScoreboardState(){
  const hasActiveGame = Boolean(game && session);
  scoreboardAreaEl.tabIndex = hasActiveGame ? 0 : -1;
  scoreboardAreaEl.setAttribute('aria-disabled', hasActiveGame ? 'false' : 'true');
  scoreboardAreaEl.classList.toggle('scoreboard-readonly', !hasActiveGame);

  if(hasActiveGame){
    scoreboardHintEl.textContent = 'Click scoreboard to add score';
  } else if(completedGameView){
    scoreboardHintEl.textContent = 'Final scoreboard';
  } else {
    scoreboardHintEl.textContent = 'Click scoreboard to add score';
  }
}

async function loadBoard(){
  const res = await fetch('./images/dartboard.svg');
  const svg = await res.text();
  boardContainer.innerHTML = svg;
  attachSvgHandlers();
}

function attachSvgHandlers(){
  const svg = boardContainer.querySelector('svg');
  if(!svg) return;
  svg.querySelectorAll('path.D, path.S, path.T, #S-BULL, #D-BULL').forEach((element) => {
    element.style.cursor = 'pointer';
    element.addEventListener('click', onSegmentClick);
  });
  boardContainer.addEventListener('click', onBoardContainerClick);
}

function missHit(){
  return {
    target: 'MISS',
    ring: '',
    multiplier: 0,
    isDouble: false,
    score: 0
  };
}

function formatHitLabel(hit){
  if(!hit){
    return '--';
  }
  if(hit.target === 'MISS'){
    return 'MISS';
  }
  return `${hit.target}${hit.ring}`;
}

function parseHit(element){
  const className = element.getAttribute('class') || '';
  let multiplier = 1;
  let ring = 'S';
  let isDouble = false;

  if(className.includes('T')){
    multiplier = 3;
    ring = 'T';
  } else if(className.includes('D')){
    multiplier = 2;
    ring = 'D';
    isDouble = true;
  }

  let target = null;
  if(element.id === 'S-BULL'){
    target = 'BULL';
    ring = 'S';
  } else if(element.id === 'D-BULL'){
    target = 'BULL';
    multiplier = 2;
    ring = 'D';
    isDouble = true;
  } else {
    const group = element.closest('g');
    const match = (group?.getAttribute('class') || '').match(/pie(\d+)/);
    if(match){
      target = Number.parseInt(match[1], 10);
    }
  }

  const base = target === 'BULL' ? 25 : target;
  return {
    target,
    ring,
    multiplier,
    isDouble,
    score: base ? base * multiplier : 0
  };
}

function createDot(clientX, clientY){
  const rect = boardContainer.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  const dot = document.createElement('div');
  dot.className = 'selection-dot';
  dot.style.left = `${x}px`;
  dot.style.top = `${y}px`;
  boardContainer.appendChild(dot);
  return dot;
}

function remainingSelectionsForTurn(){
  if(!game || !session){
    return 0;
  }
  return Math.max(0, 3 - game.throwsThisTurn - pendingSelections.length);
}

function updatePendingControls(){
  if(!game || !session){
    pendingSelectionEl.textContent = 'No pending throw selected.';
    confirmThrowBtn.disabled = true;
    cancelThrowBtn.disabled = true;
    return;
  }

  if(pendingSelections.length === 0){
    pendingSelectionEl.textContent = 'No pending throw selected.';
    confirmThrowBtn.disabled = true;
    cancelThrowBtn.disabled = true;
    return;
  }

  const summary = pendingSelections
    .map((selection) => formatHitLabel(selection.hit))
    .join(', ');
  const remaining = remainingSelectionsForTurn();
  pendingSelectionEl.textContent = `${pendingSelections[0].playerName}: ${summary}. ${remaining} pick(s) left.`;
  confirmThrowBtn.disabled = remaining !== 0;
  cancelThrowBtn.disabled = false;
}

function showSetupScreen(){
  header.hidden = false;
  setupScreen.hidden = false;
  gameScreen.hidden = true;
}

function hideSetupScreen(){
  header.hidden = true;
  setupScreen.hidden = true;
  gameScreen.hidden = false;
}

function showGameScreen(){
  hideSetupScreen();
  closeScoringOverlay();
}

function openScoringOverlay(){
  if(!game || !session){
    return;
  }
  scoringOverlayEl.hidden = false;
}

function closeScoringOverlay(){
  scoringOverlayEl.hidden = true;
}

function updateGameOptionsVisibility(){
  cricketOptionsEl.hidden = gameSelect.value !== 'cricket';
  x01OptionsEl.hidden = gameSelect.value !== '501' && gameSelect.value !== '301';
  shangaiOptionsEl.hidden = gameSelect.value !== 'shanghai';
}

function getSelectedGameOptions(){
  const cricketMode = getCricketModeSelection();
  return {
    cricketCutthroat: cricketMode.cricketCutthroat,
    cricketPoints: cricketMode.cricketPoints,
    cricketSlop: Boolean(cricketSlopEl.checked),
    x01DoubleIn: Boolean(x01DoubleInEl?.checked),
    x01DoubleOut: Boolean(x01DoubleOutEl?.checked),
    shangaiRounds: Number.parseInt(shangaiRoundsEl.value, 10),
    shanghaiScoringMode: shanghaiScoringModeEl?.value || 'Standard (Multiplier) Scoring'
  };
}

function clearPendingSelections(){
  for(const selection of pendingSelections){
    selection.dot?.remove();
  }
  pendingSelections = [];
  updatePendingControls();
}

function addPendingSelection({event, hit}){
  const actingPlayer = game.currentPlayer();
  const dot = createDot(event.clientX, event.clientY);
  pendingSelections.push({
    hit,
    playerId: actingPlayer.id,
    playerName: actingPlayer.name,
    dot
  });
  updatePendingControls();
}

function onBoardContainerClick(event){
  if(!game || !session){
    return;
  }
  if(event.target.closest('path.D, path.S, path.T, #S-BULL, #D-BULL')){
    return;
  }

  const remaining = remainingSelectionsForTurn();
  if(remaining <= 0){
    return;
  }

  addPendingSelection({event, hit: missHit()});
}

function appendLog(message){
  // Log functionality removed from game screen
}

function renderScoreboard(){
  const displayedState = getDisplayedGameState();
  scoreboardEl.innerHTML = renderScoreboardHtml(displayedState, GAME_REGISTRY);
  syncScoreboardState();
}

function updateHUD(message = 'Ready'){
  const displayedState = getDisplayedGameState();
  if(!displayedState){
    gameMetaEl.textContent = 'No active game';
    currentPlayerEl.textContent = 'No active game';
    aimingTargetEl.innerHTML = 'Target: <span class="throw-at-value">--</span>';
    renderScoreboard();
    return;
  }

  const { game: activeBoardGame, session: activeBoardSession, isCompleted } = displayedState;
  const descriptor = GAME_REGISTRY[activeBoardSession.gameKey];
  gameMetaEl.textContent = descriptor.label;
  if(isCompleted){
    const winner = escapeHtml(completedGameView?.winner || 'Tie');
    const shanghaiFinishRound = Number(completedGameView?.shanghaiFinishRound || 0);
    if(shanghaiFinishRound > 0){
      currentPlayerEl.innerHTML = `Winner: ${winner} <span class="shanghai-finish-badge">SHANGHAI FINISH • ${shanghaiFinishRound}</span>`;
    } else {
      currentPlayerEl.textContent = `Winner: ${completedGameView?.winner || 'Tie'}`;
    }
  } else {
    currentPlayerEl.textContent = `Player: ${activeBoardGame.currentPlayer().name}`;
  }
  aimingTargetEl.innerHTML = isCompleted
    ? 'State: <span class="throw-at-value">Finished</span>'
    : `Target: <span class="throw-at-value">${getThrowAtTarget()}</span>`;
  renderScoreboard();
}

function getThrowAtTarget(){
  if(!game || !session){
    return '--';
  }

  const player = game.currentPlayer();

  if(session.gameKey === 'shanghai'){
    const target = typeof game.getCurrentTarget === 'function'
      ? game.getCurrentTarget()
      : game.round;
    return String(target);
  }

  if(session.gameKey === 'cricket'){
    if(game.allowSlop){
      return 'N/A';
    }
    const targets = [20,19,18,17,16,15,'BULL'];
    const nextOpen = targets.find((target) => (player.meta.hits?.[target] || 0) < 3);
    if(nextOpen !== undefined){
      return String(nextOpen);
    }
    return 'BULL';
  }

  return '--';
}

function capturePlayerStats(){
  if(!game){
    return [];
  }
  return game.players.map((player) => ({
    name: player.name,
    score: player.score || 0,
    meta: structuredClone(player.meta || {}),
    stats: structuredClone(player.stats || {throws: 0, doubles: 0, triples: 0, bulls: 0, totalScored: 0})
  }));
}

async function persistActiveSnapshot(){
  if(!game || !session){
    return;
  }

  await storage.saveGameSnapshot({
    id: session.id,
    game: session.gameKey,
    gameLabel: session.gameLabel,
    startedAt: session.startedAt,
    gameOptions: structuredClone(session.gameOptions || {}),
    players: capturePlayerStats(),
    throws: structuredClone(session.throws),
    finished: game.finished,
    round: game.round || null,
    maxRound: game.maxRound,
    currentPlayerIndex: game.currentPlayerIndex,
    throwsThisTurn: game.throwsThisTurn,
    turnSegments: structuredClone(game.turnSegments || null),
    tiebreakMode: Boolean(game.tiebreakMode),
    tiebreakRound: game.tiebreakRound || 0,
    tiebreakTarget: game.tiebreakTarget || null,
    tiebreakReason: game.tiebreakReason || null,
    tiebreakPlayerIds: (game.tiebreakPlayers || []).map((player) => player.id),
    tiebreakScores: Array.from(game.tiebreakScores?.entries?.() || []),
    tieBreakerHistory: structuredClone(game.tieBreakerHistory || null)
  });
}

async function finalizeGame(result){
  const winners = result.winners ? result.winners.map((player) => player.name) : (result.winner ? [result.winner.name] : []);
  const shanghaiFinishRound = session.gameKey === 'shanghai'
    ? Number(result.shanghaiFinishRound || getShanghaiFinishRound({ notes: result.message || '' }) || 0) || null
    : null;
  const tieBreakerSummary = session.gameKey === 'shanghai' ? structuredClone(game.tieBreakerHistory || null) : null;
  completedGameView = {
    game: {
      players: game.players.map((player) => ({
        id: player.id,
        name: player.name,
        score: player.score || 0,
        meta: structuredClone(player.meta || {}),
        stats: structuredClone(player.stats || {throws: 0, doubles: 0, triples: 0, bulls: 0, totalScored: 0})
      })),
      currentPlayerIndex: game.currentPlayerIndex,
      round: game.round || null,
      maxRound: game.maxRound,
      tiebreakMode: Boolean(game.tiebreakMode),
      tiebreakRound: game.tiebreakRound || 0,
      tiebreakTarget: game.tiebreakTarget || null,
      startScore: game.startScore
    },
    session: {
      gameKey: session.gameKey,
      gameLabel: session.gameLabel,
      throws: structuredClone(session.throws)
    },
    winner: winners[0] || 'Tie',
    shanghaiFinishRound,
    tieBreakerSummary
  };
  const record = {
    id: `${Date.now()}`,
    game: session.gameKey,
    gameLabel: session.gameLabel,
    startedAt: session.startedAt,
    finishedAt: Date.now(),
    players: capturePlayerStats(),
    throws: structuredClone(session.throws),
    winners,
    winner: winners[0] || 'Tie',
    notes: result.message || '',
    scoringEnabled: game.pointsEnabled !== false,
    shanghaiFinishRound,
    tieBreakerSummary
  };
  await storage.saveHistory(record);
  await storage.deleteGameSnapshot(session.id);
  historyCache = await storage.listHistory();
  await refreshResumeList();
  // Show winner celebration modal only for single winner
  if (winners.length === 1 && winners[0]) {
    createWinnerCelebrationModal({
      winnerName: winners[0]
    });
  }
  session = null;
  game = null;
  closeScoringOverlay();
  clearPendingSelections();
  updateHUD(result.message || 'Game finished');
}

function addThrowStats(player, hit){
  if(!player.stats){
    player.stats = {throws: 0, doubles: 0, triples: 0, bulls: 0, totalScored: 0};
  }
  player.stats.throws += 1;
  // Joe testing - totalScored should only be updated for games that keep score
  player.stats.totalScored += hit.score;
  if(hit.multiplier === 2){
    player.stats.doubles += 1;
  }
  if(hit.multiplier === 3){
    player.stats.triples += 1;
  }
  if(hit.target === 'BULL'){
    player.stats.bulls += 1;
  }
}

function onSegmentClick(event){
  if(!game || !session){
    showMessage('Start a game first.', 'No Active Game', 'warning');
    return;
  }

  const remaining = remainingSelectionsForTurn();
  if(remaining <= 0){
    return;
  }

  const hit = parseHit(event.currentTarget);
  addPendingSelection({event, hit});
}

async function confirmPendingThrow(){
  if(!game || !session || pendingSelections.length === 0){
    return;
  }

  if(remainingSelectionsForTurn() !== 0){
    return;
  }

  const queuedSelections = [...pendingSelections];
  clearPendingSelections();

  for(const [index, selection] of queuedSelections.entries()){
    const activePlayer = game.currentPlayer();
    if(activePlayer.id !== selection.playerId){
      appendLog(`Skipped ${queuedSelections.length - index} queued throw(s) because the turn ended early.`);
      break;
    }

    const hit = selection.hit;
    addThrowStats(activePlayer, hit);
    const throwNumber = game.throwsThisTurn + 1;
    const scoreBefore = activePlayer.score ?? 0;

    const result = game.onThrow({
      playerId: activePlayer.id,
      target: hit.target,
      multiplier: hit.multiplier,
      score: hit.score,
      isDouble: hit.isDouble
    });

    const awardedScore = typeof game.getAwardedScoreForThrow === 'function'
      ? game.getAwardedScoreForThrow({
        hit,
        player: activePlayer,
        result,
        scoreBefore
      })
      : hit.score;
    const throwMeta = typeof game.getThrowRecordMeta === 'function'
      ? game.getThrowRecordMeta({
        hit,
        player: activePlayer,
        result,
        throwNumber
      })
      : { round: game.round || null };

    if(session.gameKey === 'shanghai' && (result.shanghaiFinishRound || result.message?.includes('wins with a Shanghai'))){
      activePlayer.meta.shanghaiWins = (activePlayer.meta.shanghaiWins || 0) + 1;
    }

    session.throws.push({
      at: Date.now(),
      playerId: activePlayer.id,
      playerName: activePlayer.name,
      target: hit.target,
      ring: hit.ring,
      multiplier: hit.multiplier,
      score: hit.score,
      awardedScore,
      turnReset: Boolean(result.turnReset),
      turnResetReason: result.turnResetReason || null,
      throwNumber,
      round: throwMeta.round || null,
      shanghaiTarget: throwMeta.shanghaiTarget || null,
      message: result.message || '',
      ...throwMeta
    });

    if(result.turnResetReason === 'double-out-required'){
      showMessage(result.message || 'Double out required. Score stays the same.', 'Double Out Required', 'info');
    }

    appendLog(`${activePlayer.name} hit ${hit.target} ${hit.ring} for ${hit.score}. ${result.message || ''}`.trim());

    game.incrementRound();
    
    if(result.finished){
      await persistActiveSnapshot();
      await finalizeGame(result);
      return;
    }
  }

  await persistActiveSnapshot();
  updateHUD('Turn confirmed and applied.');
  closeScoringOverlay();
}

function resetSessionUI(){
  historyDetail.innerHTML = '<div class="text-muted">Select a finished game to inspect players and throws.</div>';
  clearPendingSelections();
}

function getFilteredHistoryRecords(){
  const filterValue = (historyPlayerFilterInput?.value || '').trim().toLowerCase();
  return historyCache.filter((record) => {
    if(!filterValue){
      return true;
    }
    return (record.players || []).some((player) => (player.name || '').toLowerCase().includes(filterValue));
  });
}

function updateHistoryViewToggle(showingHistory){
  historyList.hidden = !showingHistory;
  historyDetail.hidden = !showingHistory;
  historyStatsEl.hidden = showingHistory;

  historyViewHistoryBtn.classList.toggle('btn-primary', showingHistory);
  historyViewHistoryBtn.classList.toggle('btn-outline-primary', !showingHistory);
  historyViewHistoryBtn.setAttribute('aria-pressed', String(showingHistory));
  historyViewStatsBtn.classList.toggle('btn-primary', !showingHistory);
  historyViewStatsBtn.classList.toggle('btn-outline-primary', showingHistory);
  historyViewStatsBtn.setAttribute('aria-pressed', String(!showingHistory));
}

async function startGame(){
  const players = [...gamePlayers];

  const duplicates = findDuplicatePlayerNames(players);
  if(duplicates.length > 0){
    showMessage(`Player names must be unique. Duplicate name(s): ${duplicates.join(', ')}`, 'Duplicate Players', 'error');
    return;
  }

  if(players.length === 0){
    showMessage('Select existing players and/or enter at least one new player name.', 'Missing Players', 'warning');
    return;
  }

  const mergedKnownUsers = uniquePlayerNames([...knownUsers, ...players]);
  await saveKnownUsers(mergedKnownUsers);
  renderKnownUsers([]);
  // Do not clear gamePlayers here so players persist for next game
  renderAddedPlayersTable();

  const definition = GAME_REGISTRY[gameSelect.value];
  completedGameView = null;
  sessionWasResumed = false;
  game = definition.create(players, getSelectedGameOptions());
  lastGameSetup = { players, gameKey: gameSelect.value, options: getSelectedGameOptions() };
  game.players.forEach((player) => {
    player.stats = {throws: 0, doubles: 0, triples: 0, bulls: 0, totalScored: 0};
    player.meta.shanghaiWins = 0;
  });
  session = {
    id: `${Date.now()}`,
    gameKey: definition.key,
    gameLabel: definition.label,
    startedAt: Date.now(),
    throws: [],
    gameOptions: getSelectedGameOptions()
  };

  resetSessionUI();
  showGameScreen();
  appendLog(`Started ${definition.label} with ${players.join(', ')}`);
  updateHUD(`Started ${definition.label}`);
  persistActiveSnapshot();
}

function restartGame(){
  if(!lastGameSetup){
    return;
  }
  const { players, gameKey, options } = lastGameSetup;
  const definition = GAME_REGISTRY[gameKey];
  if(!definition){
    return;
  }
  closeScoringOverlay();
  clearPendingSelections();
  completedGameView = null;
  sessionWasResumed = false;
  const reuseId = (session && !game?.finished) ? session.id : null;
  game = definition.create(players, options);
  game.players.forEach((player) => {
    player.stats = {throws: 0, doubles: 0, triples: 0, bulls: 0, totalScored: 0};
    player.meta.shanghaiWins = 0;
  });
  session = {
    id: reuseId ?? `${Date.now()}`,
    gameKey: definition.key,
    gameLabel: definition.label,
    startedAt: Date.now(),
    throws: [],
    gameOptions: options
  };
  resetSessionUI();
  showGameScreen();
  appendLog(`Restarted ${definition.label} with ${players.join(', ')}`);
  updateHUD(`Restarted ${definition.label}`);
  persistActiveSnapshot();
}

function renderHistoryList(){
  const filteredHistory = getFilteredHistoryRecords();

  const summary = summarizeHistory(filteredHistory);
  historyStatsEl.innerHTML = formatSummaryHtml(summary);

  const showingHistory = historyViewMode === 'history';
  updateHistoryViewToggle(showingHistory);

  if(!showingHistory){
    historyList.innerHTML = '';
    historyDetail.innerHTML = '';
    return;
  }

  historyList.innerHTML = '';
  historyDetail.innerHTML = '';

  const sorted = [...filteredHistory].sort((left, right) => right.finishedAt - left.finishedAt);
  for(const record of sorted){
    const item = document.createElement('li');
    item.className = 'list-group-item history-entry';
    const row = document.createElement('div');
    row.className = 'd-flex justify-content-between align-items-start gap-3';

    const label = document.createElement('div');
    const players = (record.players || []).map((player) => player.name).join(', ');
    const shanghaiFinishRound = getShanghaiFinishRound(record);
    const winnerLabel = record.winners?.length > 1
      ? `Winners: ${record.winners.join(', ')}`
      : `Winner: ${record.winner}`;
    const winnerFlair = shanghaiFinishRound
      ? ` <span class="shanghai-finish-badge">SHANGHAI FINISH • ${shanghaiFinishRound}</span>`
      : '';
    label.innerHTML = `
      <div><strong>${escapeHtml(record.gameLabel || record.game)}</strong> • ${new Date(record.finishedAt).toLocaleString()}</div>
      <div class="text-muted small">${escapeHtml(winnerLabel)}${winnerFlair} • Players: ${escapeHtml(players)}</div>
    `;

    // View button
    const viewBtn = document.createElement('button');
    viewBtn.className = 'btn btn-outline-secondary btn-sm flex-shrink-0';
    viewBtn.textContent = 'View';
    viewBtn.setAttribute('aria-expanded', 'false');

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-outline-danger btn-sm flex-shrink-0 ms-2';
    deleteBtn.textContent = 'Delete';

    const inlineDetail = document.createElement('div');
    inlineDetail.className = 'history-inline-detail';
    inlineDetail.hidden = true;

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

    deleteBtn.addEventListener('click', async () => {
      const confirmed = await showConfirm('Delete this history item? This cannot be undone.', 'Delete History');
      if (!confirmed) return;
      await storage.deleteHistory(record.id);
      // Remove from cache and re-render
      historyCache = historyCache.filter(r => r.id !== record.id);
      renderHistoryList();
    });

    const btnGroup = document.createElement('div');
    btnGroup.className = 'd-flex gap-2';
    btnGroup.append(viewBtn, deleteBtn);

    row.append(label, btnGroup);
    item.append(row, inlineDetail);
    historyList.appendChild(item);
  }

  if(sorted.length === 0){
    historyList.innerHTML = '<li class="list-group-item"><span class="text-muted">No finished games yet.</span></li>';
  }
}

async function showHistory(){
  historyCache = await storage.listHistory();
  historyViewMode = 'stats';
  if(historyPlayerFilterInput){
    historyPlayerFilterInput.value = '';
  }
  historyEl.hidden = false;
  renderHistoryList();
}

async function showSavedGames(){
  await refreshResumeList();
  savedGamesEl.hidden = false;
}

async function handleNewGameRequest(){
  if(game && session && !game.finished){
    if(sessionWasResumed){
      // Already persisted — just leave the snapshot as-is
    } else {
      const saveSnapshot = await showConfirm('Save this in-progress game before starting a new one?', 'New Game');
      if(saveSnapshot){
        await persistActiveSnapshot();
      } else {
        await storage.deleteGameSnapshot(session.id);
      }
    }
  }
  sessionWasResumed = false;

  clearPendingSelections();
  closeScoringOverlay();
  completedGameView = null;
  game = null;
  session = null;
  updateHUD('Setup a new game to begin.');
  showSetupScreen();
  await refreshResumeList();
  // Do not clear gamePlayers here so players persist for next game
}

startBtn.addEventListener('click', startGame);
if (openAddPlayersModalBtn && addPlayersModalEl) {
  openAddPlayersModalBtn.addEventListener('click', () => {
    addPlayersModalEl.hidden = false;
    document.body.style.overflow = 'hidden';
  });
}

if (addPlayersCancelBtn && addPlayersModalEl) {
  addPlayersCancelBtn.addEventListener('click', () => {
    addPlayersModalEl.hidden = true;
    document.body.style.overflow = '';
  });
}

// Prevent closing Add Players modal by pressing Escape
if (addPlayersModalEl) {
  addPlayersModalEl.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      event.preventDefault();
    }
  });
}

// --- Add Players Modal: Individual Entry Logic ---
const playerNameInput = document.getElementById('player-name-input');
const addPlayerBtn = document.getElementById('add-player-btn');
const modalAddedPlayersTable = document.getElementById('modal-added-players-table');
const modalAddedPlayersTbody = modalAddedPlayersTable ? modalAddedPlayersTable.querySelector('tbody') : null;
let modalAddedPlayers = [];

function renderModalAddedPlayers() {
  if (!modalAddedPlayersTbody) return;
  modalAddedPlayersTbody.innerHTML = '';
  modalAddedPlayers.forEach((name, idx) => {
    const tr = document.createElement('tr');
    const tdName = document.createElement('td');
    tdName.textContent = name;
    const tdRemove = document.createElement('td');
    tdRemove.className = 'text-end';
    const removeBtn = document.createElement('button');
    removeBtn.className = 'btn btn-sm btn-outline-danger';
    removeBtn.textContent = 'Remove';
    removeBtn.type = 'button';
    removeBtn.addEventListener('click', () => {
      modalAddedPlayers.splice(idx, 1);
      renderModalAddedPlayers();
    });
    tdRemove.appendChild(removeBtn);
    tr.appendChild(tdName);
    tr.appendChild(tdRemove);
    modalAddedPlayersTbody.appendChild(tr);
  });
}

if (addPlayerBtn && playerNameInput) {
  addPlayerBtn.addEventListener('click', () => {
    const name = normalizePlayerName(playerNameInput.value);
    if (!name) return;
    const nameKey = playerNameKey(name);
    const existsInModal = modalAddedPlayers.some(n => playerNameKey(n) === nameKey);
    const existsInGame = gamePlayers.some(n => playerNameKey(n) === nameKey);
    const existsInKnown = knownUsers.some(n => playerNameKey(n) === nameKey);
    if (existsInModal || existsInGame || existsInKnown) {
      showMessage(`Player "${name}" is already added or exists as a known user.`, 'Duplicate Player', 'error');
      playerNameInput.focus();
      return;
    }
    modalAddedPlayers.push(name);
    renderModalAddedPlayers();
    playerNameInput.value = '';
    playerNameInput.focus();
  });
  playerNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addPlayerBtn.click();
    }
  });
}

if (openAddPlayersModalBtn && addPlayersModalEl) {
  openAddPlayersModalBtn.addEventListener('click', () => {
    addPlayersModalEl.hidden = false;
    modalAddedPlayers = [];
    renderModalAddedPlayers();
    if (playerNameInput) playerNameInput.value = '';
    if (playerNameInput) playerNameInput.focus();
    document.body.style.overflow = 'hidden';
  });
}

if (addPlayersCancelBtn && addPlayersModalEl) {
  addPlayersCancelBtn.addEventListener('click', () => {
    addPlayersModalEl.hidden = true;
    modalAddedPlayers = [];
    renderModalAddedPlayers();
    if (playerNameInput) playerNameInput.value = '';
    document.body.style.overflow = '';
  });
}

if (addPlayersConfirmBtn && addPlayersModalEl) {
  addPlayersConfirmBtn.addEventListener('click', () => {
    // Add modalAddedPlayers to the shared gamePlayers list
    if (modalAddedPlayers.length === 0) return;
    const allPlayers = [...gamePlayers, ...modalAddedPlayers];
    const duplicates = findDuplicatePlayerNames(allPlayers);
    if (duplicates.length > 0) {
      showMessage(`Player names must be unique. Duplicate name(s): ${duplicates.join(', ')}`, 'Duplicate Players', 'info');
      return;
    }
    gamePlayers = uniquePlayerNames([...gamePlayers, ...modalAddedPlayers]);
    renderAddedPlayersTable();
    addPlayersModalEl.hidden = true;
    modalAddedPlayers = [];
    renderModalAddedPlayers();
    if (playerNameInput) playerNameInput.value = '';
    document.body.style.overflow = '';
  });
}

// Render table on load
renderAddedPlayersTable();
gameSelect.addEventListener('change', updateGameOptionsVisibility);
newGameBtn.addEventListener('click', handleNewGameRequest);
restartGameBtn.addEventListener('click', restartGame);
confirmThrowBtn.addEventListener('click', confirmPendingThrow);
cancelThrowBtn.addEventListener('click', () => {
  if(pendingSelections.length > 0){
    const removed = pendingSelections.pop();
    removed.dot?.remove();
    updatePendingControls();
  }
});
showHistoryBtn.addEventListener('click', showHistory);
showSavedGamesBtn?.addEventListener('click', showSavedGames);
themeSelectEl?.addEventListener('change', onThemeChange);
pickExistingUsersBtn?.addEventListener('click', openExistingUsersModal);
existingUsersModeAddBtn?.addEventListener('click', () => {
  setExistingUsersModalMode('add');
});
existingUsersModeManageBtn?.addEventListener('click', () => {
  setExistingUsersModalMode('manage');
});
closeExistingUsersBtn?.addEventListener('click', closeExistingUsersModal);
applyExistingUsersBtn?.addEventListener('click', applyExistingUsersSelection);
clearExistingUsersBtn?.addEventListener('click', clearExistingUsersSelection);
clearAddedUsersBtn?.addEventListener('click', clearAddedExistingUsers);
historyViewHistoryBtn.addEventListener('click', () => {
  historyViewMode = 'history';
  renderHistoryList();
});
historyViewStatsBtn.addEventListener('click', () => {
  historyViewMode = 'stats';
  renderHistoryList();
});
historyPlayerFilterInput.addEventListener('input', renderHistoryList);
closeHistory.addEventListener('click', () => {
  historyEl.hidden = true;
});
closeSavedGamesBtn?.addEventListener('click', () => {
  savedGamesEl.hidden = true;
});
existingUsersModalEl?.addEventListener('click', (event) => {
  if(event.target === existingUsersModalEl){
    closeExistingUsersModal();
  }
});
existingUsersPickerListEl?.addEventListener('click', async (event) => {
  if(existingUsersModalMode === 'add'){
    const row = event.target.closest('.existing-user-row');
    if(row){
      const clickedControl = event.target.closest('input, label, button, a, select, textarea');
      if(!clickedControl){
        const checkbox = row.querySelector('input[type="checkbox"]');
        if(checkbox){
          checkbox.checked = !checkbox.checked;
          updateExistingUsersSelectionButtons();
        }
      }
    }
  }

  const button = event.target.closest('button[data-action]');
  if(!button){
    return;
  }
  const action = button.getAttribute('data-action');
  const userName = button.getAttribute('data-user-name') || '';
  if(action === 'delete-user'){
    await deleteExistingUser(userName);
    return;
  }
  if(action === 'rename-user'){
    await renameExistingUser(userName);
  }
});
existingUsersPickerListEl?.addEventListener('change', (event) => {
  const input = event.target.closest('input[type="checkbox"]');
  if(!input){
    return;
  }
  updateExistingUsersSelectionButtons();
});
resumeListEl?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if(!button){
    return;
  }
  const action = button.getAttribute('data-action');
  const snapshotId = button.getAttribute('data-id');
  if(!snapshotId){
    return;
  }

  if(action === 'resume'){
    await resumeSnapshot(snapshotId);
    return;
  }

  if(action === 'delete'){
    await storage.deleteGameSnapshot(snapshotId);
    await refreshResumeList();
  }
});
scoreboardAreaEl.addEventListener('click', openScoringOverlay);
scoreboardAreaEl.addEventListener('keydown', (event) => {
  if(event.key === 'Enter' || event.key === ' '){
    event.preventDefault();
    openScoringOverlay();
  }
});
closeScoringOverlayBtn.addEventListener('click', closeScoringOverlay);
scoringOverlayBackdropEl.addEventListener('click', closeScoringOverlay);
messageOkBtn.addEventListener('click', closeMessage);
messageYesBtn.addEventListener('click', () => {
  messageModalController.close(true);
});
messageNoBtn.addEventListener('click', () => {
  messageModalController.close(false);
});
messageBackdrop.addEventListener('click', closeMessage);
document.addEventListener('keydown', (event) => {
  if(event.key === 'Escape' && !scoringOverlayEl.hidden){
    closeScoringOverlay();
    return;
  }
  if(event.key === 'Escape' && !historyEl.hidden){
    historyEl.hidden = true;
    return;
  }
  if(event.key === 'Escape' && savedGamesEl && !savedGamesEl.hidden){
    savedGamesEl.hidden = true;
    return;
  }
  if(event.key === 'Escape' && existingUsersModalEl && !existingUsersModalEl.hidden){
    closeExistingUsersModal();
    return;
  }
  if(event.key === 'Escape'){
    closeMessage();
  }
});

if('serviceWorker' in navigator){
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

resetSessionUI();
updateHUD();
showSetupScreen();
updateGameOptionsVisibility();
initializeTheme();
initializeKnownUsers();
refreshResumeList();
loadBoard();
