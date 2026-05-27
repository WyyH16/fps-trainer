window.Aim = (function() {
  let interval = null, time = 30, playing = false, hits = 0, clicks = 0;

  function start() {
    clearInterval(interval);
    const overlay = document.getElementById('aim-overlay');
    if (overlay) overlay.style.display = 'none';

    // 安全清除之前的靶子
    document.querySelectorAll('.aim-target').forEach(function(el) {
      if (el && el.parentNode) el.remove();
    });

    var dur = parseInt(document.getElementById('aim-duration').value) || 30;
    time = Math.max(10, Math.min(120, dur));
    document.getElementById('aim-time').innerText = time.toFixed(1);
    hits = 0; clicks = 0; playing = true;
    document.getElementById('aim-hits').innerText = hits;
    document.getElementById('aim-acc').innerText = "0%";

    spawnTarget();
    interval = setInterval(function() {
      time -= 0.1;
      document.getElementById('aim-time').innerText = time.toFixed(1);
      if (time <= 0) end();
    }, 100);
  }

  function spawnTarget() {
    if (!playing) return;
    var aBox = document.getElementById('aim-container');
    var t = document.createElement('div');
    t.className = 'aim-target';
    var size = Math.random() * 20 + 25;
    t.style.width = size + 'px';
    t.style.height = size + 'px';
    t.style.left = (Math.random() * (aBox.clientWidth - size) + size / 2) + 'px';
    t.style.top = (Math.random() * (aBox.clientHeight - size) + size / 2) + 'px';

    t.onmousedown = function(e) {
      e.stopPropagation();
      if (!playing) return;
      hits++; clicks++;
      Utils.playSound('hit', 1, true);
      document.getElementById('aim-hits').innerText = hits;
      document.getElementById('aim-acc').innerText = Math.round((hits / clicks) * 100) + "%";
      if (t.parentNode) t.remove();
      spawnTarget();
    };
    aBox.appendChild(t);
  }

  function miss(e) {
    if (playing) {
      clicks++;
      document.getElementById('aim-acc').innerText = Math.round((hits / clicks) * 100) + "%";
    }
  }

  function end() {
    playing = false;
    clearInterval(interval);
    document.getElementById('aim-time').innerText = "0.0";
    document.querySelectorAll('.aim-target').forEach(function(el) {
      if (el && el.parentNode) el.remove();
    });

    var overlay = document.getElementById('aim-overlay');
    overlay.style.display = 'flex';
    overlay.style.background = 'rgba(0,0,0,0.8)';
    overlay.style.color = 'white';
    overlay.innerHTML = '测试结束<br><span style="font-size:16px; margin-top:10px;">命中: ' + hits + ' | 准确率: ' + document.getElementById('aim-acc').innerText + '</span><br><span style="font-size:14px; margin-top:10px; cursor:pointer;" onclick="Aim.start()">点击此处或左侧重新开始</span>';

    var pb = JSON.parse(localStorage.getItem('aim_best') || '{}');
    if (!pb.hits || hits > pb.hits) {
      pb.hits = hits;
      Storage.syncSetItem('aim_best', JSON.stringify(pb));
      renderExtraPB();
      Radar.update();
    }
    if (Routine.active) Routine.next('aim', hits);
  }

  function reset() {
    playing = false;
    clearInterval(interval);
    document.querySelectorAll('.aim-target').forEach(function(el) {
      if (el && el.parentNode) el.remove();
    });
    var aimOverlay = document.getElementById('aim-overlay');
    if (aimOverlay) {
      aimOverlay.style.display = 'flex';
      aimOverlay.innerHTML = '点击START开始<br><span style="font-size:16px; margin-top:10px;">30秒定点甩枪</span>';
    }
  }

  return {
    start: start,
    end: end,
    miss: miss,
    reset: reset,
    get playing() { return playing; },
    set playing(v) { playing = v; },
    get interval() { return interval; },
    get hits() { return hits; }
  };
})();
