# Edge Atlas Bridge

Local browser extension and native messaging host for sending the current tab between Microsoft Edge and ChatGPT Atlas on macOS.

## Status

This repository is being built as a local development tool. The extension opens the current `http` or `https` tab in the paired browser: Edge sends to Atlas, and Atlas sends to Edge. It does not migrate cookies or sessions.

## Local Install

1. In Edge, open `edge://extensions`, enable Developer mode, and load the `extension/` directory as an unpacked extension.
2. In ChatGPT Atlas, open its extension manager, enable Developer mode, and load the same `extension/` directory as an unpacked extension.
3. Register both native messaging host manifests:

```sh
npm run install:native-host
```

The extension has fixed development ID `pocicjaeampgbnhkkkhdmnnehdgjfmgk` in both browsers.

After registration, clicking the extension in Edge opens the current `http` or `https` URL in ChatGPT Atlas. Clicking the same extension in Atlas opens the current `http` or `https` URL in Microsoft Edge.

## Development

```sh
npm test
```

The extension is intended for local sideloading through `edge://extensions`.

## Packaging

```sh
npm run package
```

This writes two ignored artifacts under `dist/`:

- `edge-atlas-bridge-extension-v0.1.0.zip`: extension-only archive with `manifest.json` at the zip root. Load the same extension in both Edge and Atlas.
- `edge-to-atlas-release-v0.1.0.zip`: full local release bundle with the extension, native host, installer, docs, and package metadata.
