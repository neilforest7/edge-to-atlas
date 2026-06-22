# Edge to Atlas

Local Microsoft Edge extension and native messaging host for opening the current Edge tab in ChatGPT Atlas on macOS.

## Status

This repository is being built as a local development tool. The MVP opens the current `http` or `https` tab in ChatGPT Atlas; it does not migrate cookies or sessions.

## Development

```sh
npm test
```

The extension is intended for local sideloading through `edge://extensions`.

## Local Install

1. Open `edge://extensions`, enable Developer mode, and load the `extension/` directory as an unpacked extension.
2. Copy the extension ID shown by Edge.
3. Register the native messaging host:

```sh
npm run install:native-host -- --extension-id <edge-extension-id>
```

After registration, clicking the extension action on an `http` or `https` page opens the same URL in ChatGPT Atlas.
