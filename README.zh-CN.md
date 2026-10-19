# WE Backdrop Augmentation Protocol 一致性测试

[English](README.md) | 简体中文

面向 BAP Host、Component、Companion 和组件包实现的一致性测试、Fixtures、
测试运行器和报告格式。

协议一致性通过并不代表通过 Wallpaper Engine 平台审核、安全审计或内容
质量审核。

## MVP 开发状态

初始测试套件目前维护一份小型本地契约，直到 `spec` 仓库发布机器可读的
Schema。当前覆盖：

- Manifest 和消息信封校验；
- Host/Component 生命周期转换；
- Fixtures 检查；
- JSON 报告生成。

适配器可以将真实实现转换为测试所需的最小 Subject 接口，不依赖尚未完成的
SDK API。

```sh
npm install
npm test
npm run conformance
```
