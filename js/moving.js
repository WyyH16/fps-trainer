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
      // scale-pop then remove
      gsap.fromTo(el, { scale: 1.3 }, { scale: 0, duration: 0.15, ease: 'power2.in', onComplete: () => {
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
    overlay.innerHTML = '行动失败<br><span style="font-size:16px; margin-top:10px;">最终拦截得分: <span style="color:var(--warning-color); font-weight:bold; font-size:20px;">' + score + '</span></span><br><span style="font-size:14px; margin-top:10px; cursor:pointer;" onclick="Moving.start()">点击此处或左侧重新开始</span>';

    let pb = JSON.parse(localStorage.getItem('mv_best') || '{}');
    if (!pb.score || score > pb.score) {
      pb.score = score;
      Storage.syncSetItem('mv_best', JSON.stringify(pb));
      renderExtraPB();
      Radar.update();
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
