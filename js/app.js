window.App = (function() {
  let currentView = 'overview';

  function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    const viewEl = document.getElementById('view-' + view);
    viewEl.classList.add('active');
    document.querySelector(`button[onclick="App.switchView('${view}')"]`).classList.add('active');

    // 切换时重置所有进行中的游戏
    resetAllGames();
    if (view === 'overview') { Radar.update(); LB.fetchMini(); }
    if (LB.MODULE_MAP[view]) { LB.fetchModule(view); }

    // GSAP stagger entrance for cards and panels
    if (typeof gsap !== 'undefined') {
      // Tactical HUD refresh flash
      gsap.fromTo(viewEl,
        { opacity: 0.8 },
        { opacity: 1, duration: 0.12, ease: 'power2.in' }
      );

      const children = viewEl.querySelectorAll('.module-card, .schulte-center, .rt-center, .aim-center, .stroop-center, .moving-center, .overview-center, .entertainment-small');
      gsap.fromTo(children,
        { opacity: 0, y: 20, filter: 'blur(2px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.4, stagger: 0.05, ease: 'power3.out', delay: 0.1 }
      );

      // Header accent flash
      gsap.fromTo('.header-wrap',
        { borderBottomColor: 'transparent' },
        { borderBottomColor: 'var(--accent-color)', duration: 0.6, ease: 'power2.out' }
      );
    }
  }

  function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    if (currentView === 'overview') Radar.update();
  }

  function loadWeather() {
    const weatherEl = document.getElementById('weather-info');
    const cached = localStorage.getItem('weather_cache');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        if (data && data.summary) renderWeather(data);
      } catch (e) {
        console.warn('解析天气缓存失败', e);
      }
    }
    const onSuccess = position => fetchWeather(position.coords.latitude, position.coords.longitude);
    const onFail = () => fetchWeather(39.9042, 116.4074);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(onSuccess, onFail, { timeout: 10000 });
    } else {
      onFail();
    }
  }

  function fetchWeather(lat, lon) {
    const weatherEl = document.getElementById('weather-info');
    weatherEl.innerText = 'SYS: ACQUIRING DATA...';
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`)
      .then(res => res.json())
      .then(data => {
        if (data && data.current_weather) {
          const item = {
            summary: Utils.getWeatherDescription(data.current_weather.weathercode),
            temp: Math.round(data.current_weather.temperature),
            max: data.daily?.temperature_2m_max?.[0] ? Math.round(data.daily.temperature_2m_max[0]) : null,
            min: data.daily?.temperature_2m_min?.[0] ? Math.round(data.daily.temperature_2m_min[0]) : null
          };
          localStorage.setItem('weather_cache', JSON.stringify(item));
          renderWeather(item);
        } else {
          weatherEl.innerText = 'SYS: DATA ACQUISITION FAILED';
        }
      })
      .catch(() => {
        if (!weatherEl.innerText || weatherEl.innerText === '天气加载中…') {
          weatherEl.innerText = 'SYS: OFFLINE — CACHED DATA';
        }
      });
  }

  function renderWeather(item) {
    const weatherEl = document.getElementById('weather-info');
    weatherEl.innerText = 'SYS: ' + item.summary + ' ' + item.temp + '°C';
    if (item.max !== null && item.min !== null) {
      weatherEl.innerText += ` | ${item.min}°/${item.max}°`;
    }
  }

  function resetAllGames() {
    clearInterval(Schulte.timerInterval);
    clearInterval(Aim.interval);
    clearInterval(Stroop.interval);
    clearInterval(Snake.interval);
    clearInterval(MS.timerInterval);
    if (Breakout.animFrame) cancelAnimationFrame(Breakout.animFrame);
    Breakout.playing = false;
    Reaction.reset();

    // 舒尔特重置
    Schulte.isPlaying = false;
    document.getElementById('overlay').style.display = 'none';

    // Aim重置
    Aim.reset();

    // Stroop重置
    Stroop.playing = false;
    document.getElementById('stroop-word').innerText = '色彩';
    document.getElementById('stroop-word').style.color = '';

    // 飞靶重置
    Moving.playing = false;
    clearInterval(Moving.interval);
    Moving.targets.forEach(t => { gsap.killTweensOf(t.el); if (t.el && t.el.parentNode) t.el.remove(); });
    Moving.targets = [];
    const mvOverlay = document.getElementById('moving-overlay');
    if (mvOverlay) {
      mvOverlay.style.display = 'flex';
      mvOverlay.style.background = '';
      mvOverlay.style.color = '';
      mvOverlay.innerHTML = '<div class="overlay-title">TARGET INTERCEPT</div><div class="overlay-sub">INTERCEPT ALL MOVING TARGETS</div><div class="overlay-action" onclick="Moving.start()">PRESS START TO DEPLOY</div>';
    }
    SpeedTest.stop();
  }

  function init() {
    // === Tactical Boot Sequence ===
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!sessionStorage.getItem('booted') && !prefersReducedMotion) {
      sessionStorage.setItem('booted', 'true');
      var bootEl = document.getElementById('boot-screen');
      if (bootEl && typeof gsap !== 'undefined') {
        var bootTL = gsap.timeline({
          defaults: { ease: 'power2.out' },
          onComplete: function() {
            if (bootEl.parentNode) bootEl.parentNode.removeChild(bootEl);
          }
        });
        bootTL
          .fromTo(bootEl, { opacity: 0 }, { opacity: 1, duration: 0.1 })
          .fromTo('.boot-line1', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.28 }, '+=0.05')
          .fromTo('.boot-line2', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.25 }, '-=0.12')
          .fromTo('.boot-line3', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.25 }, '-=0.12')
          .call(function() {
            var statusEl = document.querySelector('.boot-status');
            if (statusEl) statusEl.textContent = 'ONLINE';
          })
          .to('.boot-status', { color: '#20d060', duration: 0.25 })
          .fromTo('.boot-progress-fill', { width: '0%' }, { width: '100%', duration: 0.45, ease: 'power2.inOut' }, '-=0.15')
          .to('.boot-line3', { color: '#20d060', duration: 0.2 })
          .to('.boot-content', { x: 4, duration: 0.03 })
          .to('.boot-content', { x: -4, duration: 0.03 })
          .to('.boot-content', { x: 0, duration: 0.03 })
          .to(bootEl, { opacity: 0, duration: 0.28, ease: 'power2.in' }, '+=0.08');
      }
      // Fallback: remove boot screen even if GSAP fails
      setTimeout(function() {
        var b = document.getElementById('boot-screen');
        if (b && b.parentNode) b.parentNode.removeChild(b);
      }, 2500);
    } else {
      // Clean up if boot screen still exists defensively
      var leftover = document.getElementById('boot-screen');
      if (leftover && leftover.parentNode) leftover.parentNode.removeChild(leftover);
    }
    // === End Boot Sequence ===

    Schulte.renderRecords();
    Reaction.renderRecords();
    renderExtraPB();
    Radar.update();
    Entertainment.loadGameData();
    loadWeather();
    Entertainment.selectGame('snake');
    Snake.reset();
    Entertainment.attachTouch();
    Auth.restoreState().then(function() {
      if (window.__supabase) { LB.fetchMini(); }
    });
  }

  function renderExtraPB() {
    let aimBest = JSON.parse(localStorage.getItem('aim_best') || '{}');
    document.getElementById('aim-pb-hits').innerText = aimBest.hits ? aimBest.hits : '--';

    let stBest = JSON.parse(localStorage.getItem('st_best') || '{}');
    document.getElementById('st-pb').innerText = stBest.time ? stBest.time + ' s' : '-- s';

    let mvBest = JSON.parse(localStorage.getItem('mv_best') || '{}');
    let mvPbEl = document.getElementById('mv-pb');
    if (mvPbEl) mvPbEl.innerText = mvBest.score ? mvBest.score : '--';
  }

  function celebratePB(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    // Screen-wide pulse ring
    const ring = document.createElement('div');
    ring.className = 'pb-pulse-ring';
    ring.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;border:3px solid var(--accent-color);border-radius:0;opacity:0.6;';
    document.body.appendChild(ring);
    gsap.fromTo(ring,
      { scale: 1.05, opacity: 0.5 },
      { scale: 1.0, opacity: 0, duration: 0.7, ease: 'power2.out',
        onComplete: () => { if (ring.parentNode) ring.remove(); } }
    );

    // Element glow + pop
    gsap.fromTo(el,
      { scale: 1, textShadow: '0 0 0px var(--accent-glow)' },
      { scale: 1.15, textShadow: '0 0 30px var(--accent-glow), 0 0 60px var(--accent-color)', duration: 0.3, yoyo: true, repeat: 2, ease: 'elastic.out(1, 0.4)' }
    );

    // Particle burst from element center
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ['#f0a500', '#f04444', '#20d060', '#fff', '#3b82f6', '#a070e0'];

    for (let i = 0; i < 16; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = 'position:fixed;pointer-events:none;z-index:9998;border-radius:50%;width:6px;height:6px;';
      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      particle.style.left = cx + 'px';
      particle.style.top = cy + 'px';
      document.body.appendChild(particle);

      const angle = (Math.PI * 2 / 16) * i;
      const velocity = 30 + Math.random() * 60;
      gsap.to(particle, {
        x: Math.cos(angle) * velocity,
        y: Math.sin(angle) * velocity,
        opacity: 0,
        scale: 0,
        duration: 0.6 + Math.random() * 0.3,
        ease: 'power2.out',
        onComplete: () => { if (particle.parentNode) particle.remove(); }
      });
    }
  }

  // Keyboard listener
  document.addEventListener('keydown', function(event) {
    if (document.activeElement.tagName === 'INPUT') return;
    if (currentView === 'entertainment') {
      const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'];
      if (keys.includes(event.code)) {
        event.preventDefault();
        if (event.code === 'Space' && Entertainment.mode === 'breakout') {
          if (!Breakout.playing && Breakout.lives > 0) Breakout.start();
        } else {
          Entertainment.handleKey(event.code);
        }
        return;
      }
    }
    if (currentView === 'stroop' && Stroop.playing) {
      const keyMap = { 'KeyR': '红', 'KeyG': '绿', 'KeyB': '蓝', 'KeyY': '黄', 'KeyP': '紫', 'KeyK': '黑' };
      const ans = keyMap[event.code];
      if (ans) { event.preventDefault(); Stroop.click(ans); return; }
    }
    if (event.code === 'Space') {
      event.preventDefault();
      if (document.activeElement) document.activeElement.blur();

      if (currentView === 'schulte') {
        if (!Schulte.isPlaying && !Schulte.isCountingDown) Schulte.prepare();
      } else if (currentView === 'reaction') {
        Reaction.handleClick();
      } else if (currentView === 'aim') {
        if (!Aim.playing) Aim.start();
      } else if (currentView === 'stroop') {
        if (!Stroop.playing) Stroop.start();
      } else if (currentView === 'moving') {
        if (!Moving.playing) Moving.start();
      } else if (currentView === 'speedtest') {
        SpeedTest.start();
      }
    }
  });

  return {
    switchView: switchView,
    toggleTheme: toggleTheme,
    resetAllGames: resetAllGames,
    celebratePB: celebratePB,
    renderExtraPB: renderExtraPB,
    init: init,
    get currentView() { return currentView; }
  };
})();
