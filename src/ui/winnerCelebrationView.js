// Winner Celebration View using Bootstrap modal
export function createWinnerCelebrationModal({ winnerName }) {
  // Set the winner message
  const body = document.getElementById('winner-modal-body');
  if (body) {
    body.innerHTML = '';
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
  }
  // Show the modal using Bootstrap's JS API
  const modalEl = document.getElementById('winner-modal');
  if (modalEl && window.bootstrap) {
    const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
  }
}
