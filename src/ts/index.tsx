import { createRoot } from 'react-dom/client';
import { Game } from './Game';

window.addEventListener('DOMContentLoaded', () => {
  const rootEl = document.createElement('div');
  document.body.appendChild(rootEl);

  const root = createRoot(rootEl);
  root.render(<Game />);
});
