# WE Backdrop Augmentation Protocol Conformance

[English](README.md) | [简体中文](README.zh-CN.md)

Automated conformance tests, fixtures, runners, and report formats for BAP Host, Component, Companion, and package implementations.

Protocol conformance does not by itself imply Wallpaper Engine platform approval, security audit approval, or content-quality approval.

For Web wallpaper packages, `npm run check:we-package -- <directory>` checks the
[WE Web/Workshop distribution profile](https://github.com/backdrop-augmentation-protocol/spec/blob/main/profiles/we-web-workshop/README.md).
This check is optional during local-only development but required before a BAP
WE Web wallpaper is first published or updated on Workshop. It reads the
profile Schema from the pinned `spec` checkout, checks package
entrypoints and preview paths, and validates a BAP Component Manifest when
present. This is a static preflight, not an editor or platform approval test.

## MVP development

The suite consumes the machine-readable schemas from the public `spec` repository. In a checkout of the BAP monorepo it uses the sibling `spec` directory; in a standalone checkout `npm run spec:install` pins and caches the configured spec commit. `BAP_SPEC_DIR` can point to another verified spec checkout, and `BAP_SPEC_REF` selects the install commit. Unit tests cover the specified lifecycle state machine and schema fixtures. The `conformance` command currently writes a Core schema-fixture report for sample Host, Component, and Companion manifests and messages; it does not yet certify a running implementation.

```sh
npm install
npm test
npm run conformance
```
