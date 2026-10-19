# WE Backdrop Augmentation Protocol Conformance

Automated conformance tests, fixtures, runners, and report formats for BAP Host, Component, Companion, and package implementations.

Protocol conformance does not by itself imply Wallpaper Engine platform approval, security audit approval, or content-quality approval.

## MVP development

The initial suite owns a small local contract until the `spec` repository
publishes machine-readable schemas. It covers manifest and message-envelope
validation, Host/Component lifecycle transitions, fixture checks, and a JSON
report. An adapter can turn a real implementation into the small conformance
subject interface without depending on an unfinished SDK API.

```sh
npm install
npm test
npm run conformance
```
