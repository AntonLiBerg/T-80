#!/usr/bin/env node
"use strict";

const { Client } = require("ssh2");

if (process.argv.length !== 2) {
  console.error("No arguments allowed.");
  process.exit(2);
}

const HOST = "127.0.0.1";
const PORT = 2222;
const USERNAME = "test";
const PASSWORD = "test";
const COMMAND = "add testKey testPass";
const READY_MARKER = "Write command and press enter to perform:";
const SUCCESS_MARKERS = [
  "succesfully ran: addwith args: testKey,testPass",
  "succesfully ran: add with args: testKey,testPass",
];
const FAIL_MARKERS = [
  "command failed: addwith args: testKey,testPass",
  "command failed: add with args: testKey,testPass",
];

function includesAny(haystack, needles) {
  return needles.some((needle) => haystack.includes(needle));
}

const conn = new Client();
let output = "";
let sent = false;
let finished = false;

const timer = setTimeout(() => {
  if (!finished) {
    finished = true;
    conn.end();
    console.error("Timeout waiting for SSH flow to complete.");
    if (output) process.stdout.write(output);
    process.exit(1);
  }
}, 15000);

function finish(code) {
  if (finished) return;
  finished = true;
  clearTimeout(timer);
  if (output) process.stdout.write(output);
  process.exit(code);
}

conn.on("ready", () => {
  conn.shell(false, (err, stream) => {
    if (err) {
      console.error(`Failed to open shell: ${err.message}`);
      finish(1);
      return;
    }

    stream.on("data", (chunk) => {
      output += chunk.toString("utf8");
      if (!sent && output.includes(READY_MARKER)) {
        sent = true;
        stream.write(`${COMMAND}\n`);
        setTimeout(() => {
          stream.end();
          conn.end();
        }, 900);
      }
    });

    stream.on("close", () => {
      if (includesAny(output, SUCCESS_MARKERS)) {
        finish(0);
        return;
      }
      if (includesAny(output, FAIL_MARKERS)) {
        finish(1);
        return;
      }
      console.error("Could not determine command result from server output.");
      finish(1);
    });
  });
});

conn.on("error", (err) => {
  console.error(`SSH connection error: ${err.message}`);
  finish(1);
});

conn.connect({
  host: HOST,
  port: PORT,
  username: USERNAME,
  password: PASSWORD,
  readyTimeout: 5000,
});
