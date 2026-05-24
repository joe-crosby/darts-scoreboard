
import { GAME_REGISTRY } from './gameRegistry.js';
import { renderScoreboardHtml } from './ui/scoreboardView.js';
import { getShanghaiFinishRound, renderHistoryDetailHtml, createHistoryEntryItem } from './ui/historyView.js';
import { renderResumeList } from './ui/savedGamesView.js';
import { MessageModalController, initializeMessageModal, showMessage, showConfirm, showPrompt, closeMessage } from './ui/messageModalView.js';
import { createWinnerCelebrationModal } from './ui/winnerCelebrationView.js';
import { escapeHtml } from './utils.js';
import * as storage from './storage.js';
import { formatSummaryHtml, summarizeHistory } from './stats.js';

function updateExistingPlayerAddRowVisibility() {
  const row = document.getElementById('existing-player-add-row');
  if (!row) return;
  row.classList.toggle('d-none', existingPlayersModalMode !== 'manage');
}

// --- Add new player directly in existing players modal ---
const existingPlayerNewNameInput = document.getElementById('existing-player-new-name');
const existingPlayerAddBtn = document.getElementById('existing-player-add-btn');

if (existingPlayerAddBtn && existingPlayerNewNameInput) {
  existingPlayerAddBtn.addEventListener('click', async () => {
    const name = normalizePlayerName(existingPlayerNewNameInput.value);
    if (!name) {
      showMessage('Name cannot be empty.', 'Invalid Name', 'error');
      existingPlayerNewNameInput.focus();
      return;
    }
    const nameKey = playerNameKey(name);
    const exists = knownPlayers.some(n => playerNameKey(n) === nameKey);
    if (exists) {
      showMessage(`Player "${name}" already exists.`, 'Duplicate Player', 'error');
      existingPlayerNewNameInput.focus();
      return;
    }
    knownPlayers.push(name);
    await saveKnownPlayers(knownPlayers);
    renderKnownPlayers();
    existingPlayerNewNameInput.value = '';
    existingPlayerNewNameInput.focus();
  });
  existingPlayerNewNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      existingPlayerAddBtn.click();
    }
  });
}

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
const pickExistingPlayersBtn = document.getElementById('pick-existing-players');
const clearAddedPlayersBtn = document.getElementById('clear-added-players');
const selectedExistingPlayersSummaryEl = document.getElementById('selected-existing-users-summary');
const addPlayersModalEl = document.getElementById('add-players-modal');
const openAddPlayersModalBtn = document.getElementById('open-add-players-modal');
const addPlayersConfirmBtn = document.getElementById('add-players-confirm');
const addPlayersCancelBtn = document.getElementById('add-players-cancel');
const addedPlayersTableBody = document.querySelector('#added-players-table tbody');
const existingPlayersModalEl = document.getElementById('existing-players-modal');
const existingPlayersPickerListEl = document.getElementById('existing-players-picker-list');
const existingPlayersPickerEmptyEl = document.getElementById('existing-players-picker-empty');
const existingPlayersModeAddBtn = document.getElementById('existing-players-mode-add');
const existingPlayersModeManageBtn = document.getElementById('existing-players-mode-manage');
const clearExistingPlayersBtn = document.getElementById('clear-existing-players');
const closeExistingPlayersBtn = document.getElementById('close-existing-players');
const applyExistingPlayersBtn = document.getElementById('apply-existing-players');
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
let knownPlayers = [];
let gamePlayers = [];
// Tracks the players currently selected in the existing players modal (in selection order)
let selectedExistingPlayers = [];
let existingPlayersModalMode = 'add';
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

async function loadKnownPlayers(){  
  const players = await storage.listKnownPlayers();
  return uniquePlayerNames(players);
}

async function saveKnownPlayers(players){
  const normalized = uniquePlayerNames(players);
  knownPlayers = normalized;
  await storage.saveKnownPlayers(normalized);
}

async function initializeKnownPlayers(){
  knownPlayers = await loadKnownPlayers();
  renderKnownPlayers();
}

function getSelectedExistingPlayers(){
  // For compatibility, return the known players in the current game
  return gamePlayers.filter(name => knownPlayers.some(u => playerNameKey(u) === playerNameKey(name)));
}

function updateSelectedExistingPlayersSummary(){
  if(!selectedExistingPlayersSummaryEl){
    return;
  }
  // Show how many of the current gamePlayers are known players
  const knownInGame = gamePlayers.filter(name => knownPlayers.some(u => playerNameKey(u) === playerNameKey(name)));
  if(knownInGame.length === 0){
    selectedExistingPlayersSummaryEl.textContent = 'No existing players included.';
    if(clearAddedPlayersBtn){
      clearAddedPlayersBtn.disabled = true;
    }
    return;
  }
  selectedExistingPlayersSummaryEl.textContent = `${knownInGame.length} included: ${knownInGame.join(', ')}`;
  if(clearAddedPlayersBtn){
    clearAddedPlayersBtn.disabled = false;
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
  const template = document.getElementById('player-chip-template');
  gamePlayers.forEach((name, idx) => {
    if (!template) return;
    const chip = template.content.firstElementChild.cloneNode(true);
    chip.querySelector('.player-name').textContent = name;
    const removeBtn = chip.querySelector('.btn-remove-player');
    removeBtn.setAttribute('aria-label', `Remove ${name}`);
    removeBtn.addEventListener('click', () => {
      gamePlayers.splice(idx, 1);
      renderAddedPlayersTable();
      updateSelectedExistingPlayersSummary();
    });
    flexContainer.appendChild(chip);
  });
}

function clearAddedExistingPlayers(){
  gamePlayers = [];
  updateSelectedExistingPlayersSummary();
  renderKnownPlayers();
  renderAddedPlayersTable();
}

function updateExistingPlayersModalControls(){
  if(!existingPlayersModeAddBtn || !existingPlayersModeManageBtn){
    return;
  }
  const isAddMode = existingPlayersModalMode === 'add';
  existingPlayersModeAddBtn.classList.toggle('btn-primary', isAddMode);
  existingPlayersModeAddBtn.classList.toggle('btn-outline-primary', !isAddMode);
  existingPlayersModeAddBtn.setAttribute('aria-pressed', String(isAddMode));

  existingPlayersModeManageBtn.classList.toggle('btn-primary', !isAddMode);
  existingPlayersModeManageBtn.classList.toggle('btn-outline-primary', isAddMode);
  existingPlayersModeManageBtn.setAttribute('aria-pressed', String(!isAddMode));

  if(applyExistingPlayersBtn){
    applyExistingPlayersBtn.hidden = !isAddMode;
  }
  if(clearExistingPlayersBtn){
    clearExistingPlayersBtn.hidden = !isAddMode;
  }
}

function setExistingPlayersModalMode(mode){
  existingPlayersModalMode = mode === 'manage' ? 'manage' : 'add';
  updateExistingPlayersModalControls();
  renderKnownPlayers();
  updateExistingPlayersSelectionButtons();
  updateExistingPlayerAddRowVisibility();
}

function renderKnownPlayers(){
  if(!existingPlayersPickerListEl || !existingPlayersPickerEmptyEl || !pickExistingPlayersBtn){
    return;
  }
  // Always use empty selection for checkboxes
  const selectedKeys = new Set();
  existingPlayersPickerListEl.innerHTML = '';

  // Sort knownPlayers alphabetically (case-insensitive)
  const sortedKnownPlayers = [...knownPlayers].sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));

  if(sortedKnownPlayers.length === 0){
    existingPlayersPickerListEl.hidden = true;
    existingPlayersPickerEmptyEl.hidden = false;
    selectedExistingPlayers = [];
    updateSelectedExistingPlayersSummary();
    updateExistingPlayersSelectionButtons();
    return;
  }

  existingPlayersPickerListEl.hidden = false;
  existingPlayersPickerEmptyEl.hidden = true;

  sortedKnownPlayers.forEach((playerName, index) => {
    const wrapper = document.createElement('li');
    wrapper.className = 'existing-player-row';

    const main = document.createElement('div');
    main.className = 'existing-player-main';

    if(existingPlayersModalMode === 'add'){
      wrapper.dataset.clickable = 'true';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'form-check-input';
      checkbox.id = `existing-player-${index}`;
      checkbox.value = playerName;
      checkbox.checked = selectedKeys.has(playerNameKey(playerName));

      const label = document.createElement('label');
      label.className = 'form-check-label existing-player-name';
      label.htmlFor = checkbox.id;
      label.textContent = playerName;

      main.append(checkbox, label);
      wrapper.append(main);
    } else {
      const label = document.createElement('span');
      label.className = 'existing-player-name';
      label.textContent = playerName;

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-secondary btn-sm';
      deleteBtn.textContent = 'Delete';
      deleteBtn.setAttribute('data-action', 'delete-player');
      deleteBtn.setAttribute('data-player-name', playerName);

      const renameBtn = document.createElement('button');
      renameBtn.type = 'button';
      renameBtn.className = 'btn btn-outline-primary btn-sm';
      renameBtn.textContent = 'Rename';
      renameBtn.setAttribute('data-action', 'rename-player');
      renameBtn.setAttribute('data-player-name', playerName);

      const actions = document.createElement('div');
      actions.className = 'existing-player-actions d-flex gap-1';
      actions.append(renameBtn, deleteBtn);

      main.append(label);
      wrapper.append(main, actions);
    }

    existingPlayersPickerListEl.appendChild(wrapper);
  });

  // Do not update selectedExistingPlayers here; only update summary/buttons
  updateSelectedExistingPlayersSummary();
  updateExistingPlayersSelectionButtons();
}

function openExistingPlayersModal(){
  if(!existingPlayersModalEl){
    return;
  }
  setExistingPlayersModalMode('add');
  // Always open with no players selected
  selectedExistingPlayers = [];
  renderKnownPlayers();
  existingPlayersModalEl.hidden = false;
}

function closeExistingPlayersModal(){
  if(!existingPlayersModalEl){
    return;
  }
  existingPlayersModalEl.hidden = true;
}

function getCheckedExistingPlayersInModal(){
  if(!existingPlayersPickerListEl){
    return [];
  }
  return Array.from(existingPlayersPickerListEl.querySelectorAll('input[type="checkbox"]:checked'))
    .map((checkbox) => normalizePlayerName(checkbox.value))
    .filter(Boolean);
}

function updateExistingPlayersSelectionButtons(){
  if(existingPlayersModalMode !== 'add'){
    if(applyExistingPlayersBtn){
      applyExistingPlayersBtn.disabled = true;
    }
    if(clearExistingPlayersBtn){
      clearExistingPlayersBtn.disabled = true;
    }
    return;
  }

  const hasSelectedPlayers = getCheckedExistingPlayersInModal().length > 0;
  if(applyExistingPlayersBtn){
    applyExistingPlayersBtn.disabled = !hasSelectedPlayers;
  }
  if(clearExistingPlayersBtn){
    clearExistingPlayersBtn.disabled = !hasSelectedPlayers;
  }
}

function applyExistingPlayersSelection(){
  if(!existingPlayersPickerListEl){
    return;
  }

  // Add checked players to gamePlayers in the order selected, avoiding duplicates
  gamePlayers = uniquePlayerNames([...gamePlayers, ...selectedExistingPlayers]);
  updateSelectedExistingPlayersSummary();
  closeExistingPlayersModal();
  renderAddedPlayersTable();
}

function clearExistingPlayersSelection(){
  if(existingPlayersPickerListEl){
    existingPlayersPickerListEl.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = false;
    });
  }
  selectedExistingPlayers = [];
  updateExistingPlayersSelectionButtons();
}

async function deleteExistingPlayer(playerName){
  const normalizedName = normalizePlayerName(playerName);
  if(!normalizedName){
    return;
  }

  const confirmed = await showConfirm(
    `Delete player "${normalizedName}" from existing players?\n\nThis will also permanently delete all of their stats from game history. Game records will remain if other players participated. This cannot be undone.`,
    'Delete Player'
  );
  if(!confirmed){
    return;
  }

  // Remove player from known players
  knownPlayers = knownPlayers.filter((name) => playerNameKey(name) !== playerNameKey(normalizedName));
  selectedExistingPlayers = selectedExistingPlayers.filter((name) => playerNameKey(name) !== playerNameKey(normalizedName));
  await saveKnownPlayers(knownPlayers);
  renderKnownPlayers();


  // Remove player from all history records' players arrays
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

async function renameExistingPlayer(playerName){
  const previousName = normalizePlayerName(playerName);
  if(!previousName){
    return;
  }

  const nextNameRaw = await showPrompt('Enter a new unique player name:', 'Rename Player', previousName);
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

  const conflict = knownPlayers.some((name) => playerNameKey(name) === playerNameKey(nextName));
  if(conflict){
    await showMessage(`A player named \"${nextName}\" already exists.`, 'Duplicate Name', 'error');
    return;
  }

  knownPlayers = knownPlayers.map((name) => (
    playerNameKey(name) === playerNameKey(previousName) ? nextName : name
  ));
  selectedExistingPlayers = selectedExistingPlayers.map((name) => (
    playerNameKey(name) === playerNameKey(previousName) ? nextName : name
  ));
  await saveKnownPlayers(knownPlayers);
  renderKnownPlayers();
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
function buildGameOptionsFromSnapshot(snapshot){
  if(!snapshot.gameOptions){
    throw new Error('Snapshot missing game options.');
  }
  return snapshot.gameOptions;
}

async function refreshResumeList(){
  snapshotCache = await storage.listGames();
  renderResumeList(snapshotCache);
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

  const mergedKnownPlayers = uniquePlayerNames([...knownPlayers, ...players]);
  await saveKnownPlayers(mergedKnownPlayers);
  renderKnownPlayers();
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

  // Add click handler to stats table rows for filtering by game type AND players in the clicked row
  const statsTable = historyStatsEl.querySelector('table');
  if (statsTable) {
    statsTable.querySelectorAll('tbody tr').forEach(row => {
      row.style.cursor = 'pointer';
      row.addEventListener('click', () => {
        // Robustly extract player name from rowspan-based grouped table
        let playerName = null;
        let gameType = null;
        // If this row has a <td> with rowspan, that's the player name
        const playerCell = row.querySelector('td[rowspan]');
        if (playerCell) {
          playerName = playerCell.textContent.trim();
        } else {
          // Otherwise, find the closest previous sibling row with a player name cell
          let prev = row.previousElementSibling;
          while (prev) {
            const prevPlayerCell = prev.querySelector('td[rowspan]');
            if (prevPlayerCell) {
              playerName = prevPlayerCell.textContent.trim();
              break;
            }
            prev = prev.previousElementSibling;
          }
        }
        // Game type is always the second cell (first if no player cell)
        const cells = row.querySelectorAll('td');
        let gameCellIdx = playerCell ? 1 : 0;
        if (cells.length > gameCellIdx) {
          let rawGame = cells[gameCellIdx].textContent.trim();
          // Try to match to a known game key
          let foundKey = null;
          for (const key in GAME_REGISTRY) {
            const label = GAME_REGISTRY[key].label;
            if (rawGame === key || rawGame.startsWith(key + ' ') || rawGame === label || rawGame.startsWith(label + ' ')) {
              foundKey = key;
              break;
            }
          }
          gameType = foundKey || rawGame.split(' ')[0];
        }
        if (playerName && gameType) {
          historyPlayerFilterInput.value = '';
          historyViewMode = 'history';
          updateHistoryViewToggle(true);
          historyStatsEl.hidden = true;
          historyList.hidden = false;
          historyDetail.hidden = false;
          renderHistoryListFilteredByGameTypeAndPlayers(gameType, [playerName]);
          const first = historyList.querySelector('.history-entry');
          if (first) first.scrollIntoView({behavior: 'smooth', block: 'center'});
        }
      });
    });
  }

  // Helper: render history filtered by game type AND players
  function renderHistoryListFilteredByGameTypeAndPlayers(gameType, playerNames) {
    // Normalize player names for robust comparison
    const normalizedClickedNames = playerNames.map(n => playerNameKey(n));
    const filteredHistory = historyCache.filter(record => {
      const recordGameType = record.game || record.gameKey;
      const recordGameLabel = record.gameLabel || (GAME_REGISTRY[recordGameType]?.label) || '';
      // Match by key or label
      if (recordGameType !== gameType && recordGameLabel !== gameType) return false;
      // Support both string and object player entries, normalize all
      const recordPlayers = (record.players || []).map(p => playerNameKey(typeof p === 'string' ? p : (p && p.name ? p.name : ''))).filter(Boolean);
      return normalizedClickedNames.some(nameKey => recordPlayers.includes(nameKey));
    });
    historyList.innerHTML = '';
    historyDetail.innerHTML = '';
    if(filteredHistory.length === 0){
      historyList.innerHTML = '<li class="list-group-item"><span class="text-muted">No finished games yet.</span></li>';
      return;
    }
    const sorted = [...filteredHistory].sort((left, right) => right.finishedAt - left.finishedAt);
    for(const record of sorted){
      const item = createHistoryEntryItem(record, () => renderHistoryListFilteredByGameTypeAndPlayers(gameType, playerNames));
      if(item){
        historyList.appendChild(item);
      }
    }
  }

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
    const item = createHistoryEntryItem(record, renderHistoryList);
    if(item){
      historyList.appendChild(item);
    }
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
    const existsInKnown = knownPlayers.some(n => playerNameKey(n) === nameKey);
    if (existsInModal || existsInGame || existsInKnown) {
      showMessage(`Player "${name}" is already added or exists as a known player.`, 'Duplicate Player', 'error');
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
pickExistingPlayersBtn?.addEventListener('click', openExistingPlayersModal);
existingPlayersModeAddBtn?.addEventListener('click', () => {
  setExistingPlayersModalMode('add');
});
existingPlayersModeManageBtn?.addEventListener('click', () => {
  setExistingPlayersModalMode('manage');
});
closeExistingPlayersBtn?.addEventListener('click', closeExistingPlayersModal);
applyExistingPlayersBtn?.addEventListener('click', applyExistingPlayersSelection);
clearExistingPlayersBtn?.addEventListener('click', clearExistingPlayersSelection);
clearAddedPlayersBtn?.addEventListener('click', clearAddedExistingPlayers);
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

existingPlayersPickerListEl?.addEventListener('click', async (event) => {
  if(existingPlayersModalMode === 'add'){    
    const row = event.target.closest('.existing-player-row');
    if(row){

      let value = row.textContent;
      const checkbox = row.querySelector('input[type="checkbox"]');
      if(checkbox){
        checkbox.checked = !checkbox.checked;

        if (checkbox.checked) {
          selectedExistingPlayers.push(value);
        }
        else {
          if (selectedExistingPlayers.includes(value)) {  
            selectedExistingPlayers.remove(value);
          }
        }
        updateExistingPlayersSelectionButtons();
      }
    }
  }

  const button = event.target.closest('button[data-action]');
  if(!button){
    return;
  }
  const action = button.getAttribute('data-action');
  const playerName = button.getAttribute('data-player-name') || '';
  if(action === 'delete-player'){
    await deleteExistingPlayer(playerName);
    return;
  }
  if(action === 'rename-player'){
    await renameExistingPlayer(playerName);
  }
});
existingPlayersPickerListEl?.addEventListener('change', (event) => {
  const input = event.target.closest('input[type="checkbox"]');
  if(!input){
    return;
  }
  updateExistingPlayersSelectionButtons();
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
    // Confirm deletion
    const confirm = await showConfirm('Are you sure you want to delete this saved game? This action cannot be undone.', 'Delete Saved Game', 'warning');
    if(!confirm){
      return;
    }
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
  if(event.key === 'Escape' && existingPlayersModalEl && !existingPlayersModalEl.hidden){
    closeExistingPlayersModal();
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
initializeKnownPlayers();
refreshResumeList();
loadBoard();
