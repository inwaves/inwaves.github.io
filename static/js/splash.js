(function() {
  'use strict';

  // Configuration for the wave animation
  const CONFIG = {
    charWidth: 10,
    charHeight: 18,
    fps: 30,
    
    // Define wave "slices" at different depths (2.5D perspective)
    // Each slice represents waves at a different distance from viewer
    depthSlices: [
      // Far waves - top of screen (horizon), smallest
      { centerY: 0.25, amplitudeScale: 0.3, wavelengthScale: 0.5, speedScale: 0.7, transitionZone: 2 },
      
      // Mid-distance waves - middle, medium
      { centerY: 0.5, amplitudeScale: 0.6, wavelengthScale: 0.75, speedScale: 0.85, transitionZone: 2.5 },
      
      // Closest waves - bottom, largest
      { centerY: 0.75, amplitudeScale: 1.0, wavelengthScale: 1.0, speedScale: 1.0, transitionZone: 3 },
    ],
    
    // Base wave components (will be scaled by depth slices)
    baseWaves: [
      // Slow swells
      { wavelength: 500, amplitude: 40, speed: 0.5, phaseOffset: 0 },
      { wavelength: 350, amplitude: 30, speed: 0.7, phaseOffset: 1.2 },
      
      // Medium waves
      { wavelength: 180, amplitude: 20, speed: 1.1, phaseOffset: 2.5 },
      
      // Ripples
      { wavelength: 80,  amplitude: 10, speed: 1.8, phaseOffset: 1.7 },
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

  // Calculate wave surface Y for a specific depth slice
  function getWaveSurfaceY(x, t, depthSlice) {
    const baseY = height * depthSlice.centerY;
    let totalDisplacement = 0;
    
    for (const wave of CONFIG.baseWaves) {
      // Scale wave parameters based on depth (perspective)
      const scaledWavelength = wave.wavelength * depthSlice.wavelengthScale;
      const scaledAmplitude = wave.amplitude * depthSlice.amplitudeScale;
      const scaledSpeed = wave.speed * depthSlice.speedScale;
      
      const k = PI2 / scaledWavelength;
      
      // HYBRID APPROACH: Separate slow drift from fast oscillation
      // Slow horizontal drift (barely perceptible pattern translation)
      const drift = t * scaledSpeed * 0.002;  // Very slow horizontal movement
      
      // Fast vertical oscillation (visible up-down motion)  
      const oscillation = Math.sin(t * scaledSpeed * 0.08);  // Faster vertical breathing
      
      // Spatial pattern with drift
      const spatialPhase = k * x + drift + wave.phaseOffset;
      
      // Combine: spatial pattern × temporal oscillation
      totalDisplacement += scaledAmplitude * Math.sin(spatialPhase) * oscillation;
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
    
    // Render each depth slice independently
    // Process from farthest to nearest so closer waves can overwrite distant ones
    for (let sliceIdx = 0; sliceIdx < CONFIG.depthSlices.length; sliceIdx++) {
      const depthSlice = CONFIG.depthSlices[sliceIdx];
      
      for (let col = 0; col < cols; col++) {
        const x = col * CONFIG.charWidth + CONFIG.charWidth / 2;
        
        // Get wave surface for THIS depth slice only
        const surfaceY = getWaveSurfaceY(x, time, depthSlice);
        
        for (let row = 0; row < rows; row++) {
          const y = row * CONFIG.charHeight + CONFIG.charHeight / 2;
          
          // Distance from this wave's surface
          const distFromSurface = y - surfaceY;
          
          // Only render in a band around this wave surface
          // This prevents waves from merging into one blob
          const transitionZone = CONFIG.charHeight * depthSlice.transitionZone;
          
          // Only draw if we're near this wave's surface
          if (Math.abs(distFromSurface) < transitionZone * 2) {
            const density = (distFromSurface + transitionZone) / (transitionZone * 2);
            const char = getCharForDensity(density);
            
            if (char !== ' ') {
              const opacity = Math.max(0.3, Math.min(1, 1.2 - density * 0.5));
              ctx.globalAlpha = opacity;
              ctx.fillText(char, x, y);
            }
          }
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