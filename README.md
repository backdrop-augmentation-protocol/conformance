# WE Backdrop Augmentation Protocol Conformance

[English](README.md) | [简体中文](README.zh-CN.md)

Automated conformance tests, fixtures, runners, and report formats for BAP Host, Component, Companion, and package implementations.

Protocol conformance does not by itself imply Wallpaper Engine platform approval, security audit approval, or content-quality approval.

## MVP development

The suite consumes the machine-readable schemas from the public `spec` repository. In a checkout of the BAP monorepo it uses the sibling `spec` directory; in a standalone checkout `npm run spec:install` pins and caches the configured spec commit. `BAP_SPEC_DIR` can point to another verified spec checkout, and `BAP_SPEC_REF` selects the install commit. The runner validates the official Manifest, Message, and Error contracts, covers Host/Component/Companion roles, lifecycle transitions, fixture checks, and writes a JSON report including the spec source.

```sh
npm install
npm test
npm run conformance
```
