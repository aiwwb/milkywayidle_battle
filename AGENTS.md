# AGENTS.md — AI 协作通用指导

本文件面向所有 AI 编码助手（Claude Code、Codex、Cursor 等），是仓库的**通用工程约定**，内容与具体业务功能无关。

> **关于功能改造说明**：各仓库的 `MODIFICATIONS.md` 记录该仓库相对上游的**功能改造细节**，可作为参考；业务描述以对应仓库的 `MODIFICATIONS.md` 为准。面向用户的更新日志统一记录在各仓库的 `patchNote.json`。

## Changelog 约定（必须遵守）

- **每次代码改动完成后，必须在根目录 `patchNote.json` 追加记录**（该文件同时是页面"更新日志"弹窗的数据源）。
- 用**面向用户的语言**描述改动效果——用户能感知到什么变化，而不是内部实现。
- 语言简练，一条改动一行；不写内部文件名、函数名等技术细节。
- 结构：顶层 key 是日期分组（`YYYY年M月D日`，倒序，新分组放最上方）；数组元素支持两种格式：
  - 字符串：历史遗留格式（作者直接写在文本里 ` by xxx`）；
  - 对象（推荐）：`{ "text": "用户可感知的改动描述", "author": "作者名" }`。
- `author` 统一写 **`aiwwb`**（仓库作者 GitHub 账号），不要使用其他别名。
- 纯文档类改动（如本文件、README）可不记录。

## 项目简介

**MWI Combat Simulator** —— Milky Way Idle（一款放置类网游）的战斗模拟器。用户在网页表单里配置角色（等级、装备、食物/药水、技能、zone 或 labyrinth、模拟时长等），程序在后台用 Web Worker 跑蒙特卡洛式战斗模拟，统计击杀数、掉落、经验、死亡、dps 等结果并渲染成图表/表格。

## 常用命令

```bash
npm install      # 安装依赖
npm run build    # webpack 打包（输出到 dist/，含 source map）
npm run watch    # webpack --watch 增量打包
npm start        # webpack-dev-server，端口 9000，自动打开浏览器
```

- **没有测试**（`npm test` 是空占位，会直接报错）。
- 没有 lint / 类型检查脚本。格式化配置见 `.prettierrc`（tabWidth 4、单引号 false）。

## 技术栈

- **纯 JS ES modules + webpack 5**，无前端框架。入口 `src/main.js`。
- 依赖仅一个运行时库：`heap-js`（用于事件优先队列）。
- UI 用 CDN 引入：Bootstrap 5、Chart.js 4、i18next（见 `index.html` 末尾的 `<script>`）。
- `webpack.config.js` 用 `CopyWebpackPlugin` 把 `index.html`、`js/`、`locales/`、`patchNote.json` 原样拷到 `dist/`；`main.js`、`worker.js`、`multiWorker.js` 三个 entry 由 webpack 自动代码分割。

## 架构（需要跨文件才能看全）

### 三层进程结构

```
index.html + src/main.js        UI 主线程：收集表单 → postMessage 给 worker → 渲染结果
    │  new Worker(...)
    ├─ src/worker.js            单次模拟 worker：把 DTO 构造成 Player/Zone/Labyrinth，
    │                            跑 CombatSimulator.simulate()，回传 SimResult
    └─ src/multiWorker.js       批量模拟 worker：按 CPU 核数起一个 worker.js 池，
                                 "模拟所有 zone" / "模拟所有 labyrinth"
```

- 消息协议：`postMessage` 用 `{ type, ... }` 分发。worker 侧 `type` 有 `start_simulation` / `start_simulation_all_zones` / `start_simulation_all_labyrinths`；主线程收 `simulation_result` / `simulation_progress` / `simulation_error`。
- `src/main.js`（约 4800 行）是纯 UI + 结果渲染，不参与战斗计算。战斗引擎全部在 worker 线程里跑。

### 战斗引擎（`src/combatsimulator/`）

- **`combatSimulator.js`**（核心，约 1700 行）—— 模拟主循环，`extends EventTarget`，通过 `dispatchEvent` 派发 `progress` 事件给 worker 转成进度条。用**离散事件模拟**推进时间。
- **`events/`** —— 事件驱动框架：
  - `eventQueue.js` 用 `heap-js` 最小堆按 `time` 排序；
  - `combatEvent.js` 是所有事件的基类（`type` + `time`）；
  - 每种战斗行为是一个事件类（`autoAttackEvent`、`damageOverTimeEvent`、`cooldownReadyEvent`、`regenTickEvent`、各类 `*ExpirationEvent`、`enemyRespawnEvent` 等）。加新机制通常就是加一个新事件类并在主循环里 schedule。
- **单位类层次**：`combatUnit.js`（基类，存战斗属性和 `combatDetails.combatStats`）→ `player.js` / `monster.js`。怪物属性按 `difficultyTier` 和 `roomLevel` 缩放（见 `monster.updateCombatDetails`）。
- **数据驱动**：`Player.createFromDTO()` / `Monster` / `Zone` / `Labyrinth` / `Ability` / `Equipment` / `Consumable` 都从 JSON 数据构建对象。所有游戏数据在 `data/*.json`（很大：`itemDetailMap.json` 2.2MB、`actionDetailMap.json` 1.4MB、`combatMonsterDetailMap.json` 344KB）。

### 关键约定

- **时间单位是纳秒**：`1e9` = 1 秒。`combatSimulator.js` 顶部 `ONE_SECOND`/`*_INTERVAL` 常量、`attackInterval: 3000000000`（3 秒）等都是纳秒。
- **hrid**：游戏数据用字符串 id（如 `/actions/combat/fly`、`/items/xxx`、`/abilities/xxx`），各处 JSON 的 key 和 DTO 字段都用 hrid 关联。
- **i18n**：i18next。`index.html` 从 CDN 加载 i18next 本体，实际文案在 `js/i18n.js`（内联、约 12k 行，`const Wa = { en: {...}, zh: {...} }`）；`locales/en|zh/common.json` 也存在但以 `js/i18n.js` 为主。
- **玩家配置格式**：主线程 `playerDataMap` 里存的是 JSON 字符串（`{player, food, drinks, abilities, triggerMap, zone, simulationTime, houseRooms, achievements, shrines}`），worker 端 `Player.createFromDTO` 再解析。
- **buff 类型体系**：所有加成都是 `Buff` 对象（`typeHrid` + `ratioBoost` + `flatBoost`），经 `combatUnit.addPermanentBuff` 按 `typeHrid` 聚合进 `permanentBuffs`，在 `updateCombatDetails` 里用 `getBuffBoost(type)` / `getBuffBoosts(type)` 消费。**字段语义因类型而异**（取决于引擎算法）：
  - `ratioBoost`（百分比乘）：`damage`、`attack_speed`、`max_hitpoints` / `max_manapoints`
  - `flatBoost`（直接加）：`cast_speed`、`rare_find`、`wisdom`、`stamina_level` / `intelligence_level`（加等级）
  - 加新 buff 类型前，先到 `combatUnit.updateCombatDetails` 看目标属性是被 ratioBoost 还是 flatBoost 消费。
- `package.json` 里 `"mwicombatsimulator": "file:"` 是自引用占位依赖，可忽略。

## 改动定位指南

- 改**战斗数值/机制** → 动 `src/combatsimulator/`，改完 `npm run build` 后刷新页面即可。
- 改**UI / 表单 / 结果展示** → 动 `index.html` 和 `src/main.js`。
- 新增**怪物 / 装备 / 技能数据** → 先看 `src/combatsimulator/data/` 里对应 JSON 的结构，再按相同 schema 增补；worker 和主线程都会 `import` 这些 JSON（webpack 打包进 bundle）。
- 涉及多线程：主线程和 worker 之间只传可序列化的 DTO（用 `structuredClone` 拷贝），不要传函数/类实例。

## 发布与部署（GitHub Pages）

项目发布到 GitHub Pages，地址 `https://aiwwb.github.io/milkywayidle_battle/dist/`（发布 `dist/` 静态文件）。

- **发布前先 `npm run build` 并提交 `dist/`** —— dist 被 git 追踪，Pages 发布的就是它。
- Pages 配置：仓库 Settings → Pages → Source 选 `Deploy from a branch` → Branch 选 `testing`、目录选 `/ (root)`（**不是 /docs**）。
- webpack 已设相对路径 `publicPath`，配合 `index.html` 相对引用，可直接跑在 `/dist/` 子路径下，无需改 base。
- remote 指向自有仓库 `https://github.com/aiwwb/milkywayidle_battle.git`。

### git 代理（坑）

本机走 v2rayN 代理（mixed 端口 10808，http/socks5 同端口）。`git push` 若报 `ServicePointManager 不支持具有 socks5h 方案的代理`，是 Git Credential Manager（GCM）不支持 socks5h 协议导致。

- 排查：`git config --list --show-origin | grep proxy`，注意 **local `.git/config` 会覆盖 global**。
- 解决：把代理协议改成 http，GCM 才能用。本项目已在 `.git/config` 配 `http.proxy = http://127.0.0.1:10808`（仅 local，不影响其他仓库）。

## 协作约定

- 代码改动由 AI 完成并 commit；**push 不由 AI 执行**，而是给出 `git push` 命令，用户手动执行（push 涉及本机认证/代理，用户手动点授权更稳妥）。
- **git commit 内容必须干净**：只允许简洁的提交信息和作者，禁止塞入任何无关信息——包括但不限于 `Co-Authored-By`、`Generated with xxx` 等 AI 署名/工具尾注、空行分隔的推广语、链接等。提交信息一行说清改了什么即可。
