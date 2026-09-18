import { createApp } from './ui/app.js';

const fatal = document.getElementById('fatal');

function showFatal(message) {
  fatal.hidden = false;
  fatal.textContent = message;
}

/** True when the browser can give us a WebGL 2 context, which three.js requires. */
function webglAvailable() {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

if (!webglAvailable()) {
  showFatal('This application needs WebGL 2, which this browser or device does not provide.');
} else {
  try {
    createApp();
  } catch (error) {
    console.error(error);
    showFatal(`The simulation could not start: ${error.message}`);
  }
}
