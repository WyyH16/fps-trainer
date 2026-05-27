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
    const children = viewEl.querySelectorAll('.module-card, .schulte-center, .rt-center, .aim-center, .stroop-center, .moving-center, .overview-center, .entertainment-small');
    gsap.fromTo(children,
      { opacity: 0, y: 20, filter: 'blur(2px)' },
      { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.4, stagger: 0.05, ease: 'power3.out' }
    );
    // Header accent flash
    gsap.fromTo('.header-wrap',
      { borderBottomColor: 'transparent' },
      { borderBottomColor: 'var(--accent-color)', duration: 0.6, ease: 'power2.out' }
    );
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
    gsap.fromTo(el,
      { scale: 1, textShadow: '0 0 0px var(--accent-glow)' },
      { scale: 1.08, textShadow: '0 0 20px var(--accent-glow)', duration: 0.3, yoyo: true, repeat: 2, ease: 'power2.inOut' }
    );
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
