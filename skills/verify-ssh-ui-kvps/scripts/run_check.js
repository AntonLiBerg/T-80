#!/usr/bin/env node
"use strict";

const { execSync } = require("node:child_process");
const path = require("node:path");
const { Client } = require("ssh2");

if (process.argv.length !== 2) {
  console.error("No arguments allowed.");
  process.exit(2);
}

const REPO_ROOT = path.resolve(__dirname, "../../..");
const READY_MARKER = "Write command and press enter to perform:";
const EMPTY_MARKER = "(kvps table is empty)";

function runCommand(cmd, inheritOutput = false) {
  if (inheritOutput) {
    console.error(`$ ${cmd}`);
    execSync(cmd, { cwd: REPO_ROOT, stdio: "inherit" });
    return "";
  }
  return execSync(cmd, { cwd: REPO_ROOT, encoding: "utf8" });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeLines(input) {
  return input
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function captureSshUi() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let output = "";
    let closing = false;

    const timer = setTimeout(() => {
      conn.end();
      reject(new Error("Timed out waiting for SSH UI."));
    }, 15000);

    function closeAndResolve() {
      if (closing) return;
      closing = true;
      setTimeout(() => {
        conn.end();
      }, 150);
    }

    conn.on("ready", () => {
      conn.shell(false, (err, stream) => {
        if (err) {
          clearTimeout(timer);
          reject(new Error(`Unable to open shell: ${err.message}`));
          return;
        }

        stream.on("data", (chunk) => {
          output += chunk.toString("utf8");
          if (output.includes(READY_MARKER)) {
            closeAndResolve();
          }
        });

        stream.on("close", () => {
          clearTimeout(timer);
          resolve(output);
        });
      });
    });

    conn.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`SSH connection failed: ${err.message}`));
    });

    conn.connect({
      host: "127.0.0.1",
      port: 2222,
      username: "test",
      password: "test",
      readyTimeout: 5000,
    });
  });
}

async function captureSshUiWithRetry(attempts) {
  let lastError = null;
  for (let i = 1; i <= attempts; i += 1) {
    try {
      return await captureSshUi();
    } catch (err) {
      lastError = err;
      await sleep(1000);
    }
  }
  throw lastError ?? new Error("Unable to capture SSH UI.");
}

function fetchKvpRows() {
  const sql = `
SELECT json_build_object(
  'id', id::text,
  'key', key,
  'value', replace(replace(value, E'\\\\r', '\\\\\\\\r'), E'\\\\n', '\\\\\\\\n'),
  'created_at', to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'updated_at', to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
)::text
FROM kvps
ORDER BY id;
`;

  const output = execSync(
    "docker compose -f docker-compose.dev.yaml exec -T db psql -U t80 -d t80 -tA",
    { cwd: REPO_ROOT, encoding: "utf8", input: sql },
  );

  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const parsed = JSON.parse(line);
    return {
      ...parsed,
      value: String(parsed.value).replace(/\r/g, "\\r").replace(/\n/g, "\\n"),
    };
  });
}

function verifyUiMatchesRows(uiOutput, rows) {
  if (!uiOutput.includes(READY_MARKER)) {
    throw new Error(`SSH output missing marker: "${READY_MARKER}"`);
  }

  if (uiOutput.includes("[object Object]")) {
    throw new Error("SSH UI still contains [object Object].");
  }

  if (rows.length === 0) {
    if (!uiOutput.includes(EMPTY_MARKER)) {
      throw new Error("kvps is empty but UI did not show empty-table marker.");
    }
    return;
  }

  const uiLines = normalizeLines(uiOutput);
  const missingRows = [];

  for (const row of rows) {
    const fields = [
      row.id,
      row.key,
      row.value,
      row.created_at,
      row.updated_at,
    ];

    const found = uiLines.some((line) => fields.every((field) => line.includes(field)));
    if (!found) {
      missingRows.push(row);
    }
  }

  if (missingRows.length > 0) {
    throw new Error(
      `UI is missing ${missingRows.length} kvps row(s): ${JSON.stringify(missingRows)}`,
    );
  }
}

async function main() {
  runCommand("npm run build", true);
  runCommand("docker compose -f docker-compose.dev.yaml up --build -d ssh-service", true);

  const uiOutput = await captureSshUiWithRetry(12);
  process.stdout.write(`${uiOutput}\n`);

  const rows = fetchKvpRows();
  verifyUiMatchesRows(uiOutput, rows);

  console.log(`PASS: SSH UI contains all ${rows.length} row(s) from kvps.`);
}

main().catch((err) => {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
});
