// JSON edits for bob-herdr: Bob's hook settings and the Herdr app's
// programs.json. Node is always there: Bob runs on it.
//
//   node config.mjs hooks-add <settings.json> <command>
//   node config.mjs hooks-remove <settings.json>
//   node config.mjs hooks-count <settings.json>
//   node config.mjs program-add <programs.json> <icon> <tint> <bob path>
//   node config.mjs program-remove <programs.json>
//   node config.mjs program-show <programs.json>

import fs from "node:fs";
import path from "node:path";

const OURS = /bob-herdr"? hook\b/;
const ICON_DIR = "bob-herdr/";

function read(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return {};
    throw new Error(`${file}: ${e.message}`);
  }
}

// Written beside the file, then renamed over it: an interrupted write never
// leaves a half-written settings file. A symlinked file is written at its
// target, so the link stays a link, and the file keeps its permissions.
function write(file, data) {
  let target = file;
  let mode = 0o644;
  try {
    target = fs.realpathSync(file);
    mode = fs.statSync(target).mode & 0o777;
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.bob-herdr-${process.pid}`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode });
  fs.chmodSync(tmp, mode);
  fs.renameSync(tmp, target);
}

const ours = (h) => OURS.test(h?.command ?? "");
const groupsOf = (groups) => (Array.isArray(groups) ? groups : []);
const hooksOf = (group) => (Array.isArray(group?.hooks) ? group.hooks : []);
const eventsOf = (hooks) => (hooks && typeof hooks === "object" && !Array.isArray(hooks) ? Object.entries(hooks) : []);

// Drops our hooks, then any matcher group or event they leave empty (Bob's
// schema wants at least one hook per group). Anything else, valid or not,
// stays as it was.
function withoutOurs(hooks) {
  const out = {};
  for (const [event, groups] of eventsOf(hooks)) {
    if (!Array.isArray(groups)) {
      out[event] = groups;
      continue;
    }
    const kept = groups
      .map((g) => (Array.isArray(g?.hooks) && g.hooks.some(ours) ? { ...g, hooks: g.hooks.filter((h) => !ours(h)) } : g))
      .filter((g) => !Array.isArray(g?.hooks) || g.hooks.length > 0);
    if (kept.length > 0) out[event] = kept;
  }
  return out;
}

function countOurs(hooks) {
  return eventsOf(hooks)
    .flatMap(([, groups]) => groupsOf(groups))
    .flatMap(hooksOf)
    .filter(ours).length;
}

const [cmd, file, ...args] = process.argv.slice(2);

switch (cmd) {
  case "hooks-add": {
    const settings = read(file);
    const hook = { type: "command", command: args[0], timeout: 5 };
    // Also drops a SessionStart hook left by an older bob-herdr.
    const hooks = withoutOurs(settings.hooks);
    for (const event of ["UserPromptSubmit", "Stop"]) {
      hooks[event] = [...groupsOf(hooks[event]), { hooks: [hook] }];
    }
    write(file, { ...settings, hooks });
    break;
  }
  case "hooks-remove": {
    if (!fs.existsSync(file)) break;
    const settings = read(file);
    if (countOurs(settings.hooks) === 0) break;
    write(file, { ...settings, hooks: withoutOurs(settings.hooks) });
    break;
  }
  case "hooks-count":
    console.log(countOurs(read(file).hooks));
    break;
  case "program-add": {
    const table = read(file);
    const [icon, tint, bob] = args;
    const programs = { ...(table.programs ?? {}) };
    const existing = programs.bob ?? {};
    // Fields already in the entry win, so a reinstall keeps your own `run`
    // or name; only the icon is always ours. A `run` of plain ["bob"], from
    // an older bob-herdr, becomes the shim's full path.
    const run = !Array.isArray(existing.run) || (existing.run.length === 1 && existing.run[0] === "bob") ? [bob] : existing.run;
    programs.bob = {
      name: "IBM Bob",
      tile: "#1c1d21",
      color: "#ffffff",
      match: ["bob", "bob.js"],
      ...existing,
      run,
      icon,
      tint: tint === "true",
    };
    write(file, { ...table, programs });
    break;
  }
  case "program-remove": {
    if (!fs.existsSync(file)) break;
    const table = read(file);
    if (!table.programs?.bob?.icon?.startsWith(ICON_DIR)) break;
    const { bob, ...programs } = table.programs;
    write(file, { ...table, programs });
    break;
  }
  case "program-show": {
    const bob = read(file).programs?.bob;
    console.log(bob?.icon?.startsWith(ICON_DIR) ? JSON.stringify(bob) : "");
    break;
  }
  default:
    console.error(`config.mjs: unknown command ${cmd}`);
    process.exit(2);
}
