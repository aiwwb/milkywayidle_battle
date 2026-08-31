# MWICombatSimulator

### How to run locally for development purposes

Install dependencies: 

```bash
npm install
```

Build webpack bundle:

```bash
npm run build
```

Run locally:

```bash
npm start
```

## 测试模拟数据

根目录的 `测试模拟数据.md` 存放了一份**单人模拟数据**（JSON 字符串），供单人模拟场景的快速导入测试。

导入方式：
1. 页面点击「导入/导出」（Import/Export）按钮打开弹窗；
2. 切到「Solo」标签页；
3. 把 `测试模拟数据.md` 里的 JSON 内容整段复制，粘贴到输入框（`Import set here for Solo`）；
4. 点击「Import」按钮。

该数据包含一套完整的单人配置：等级、装备（含强化等级）、食物/饮料、技能、触发器、区域、模拟时长、房屋、成就、神龛。

## Origin & Credits

This project is based on [MWICombatSimulatorTest](https://github.com/shykai/MWICombatSimulatorTest) by [shykai](https://github.com/shykai), a combat simulator for [Milky Way Idle](https://www.milkywayidle.com/).

Thanks to shykai for the original implementation, and to KuganDev, Vlad (mwisim) and AmVoidGuy for their prior work on earlier versions of this simulator.

本项目基于 shykai 的 [MWICombatSimulatorTest](https://github.com/shykai/MWICombatSimulatorTest) 二次开发，感谢原作者及 KuganDev、Vlad (mwisim)、AmVoidGuy 等前人的工作。