(function() {
  'use strict';

  // Configuration for the wave animation
  const CONFIG = {
    charWidth: 10,
    charHeight: 18,
    waveCenter: 0.5,     // Vertical center (0.5 = middle of screen)
    fps: 30,
    
    // Multiple wave components for organic motion
    // Each wave: spatial wavelength, max amplitude, oscillation speed, phase offset
    waves: [
      // Slow swells - large, slow breathing
      { wavelength: 600, amplitude: 60, speed: 0.5, phaseOffset: 0 },
      { wavelength: 400, amplitude: 45, speed: 0.7, phaseOffset: 1.2 },
      
      // Medium waves - faster breathing
      { wavelength: 200, amplitude: 30, speed: 1.1, phaseOffset: 2.5 },
      { wavelength: 120, amplitude: 20, speed: 1.5, phaseOffset: 0.8 },
      
      // Ripples - quick small oscillations
      { wavelength: 60,  amplitude: 10, speed: 2.2, phaseOffset: 1.7 },
    ],
    
    // Character density gradient (darkest to lightest)
    gradient: ['█', '▓', '▒', '░', '~', '-', '.', ' ']
  };

  const PI2 = Math.PI * 2;

  let canvas, ctx;
  let width, height;
  let cols, rows;
  let time = 0;
  let animationId;
  let overlay;

  function init() {
    overlay = document.getElementById('splash-overlay');
    canvas = document.getElementById('wave-canvas');
    
    if (!overlay || !canvas) return;

    ctx = canvas.getContext('2d');
    
    resize();
    window.addEventListener('resize', resize);
    overlay.addEventListener('click', dismiss);
    
    animate();
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);
    
    cols = Math.ceil(width / CONFIG.charWidth);
    rows = Math.ceil(height / CONFIG.charHeight);
  }

  // Calculate the wave surface Y position at a given X coordinate
  // Uses STANDING WAVE pattern: spatial shape × temporal oscillation
  // This creates "breathing" motion rather than horizontal scrolling
  function getWaveSurfaceY(x, t) {
    const baseY = height * CONFIG.waveCenter;
    let totalDisplacement = 0;
    
    for (const wave of CONFIG.waves) {
      // Wave number k = 2π / wavelength
      const k = PI2 / wave.wavelength;
      
      // SPATIAL PATTERN: sin(kx + phaseOffset) - determines wave shape
      // The phaseOffset ensures different wave components don't all peak at same x
      const spatialPattern = Math.sin(k * x + wave.phaseOffset);
      
      // TEMPORAL OSCILLATION: sin(ωt) - makes the wave breathe up and down
      // This is the key change: oscillation is separate from spatial position
      const temporalOscillation = Math.sin(t * wave.speed * 0.05);
      
      // STANDING WAVE: multiply spatial × temporal
      // The wave shape stays in place, but its amplitude pulses over time
      totalDisplacement += wave.amplitude * spatialPattern * temporalOscillation;
    }
    
    return baseY + totalDisplacement;
  }

  // Map distance from surface to a character
  function getCharForDensity(density) {
    const index = Math.floor(density * (CONFIG.gradient.length - 1));
    const clampedIndex = Math.max(0, Math.min(CONFIG.gradient.length - 1, index));
    return CONFIG.gradient[clampedIndex];
  }

  function draw() {
    const isDark = document.body.classList.contains('dark');
    
    // Clear canvas
    ctx.fillStyle = isDark ? '#0a0a14' : '#fafafa';
    ctx.fillRect(0, 0, width, height);
    
    // Set text style
    ctx.font = CONFIG.charHeight + 'px "Courier New", Consolas, monospace';
    ctx.fillStyle = isDark ? '#4a90d9' : '#2563eb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // For each column, calculate the wave surface
    for (let col = 0; col < cols; col++) {
      const x = col * CONFIG.charWidth + CONFIG.charWidth / 2;
      
      // The wave surface at this x position
      const surfaceY = getWaveSurfaceY(x, time);
      
      for (let row = 0; row < rows; row++) {
        const y = row * CONFIG.charHeight + CONFIG.charHeight / 2;
        
        // How far is this cell from the surface?
        const distFromSurface = y - surfaceY;
        
        // Create gradient
        const transitionZone = CONFIG.charHeight * 3;
        const density = (distFromSurface + transitionZone) / (transitionZone * 2);
        
        // Get character for this density
        const char = getCharForDensity(density);
        
        // Only draw non-space characters
        if (char !== ' ') {
          const opacity = Math.max(0.3, Math.min(1, 1.2 - density * 0.5));
          ctx.globalAlpha = opacity;
          ctx.fillText(char, x, y);
        }
      }
    }
    
    ctx.globalAlpha = 1;
    
    // Draw hint at bottom
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = isDark ? '#4b5563' : '#9ca3af';
    ctx.fillText('click anywhere to enter', width / 2, height - 40);
  }

  function animate() {
    time += 1;
    draw();
    animationId = setTimeout(() => {
      requestAnimationFrame(animate);
    }, 1000 / CONFIG.fps);
  }

  function dismiss() {
    if (animationId) {
      clearTimeout(animationId);
    }
    
    overlay.style.transition = 'opacity 0.5s ease-out';
    overlay.style.opacity = '0';
    
    setTimeout(() => {
      overlay.style.display = 'none';
      sessionStorage.setItem('splashSeen', 'true');
    }, 500);
  }

  function shouldShowSplash() {
    return !sessionStorage.getItem('splashSeen');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      if (shouldShowSplash()) {
        init();
      } else {
        const overlay = document.getElementById('splash-overlay');
        if (overlay) overlay.style.display = 'none';
      }
    });
  } else {
    if (shouldShowSplash()) {
      init();
    } else {
      const overlay = document.getElementById('splash-overlay');
      if (overlay) overlay.style.display = 'none';
    }
  }
})();