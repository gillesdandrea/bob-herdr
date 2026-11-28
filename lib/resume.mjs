// OSC 7577 (Program Resume Protocol) reports for Bob, sent by the bob shim.
// A report tells the terminal how to bring Bob back after the terminal
// restarts: the shim with Bob's options, plus `-r <task id>` once Bob has a
// task.
//
// The shim takes OSC7577_TOKEN out of Bob's environment and keeps it in its
// own memory, so that Bob and the commands it runs cannot report. It gives
// this script the record on stdin, one value per line: the shim's process
// id, which owns the record; the command without `-r`, as the protocol's
// comma-separated base64; the working directory in base64; the token.
//
//   node resume.mjs report [task id] < record
//   node resume.mjs clear < record

import crypto from "node:crypto";
import fs from "node:fs";
import { pathToFileURL } from "node:url";

// The protocol's minimums: a terminal must accept a report within them.
const MAX_BYTES = 2048;
const MAX_ARGS = 64;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
// Bob's task ids are hex; anything else is not reported.
const TASK_ID = /^[A-Za-z0-9_-]+$/;

const b64 = (text) => Buffer.from(text).toString("base64");

// Decoded text the protocol accepts: valid UTF-8 without control characters.
function decodes(value) {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(value, "base64"));
    return !CONTROL.test(text);
  } catch {
    return false;
  }
}

export function parse(text) {
  const [pid, argv, cwd, token] = text.split("\n");
  return /^[1-9][0-9]*$/.test(pid) && argv && token ? { pid, argv, cwd, token } : null;
}

function seal(record, pairs) {
  const mac = crypto.createHash("sha256").update(`${pairs}:${record.token}`).digest("hex");
  return `\x1b]7577;${pairs}:mac=${mac}\x1b\\`;
}

export function clear(record) {
  return seal(record, `pid=${record.pid}:time=${Math.floor(Date.now() / 1000)}:clear=1`);
}

// The report that resumes `task`, or starts a fresh Bob when there is none.
// A command the protocol cannot carry, or one past its minimums, clears the
// record instead, so the terminal does not resume an earlier command.
export function report(record, task) {
  if (task && !TASK_ID.test(task)) return clear(record);
  const args = record.argv.split(",");
  if (task) args.push(b64("-r"), b64(task));
  if (args.length > MAX_ARGS || !args.every(decodes)) return clear(record);
  const cwd = record.cwd && decodes(record.cwd) ? `:cwd=${record.cwd}` : "";
  const seq = seal(record, `pid=${record.pid}:time=${Math.floor(Date.now() / 1000)}:argv=${args.join(",")}${cwd}`);
  return Buffer.byteLength(seq) > MAX_BYTES ? clear(record) : seq;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [cmd, task] = process.argv.slice(2);
  try {
    const record = parse(fs.readFileSync(0, "utf8"));
    if (record) fs.writeFileSync("/dev/tty", cmd === "clear" ? clear(record) : report(record, task));
  } catch {
    // No terminal.
  }
}
