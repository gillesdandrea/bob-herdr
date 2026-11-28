// `bob-herdr hook`: reports a Bob hook event as OSC 7501, and hands Bob's
// task to the shim, which reports it as OSC 7577 (see resume.mjs). The
// event's JSON arrives on stdin, and the report, e.g.
// `state=blocked:kind=permission:app=bob:msg=...`, goes to the terminal
// itself. Nothing goes to stdout: Bob reads a hook's stdout as its answer.
//
// Bob runs this on every event and waits for it, so it is one process.
// bin/bob-herdr starts it only when status reports are on, given as `1`, or
// the shim reports how to resume Bob.
//
//   node hook.mjs [1] < event.json

import fs from "node:fs";

const MAX = 100;
const QUESTION = "ask_followup_question";

// A `msg` pair: the text on one line, cut to MAX characters, in base64 as
// the protocol wants. Empty when there is no text.
function msg(value) {
  if (typeof value !== "string") return [];
  const chars = [...value.replace(/\s+/g, " ").trim()];
  if (chars.length === 0) return [];
  const line = chars.length > MAX ? `${chars.slice(0, MAX - 1).join("")}…` : chars.join("");
  return [`msg=${Buffer.from(line).toString("base64")}`];
}

const firstLine = (value) => (typeof value === "string" ? value.split("\n").find((line) => line.trim()) : undefined);

// What Bob wants approved: the tool, and its command or file when it has one.
function request(event) {
  const detail = event.tool_input?.command ?? event.tool_input?.path;
  return typeof detail === "string" ? `${event.tool_name}: ${detail}` : event.tool_name;
}

// The pairs of a report: the state, the kind of a blocked state, a message.
const pairs = (state, kind, text) =>
  [`state=${state}`, ...(kind ? [`kind=${kind}`] : []), "app=bob", ...msg(text)].join(":");

function report(event) {
  switch (event.hook_event_name) {
    // At launch the shim reports idle; this is `/clear` or `/new`.
    case "SessionStart":
      return event.source === "clear" ? pairs("idle") : "";
    case "UserPromptSubmit":
      return pairs("working");
    case "PreToolUse":
      return event.tool_name === QUESTION ? pairs("blocked", "question", event.tool_input?.question) : "";
    case "PostToolUse":
      return event.tool_name === QUESTION ? pairs("working") : "";
    case "PermissionRequest":
      return pairs("blocked", "permission", request(event));
    // `cancelled` means the task stopped before anyone answered.
    case "PermissionResolved":
      return pairs(event.decision === "cancelled" ? "idle" : "working");
    case "Stop":
      return pairs("done", undefined, firstLine(event.last_assistant_message));
    default:
      return "";
  }
}

// The task to resume after this event: a task id, null for a fresh Bob, or
// undefined to leave the record as it is. The shim reported a fresh Bob, or
// the task given with `-r`, before Bob started. A new task has no id that
// `-r` can open until its first prompt; `/clear` and `/new` start one.
function task(event) {
  switch (event.hook_event_name) {
    case "SessionStart":
      if (event.source === "clear") return null;
      return event.source === "startup" ? undefined : event.session_id;
    case "UserPromptSubmit":
      return event.session_id;
    default:
      return undefined;
  }
}

// Writes the task to $BOB_HERDR_STATE/task, an empty line for a fresh Bob,
// and signals the shim, whose process id is in $BOB_HERDR_STATE/resume.
// Renamed into place, so the shim never reads half a line.
function handOver(id) {
  const dir = process.env.BOB_HERDR_STATE;
  if (!dir) return;
  try {
    const pid = Number(fs.readFileSync(`${dir}/resume`, "utf8"));
    if (!Number.isInteger(pid) || pid <= 1) return;
    const tmp = `${dir}/task.${process.pid}`;
    fs.writeFileSync(tmp, `${id ?? ""}\n`);
    fs.renameSync(tmp, `${dir}/task`);
    process.kill(pid, "SIGUSR1");
  } catch {
    // The shim has exited and removed the folder.
  }
}

// Under the shim, keeps the report in $BOB_HERDR_STATE/last, so the shim
// knows it without asking the terminal. Written before the report goes out,
// and renamed into place, so the shim never reads half a line.
function remember(out) {
  const dir = process.env.BOB_HERDR_STATE;
  if (!dir) return;
  try {
    const tmp = `${dir}/last.${process.pid}`;
    fs.writeFileSync(tmp, `${out}\n`);
    fs.renameSync(tmp, `${dir}/last`);
  } catch {
    // The shim has exited and removed the folder.
  }
}

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  try {
    const event = JSON.parse(input);
    const id = task(event);
    if (id !== undefined) handOver(id);
    const out = process.argv[2] === "1" ? report(event) : "";
    if (!out) return;
    remember(out);
    fs.writeFileSync("/dev/tty", `\x1b]7501;${out}\x1b\\`);
  } catch {
    // Not an event, or no terminal: report nothing.
  }
});
