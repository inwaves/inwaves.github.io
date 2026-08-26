import './style.css';
import { App } from './app.js';

const app = new App(document.getElementById('app'));
app.start().catch((err) => {
  console.error(err);
  const loading = document.getElementById('loading');
  loading.textContent = 'Something went wrong while loading. See the console for details.';
});
