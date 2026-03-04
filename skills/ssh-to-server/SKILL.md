---
name: ssh-to-server
description: Connect to the local SSH microservice at 127.0.0.1:2222 with test/test, send the fixed command `add testKey testPass`, and verify the inserted row exists in Postgres table `kvps`. Use when validating end-to-end SSH command handling and database persistence in T-80.
---

# SSH To Server

Run this fixed flow only:

1. SSH to `test@127.0.0.1` on port `2222` with password `test`.
2. Send `add testKey testPass` and press enter.
3. Check `kvps` for key `testKey` with value `testPass`.

## Preconditions

- Run from repository root: `/root/repo/T-80`.
- Start services first with `npm run dev`.
- Ensure schema exists (`npm run dev` now applies `db/init.sql` each run).

## Commands

- Preferred one-shot command:

```bash
bash skills/ssh-to-server/scripts/run_ssh_add_and_check.sh
```

This wrapper deletes existing `testKey` first so repeated runs do not fail on the unique key constraint.

- Under the hood:

```bash
node skills/ssh-to-server/scripts/ssh_add_test_kvp.js
bash skills/ssh-to-server/scripts/check_test_kvp.sh
```

## Manual fallback (exact SSH command)

```bash
ssh -q -p 2222 test@127.0.0.1
# password: test
# then type:
add testKey testPass
```

Then verify:

```bash
docker compose -f docker-compose.dev.yaml exec -T db \
  psql -U t80 -d t80 -c \
  "SELECT key, value FROM kvps WHERE key='testKey' AND value='testPass';"
```

## Hardcoded Values

- SSH target: `127.0.0.1:2222`
- Username: `test`
- Password: `test`
- Command sent: `add testKey testPass`
- DB/table check: `t80.kvps`
