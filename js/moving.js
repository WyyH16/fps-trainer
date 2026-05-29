window.Moving = (function() {
  let interval = null, score = 0, lives = 3, playing = false;
  let targets = [];

  function updateUI() {
    document.getElementById('mv-score').innerText = score;
    document.getElementById('mv-score-hud').innerText = score;
    document.getElementById('mv-lives').innerText = '❤️'.repeat(lives) + '🖤'.repeat(3 - lives);
  }

  function start() {
    clearInterval(interval);
    document.getElementById('moving-overlay').style.display = 'none';

    targets.forEach(t => { gsap.killTweensOf(t.el); if (t.el && t.el.parentNode) t.el.remove(); });
    targets = [];

    score = 0; lives = 3; playing = true;
    updateUI();

    // Interval only handles spawning; movement is driven by per-target GSAP tweens
    interval = setInterval(() => {
      if (!playing) return;
      const spawnChance = Math.min(0.15, 0.02 + (score * 0.001));
      if (Math.random() < spawnChance) spawn();
    }, 50);
  }

  function spawn() {
    const el = document.createElement('div');
    el.className = 'moving-target';

    const mvBox = document.getElementById('moving-container');
    const size = Math.random() * 30 + 20;
    const baseSpeed = 2 + (score * 0.05);
    const speedPxPerTick = (Math.random() < 0.5 ? 1 : -1) * (Math.random() * 2 + baseSpeed);
    const speedPxPerSec = speedPxPerTick * 50; // original was px per 20ms tick
    const boxW = mvBox.clientWidth;
    const startX = speedPxPerTick > 0 ? -size : boxW;
    const endX = speedPxPerTick > 0 ? boxW : -size;
    const duration = Math.abs((endX - startX) / speedPxPerSec);

    gsap.set(el, {
      width: size,
      height: size,
      top: (Math.random() * 80 + 10) + '%',
      y: '-50%',
      x: startX
    });

    el.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      if (!playing) return;
      score++;
      Utils.playSound('hit', 1, true);
      updateUI();
      gsap.killTweensOf(el);
      targets = targets.filter(item => item.el !== el);
      // Particle explosion + scale-pop
      explodeAt(el);
      gsap.fromTo(el, { scale: 1.4, boxShadow: '0 0 24px var(--success-glow)' }, { scale: 0, duration: 0.18, ease: 'power2.in', onComplete: () => {
        if (el.parentNode) el.remove();
      }});
    });

    const tween = gsap.to(el, {
      x: endX,
      duration: duration,
      ease: 'none',
      onComplete: () => {
        if (el.parentNode) el.remove();
        const idx = targets.findIndex(item => item.el === el);
        if (idx !== -1) {
          targets.splice(idx, 1);
          lives--;
          Utils.playSound('error', 0, true);
          updateUI();
          if (lives <= 0) end();
        }
      }
    });

    const targObj = { el: el, tween: tween };
    targets.push(targObj);
    mvBox.appendChild(el);
  }

  function explodeAt(el) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const container = document.getElementById('moving-container');
    const colors = ['#f0a500', '#f04444', '#20d060', '#fff', '#3b82f6', '#a070e0'];

    for (let i = 0; i < 10; i++) {
      const particle = document.createElement('div');
      particle.className = 'moving-particle';
      const angle = (Math.PI * 2 / 10) * i + Math.random() * 0.4;
      const velocity = 40 + Math.random() * 70;
      const size = 3 + Math.random() * 5;
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      particle.style.left = cx + 'px';
      particle.style.top = cy + 'px';
      particle.style.position = 'fixed';
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '100';
      particle.style.borderRadius = '50%';
      document.body.appendChild(particle);

      gsap.to(particle, {
        x: Math.cos(angle) * velocity,
        y: Math.sin(angle) * velocity,
        opacity: 0,
        scale: 0,
        duration: 0.45 + Math.random() * 0.25,
        ease: 'power2.out',
        onComplete: () => { if (particle.parentNode) particle.remove(); }
      });
    }
  }

  function miss(e) { }

  function end() {
    playing = false;
    clearInterval(interval);
    targets.forEach(t => { gsap.killTweensOf(t.el); if (t.el && t.el.parentNode) t.el.remove(); });
    targets = [];

    const overlay = document.getElementById('moving-overlay');
    overlay.style.display = 'flex';
    overlay.style.background = 'rgba(0,0,0,0.8)';
    overlay.style.color = 'white';
    overlay.innerHTML = '<div class="overlay-title">INTERCEPT FAILED</div><div class="overlay-stats"><span style="display:block;font-size:28px;color:var(--warning-color);">' + score + '</span><span>FINAL SCORE</span></div><div class="overlay-action" onclick="Moving.start()">[ CLICK TO REDEPLOY ]</div>';

    let pb = JSON.parse(localStorage.getItem('mv_best') || '{}');
    if (!pb.score || score > pb.score) {
      pb.score = score;
      Storage.syncSetItem('mv_best', JSON.stringify(pb));
      App.renderExtraPB();
      Radar.update();
      App.celebratePB('mv-pb');
    }
  }

  return {
    start: start,
    end: end,
    miss: miss,
    get playing() { return playing; },
    set playing(v) { playing = v; },
    get interval() { return interval; },
    get targets() { return targets; },
    set targets(v) { targets = v; },
    get score() { return score; }
  };
})();
