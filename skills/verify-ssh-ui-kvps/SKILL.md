---
name: verify-ssh-ui-kvps
description: Rebuild the SSH service and validate that the SSH connect screen renders rows from the Postgres `kvps` table. Use when checking makeUI output, regressions like `[object Object]`, or verifying that DB content is shown in the SSH banner.
---

# Verify SSH UI KVPS

Run this skill when you need an end-to-end, command-driven verification that:

1. `npm run build` succeeds.
2. `docker compose -f docker-compose.dev.yaml up --build -d ssh-service` deploys latest server code.
3. SSH login to `test@127.0.0.1:2222` shows the connect UI.
4. The UI contains all rows from `kvps` (id/key/value/created_at/updated_at).
5. UI does not contain `[object Object]`.

## One Command

```bash
node skills/verify-ssh-ui-kvps/scripts/run_check.js
```

## Commands Included

The script executes these checks directly:

```bash
npm run build
docker compose -f docker-compose.dev.yaml up --build -d ssh-service
docker compose -f docker-compose.dev.yaml exec -T db psql -U t80 -d t80 -tAc "<kvps query>"
```

It also opens an SSH session (`test/test` on `127.0.0.1:2222`) to capture the banner output and compare it with DB rows.
