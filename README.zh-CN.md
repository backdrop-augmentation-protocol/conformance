# WE Backdrop Augmentation Protocol 一致性测试

[English](README.md) | 简体中文

面向 BAP Host、Component、Companion 和组件包实现的一致性测试、Fixtures、
测试运行器和报告格式。

协议一致性通过并不代表通过 Wallpaper Engine 平台审核、安全审计或内容
质量审核。

## MVP 开发状态

测试套件直接读取 `spec` 仓库的机器可读 Schema。当前覆盖：

- Manifest 和消息信封校验；
- Host/Component 生命周期转换；
- Fixtures 检查；
- JSON 报告生成。

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
