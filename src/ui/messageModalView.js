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
    return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.71c.889 0 1.438-.99.98-1.767z"/><path fill="currentColor" d="M8 5c.535 0 .954.462.9.995l-.35 3.507a.55.55 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 0 0 2 1 1 0 0 0 0-2"/></svg>';
  }
  if (iconType === 'error') {
    return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M11.46.146a.5.5 0 0 1 .353.146l4.894 4.894a.5.5 0 0 1 .146.353v4.922a.5.5 0 0 1-.146.353l-4.894 4.894a.5.5 0 0 1-.353.146H5.538a.5.5 0 0 1-.353-.146L.292 10.814a.5.5 0 0 1-.146-.353V5.54a.5.5 0 0 1 .146-.353L5.185.292a.5.5 0 0 1 .353-.146z"/><path fill="#fff" d="M4.646 4.646a.5.5 0 0 0 0 .708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646a.5.5 0 0 0-.708 0"/></svg>';
  }
  if (type === 'confirm') {
    return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0"/><path fill="#fff" d="M5.255 5.786a.237.237 0 0 0 .241.247h.825c.138 0 .248-.113.266-.25.09-.656.54-1.134 1.342-1.134.686 0 1.314.343 1.314 1.168 0 .635-.374.927-.965 1.371-.673.489-1.206 1.06-1.168 1.987l.003.217a.25.25 0 0 0 .25.246h.811a.25.25 0 0 0 .25-.25v-.105c0-.718.273-.927 1.01-1.486.609-.463 1.244-.977 1.244-2.056 0-1.511-1.276-2.241-2.673-2.241-1.267 0-2.655.59-2.75 2.286z"/><path fill="#fff" d="M7.991 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/></svg>';
  }
  return '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0"/><path fill="#fff" d="m8.93 6.588-2.29.287-.082.38.451.082c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533z"/><circle cx="8" cy="4.5" r="1" fill="#fff"/></svg>';
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
