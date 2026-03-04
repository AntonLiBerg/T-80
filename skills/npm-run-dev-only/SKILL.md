---
name: npm-run-dev-only
description: Run exactly `npm run dev` in the project root and nothing else. Use when the user asks to start the npm development server with a hardcoded single-command action.
---

# NPM Run Dev Only

Run only this command:

```bash
npm run dev
```

## Rules

1. Run from the repository root.
2. Use no arguments, flags, prefixes, suffixes, pipes, or chained commands.
3. Run no other command as part of this skill action.
4. If asked for anything else, state that this skill only supports `npm run dev`.

## Script

Use `scripts/run_dev.sh` to enforce the one-command behavior.
