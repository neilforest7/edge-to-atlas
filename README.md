# Edge to Atlas

Local Microsoft Edge extension and native messaging host for opening the current Edge tab in ChatGPT Atlas on macOS.

## Status

This repository is being built as a local development tool. The MVP opens the current `http` or `https` tab in ChatGPT Atlas; it does not migrate cookies or sessions.

## Development

```sh
npm test
```

The extension is intended for local sideloading through `edge://extensions`.
