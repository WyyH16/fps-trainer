# FPS训练台模块化重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将单文件 index.html (4100行) 拆分为 1个CSS + 16个JS模块，零行为变更。

**Architecture:** 每个JS模块用IIFE包裹、暴露单一名空间到window。通过`<script>`标签按依赖顺序加载。跨模块调用统一使用命名空间（如 `Schulte.prepare()` 而非 `prepareSchulte()`）。

**Tech Stack:** 纯 HTML/CSS/JS，无构建工具，GSAP 3.12.5 (CDN)，Supabase JS SDK (CDN)

---

## 文件映射总览

| 源文件行范围 | 目标文件 | 命名空间 |
|-------------|---------|---------|
| L9-423 | `css/style.css` | — |
| L425-529 | 保留在 `index.html` | — |
| L531-537 | 保留在 `index.html` | — |
| L538-1014 | 保留在 `index.html` | — |
| L1018-1037 | `js/app.js` | `App` |
| L1040-1092 | 拆分到各自游戏模块 | — |
| L1095-1245 | `js/storage.js` | `Storage` |
| L1248-1261 | `js/utils.js` | `Utils` |
| L1263-1439 | `js/storage.js` | `Storage` |
| L1441-1692 | `js/auth.js` | `Auth` |
| L1694-1928 | `js/leaderboard.js` | `LB` |
| L1934-2129 | `js/snake.js` | `Snake` |
| L2131-2558 | `js/tile2048.js` | `Tile2048` |
| L2560-2794 | `js/minesweeper.js` | `MS` |
| L2796-3140 | `js/breakout.js` | `Breakout` |
| L1862-1895, L3142-3162 | `js/entertainment.js` | `Entertainment` |
| L2162-2200, L2267-2331 | `js/speedtest.js` | `SpeedTest` |
| L2201-2265 | `js/app.js` | `App` |
| L3266-3276 | `js/app.js` | `App` |
| L3278-3368 | `js/radar.js` | `Radar` |
| L3370-3445 | `js/routine.js` | `Routine` |
| L3447-3713 | `js/schulte.js` | `Schulte` |
| L3716-3847 | `js/reaction.js` | `Reaction` |
| L3849-3924 | `js/aim.js` | `Aim` |
| L3926-3986 | `js/stroop.js` | `Stroop` |
| L3988-4097 | `js/moving.js` | `Moving` |
| L1857-1860, L3164-3249, L3251-3264 | `js/app.js` | `App` |

---

### Task 1: 创建目录结构和 CSS 文件

**Files:**
- Create: `css/style.css`
- Create: `js/` 目录

- [ ] **Step 1: 创建目录**

```bash
mkdir -p css js
```

- [ ] **Step 2: 提取 CSS 到 style.css**

从 `index.html` 第 9-423 行（`<style>` 到 `</style>` 之间，不含标签本身）提取全部CSS内容，写入 `css/style.css`。

```bash
sed -n '10,422p' index.html > css/style.css
```

- [ ] **Step 3: 替换 index.html 中的 `<style>` 块**

将原来的 `<style>...</style>`（L9-L423）替换为：

```html
<link rel="stylesheet" href="css/style.css">
```

- [ ] **Step 4: 验证** — 在浏览器打开 index.html，确认所有样式正常加载。

- [ ] **Step 5: Commit**

```bash
git add css/style.css index.html
git commit -m "refactor: extract CSS to css/style.css"
```

---

### Task 2: 提取 utils.js（公共工具函数）

**Files:**
- Create: `js/utils.js`
- Modify: `index.html`

**目标函数**（来源行号）:
- `formatDateStr()` (L1248-1251)
- `getReactRankColor()` (L1253-1256)
- `getSchulteRankColor()` (L1258-1261)
- `roundRect()` from 贪吃蛇 (L2117-2129)
- `roundRectB()` from 打砖块 (L3128-3140) — 合并到 `roundRect`
- `formatScore()` (L1736-1750) — 排行榜格式化
- `getWeatherDescription()` (L2255-2265) — 移到此处或留 app.js
- `audioCtx`, `initAudio()`, `playSound()` (L3455-3474)

- [ ] **Step 1: 创建 js/utils.js**

将上述函数复制到新文件，用 IIFE 包裹并暴露 `window.Utils`:

```javascript
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
```

- [ ] **Step 2: 在 index.html 添加 `<script>` 标签**

在 Supabase SDK `<script>` 块之后、主 `<script>` 块之前添加：

```html
<script src="js/utils.js"></script>
```

- [ ] **Step 3: 从 index.html 删除已提取的函数**

删除 original source 中对应函数（保留函数调用位置，只删定义）。

- [ ] **Step 4: 把所有对 `playSound(type)` 的调用改为 `Utils.playSound(type, comboCount, modeSound)`，`roundRect` 调用改为 `Utils.roundRect`，`roundRectB` 改为 `Utils.roundRect`，`formatDateStr` → `Utils.formatDateStr`，`countryToFlag` → `Utils.countryToFlag`，`getReactRankColor` → `Utils.getReactRankColor`，`formatScore` → `Utils.formatScore`，`getWeatherDescription` → `Utils.getWeatherDescription`**

- [ ] **Step 5: Commit**

```bash
git add js/utils.js index.html
git commit -m "refactor: extract Utils module (utils, audio, formatting)"
```

---

### Task 3: 提取 storage.js（本地存储 + 云同步）

**Files:**
- Create: `js/storage.js`
- Modify: `index.html`

**包含内容**（来源行号）:
- `SUPABASE_CONFIG` (L1095-1113)
- `sb()` (L1118)
- `syncSetItem()` (L1121-1153)
- `pushRecordToCloud()` (L1155-1184)
- `pushBestToCloud()` (L1186-1245)
- `syncPullAll()` (L1263-1300)
- `pushAllLocalToCloud()` (L1302-1314)
- `mergeCloudBests()` (L1316-1411)
- `mergeCloudRecords()` (L1413-1439)

- [ ] **Step 1: 创建 js/storage.js**

用 IIFE 包裹，暴露 `window.Storage`。依赖 `window.Utils` 和 `window.__supabase`。

```javascript
window.Storage = (function() {
  const SUPABASE_CONFIG = { /* ... */ };
  
  function sb() { return window.__supabase || null; }
  
  async function syncSetItem(key, value) { /* ... 原代码 ... */ }
  // ... 其余函数 ...
  
  return {
    SUPABASE_CONFIG: SUPABASE_CONFIG,
    syncSetItem: syncSetItem,
    syncPullAll: syncPullAll,
    pushBestToCloud: pushBestToCloud,
    pushRecordToCloud: pushRecordToCloud,
    getSupabase: sb
  };
})();
```

所有内部 `formatDateStr` → `Utils.formatDateStr`，`getReactRankColor` → `Utils.getReactRankColor`，`getSchulteRankColor` → `Utils.getSchulteRankColor`。

- [ ] **Step 2: 在 index.html 添加 `<script>` 标签**

```html
<script src="js/storage.js"></script>
```

放在 `utils.js` 之后。

- [ ] **Step 3: 删除 index.html 中的对应代码**

- [ ] **Step 4: 全局替换 `syncSetItem(` → `Storage.syncSetItem(`，`syncPullAll` → `Storage.syncPullAll`**

- [ ] **Step 5: Commit**

---

### Task 4: 提取 auth.js（认证 + 个人资料）

**Files:**
- Create: `js/auth.js`
- Modify: `index.html`

**包含内容** (L1441-1692): `currentAuthTab`, `openAuthModal`, `closeAuthModal`, `switchAuthTab`, `updateAuthTabUI`, `handleAuthMagicLink`, `handleAuthRegister`, `handleAuthLogin`, `updateAuthButton`, `countryToFlag`（已移至utils，改为 Utils调用）, `detectCountry`, `saveProfile`, `handleLogout`, `ensureProfile`, `restoreAuthState`, `currentUser`

- [ ] **Step 1: 创建 js/auth.js**

暴露 `window.Auth`:

```javascript
window.Auth = (function() {
  let currentUser = null;
  let currentAuthTab = 'password';
  
  // ... 所有 auth 函数 ...
  
  return {
    get currentUser() { return currentUser; },
    set currentUser(v) { currentUser = v; },
    openModal: openAuthModal,
    closeModal: closeAuthModal,
    restoreState: restoreAuthState,
    updateButton: updateAuthButton,
    logout: handleLogout,
    getClient: function() { return Storage.getSupabase(); }
  };
})();
```

内部调用 `syncSetItem` → `Storage.syncSetItem`，`countryToFlag` → `Utils.countryToFlag`，`formatDateStr` → `Utils.formatDateStr`。

- [ ] **Step 2: 添加 `<script src="js/auth.js"></script>`**

- [ ] **Step 3: 从 index.html 删除 auth 代码**

- [ ] **Step 4: 全局替换 `currentUser` → `Auth.currentUser`，`openAuthModal` → `Auth.openModal`，`closeAuthModal` → `Auth.closeModal`，`handleLogout` → `Auth.logout`，`updateAuthButton` → `Auth.updateButton`，`restoreAuthState` → `Auth.restoreState`**

注意：HTML 中的 `onclick="openAuthModal()"` 也需改为 `onclick="Auth.openModal()"`。

- [ ] **Step 5: Commit**

---

### Task 5: 提取 leaderboard.js（排行榜）

**Files:**
- Create: `js/leaderboard.js`
- Modify: `index.html`

**包含内容** (L1694-1928): `LEADERBOARD_MODULES`, `MODULE_LB_MAP`, `ENT_LB_MAP`, `renderLeaderboardFilter`, `switchLeaderboard`, `openLeaderboard`, `closeLeaderboard`, `formatScore`（已移至Utils，改调用）, `fetchLeaderboard`, `fetchMiniLeaderboard`, `fetchModuleLB`, `fetchEntertainmentLB`, `schulteLBSubKey`, `switchSchulteLBGrid`, `refreshRelevantLB`, `msDiffKey`

- [ ] **Step 1: 创建 js/leaderboard.js**

暴露 `window.LB`:

```javascript
window.LB = (function() {
  // ... 所有排行榜函数 ...
  
  return {
    open: openLeaderboard,
    close: closeLeaderboard,
    fetch: fetchLeaderboard,
    fetchMini: fetchMiniLeaderboard,
    fetchModule: fetchModuleLB,
    fetchEntertainment: fetchEntertainmentLB,
    refresh: refreshRelevantLB,
    switchModule: switchLeaderboard,
    switchSchulteGrid: switchSchulteLBGrid,
    renderFilter: renderLeaderboardFilter,
    get MODULE_MAP() { return MODULE_LB_MAP; },
    get ENT_MAP() { return ENT_LB_MAP; }
  };
})();
```

内部 `formatScore` → `Utils.formatScore`，`countryToFlag` → `Utils.countryToFlag`，`currentUser` → `Auth.currentUser`。

- [ ] **Step 2: 添加 `<script src="js/leaderboard.js"></script>`**

- [ ] **Step 3: 从 index.html 删除，全局替换引用**

`fetchLeaderboard` → `LB.fetch`，`openLeaderboard` → `LB.open`，`closeLeaderboard` → `LB.close`，`fetchMiniLeaderboard` → `LB.fetchMini`，`fetchModuleLB` → `LB.fetchModule`，`fetchEntertainmentLB` → `LB.fetchEntertainment`，`MODULE_LB_MAP` → `LB.MODULE_MAP`，`ENT_LB_MAP` → `LB.ENT_MAP` 等。

- [ ] **Step 4: Commit**

---

### Task 6: 提取 schulte.js（舒尔特方格）

**Files:**
- Create: `js/schulte.js`
- Modify: `index.html`

**包含内容** (L3447-3713): 所有舒尔特方格变量和函数。

- [ ] **Step 1: 创建 js/schulte.js**

```javascript
window.Schulte = (function() {
  let currentTarget, step, finalTarget, maxNumber;
  let timerInterval = null, startTime = 0;
  let isPlaying = false, isCountingDown = false;
  let currentSize = 5;
  let modeReverse, modeBlind, modeDistract, modeSound;
  let cellTimes = [], lastClickTime = 0, comboCount = 0;
  
  function prepare() { /* ... 原 prepareSchulte 代码 ... */ }
  function start() { /* ... 原 startSchulte 代码 ... */ }
  function end() { /* ... 原 endSchulte 代码 ... */ }
  function generateGrid(max) { /* ... */ }
  function handleClick(cell, num) { /* ... 原 handleSchulteClick ... */ }
  function saveRecord(timeStr, rank, tagStr) { /* ... */ }
  function renderRecords() { /* ... */ }
  function clearRecords() { /* ... */ }
  function renderHeatmap() { /* ... */ }
  function drawChart() { /* ... */ }
  function startCountdown(seconds) { /* ... */ }
  
  return {
    prepare: prepare,
    start: start,
    end: end,
    get isPlaying() { return isPlaying; },
    get isCountingDown() { return isCountingDown; },
    set isPlaying(v) { isPlaying = v; },
    renderRecords: renderRecords,
    clearRecords: clearRecords
  };
})();
```

内部 `playSound` → `Utils.playSound`，`initAudio` → `Utils.initAudio`，`syncSetItem` → `Storage.syncSetItem`，`formatDateStr` → `Utils.formatDateStr`。

- [ ] **Step 2: 添加 script 标签**

- [ ] **Step 3: 从 index.html 删除，更新所有引用**

`prepareSchulte()` → `Schulte.prepare()`
`startSchulte()` → `Schulte.start()`
`endSchulte()` → `Schulte.end()`
`isPlaying (schulte context)` → `Schulte.isPlaying`
`renderSchulteRecords()` → `Schulte.renderRecords()`
`clearSchulteRecords()` → `Schulte.clearRecords()`

- [ ] **Step 4: Commit**

---

### Task 7: 提取 reaction.js（反应测试）

**Files:**
- Create: `js/reaction.js`
- Modify: `index.html`

**包含内容** (L3716-3847)

- [ ] **Step 1: 创建 js/reaction.js**

暴露 `window.Reaction`:

```javascript
window.Reaction = (function() {
  let rtState = 'idle';
  let rtTimeout = null, rtStartTime = 0, rtResults = [];
  
  // ... 所有reaction函数 ...
  
  return {
    handleClick: handleRtClick,
    renderRecords: renderRtRecords,
    clearRecords: clearRtRecords,
    getState: function() { return rtState; },
    getResults: function() { return rtResults; }
  };
})();
```

- [ ] **Step 2: 添加 script，删除源代码，更新引用**

`handleRtClick()` → `Reaction.handleClick()`
`renderRtRecords()` → `Reaction.renderRecords()`
`clearRtRecords()` → `Reaction.clearRecords()`
`rtState` → `Reaction.getState()`

- [ ] **Step 3: Commit**

---

### Task 8: 提取 aim.js（精准定位）

**Files:**
- Create: `js/aim.js`
- Modify: `index.html`

**包含内容** (L3849-3924)

- [ ] **Step 1: 创建 js/aim.js** 暴露 `window.Aim`

- [ ] **Step 2: 添加 script，删除源代码，更新引用**

`startAim()` → `Aim.start()`，`endAim()` → `Aim.end()`，`aimPlaying` → `Aim.isPlaying`

- [ ] **Step 3: Commit**

---

### Task 9: 提取 stroop.js（抗压决策）

**Files:**
- Create: `js/stroop.js`
- Modify: `index.html`

**包含内容** (L3926-3986)

- [ ] **Step 1: 创建 js/stroop.js** 暴露 `window.Stroop`

- [ ] **Step 2: 添加 script，删除源代码，更新引用**

`startStroop()` → `Stroop.start()`
`stroopClick(ans)` → `Stroop.click(ans)`
`stPlaying` → `Stroop.isPlaying`

- [ ] **Step 3: Commit**

---

### Task 10: 提取 moving.js（移动飞靶）

**Files:**
- Create: `js/moving.js`
- Modify: `index.html`

**包含内容** (L3988-4097)

- [ ] **Step 1: 创建 js/moving.js** 暴露 `window.Moving`

- [ ] **Step 2: 添加 script，删除源代码，更新引用**

`startMoving()` → `Moving.start()`，`endMoving()` → `Moving.end()`，`mvPlaying` → `Moving.isPlaying`

- [ ] **Step 3: Commit**

---

### Task 11: 提取 speedtest.js（手速测试）

**Files:**
- Create: `js/speedtest.js`
- Modify: `index.html`

**包含内容**:
- 变量 (L1082-1092): `speedTestClicks`, `speedTestRemaining`, `speedTestRunning`, `speedTestInterval`, `speedTestBest`
- 函数 (L2267-2331): `updateSpeedTestUI`, `saveSpeedTestBest`, `startSpeedTest`, `stopSpeedTest`, `resetSpeedTest`, `registerSpeedClick`
- 记录函数 (L2162-2200): `renderSpeedRecords`, `saveSpeedRecord`, `clearSpeedRecords`, `loadGameData` 中的 speed 部分

- [ ] **Step 1: 创建 js/speedtest.js** 暴露 `window.SpeedTest`

- [ ] **Step 2: 添加 script，删除源代码，更新引用**

`startSpeedTest()` → `SpeedTest.start()`，`stopSpeedTest()` → `SpeedTest.stop()` 等

- [ ] **Step 3: Commit**

---

### Task 12: 提取 snake.js（贪吃蛇）

**Files:**
- Create: `js/snake.js`
- Modify: `index.html`

**包含内容** (L1040-2129 蛇相关 + snake 常量/变量)

- [ ] **Step 1: 创建 js/snake.js** 暴露 `window.Snake`

关键：内部 `roundRect` → `Utils.roundRect`。

- [ ] **Step 2: 添加 script，删除源代码，更新引用**

`startSnake()` → `Snake.start()`，`resetSnake()` → `Snake.reset()`，`snakeInterval` → `Snake.clearInterval`

- [ ] **Step 3: Commit**

---

### Task 13: 提取 tile2048.js（2048）

**Files:**
- Create: `js/tile2048.js`
- Modify: `index.html`

**包含内容** (L2131-2558 + L1057-1061 变量)

- [ ] **Step 1: 创建 js/tile2048.js** 暴露 `window.Tile2048`

- [ ] **Step 2: 添加 script，删除源代码，更新引用**

`start2048()` → `Tile2048.start()`，`move2048(dir)` → `Tile2048.move(dir)`

- [ ] **Step 3: Commit**

---

### Task 14: 提取 minesweeper.js 和 breakout.js（并行）

**Files:**
- Create: `js/minesweeper.js` (L2560-2794 + L1063-1067)
- Create: `js/breakout.js` (L2796-3140 + L1069-1076)
- Modify: `index.html`

这两个模块没有互相依赖，可并行处理。

- [ ] **Step 1: 创建 js/minesweeper.js** 暴露 `window.MS`

- [ ] **Step 2: 创建 js/breakout.js** 暴露 `window.Breakout`

内部 `roundRectB` → `Utils.roundRect`。

- [ ] **Step 3: 添加 script，删除源代码，更新引用**

- [ ] **Step 4: Commit**

---

### Task 15: 提取 entertainment.js（娱乐模块入口）

**Files:**
- Create: `js/entertainment.js`
- Modify: `index.html`

**包含内容**:
- `entertainmentMode`, `selectMiniGame()` (L1862-1895)
- `handleEntertainmentKey()` (L3142-3162)
- `attachEntertainmentTouch()`, `handleTouchStart()`, `handleTouchEnd()` (L2393-2428)
- `loadGameData()` (L2148-2161) — 组织所有游戏数据初始化
- `snakeBestScore`, `best2048Score`, `bestMinesweeper`, `bestBreakoutScore` (L1078-1081)
- `SNAKE_BEST_KEY` 等常量 (L1087-1092)

- [ ] **Step 1: 创建 js/entertainment.js** 暴露 `window.Entertainment`

```javascript
window.Entertainment = (function() {
  let mode = 'snake';
  
  function selectGame(game) {
    mode = game;
    // ... 原 selectMiniGame 代码, 调用 Snake/Tile2048/MS/Breakout 的 reset/init
  }
  
  function handleKey(code) { /* ... */ }
  
  function loadGameData() {
    // 从 localStorage 加载所有游戏 best scores
    Snake.bestScore = parseInt(localStorage.getItem('snake_best_score') || '0');
    Tile2048.bestScore = parseInt(localStorage.getItem('2048_best_score') || '0');
    // ...
  }
  
  return {
    selectGame: selectGame,
    handleKey: handleKey,
    loadGameData: loadGameData,
    get mode() { return mode; }
  };
})();
```

- [ ] **Step 2: 添加 script，删除源代码，更新引用**

`selectMiniGame(g)` → `Entertainment.selectGame(g)`
`entertainmentMode` → `Entertainment.mode`
`loadGameData()` → `Entertainment.loadGameData()`

- [ ] **Step 3: Commit**

---

### Task 16: 提取 radar.js 和 routine.js（并行）

**Files:**
- Create: `js/radar.js` (L3278-3368)
- Create: `js/routine.js` (L3370-3445)
- Modify: `index.html`

- [ ] **Step 1: 创建 js/radar.js** 暴露 `window.Radar`

```javascript
window.Radar = (function() {
  function update() { /* 原 updateRadarChart 代码 */ }
  return { update: update };
})();
```

- [ ] **Step 2: 创建 js/routine.js** 暴露 `window.Routine`

```javascript
window.Routine = (function() {
  let active = false, step = 0, scores = {};
  
  function start() { /* 原 startRoutine - 调用 Schulte.prepare(), App.switchView() */ }
  function next(mod, result) { /* 原 routineNext */ }
  function finish() { /* 原 finishRoutine */ }
  
  return {
    start: start,
    next: next,
    finish: finish,
    get active() { return active; }
  };
})();
```

- [ ] **Step 3: 添加 script 标签，删除源代码，更新引用**

`updateRadarChart()` → `Radar.update()`
`startRoutine()` → `Routine.start()`
`routineNext(m, r)` → `Routine.next(m, r)`
`routine.active` → `Routine.active`

- [ ] **Step 4: Commit**

---

### Task 17: 提取 app.js（应用主控 + 收尾）

**Files:**
- Create: `js/app.js`
- Modify: `index.html`

**包含内容**: 所有剩余的脚本逻辑：
- `currentView`, `switchView()` (L1018-1037)
- `toggleTheme()` (L1857-1860)
- `resetAllGames()` (L3164-3249)
- 键盘事件处理 (L3212-3249)
- `loadWeather()`, `fetchWeather()`, `renderWeather()` (L2201-2265)
- `renderExtraPB()` (L3266-3276)
- `window.onload` 初始化 (L3251-3264)
- `showToast()` (L428-441) — 移至此处或 utils

- [ ] **Step 1: 创建 js/app.js**

```javascript
window.App = (function() {
  let currentView = 'overview';
  
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
  
  function switchView(view) {
    currentView = view;
    // ... DOM 操作 + GSAP 动画
    resetAllGames();
    if (view === 'overview') { Radar.update(); LB.fetchMini(); }
    if (LB.MODULE_MAP[view]) { LB.fetchModule(view); }
  }
  
  function resetAllGames() {
    // 清理所有定时器，调用各模块停止方法
    Schulte.isPlaying = false;
    // ... 依次重置
  }
  
  function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    if (currentView === 'overview') Radar.update();
  }
  
  // ... loadWeather, renderExtraPB 等
  
  return {
    init: init,
    switchView: switchView,
    toggleTheme: toggleTheme,
    resetAllGames: resetAllGames,
    get currentView() { return currentView; }
  };
})();
```

- [ ] **Step 2: 替换 `window.onload`**

原 `window.onload = function() { ... }` 改为 `window.onload = function() { App.init(); }`

- [ ] **Step 3: 更新所有 HTML onclick 中的函数引用**

`onclick="switchView('overview')"` → `onclick="App.switchView('overview')"`
`onclick="toggleTheme()"` → `onclick="App.toggleTheme()"`
等等。

- [ ] **Step 4: 删除 index.html 中所有剩余 JS 代码**

此时的 `<script>` 块只应包含 Supabase SDK 导入和 PWA 安装逻辑。

- [ ] **Step 5: Commit**

---

### Task 18: 最终验证和清理

- [ ] **Step 1: 确认 index.html 加载顺序正确**

最终的 `<script>` 顺序：
```html
<script src="js/utils.js"></script>
<script src="js/storage.js"></script>
<script src="js/auth.js"></script>
<script src="js/leaderboard.js"></script>
<script src="js/radar.js"></script>
<script src="js/schulte.js"></script>
<script src="js/reaction.js"></script>
<script src="js/aim.js"></script>
<script src="js/stroop.js"></script>
<script src="js/moving.js"></script>
<script src="js/speedtest.js"></script>
<script src="js/snake.js"></script>
<script src="js/tile2048.js"></script>
<script src="js/minesweeper.js"></script>
<script src="js/breakout.js"></script>
<script src="js/entertainment.js"></script>
<script src="js/routine.js"></script>
<script src="js/app.js"></script>
```

- [ ] **Step 2: 全功能测试**

在浏览器中逐项验证：
- 所有标签页切换正常
- 舒尔特方格：不同规格、特殊模式（逆向/盲记/干扰）均可运行
- 反应测试：5次测试、评级
- 瞄准测试：倒计时、命中统计
- Stroop 测试：颜色判断、罚时
- 飞靶测试：生成、得分、生命值
- 手速测试：计时、CPS
- 娱乐模块：4个小游戏均可运行
- 主题切换
- 雷达图更新
- 综合热身流程
- 排行榜（需要 Supabase 连接）

- [ ] **Step 3: 修复验证中发现的任何问题**

- [ ] **Step 4: 最终 commit**

```bash
git add -A
git commit -m "refactor: complete modular split into 1 CSS + 16 JS modules"
```

---

## 执行注意事项

1. **PWA脚本（L425-529）** 保留在 `index.html` 中不动，因其需尽早注册 SW。
2. **Supabase SDK（L531-537）** 保留在 `index.html` 中，所有模块通过 `window.__supabase` 访问。
3. **HTML onclick 属性** 需要同步更新为命名空间调用（如 `Schulte.prepare()`）。
4. **每个模块提取后立即在浏览器验证**，不要等全部完成再测。
5. **Utils.playSound** 签名变更：原 `playSound(type)` 依赖模块级 `comboCount` 和 `modeSound` 变量，需要将这些作为参数传入，或者 schulte 模块内部维护 audioCtx。
6. **roundRectB 合并到 roundRect**：两个函数功能相同，统一为 `Utils.roundRect(ctx, x, y, w, h, r)`。
7. **Storage.js 中的 `formatDateStr`/`getReactRankColor` 等** 需改为 `Utils.formatDateStr`/`Utils.getReactRankColor` 调用。
