# MODIFICATIONS.md — 本仓库功能改造说明

本仓库基于 [shykai/MWICombatSimulatorTest](https://github.com/shykai/MWICombatSimulatorTest) 二次开发。本文档按功能模块记录相对原版的全部改造内容，供后续开发与 AI 协作参考。

> 通用工程约定（构建命令、架构、协作规范、更新日志要求）见根目录 `AGENTS.md`；面向用户的改动摘要见 `patchNote.json`。

## 收益计算体系

### 市场税 5%
- `main.js` 顶部 `MARKET_TAX_RATE = 0.05`（改税率只动这一个常量）。
- 免税规则（`getTaxFactor()`）：① 直接掉落的金币 `/items/coin`；② 按 NPC 回收价成交的；③ 地下城 / 迷宫产出。其余按市场单价 × (1 - MARKET_TAX_RATE)。
- 展示分两层：税前利润保持不变；另增"税后期望利润" = 税后期望收入 − 支出，显示在结果页和改价弹窗（i18n key `common:afterTaxNoRNGProfit`）。

### 价格解析与回退
- 单价统一走 `resolveItemPrice(itemHrid, setting)`：按掉落物/消耗品价格配置取 bid 或 ask，缺价回退 vendor，未获取市场数据时最终回退 `itemDetailMap[].sellPrice`；金币恒按面值 1 计价。
- 价格来源：`fetchPrices()` 拉取 `milkywayidle.com/game_data/marketplace.json`（失败自动切 CN 镜像），存 `window.prices`。
- **开始模拟时若尚未获取市场价格会自动拉取一次**，无需手动点"获取价格"；拉取失败不阻塞模拟。

### 六项收益指标
结果页展示：收入、支出、利润、期望收入、期望利润、税后期望利润。计算点：
- 收入表/期望收入表由 `showKills()` 构建（同时填充改价弹窗的 `revenueTable` / `noRngRevenueTable`）；
- 支出由实际消耗量 × 单价计（`showConsumablesUsed()`），改价弹窗联动重算入口在 input 监听器与 `updateProfitDisplay()`；
- 非 24h 模拟时六项指标括号标注每日折算值。

### 数字格式化
- 公共函数 `formatSmart(value, threshold)`：千分位；绝对值 ≥ 阈值缩写为 K/M/B/T（最多两位小数）；返回展示文本 + 精确值。
- 六项收益指标始终缩写，悬浮 title 显示精确值；每日折算值同样缩写。
- 掉落物详情的数量列 ≥100k 才缩写；单价/总价始终缩写；数字单元格均带 title 精确提示。

### 掉落物详情
- 原"掉落物合计"+"非随机掉落物"两区块合并为一个固定的"掉落物详情"列表（行式布局同伤害统计，不可折叠），列：物品名称、期望数量、掉落数量、单价（表头动态显示当前掉落物价格配置名）、总价 = 掉落数量 × 单价。

## 战斗与统计

### 神龛系统（新增）
与房屋/成就并列的永久加成，数据流一致（main.js UI → DTO → worker `createFromDTO` → `combatUnit.generatePermanentBuffs`）。
- 新增文件：`src/combatsimulator/data/shrineDetailMap.json`、`src/combatsimulator/shrine.js`（参考 `houseRoom.js`）。
- 五种神龛：力量(伤害 +0.3%/级)、节奏(攻速 +0.4%/级 或 施速 +0.004/级)、精神(最大 HP/MP +1%/级)、稀有(稀有发现 +0.015/级)、学者(经验 +0.005/级)。
- 精神神龛引入新 buff 类型 `max_hitpoints` / `max_manapoints`，处理在 `combatUnit.updateCombatDetails` 的 HP/MP 公式。
- UI：`#shrinesModal` 弹窗、`main.js initShrinesModal()`、i18n `shrineNames.*`。

### 伤害统计
- 总伤害标题旁标注该玩家占队伍的伤害百分比（`calcTeamDamageInfo()`），单人模拟不显示。

## 批量模拟

- 新增列：法力值耗尽比例（死亡次数后）、队伍伤害占比（战斗次数后）。法力数据来自引擎已有的 `playerRanOutOfMana(Time)` 统计。
- 排序三态循环：降序 → 升序 → 还原原始顺序。数值列以区域+难度为组排序（降序取组内最大值、升序取组内最小值，组内玩家行相邻）；玩家列独立按行排序不锁组。
- 经验七列整列为 0 时自动隐藏该列（每次新模拟重新评估）。

## 角色面板与界面调整

- 专业顺序：战斗、耐力、智力、攻击、防御、近战、远程、魔法；装备槽位顺序：主手、副手、头部、身体、腿部、手部、脚部、袋子、背部、项链、戒指、耳环、护符。
- 房屋/成就/神龛按钮合并为一行（等宽 flex）；移除上游遗留的无功能角色选择下拉框。
- 黑暗模式开关改为按钮组样式（复选框在前、文字在后，浅色底保证勾选可见）；团灭日志与实验性功能按钮并排。
- 全部弹窗加 `modal-dialog-scrollable`，高度超出屏幕时整体滚动不溢出；全站滚动条样式统一（含暗色变体）。

## 更新日志机制

- `patchNote.json` 是唯一日志源（webpack 打包进 bundle），页面右上角固定区"更新日志"按钮打开弹窗展示。
- 条目支持两种格式：字符串（历史遗留，作者内联 ` by xxx`）；对象 `{ text, author }`（推荐），作者渲染为徽章。历史条目的作者已按 git log 溯源补全。

## 第三方集成

- **访问量统计**：Vercount（不蒜子停摆后的替代），`index.html` 引入 `events.vercount.one/js`，footer 沿用 busuanzi 标签（Vercount 兼容并同步历史数据）。统计粒度按域名（整个 aiwwb.github.io）。

## 发布与部署

- GitHub Pages：`https://aiwwb.github.io/milkywayidle_battle/dist/`；发布前需 `npm run build` 并提交 dist/。
- webpack 显式相对 publicPath（避免 CDN 脚本污染 Worker URL 导致 SecurityError）。
