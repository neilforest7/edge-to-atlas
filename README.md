# Edge Atlas Bridge

Local browser extension and native messaging host for sending the current tab between Microsoft Edge and ChatGPT Atlas on macOS.

## Status

This repository is being built as a local development tool. The extension opens the current `http` or `https` tab in the paired browser: Edge sends to Atlas, and Atlas sends to Edge. It does not migrate cookies or sessions.

## Local Install

1. Download `edge-to-atlas-release-*.zip` from the latest GitHub Release:
   <https://github.com/neilforest7/edge-to-atlas/releases/latest>
2. Unzip the release package to a stable local folder.
3. In Edge, open `edge://extensions`, enable Developer mode, and load the unzipped `extension/` directory as an unpacked extension.
4. In ChatGPT Atlas, open its extension manager, enable Developer mode, and load the same unzipped `extension/` directory as an unpacked extension.
5. From the unzipped release folder, run the native host installer once:

```sh
npm run install:native-host
```

This installer writes the Edge and Atlas native messaging manifests under your macOS user profile. Run it again if you move the unzipped release folder, because the native host runner points back to that folder.

The extension has fixed development ID `pocicjaeampgbnhkkkhdmnnehdgjfmgk` in both browsers.

After registration, clicking the extension in Edge opens the current `http` or `https` URL in ChatGPT Atlas. Clicking the same extension in Atlas opens the current `http` or `https` URL in Microsoft Edge.

## Development

```sh
git clone https://github.com/neilforest7/edge-to-atlas.git
cd edge-to-atlas
npm test
```

For source-based local development, load the repository `extension/` directory in both browsers, then run `npm run install:native-host` from the repository root.

## Packaging

```sh
npm run package
```

This writes two ignored artifacts under `dist/`:

- `edge-atlas-bridge-extension-v0.1.0.zip`: extension-only archive with `manifest.json` at the zip root. Load the same extension in both Edge and Atlas.
- `edge-to-atlas-release-v0.1.0.zip`: full local release bundle with the extension, native host, installer, docs, and package metadata.
