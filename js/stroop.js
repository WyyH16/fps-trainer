window.Stroop = (function() {
  let interval = null, time = 0, prog = 0, playing = false, currentColor = '';
  const words = ['红','蓝','绿','黄','紫','黑'];
  const colors = { '红':'#ef4444', '蓝':'#3b82f6', '绿':'#10b981', '黄':'#eab308', '紫':'#a855f7'};

  function start() {
    clearInterval(interval); time = 0; prog = 0; playing = true;
    document.getElementById('st-prog').innerText = "0/20"; document.getElementById('st-time').innerText = "0.00";
    nextWord();
    interval = setInterval(()=> {
      time += 0.01;
      document.getElementById('st-time').innerText = time.toFixed(2);
    }, 10);
  }

  function nextWord() {
    const w = words[Math.floor(Math.random()*words.length)];
    let cKey;
    if(Math.random() < 0.8) {
      let others = words.filter(x => x !== w);
      cKey = others[Math.floor(Math.random()*others.length)];
    } else {
      cKey = w;
    }
    currentColor = cKey;
    const el = document.getElementById('stroop-word');
    el.innerText = w;

    let realC = colors[cKey];
    if(cKey === '黑') realC = document.body.classList.contains('dark-mode') ? '#ffffff' : '#111827';
    el.style.color = realC;
  }

  function click(ans) {
    if(!playing) return;
    if(ans === currentColor) {
      prog++; document.getElementById('st-prog').innerText = prog + "/20";
      if(prog >= 20) {
        playing = false; clearInterval(interval);
        document.getElementById('stroop-word').innerText = "完成!";
        document.getElementById('stroop-word').style.color = 'var(--success-color)';
        let t = document.getElementById('st-time').innerText;

        let pb = JSON.parse(localStorage.getItem('st_best')||'{}');
        if(!pb.time || parseFloat(t) < parseFloat(pb.time)) {
          pb.time = t;
          Storage.syncSetItem('st_best', JSON.stringify(pb));
          if (typeof renderExtraPB === 'function') renderExtraPB();
          if (typeof Radar !== 'undefined') Radar.update();
        }
      } else { nextWord(); }
    } else {
      Utils.playSound('error', 0, true);
      time += 1.0;
      const el = document.getElementById('st-time');
      el.style.color = 'var(--danger-color)';
      setTimeout(()=>el.style.color = 'var(--text-main)', 300);
    }
  }

  return {
    start: start,
    click: click,
    get playing() { return playing; },
    set playing(v) { playing = v; },
    get interval() { return interval; }
  };
})();
