window.Utils = (function() {
  let audioCtx;

  function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function playSound(type, comboCount, modeSound) {
    if (!modeSound || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.connect(gainNode); gainNode.connect(audioCtx.destination);
    if (type === 'hit') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(600 + (comboCount * 30), audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
      osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } else if (type === 'error') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
      osc.start(); osc.stop(audioCtx.currentTime + 0.2);
    }
  }

  function formatDateStr(isoStr) {
    const d = new Date(isoStr);
    return `${d.getMonth()+1}-${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  }

  function getReactRankColor(rankName) {
    const map = { '外星神经': '#8b5cf6', '电竞选手': '#3b82f6', '眼疾手快': '#10b981', '普通路人': '#f59e0b', '老年反应': '#6b7280' };
    return map[rankName] || '#6b7280';
  }

  function getSchulteRankColor(rankName) {
    const map = { 'S级': '#8b5cf6', 'A级': '#3b82f6', 'B级': '#10b981', 'C级': '#f59e0b' };
    return map[rankName] || '#6b7280';
  }

  function countryToFlag(code) {
    if (!code) return '';
    var a = code.toUpperCase().charCodeAt(0) + 127397;
    var b = code.toUpperCase().charCodeAt(1) + 127397;
    return String.fromCodePoint(a) + String.fromCodePoint(b);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function formatScore(module, scoreData) {
    switch (module) {
      case 'schulte':   return (scoreData.time || '--') + 's';
      case 'reaction':  return (scoreData.ms || '--') + 'ms';
      case 'aim':       return String(scoreData.hits || '--') + ' 命中';
      case 'stroop':    return (scoreData.time || '--') + 's';
      case 'moving':    return String(scoreData.score || '--') + ' 分';
      case 'speedtest': return (scoreData.cps || '--') + ' CPS';
      case 'snake':     return String(scoreData.score || '--') + ' 分';
      case '2048':      return String(scoreData.score || '--') + ' 分';
      case 'minesweeper': return (scoreData.time || '--') + 's';
      case 'breakout':  return String(scoreData.score || '--') + ' 分';
      default:          return '--';
    }
  }

  function getWeatherDescription(code) {
    const map = {
      0: '☀️晴', 1: '☀️主要晴', 2: '☁️多云', 3: '⛅阴',
      45: '🌫️雾', 48: '🧊🌫️冻雾', 51: '🌧️毛毛雨', 53: '🌧️小雨', 55: '🌧️大雨',
      56: '🧊🌧️冻毛毛雨', 57: '🧊🌧️冻大雨', 61: '🌧️小雨', 63: '🌧️中雨', 65: '🌧️大雨',
      66: '🧊🌧️冻小雨', 67: '🧊🌧️冻大雨', 71: '🌨️小雪', 73: '🌨️中雪', 75: '🌨️大雪',
      77: '🧊 hail', 80: '🌦️阵雨', 81: '⛈️雷阵雨', 82: '⛈️大阵雨',
      85: '🌨️小雪', 86: '🌨️大雪', 95: '🌩️雷雨', 96: '🌩️雷阵雨', 99: '⛈️强雷雨'
    };
    return map[code] || '未知天气';
  }

  return {
    initAudio: initAudio,
    playSound: playSound,
    formatDateStr: formatDateStr,
    getReactRankColor: getReactRankColor,
    getSchulteRankColor: getSchulteRankColor,
    countryToFlag: countryToFlag,
    roundRect: roundRect,
    formatScore: formatScore,
    getWeatherDescription: getWeatherDescription
  };
})();
