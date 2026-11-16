import '@fontsource/jersey-10/latin-400.css';
import './styles/ui.css';
import { startGame } from './game';

const gameParent = document.getElementById('game');
const uiRoot = document.getElementById('ui');
if (!gameParent || !uiRoot) {
  throw new Error('Faltan los contenedores #game y #ui en index.html.');
}

try {
  startGame(gameParent, uiRoot);
} catch (error) {
  console.error(error);
  const message = document.createElement('p');
  message.className = 'fatal';
  message.setAttribute('role', 'alert');
  message.textContent = 'El juego no ha podido iniciarse. Recarga la página para reintentarlo.';
  uiRoot.replaceChildren(message);
}
