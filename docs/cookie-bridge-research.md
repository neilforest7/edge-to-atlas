# Cookie Bridge Research

## Decision

The MVP does not copy cookies, passwords, or browser sessions from Edge to Atlas. It only opens the current URL in Atlas.

## Current Findings

- Atlas supports first-party import flows for browser data. OpenAI documents importing passwords, bookmarks, history, and settings from another browser.
- Atlas release notes also mention "Site Data" import from Chrome, which covers cookies and related site data through Atlas-owned import code.
- Local browser data is Chromium-shaped but not identical:
  - Edge default profile: `~/Library/Application Support/Microsoft Edge/Default/`
  - Atlas browser profiles: `~/Library/Application Support/com.openai.atlas/browser-data/host/`
  - Edge `cookies` schema includes Edge-specific columns such as `is_edgelegacycookie` and `browser_provenance`.
  - Both browsers store sensitive cookie payloads in `encrypted_value`.

## Risk Boundary

Direct cookie copying is not a safe MVP feature. It would need to prove all of the following before implementation:

- The source and target profile are closed or copied to a temporary read-only location before inspection.
- `encrypted_value` can be decrypted and re-encrypted for the target browser without weakening local storage protections.
- Schema differences are mapped without dropping security-related fields.
- The tool never exports cookie values in logs, reports, tests, or commits.
- The user explicitly opts into each target domain or profile migration.

## Read-only Audit

Run:

```sh
npm run audit:cookie-bridge
```

The script discovers Edge and Atlas Chromium profile artifacts, then reads only `.schema cookies` through `sqlite3 -readonly`. It does not query cookie rows, decrypt values, or write to either browser profile.
