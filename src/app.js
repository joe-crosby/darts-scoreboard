import { GAME_REGISTRY } from './gameRegistry.js';
import { getShanghaiAwardedScore, getShanghaiRoundTotal } from './games/shanghaiScoring.js';
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
const playersInput = document.getElementById('players-input');
const themeSelectEl = document.getElementById('theme-select');
const pickExistingUsersBtn = document.getElementById('pick-existing-users');
const clearAddedUsersBtn = document.getElementById('clear-added-users');
const selectedExistingUsersSummaryEl = document.getElementById('selected-existing-users-summary');
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

class MessageModalController {
  constructor({ modalEl, panelEl, badgeEl, titleEl, bodyEl, okBtn, yesBtn, noBtn }) {
    this.modalEl = modalEl;
    this.panelEl = panelEl;
    this.badgeEl = badgeEl;
    this.titleEl = titleEl;
    this.bodyEl = bodyEl;
    this.okBtn = okBtn;
    this.yesBtn = yesBtn;
    this.noBtn = noBtn;
    this.pendingResolve = null;
    this.mode = 'message';
    this.promptInput = document.createElement('input');
    this.promptInput.type = 'text';
    this.promptInput.className = 'form-control mt-2';
    this.promptInput.autocomplete = 'off';
    this.promptInput.setAttribute('aria-label', 'Input value');
  }

  removePromptInput() {
    if(this.promptInput.parentElement === this.bodyEl){
      this.bodyEl.removeChild(this.promptInput);
    }
  }

  showMessage(text, title = 'Notice', type = 'info') {
    this.mode = 'message';
    this.removePromptInput();
    this.titleEl.textContent = title;
    this.bodyEl.textContent = text;
    this.panelEl.classList.remove('info', 'warning', 'error');
    this.panelEl.classList.add(type);
    this.badgeEl.innerHTML = getBadgeIconSvg(type);
    this.okBtn.hidden = false;
    this.yesBtn.hidden = true;
    this.noBtn.hidden = true;
    this.modalEl.hidden = false;
    this.okBtn.focus();
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
    });
  }

  showConfirm(text, title = 'Confirm') {
    this.mode = 'confirm';
    this.removePromptInput();
    this.titleEl.textContent = title;
    this.bodyEl.textContent = text;
    this.panelEl.classList.remove('info', 'warning', 'error');
    this.panelEl.classList.add('info');
    this.badgeEl.innerHTML = getBadgeIconSvg('confirm');
    this.okBtn.hidden = true;
    this.yesBtn.hidden = false;
    this.noBtn.hidden = false;
    this.modalEl.hidden = false;
    this.yesBtn.focus();
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
    });
  }

  showPrompt(text, title = 'Prompt', initialValue = '') {
    this.mode = 'prompt';
    this.titleEl.textContent = title;
    this.bodyEl.textContent = text;
    if(this.promptInput.parentElement !== this.bodyEl){
      this.bodyEl.appendChild(this.promptInput);
    }
    this.promptInput.value = initialValue;
    this.panelEl.classList.remove('info', 'warning', 'error');
    this.panelEl.classList.add('info');
    this.badgeEl.innerHTML = getBadgeIconSvg('confirm');
    this.okBtn.hidden = true;
    this.yesBtn.hidden = false;
    this.noBtn.hidden = false;
    this.modalEl.hidden = false;
    this.promptInput.focus();
    this.promptInput.select();
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
    });
  }

  close(result) {
    if(this.modalEl.hidden){
      return;
    }
    this.modalEl.hidden = true;
    if(this.pendingResolve){
      const resolve = this.pendingResolve;
      this.pendingResolve = null;
      if(this.mode === 'prompt'){
        resolve(result === true ? this.promptInput.value : null);
      } else {
        resolve(result);
      }
    }
    this.mode = 'message';
    this.removePromptInput();
  }
}

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
  return [...selectedExistingUsers];
}

function updateSelectedExistingUsersSummary(){
  if(!selectedExistingUsersSummaryEl){
    return;
  }
  if(selectedExistingUsers.length === 0){
    selectedExistingUsersSummaryEl.textContent = 'No existing users included.';
    if(clearAddedUsersBtn){
      clearAddedUsersBtn.disabled = true;
    }
    return;
  }
  selectedExistingUsersSummaryEl.textContent = `${selectedExistingUsers.length} included: ${selectedExistingUsers.join(', ')}`;
  if(clearAddedUsersBtn){
    clearAddedUsersBtn.disabled = false;
  }
}

function clearAddedExistingUsers(){
  selectedExistingUsers = [];
  updateSelectedExistingUsersSummary();
  renderKnownUsers(selectedExistingUsers);
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
    const wrapper = document.createElement('div');
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

  selectedExistingUsers = getCheckedExistingUsersInModal();
  if(selectedExistingUsers.length === 0){
    updateExistingUsersSelectionButtons();
    return;
  }

  selectedExistingUsers = uniquePlayerNames(selectedExistingUsers);
  updateSelectedExistingUsersSummary();
  closeExistingUsersModal();
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

  const confirmed = await showConfirm(`Delete user "${normalizedName}" from existing users?`, 'Delete User');
  if(!confirmed){
    return;
  }

  knownUsers = knownUsers.filter((name) => playerNameKey(name) !== playerNameKey(normalizedName));
  selectedExistingUsers = selectedExistingUsers.filter((name) => playerNameKey(name) !== playerNameKey(normalizedName));
  await saveKnownUsers(knownUsers);
  renderKnownUsers(selectedExistingUsers);
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
    await showMessage('Name cannot be empty.', 'Invalid Name', 'warning');
    return;
  }

  if(playerNameKey(nextName) === playerNameKey(previousName)){
    return;
  }

  const conflict = knownUsers.some((name) => playerNameKey(name) === playerNameKey(nextName));
  if(conflict){
    await showMessage(`A user named \"${nextName}\" already exists.`, 'Duplicate Name', 'warning');
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

function getBadgeForType(type){
  if(type === 'error') return 'error';
  if(type === 'warning') return 'warning';
  return 'info';
}

function getBadgeIconSvg(type){
  const iconType = getBadgeForType(type);
  if(iconType === 'warning'){
    return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.71c.889 0 1.438-.99.98-1.767z"/><path fill="currentColor" d="M8 5c.535 0 .954.462.9.995l-.35 3.507a.55.55 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2"/></svg>';
  }
  if(iconType === 'error'){
    return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M11.46.146a.5.5 0 0 1 .353.146l4.894 4.894a.5.5 0 0 1 .146.353v4.922a.5.5 0 0 1-.146.353l-4.894 4.894a.5.5 0 0 1-.353.146H5.538a.5.5 0 0 1-.353-.146L.292 10.814a.5.5 0 0 1-.146-.353V5.54a.5.5 0 0 1 .146-.353L5.185.292a.5.5 0 0 1 .353-.146z"/><path fill="#fff" d="M4.646 4.646a.5.5 0 0 0 0 .708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646a.5.5 0 0 0-.708 0"/></svg>';
  }
  if(type === 'confirm'){
    return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0"/><path fill="#fff" d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286z"/><path fill="#fff" d="M7.991 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/></svg>';
  }
  return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0"/><path fill="#fff" d="m8.93 6.588-2.29.287-.082.38.451.082c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533z"/><circle cx="8" cy="4.5" r="1" fill="#fff"/></svg>';
}

function showMessage(text, title = 'Notice', type = 'info'){
  return messageModalController.showMessage(text, title, type);
}

function showConfirm(text, title = 'Confirm'){
  return messageModalController.showConfirm(text, title);
}

function showPrompt(text, title = 'Prompt', initialValue = ''){
  return messageModalController.showPrompt(text, title, initialValue);
}

function closeMessage(){
  messageModalController.close();
}

function getToastEl(){
  let toastEl = document.getElementById('app-toast');
  if(toastEl){
    return toastEl;
  }
  toastEl = document.createElement('div');
  toastEl.id = 'app-toast';
  toastEl.className = 'app-toast';
  toastEl.setAttribute('role', 'status');
  toastEl.setAttribute('aria-live', 'polite');
  toastEl.hidden = true;
  document.body.appendChild(toastEl);
  return toastEl;
}

function showToast(text, durationMs = 2800){
  const toastEl = getToastEl();
  toastEl.textContent = text;
  toastEl.hidden = false;
  requestAnimationFrame(() => {
    toastEl.classList.add('show');
  });
  if(toastHideTimer){
    clearTimeout(toastHideTimer);
  }
  toastHideTimer = setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => {
      if(!toastEl.classList.contains('show')){
        toastEl.hidden = true;
      }
    }, 180);
  }, durationMs);
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
  header.hidden = false;
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

function buildSessionStats(){
  if(!session){
    return '<div class="text-muted">No active session.</div>';
  }

  const throwCount = session.throws.length;
  const rounds = game?.round ? `Round ${game.round}` : 'No round state';
  return `
    <div><strong>Total throws:</strong> ${throwCount}</div>
    <div><strong>Game:</strong> ${session.gameLabel}</div>
    <div><strong>State:</strong> ${rounds}</div>
  `;
}

function renderScoreboard(){
  const displayedState = getDisplayedGameState();
  if(!displayedState){
    scoreboardEl.innerHTML = '<div class="text-muted p-2">Start a game to see scores.</div>';
    syncScoreboardState();
    return;
  }

  const { game: activeBoardGame, session: activeBoardSession, isCompleted } = displayedState;
  const descriptor = GAME_REGISTRY[activeBoardSession.gameKey];

  const splitPlayers = () => {
    const splitIndex = Math.ceil(activeBoardGame.players.length / 2);
    const leftPlayers = activeBoardGame.players.slice(0, splitIndex);
    const rightPlayers = activeBoardGame.players.slice(splitIndex);
    const pad = (players, size) => {
      const padded = [...players];
      while(padded.length < size){
        padded.push(null);
      }
      return padded;
    };
    const columnSize = Math.max(leftPlayers.length, rightPlayers.length);
    return {
      left: pad(leftPlayers, columnSize),
      right: pad(rightPlayers, columnSize)
    };
  };

  const renderBoard = ({centerHeader, rowLabels, cellFor, footerLabel, footerFor, hideRowLabels = false, noFooter = false, compactRows = false}) => {
    const { left, right } = splitPlayers();
    const tableClass = compactRows ? 'dart-board-table compact-rows' : 'dart-board-table';
    let html = `<div class="dart-board"><table class="${tableClass}">`;

    html += '<thead><tr>';
    left.forEach((player) => {
      if(player){
        const activeClass = !isCompleted && player.id === activeBoardGame.currentPlayerIndex ? ' active-player-header' : '';
        html += `<th class="board-player-col${activeClass}">${player.name}</th>`;
      } else {
        html += '<th class="board-player-col board-spacer-col"></th>';
      }
    });
    html += `<th class="board-center-col">${centerHeader}</th>`;
    right.forEach((player) => {
      if(player){
        const activeClass = !isCompleted && player.id === activeBoardGame.currentPlayerIndex ? ' active-player-header' : '';
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
        const activeClass = !isCompleted && player.id === activeBoardGame.currentPlayerIndex ? ' active-player-cell' : '';
        html += `<td class="board-player-cell${activeClass}">${cellFor(player, rowIndex, label)}</td>`;
      });
      const rowLabel = hideRowLabels ? '&nbsp;' : label;
      html += `<td class="board-center-col board-row-label">${rowLabel}</td>`;
      right.forEach((player) => {
        if(!player){
          html += '<td class="board-player-cell board-spacer-col"></td>';
          return;
        }
        const activeClass = !isCompleted && player.id === activeBoardGame.currentPlayerIndex ? ' active-player-cell' : '';
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
  };

  const markForState = (state, hits) => {
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
  };

  const renderCricketCell = (player, target) => {
    const hits = Math.min(3, player.meta.hits?.[target] || 0);
    const state = player.meta.markState?.[target] || 'empty';
    return `<div class="board-cell-inner cricket-cell-inner">${markForState(state, hits)}</div>`;
  };

  const buildCountDownTurns = () => {
    const startScore = activeBoardGame.startScore || Number.parseInt(activeBoardSession.gameKey, 10) || 0;
    const turnsByPlayer = new Map(activeBoardGame.players.map((player) => [player.id, []]));
    const remainingByPlayer = new Map(activeBoardGame.players.map((player) => [player.id, startScore]));
    let currentTurn = null;

    const pushTurn = () => {
      if(!currentTurn){
        return;
      }
      turnsByPlayer.get(currentTurn.playerId).push(currentTurn);
      currentTurn = null;
    };

    for(const throwRecord of activeBoardSession.throws){
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
    return turnsByPlayer;
  };

  const renderCountDownCell = (turn) => {
    if(!turn){
      return '<div class="board-cell-inner"></div>';
    }
    if(turn.initial){
      return `<div class="board-cell-inner turn-cell-inner"><div class="turn-values"><span class="turn-value">${turn.start}</span></div></div>`;
    }
    const valuesHtml = `
      <span class="turn-value crossed-out-value">${turn.start}</span>
      <span class="turn-value">${turn.end}</span>
    `;
    const bustHtml = turn.bust ? '<div class="turn-badge">BUST</div>' : '';
    return `
      <div class="board-cell-inner turn-cell-inner">
        <div class="turn-values">${valuesHtml}</div>
        ${bustHtml}
      </div>
    `;
  };

  const buildShanghaiRounds = () => {
    const roundsByPlayer = new Map(activeBoardGame.players.map((player) => [player.id, new Map()]));
    for(const throwRecord of activeBoardSession.throws){
      const roundKey = throwRecord.round || 1;
      const playerRounds = roundsByPlayer.get(throwRecord.playerId);
      if(!playerRounds.has(roundKey)){
        playerRounds.set(roundKey, []);
      }
      playerRounds.get(roundKey).push(throwRecord);
    }
    return roundsByPlayer;
  };

  if(activeBoardSession.gameKey === 'cricket'){
    const targets = [20, 19, 18, 17, 16, 15, 'BULL'];
    scoreboardEl.innerHTML = renderBoard({
      centerHeader: descriptor.label,
      rowLabels: targets,
      cellFor: (player, _rowIndex, target) => renderCricketCell(player, target),
      footerLabel: 'Pts',
      footerFor: (player) => `<div class="board-footer-value">${player.score || 0}</div>`
    });
    syncScoreboardState();
    return;
  }

  if(activeBoardSession.gameKey === 'shanghai'){
    const roundsByPlayer = buildShanghaiRounds();
    const configuredRounds = Number(activeBoardGame.maxRound || 20);
    const isLiveTieBreaker = !isCompleted && Boolean(activeBoardGame.tiebreakMode);
    const tieBreakerTarget = Number(activeBoardGame.tiebreakTarget || 1);
    const tieBreakerRound = Number(activeBoardGame.tiebreakRound || 1);
    const rowLabels = isLiveTieBreaker
      ? [tieBreakerTarget]
      : Array.from({ length: configuredRounds }, (_, index) => index + 1);
    scoreboardEl.innerHTML = renderBoard({
      centerHeader: isLiveTieBreaker ? `${descriptor.label} • Tiebreak` : descriptor.label,
      rowLabels,
      cellFor: (player, _rowIndex, roundLabel) => {
        const entries = isLiveTieBreaker
          ? activeBoardSession.throws.filter((entry) => (
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
    syncScoreboardState();
    return;
  }

  const startScore = activeBoardGame.startScore || Number.parseInt(activeBoardSession.gameKey, 10) || 0;
  const turnsByPlayer = buildCountDownTurns();

  const buildPlayerStack = (player) => {
    const turns = turnsByPlayer.get(player.id) || [];
    const items = [{ type: 'score', value: startScore }];
    for(const turn of turns){
      items.push(turn.bust ? { type: 'bust' } : { type: 'score', value: turn.end });
    }
    let lastScoreIdx = -1;
    for(let i = items.length - 1; i >= 0; i--){
      if(items[i].type === 'score'){ lastScoreIdx = i; break; }
    }
    const stackHtml = items.map((item, i) => {
      if(item.type === 'bust') return '<div class="turn-badge">BUST</div>';
      const crossed = i < lastScoreIdx ? ' crossed-out-value' : '';
      return `<div class="turn-value${crossed}">${item.value}</div>`;
    }).join('');
    return `<div class="board-cell-inner countdown-cell"><div class="countdown-stack">${stackHtml}</div></div>`;
  };

  scoreboardEl.innerHTML = renderBoard({
    centerHeader: descriptor.label,
    rowLabels: [''],
    cellFor: (player) => buildPlayerStack(player),
    hideRowLabels: true,
    noFooter: true
  });
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

function getShanghaiFinishRound(record){
  if(record?.shanghaiFinishRound){
    return Number(record.shanghaiFinishRound) || null;
  }
  const message = record?.notes || '';
  const match = /wins with a shanghai on\s+(\d+)/i.exec(message);
  return match ? Number(match[1]) : null;
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
    ? getShanghaiFinishRound({ notes: result.message || '' })
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
    const roundAtThrow = game.round || null;
    const shanghaiTargetAtThrow = session.gameKey === 'shanghai' && typeof game.getCurrentTarget === 'function'
      ? game.getCurrentTarget()
      : roundAtThrow;
    const shanghaiRoundForRecord = session.gameKey === 'shanghai' && typeof game.getRoundForRecord === 'function'
      ? game.getRoundForRecord()
      : roundAtThrow;
    const tieBreakerMeta = session.gameKey === 'shanghai' && typeof game.getTieBreakerThrowMeta === 'function'
      ? game.getTieBreakerThrowMeta()
      : null;
    const scoreBefore = activePlayer.score ?? 0;

    const result = game.onThrow({
      playerId: activePlayer.id,
      target: hit.target,
      multiplier: hit.multiplier,
      score: hit.score,
      isDouble: hit.isDouble
    });

    // awardedScore = points actually added (or removed in x01) from a player's visible total.
    // For x01 and cricket, use score deltas so bust/blocked throws contribute 0.
    // For Shanghai, use the round-specific awarded score.
    let awardedScore;
    if(session.gameKey === 'shanghai'){
      awardedScore = getShanghaiAwardedScore(
        shanghaiTargetAtThrow,
        hit.target,
        hit.multiplier,
        hit.score,
        game.scoringMode
      );
    } else if(session.gameKey === 'cricket'){
      awardedScore = Math.max(0, (activePlayer.score ?? 0) - scoreBefore);
    } else if(session.gameKey === '501' || session.gameKey === '301'){
      awardedScore = Math.max(0, scoreBefore - (activePlayer.score ?? 0));
    } else {
      awardedScore = hit.score;
    }

    if(session.gameKey === 'shanghai' && result.message?.includes('wins with a Shanghai')){
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
      round: session.gameKey === 'shanghai' ? shanghaiRoundForRecord : roundAtThrow,
      shanghaiTarget: session.gameKey === 'shanghai' ? shanghaiTargetAtThrow : null,
      message: result.message || '',
      ...(tieBreakerMeta || {})
    });

    if(result.turnResetReason === 'double-out-required'){
      showToast(result.message || 'Double out required. Score stays the same.');
    }

    appendLog(`${activePlayer.name} hit ${hit.target} ${hit.ring} for ${hit.score}. ${result.message || ''}`.trim());

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

function escapeHtml(value){
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getVisitKey(visit){
  return `${visit.playerName}::${visit.visitNumber}`;
}

function getMatchStateForVisit(record, visit, stateByVisit){
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
    const totalThrows = playerThrows.length;
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

function renderHistoryDetailHtml(record){
  const visitData = buildVisitOrder(record);
  const playerRows = buildPlayerPerformanceRows(record, visitData);
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

  const visitRows = roundOrderVisits.map((visit) => {
    const matchState = getMatchStateForVisit(record, visit, stateByVisit);
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

  return `
    <div class="history-detail-card card card-body mt-3">
      <div><strong>${escapeHtml(record.gameLabel || record.game)}</strong></div>
      <div class="text-muted small mb-2">Started ${new Date(record.startedAt).toLocaleString()} • Finished ${new Date(record.finishedAt).toLocaleString()}</div>
      <div class="mb-3"><strong>${escapeHtml(winnerLabel)}</strong>${winnerFlair}</div>
      <h3 class="h6">Performance Snapshot</h3>
      <div class="table-responsive mb-3">
        <table class="table table-sm table-striped">
          <thead>
            <tr><th>Player</th><th>Score</th><th>1st 3 %</th><th>1st 9 %</th><th>Best Round</th><th>D</th><th>T</th><th>Bull</th></tr>
          </thead>
          <tbody>${playerRows || '<tr><td colspan="8">No player stats yet.</td></tr>'}</tbody>
        </table>
      </div>
      <h3 class="h6">Round Order (Actual Throw Sequence)</h3>
      <div class="table-responsive mb-3">
        <table class="table table-sm table-hover">
          <thead>
            <tr><th>Round</th><th>Player</th><th>Player Round</th><th>Darts (Thrown Order)</th><th>Round Score</th><th>Match State</th></tr>
          </thead>
          <tbody>${visitRows || '<tr><td colspan="6">No rounds recorded.</td></tr>'}</tbody>
        </table>
      </div>
      ${tieBreakerSummary ? `
        <h3 class="h6">Tie-Breaker Data</h3>
        <div class="text-muted small mb-2">${escapeHtml(tieBreakerReasonLabel)} • Start Target ${Number(tieBreakerSummary.startingTarget || 0)} • Winner ${escapeHtml(tieBreakerSummary.winner || record.winner || 'N/A')}</div>
        <div class="table-responsive mb-3">
          <table class="table table-sm table-striped">
            <thead>
              <tr><th>TB Round</th><th>Target</th><th>Leaders</th><th>High Score</th><th>Per-Player Score</th></tr>
            </thead>
            <tbody>${tieBreakerRows || '<tr><td colspan="5">No tie-break rounds recorded.</td></tr>'}</tbody>
          </table>
        </div>
      ` : ''}
    </div>
  `;
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
  const selectedExistingUsersList = getSelectedExistingUsers();
  const newUsers = parsePlayerNames(playersInput.value);
  const players = [...selectedExistingUsersList, ...newUsers];

  const duplicates = findDuplicatePlayerNames(players);
  if(duplicates.length > 0){
    showMessage(`Player names must be unique. Duplicate name(s): ${duplicates.join(', ')}`, 'Duplicate Players', 'warning');
    return;
  }

  if(players.length === 0){
    showMessage('Select existing players and/or enter at least one new player name.', 'Missing Players', 'warning');
    return;
  }

  const mergedKnownUsers = uniquePlayerNames([...knownUsers, ...players]);
  await saveKnownUsers(mergedKnownUsers);
  renderKnownUsers(selectedExistingUsers);
  playersInput.value = '';

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

    const button = document.createElement('button');
    button.className = 'btn btn-outline-secondary btn-sm flex-shrink-0';
    button.textContent = 'View';
    button.setAttribute('aria-expanded', 'false');

    const inlineDetail = document.createElement('div');
    inlineDetail.className = 'history-inline-detail';
    inlineDetail.hidden = true;

    button.addEventListener('click', () => {
      const isOpen = !inlineDetail.hidden;
      inlineDetail.hidden = isOpen;
      button.textContent = isOpen ? 'View' : 'Hide';
      button.setAttribute('aria-expanded', String(!isOpen));
      if(!isOpen && !inlineDetail.dataset.rendered){
        inlineDetail.innerHTML = renderHistoryDetailHtml(record);
        inlineDetail.dataset.rendered = '1';
      }
    });

    row.append(label, button);
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
}

startBtn.addEventListener('click', startGame);
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
