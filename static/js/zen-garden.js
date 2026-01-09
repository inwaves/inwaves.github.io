(function() {
  'use strict';

  const CONFIG = {
    charWidth: 14,
    charHeight: 20,
    fps: 6, // Slowed down to half speed (was 12)
    
    // Character gradients for groove depth (darkest to lightest)
    // Using subtle characters for ambient effect
    gradients: {
      block: ['█', '▓', '▒', '░', '·', ' '],
      line: ['━', '─', '╌', '┄', '·', ' '],
      wave: ['∿', '∼', '~', '˜', '·', ' '],
      dot: ['●', '◉', '○', '◌', '·', ' '],
    },
    
    // Pattern configurations - speeds reduced to half
    patterns: {
      linear: {
        wavelength: 40,
        speed: 0.0075, // Was 0.015
        breathCycle: 200,
        breathAmplitude: 0.3,
      },
      concentric: {
        baseRadius: 30,
        ringSpacing: 25,
        speed: 0.01, // Was 0.02
        breathCycle: 180,
      },
      wave: {
        wavelength: 80,
        amplitude: 15,
        speed: 0.005, // Was 0.01
        secondaryWave: 0.3,
      },
      ripple: {
        speed: 0.015, // Was 0.03
        fadeDistance: 150,
        spawnRate: 0.003, // Was 0.005, slower spawn rate
      }
    }
  };

  let canvas, ctx;
  let width, height;
  let cols, rows;
  let time = 0;
  let animationId;
  let currentPattern = 'ripple'; // Default changed to ripple
  let currentGradient = 'dot'; // Default changed to dot
  let ripples = [];

  function init() {
    canvas = document.getElementById('zen-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    
    resize();
    window.addEventListener('resize', resize);
    
    // Check for pattern override from data attribute
    const patternAttr = canvas.dataset.pattern;
    if (patternAttr && CONFIG.patterns[patternAttr]) {
      currentPattern = patternAttr;
    }
    
    const gradientAttr = canvas.dataset.gradient;
    if (gradientAttr && CONFIG.gradients[gradientAttr]) {
      currentGradient = gradientAttr;
    }
    
    animate();
  }

  function resize() {
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    
    width = container.offsetWidth;
    height = container.offsetHeight;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    
    // Reset transform before scaling to avoid compounded scaling on resize
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    
    cols = Math.ceil(width / CONFIG.charWidth);
    rows = Math.ceil(height / CONFIG.charHeight);
  }

  // Linear raking pattern - horizontal parallel grooves that breathe
  function getLinearValue(x, y, t) {
    const cfg = CONFIG.patterns.linear;
    
    // Base pattern: horizontal lines
    const basePattern = Math.sin(y * (Math.PI * 2 / cfg.wavelength));
    
    // Breathing effect: depth oscillates slowly
    const breath = Math.sin(t * cfg.speed * cfg.breathCycle) * cfg.breathAmplitude;
    
    // Subtle horizontal drift
    const drift = Math.sin(x * 0.01 + t * cfg.speed) * 0.1;
    
    return (basePattern * (1 + breath) + drift) * 0.5 + 0.5;
  }

  // Concentric circles pattern - rings that pulse outward
  function getConcentricValue(x, y, t) {
    const cfg = CONFIG.patterns.concentric;
    const cx = width / 2;
    const cy = height / 2;
    
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    
    // Concentric rings
    const rings = Math.sin((dist - t * cfg.speed * 50) * (Math.PI * 2 / cfg.ringSpacing));
    
    // Breathing effect
    const breath = Math.sin(t * cfg.speed * cfg.breathCycle) * 0.2;
    
    return (rings * (1 + breath)) * 0.5 + 0.5;
  }

  // Wave pattern - undulating curves
  function getWaveValue(x, y, t) {
    const cfg = CONFIG.patterns.wave;
    
    // Primary wave along x-axis
    const primaryWave = Math.sin(x * (Math.PI * 2 / cfg.wavelength) + t * cfg.speed * 10);
    
    // Secondary wave adds organic variation
    const secondaryWave = Math.sin(y * 0.02 + t * cfg.speed * 5) * cfg.secondaryWave;
    
    // Vertical position modulated by waves
    const waveY = y + primaryWave * cfg.amplitude + secondaryWave * cfg.amplitude * 0.5;
    
    // Create groove pattern based on modulated position
    const groove = Math.sin(waveY * 0.15);
    
    return groove * 0.5 + 0.5;
  }

  // Ripple pattern - expanding circles from random points
  function getRippleValue(x, y, t) {
    const cfg = CONFIG.patterns.ripple;
    
    // Spawn new ripples occasionally
    if (Math.random() < cfg.spawnRate) {
      ripples.push({
        x: Math.random() * width,
        y: Math.random() * height,
        birth: t,
      });
    }
    
    // Remove old ripples
    ripples = ripples.filter(r => (t - r.birth) * 50 < cfg.fadeDistance * 2);
    
    let value = 0;
    for (const ripple of ripples) {
      const dist = Math.sqrt((x - ripple.x) ** 2 + (y - ripple.y) ** 2);
      const age = (t - ripple.birth) * 50;
      const rippleRadius = age;
      
      // Ring at current radius
      const ringDist = Math.abs(dist - rippleRadius);
      if (ringDist < 20) {
        const fade = Math.max(0, 1 - age / cfg.fadeDistance);
        const ring = Math.sin(ringDist * 0.3) * fade;
        value = Math.max(value, ring);
      }
    }
    
    return value * 0.5 + 0.5;
  }

  function getPatternValue(x, y, t) {
    switch (currentPattern) {
      case 'linear': return getLinearValue(x, y, t);
      case 'concentric': return getConcentricValue(x, y, t);
      case 'wave': return getWaveValue(x, y, t);
      case 'ripple': return getRippleValue(x, y, t);
      default: return getRippleValue(x, y, t);
    }
  }

  function getCharForValue(value) {
    const gradient = CONFIG.gradients[currentGradient];
    const index = Math.floor(value * (gradient.length - 1));
    const clampedIndex = Math.max(0, Math.min(gradient.length - 1, index));
    return gradient[clampedIndex];
  }

  function draw() {
    const isDark = document.body.classList.contains('dark');
    
    // Clear with transparent background
    ctx.clearRect(0, 0, width, height);
    
    // Set text style - very subtle colors
    ctx.font = CONFIG.charHeight + 'px "Courier New", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Very low opacity for ambient effect
    const baseOpacity = 0.08;
    ctx.fillStyle = isDark ? `rgba(74, 144, 217, ${baseOpacity})` : `rgba(37, 99, 235, ${baseOpacity})`;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * CONFIG.charWidth + CONFIG.charWidth / 2;
        const y = row * CONFIG.charHeight + CONFIG.charHeight / 2;
        
        const value = getPatternValue(x, y, time);
        const char = getCharForValue(value);
        
        if (char !== ' ') {
          // Vary opacity slightly based on value for depth effect
          const opacity = baseOpacity + (1 - value) * 0.04;
          ctx.fillStyle = isDark 
            ? `rgba(74, 144, 217, ${opacity})` 
            : `rgba(37, 99, 235, ${opacity})`;
          ctx.fillText(char, x, y);
        }
      }
    }
  }

  function animate() {
    time += 1;
    draw();
    animationId = setTimeout(() => {
      requestAnimationFrame(animate);
    }, 1000 / CONFIG.fps);
  }

  // Public API to change patterns
  window.ZenGarden = {
    setPattern: function(pattern) {
      if (CONFIG.patterns[pattern]) {
        currentPattern = pattern;
      }
    },
    setGradient: function(gradient) {
      if (CONFIG.gradients[gradient]) {
        currentGradient = gradient;
      }
    },
    stop: function() {
      if (animationId) {
        clearTimeout(animationId);
        animationId = null;
      }
    },
    start: function() {
      if (!animationId) {
        animate();
      }
    }
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();