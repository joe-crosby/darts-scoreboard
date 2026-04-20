/**
 * Message Modal Controller and UI
 * Handles showing alerts, confirmations, and prompts to the user
 */

function getBadgeForType(type) {
  if (type === 'error') return 'error';
  if (type === 'warning') return 'warning';
  return 'info';
}

function getBadgeIconSvg(type) {
  const iconType = getBadgeForType(type);
  if (iconType === 'warning') {
    return '<i class="bi bi-exclamation-triangle-fill"></i>';
  }
  if (iconType === 'error') {
    return '<i class="bi bi-x-octagon-fill"></i>';
  }
  if (type === 'confirm') {
    return '<i class="bi bi-question-circle-fill"></i>';
  }
  return '<i class="bi bi-info-circle-fill"></i>';
}

export class MessageModalController {
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
    if (this.promptInput.parentElement === this.bodyEl) {
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
    if (this.promptInput.parentElement !== this.bodyEl) {
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
    if (this.modalEl.hidden) {
      return;
    }
    this.modalEl.hidden = true;
    if (this.pendingResolve) {
      const resolve = this.pendingResolve;
      this.pendingResolve = null;
      if (this.mode === 'prompt') {
        resolve(result === true ? this.promptInput.value : null);
      } else {
        resolve(result);
      }
    }
    this.mode = 'message';
    this.removePromptInput();
  }
}

// Global modal controller instance - set by app.js
let messageModalController = null;

export function initializeMessageModal(controller) {
  messageModalController = controller;
}

export function showMessage(text, title = 'Notice', type = 'info') {
  return messageModalController.showMessage(text, title, type);
}

export function showConfirm(text, title = 'Confirm') {
  return messageModalController.showConfirm(text, title);
}

export function showPrompt(text, title = 'Prompt', initialValue = '') {
  return messageModalController.showPrompt(text, title, initialValue);
}

export function closeMessage() {
  messageModalController.close();
}
