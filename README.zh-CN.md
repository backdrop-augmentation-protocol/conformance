# WE Backdrop Augmentation Protocol 一致性测试

[English](README.md) | 简体中文

面向 BAP Host、Component、Companion 和组件包实现的一致性测试、Fixtures、
测试运行器和报告格式。

## 安装后的命令

```sh
npm install --save-dev @backdrop-augmentation-protocol/conformance
npx bap-conformance --report reports/conformance.json
npx bap-check-we-package <壁纸包目录> [更多目录]
```

安装后的命令使用随包附带、固定版本的 Core Schema 和 WE 分发 Profile，
不需要相邻的源码仓库。`bap-conformance` 报告检查示例 Core Schema Fixtures 和明确标记为草案的 BAP 0.2.0 桌面组合 Fixtures；草案检查不能证明协议已冻结兼容，也不能认定运行中的实现已通过一致性测试。

协议一致性通过并不代表通过 Wallpaper Engine 平台审核、安全审计或内容
质量审核。

## MVP 开发状态

测试套件直接读取 `spec` 仓库的机器可读 Schema。当前覆盖：

- Manifest 和消息信封校验；
- Host/Component 生命周期转换；
- Fixtures 检查；
- Core Schema 示例 Fixtures 的 JSON 报告生成；
- 明确标记为草案的桌面组件组合契约检查；该检查不能证明运行中的实现符合协议或草案已冻结。

WE Web 壁纸包可以运行 `npm run check:we-package -- <目录>`，按照
[WE Web/Workshop 分发 Profile](https://github.com/backdrop-augmentation-protocol/spec/blob/main/profiles/we-web-workshop/README.zh-CN.md)
检查项目元数据、入口、预览资源和 BAP 组件 Manifest。本地开发和调试阶段可不运行；
首次发布到 Workshop 之前及已发布项目的每次更新，都必须运行。静态检查通过不代表
编辑器或平台审核通过。

```sh
npm install
npm test
npm run conformance
npm run check:we-package -- <目录>
```
