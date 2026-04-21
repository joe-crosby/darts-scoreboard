// Winner Celebration View
// This module provides a reusable, theme-friendly modal for celebrating a game win.
// It uses only generic classes (e.g., .modal, .table, .btn) and no custom CSS per id.

export function createWinnerCelebrationModal({ winnerName }) {
  // Create modal container
  const modal = document.createElement('div');
  modal.className = 'modal fade show';
  modal.tabIndex = -1;
  modal.style.display = 'block';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  // Modal dialog
  const dialog = document.createElement('div');
  dialog.className = 'modal-dialog modal-dialog-centered';

  // Modal content
  const content = document.createElement('div');
  content.className = 'modal-content text-center';

  // Modal header
  const header = document.createElement('div');
  header.className = 'modal-header border-0 justify-content-center';
  // No title in header, message will be in body

  // Modal body
  const body = document.createElement('div');
  body.className = 'modal-body';
  // Winner message with dartboard icon after, larger font
  const message = document.createElement('div');
  message.style.fontSize = '2.4em';
  message.style.fontWeight = '600';
  message.style.letterSpacing = '0.01em';
  message.style.display = 'flex';
  message.style.alignItems = 'center';
  message.style.justifyContent = 'center';
  message.innerText = `${winnerName} Wins! `;
  const dartboard = document.createElement('span');
  dartboard.style.fontSize = '1.3em';
  dartboard.style.marginLeft = '0.18em';
  dartboard.innerText = '🎯';
  message.appendChild(dartboard);
  body.appendChild(message);

  // Modal footer
  const footer = document.createElement('div');
  footer.className = 'modal-footer border-0 justify-content-center gap-2';
  // Single Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'btn btn-primary';
  closeBtn.innerText = 'Close';
  closeBtn.onclick = () => {
    close();
  };
  footer.append(closeBtn);

  // Assemble modal
  content.append(header, body, footer);
  dialog.appendChild(content);
  modal.appendChild(dialog);

  // Add to DOM
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  // Trap focus and close on Escape
  function handleKey(e) {
    if (e.key === 'Escape') {
      close();
    }
  }
  document.addEventListener('keydown', handleKey);

  // Remove modal
  function close() {
    modal.remove();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleKey);
  }

  return { close };
}
