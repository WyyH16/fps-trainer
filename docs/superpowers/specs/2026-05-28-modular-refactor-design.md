# FPS训练台模块化重构设计

## 目标

将当前 4100 行单文件 `index.html` 拆分为独立 CSS 文件和 16 个 JS 模块，保持零构建依赖，浏览器直接加载运行。

## 现状痛点

- CSS + HTML + JS 全部混在一个文件中，4100 行
- 所有变量全局作用域，命名冲突风险高
- `roundRect` 函数重复定义（贪吃蛇和打砖块各一份）
- 改一个功能需要在文件中翻很久
- 无法独立测试任一模块

## 目标文件结构

```
FPS训练台/
├── index.html              (~200行，布局骨架 + <script> 加载)
├── manifest.json           (不变)
├── sw.js                   (不变)
├── icon.png                (不变)
├── CNAME                   (不变)
├── supabase-schema.sql     (不变)
├── css/
│   └── style.css           (所有样式，~400行)
└── js/
    ├── utils.js            (roundRect, formatDateStr, playSound, countryToFlag)
    ├── storage.js          (syncSetItem, localStorage 封装)
    ├── auth.js             (Supabase 登录/注册/资料/状态恢复)
    ├── leaderboard.js      (排行榜查询/渲染/过滤)
    ├── radar.js            (六边形雷达图)
    ├── routine.js          (综合热身流程编排)
    ├── schulte.js          (舒尔特方格)
    ├── reaction.js         (反应测试)
    ├── aim.js              (瞄准定位)
    ├── stroop.js           (抗压决策)
    ├── moving.js           (移动飞靶)
    ├── speedtest.js        (手速测试)
    ├── entertainment.js    (娱乐模块入口 + 迷你游戏切换)
    ├── snake.js            (贪吃蛇)
    ├── tile2048.js         (2048)
    ├── minesweeper.js      (扫雷)
    ├── breakout.js         (打砖块)
    └── app.js              (初始化、视图切换、键盘事件、主题、GSAP动画)
```

## JS 模块接口（命名空间约定）

| 模块 | 命名空间 | 暴露的关键方法/属性 |
|------|---------|-------------------|
| Utils | `Utils` | `roundRect()`, `formatDateStr()`, `playSound()`, `countryToFlag()` |
| Storage | `Storage` | `get(key)`, `set(key,val)`, `syncSetItem(key,val)`, `SUPABASE_CONFIG` |
| Auth | `Auth` | `currentUser`, `openModal()`, `closeModal()`, `restoreState()`, `updateButton()`, `logout()` |
| Leaderboard | `LB` | `fetch(module,subKey)`, `openModal()`, `closeModal()`, `renderFilter()` |
| Radar | `Radar` | `update()` |
| Routine | `Routine` | `start()`, `next(module,result)`, `active` |
| Schulte | `Schulte` | `prepare()`, `start()`, `end()`, `records`, `bests`, `renderRecords()` |
| Reaction | `Reaction` | `handleClick()`, `renderRecords()` |
| Aim | `Aim` | `start()`, `end()`, `records` |
| Stroop | `Stroop` | `start()`, `click(ans)` |
| Moving | `Moving` | `start()`, `end()`, `records` |
| SpeedTest | `SpeedTest` | `start()`, `stop()`, `reset()`, `renderRecords()` |
| Snake | `Snake` | `start()`, `reset()`, `step()`, `isPlaying` |
| Tile2048 | `Tile2048` | `start()`, `move(dir)`, `render()` |
| Minesweeper | `MS` | `init()`, `reset()`, `diff(d)` |
| Breakout | `Breakout` | `start()`, `reset()`, `isPlaying` |
| App | `App` | `init()`, `switchView(v)`, `toggleTheme()`, `resetAllGames()` |
| Entertainment | `Entertainment` | `selectGame(g)`, `handleKey(e)` |

## 依赖加载顺序

```
utils.js → storage.js → auth.js → leaderboard.js
         ↓
radar.js, schulte.js, reaction.js, aim.js, stroop.js, moving.js, speedtest.js
         ↓
snake.js, tile2048.js, minesweeper.js, breakout.js
         ↓
entertainment.js, routine.js
         ↓
app.js
```

## 模块间通信

- 通过 `window.命名空间` 直接调用（如 `window.Schulte.records`）
- `App.resetAllGames()` 负责跨模块重置，调用各模块的停止方法
- `Storage.syncSetItem()` 统一处理 local + cloud 双写
- `Routine` 编排多模块流程时直接调用 `Schulte.prepare()` / `Aim.start()` 等

## 重构原则

1. **零行为变更** — 不修改任何业务逻辑，纯结构拆分
2. **先提取后优化** — 先完成拆分保证功能一致，后续再在独立文件中优化
3. **静态加载** — 不用 ES modules，不用打包工具，纯 `<script>` 标签加载
4. **全局命名空间** — 每个模块暴露一个对象到 `window`，互不污染
5. **消除重复** — `roundRect` 只保留 `Utils.roundRect` 一份，两处调用统一
6. **html/css/js 彻底分离** — `<style>` 块移到 `css/style.css`，`<script>` 块移到对应 `js/*.js`

## 非目标

- 不引入 npm / bundler / TypeScript
- 不修改 PWA / SW 逻辑
- 不修改 Supabase Schema
- 不新增功能特性
- 不改变现有视觉样式
