# bob-herdr

bob-herdr makes IBM Bob report its status to [herdr](https://herdr.dev), so
the Herdr app shows Bob as idle, working or done. It also lets you start Bob
with a first prompt (`bob "fix the failing test"`) and adds Bob to the app's
**Start an agent** menu.

herdr-core shows an agent's status only when the agent reports it with
[OSC 7501](https://superlogical.com/rex/docs/build/program-status), the
Program Status Protocol. Claude Code, Codex and Pi report it; Bob 2.0.9 does
not. bob-herdr reports it for Bob through Bob's hooks and a `bob` shim.

bob-herdr is unofficial and is not an IBM product.

## Features

- **Status:** the Herdr app shows Bob as idle, working or done in its agents
  sidebar and tab bar, and plays its notifications and sounds for Bob.
- **First prompt:** `bob "fix the failing test"` starts Bob and types the
  prompt in once Bob is ready. The Herdr app and `hc run bob "task"` pass a
  task to Bob this way.
- **Herdr app entry:** Bob's tabs show its name and icon, and **+ → Start an
  agent** lists IBM Bob.

## Requirements

- [Bob](https://www.npmjs.com/package/@ibm/bob) on your `PATH`, installed
  with `bun add -g @ibm/bob` or `npm install -g @ibm/bob`.
- [herdr-core](https://herdr.dev/core/) (`hc`). The Herdr app is optional.
- Node, which Bob also needs.
- macOS 13 or later, or Linux. The scripts call `realpath`, which older macOS
  versions do not have.

## Install

```sh
git clone https://github.com/gillesdandrea/bob-herdr.git
bob-herdr/bin/bob-herdr install
```

`install` makes three changes. Running it again changes nothing.

1. It links `bob-herdr` and the `bob` shim into `~/.local/bin`. That folder
   must come before the real `bob` on your `PATH`: see
   [PATH order](#path-order).
2. It adds two hooks to `~/.bob/settings/settings.json`. Your other hooks
   stay as they are.
3. If the Herdr app is installed, it adds a `bob` entry to
   `~/.config/herdr-app/programs.json` and copies an icon to
   `~/.config/herdr-app/bob-herdr/`. The entry starts the shim by its full
   path, `~/.local/bin/bob`. The icon is Bob's mascot when the IBM Bob IDE is
   installed, and a plain robot glyph otherwise. If the entry already exists,
   `install` keeps your own fields, such as a custom `run`, and only replaces
   the icon.

The links and the hooks point into the clone, so `git pull` updates them.

```sh
bob-herdr status      # what is installed, and which bob runs
bob-herdr uninstall   # remove the links, the hooks and the app entry
```

### PATH order

The shim and the real Bob are both named `bob`, and the shell runs the one
that comes first on `PATH`. The herdr-core server has its own `PATH`: see
[Run Bob with hc](#run-bob-with-hc). If the real Bob comes first, the hooks still
report working and done, but Bob never shows as idle, the shim does not type
a first prompt in, and the status is not cleared when Bob exits.

`bob-herdr status` prints which `bob` runs. The real Bob is in a different
folder depending on how you installed it:

| Installed with | Real `bob` in |
|---|---|
| `bun add -g` | `~/.bun/bin` |
| `npm install -g` | your Node's `bin` folder, or the shims folder of a version manager such as mise or asdf |

Put `~/.local/bin` ahead of that folder in the file that sets your `PATH`
(`~/.zshenv`, `~/.zprofile`, `~/.bashrc`, ...), then open a new shell. A
version manager that changes `PATH` in interactive shells, such as
`mise activate`, can put its folders back in front, so check again in a new
terminal.

An npm global install belongs to one Node version. After a Node upgrade, the
version manager's `bob` shim can fail with "No version is set". A
`bun add -g` install does not depend on the Node version.

## Use

In an hc terminal, such as a pane in the Herdr app:

```sh
bob "fix the failing test in src/x.ts"
bob --mode plan "outline the refactor"
```

Bob's options go before the prompt. The shim recognizes the options of `bob`
and `bob chat` in Bob 2.0.9. Write any other option that takes a value as
`--option=value`, or put the prompt after `--`. With `--`, the shim passes
everything before it to Bob unchanged:

```sh
bob --new-option=value "the prompt"
bob --new-option value -- "the prompt"
```

Outside an hc terminal, Bob starts without the prompt, and the shim prints
a message saying so. `bob -p`, `bob run`, `bob mcp` and `bob acp` run Bob
directly, without the shim.

### Run Bob with hc

From any terminal, including another agent's:

```sh
hc run --bg --name fix --cwd ~/src/app ~/.local/bin/bob "fix the failing test in x.ts"
hc wait fix                  # wait until Bob's turn is done
hc read --lines 50 fix       # print its screen
hc send fix "now add a test for the empty case"
hc attach fix                # take over; ctrl+\ detaches
hc kill fix && hc rm fix     # when you accept the work
```

`hc get fix` shows Bob's status, and `hc ls` lists the terminal with your
other terminals. In the Herdr app, Bob appears in the agents sidebar. A
terminal started without a pane opens in peek.

The examples call the shim by its full path because terminals started with
`hc run`, and templates, look up commands in the herdr-core server's `PATH`,
not in your shell's. The server keeps the `PATH` it had when it started. If
it started before you put `~/.local/bin` first, a bare `bob` runs the real
Bob, without the shim. `hc server restart`, run from a shell with your
current `PATH`, gives the server that `PATH`; running terminals and their
programs keep going. The server takes the whole environment of the shell
that restarts it.

Panes in the Herdr app run your shell, which sets its own `PATH`, so a bare
`bob` works there.

A [herdr-core template](https://herdr.dev/core/) gives Bob a fixed role. Save
it as `~/.config/herdr-core/templates/bob-reviewer.md`:

```markdown
---
name: bob-reviewer
description: Bob reviews a change, read-only
command: $HOME/.local/bin/bob --mode ask
---
Review the change below. Do not edit files. Report findings by severity.
```

Then run `hc run --bg --name review bob-reviewer "review the diff on this branch"`.
herdr-core types the template's text and the task into Bob when the shim
reports that Bob is ready.

Bob never reports blocked (see [Limitations](#limitations)). While Bob waits
for your approval, `hc wait` keeps waiting until it times out. If a wait
takes longer than expected, check the screen with `hc read`, then answer
with `hc keys fix enter` or `hc attach fix`.

## How it works

Bob's hooks report its status to the terminal as OSC 7501:

| Bob event | Status |
|---|---|
| `UserPromptSubmit` | working |
| `Stop` | done |

Bob runs its `SessionStart` hook at the first prompt, not at launch, so the
shim reports idle instead.

The `bob` shim runs the next `bob` on `PATH` that is not a bob-herdr shim. In
an hc terminal, the shim also:

1. Waits with `hc wait --output` until Bob's input box is on screen. If Bob
   first asks whether to trust the folder, the wait lasts until you answer.
2. Without a prompt, reports idle, so Bob appears as an agent as soon as it
   is ready. herdr-core templates rely on this: they type their first
   message after the agent first reports a status.
3. With a prompt, types it in with `hc send` and reports nothing itself. The
   hook reports working once Bob has the prompt, so an `hc wait` started
   with Bob lasts until the first turn is done.
4. Clears the status when Bob exits.

Before it reports or types, the shim checks that Bob is still running, so a
prompt never lands in the shell after Bob has exited. If the prompt cannot
be typed in, the status shows idle with a message saying why.

## Limitations

Bob's hooks cannot report everything OSC 7501 supports:

- **No blocked status.** Bob has no hook for permission prompts, and
  `PreToolUse` runs before Bob checks the approval. While Bob waits for your
  approval, it shows as working.
- **Cancelled turns stay working.** `Stop` does not run when you cancel a
  turn with Esc or Ctrl-C. Your next prompt sets the status again.
- **No error status.** No hook runs when a turn fails.

The shim and the protocol add their own limits:

- **Ready detection reads the screen.** The shim waits for the text
  `/ for commands` in Bob's placeholder line
  (`Build Anything, @ for context, / for commands`). If a Bob release changes
  that line, set `BOB_HERDR_READY_TEXT`. `hc wait --output` sees only output
  printed after it starts listening, so the shim starts listening 0.3 seconds
  before it starts Bob. If Bob still draws its input box first, the wait
  ends after `BOB_HERDR_READY_TIMEOUT` and the prompt is not typed in.
- **Options the shim does not know.** An unknown option followed by a
  separate value makes that value part of the prompt. Use `--option=value`
  or `--` (see [Use](#use)).
- **Exiting Bob clears every status record in the terminal.** OSC 7501
  addresses a terminal's main status record only by clearing all records, so
  a done status left by an earlier program in the same pane disappears too.
- **macOS 13 or later.** The scripts need `realpath`.

These limits go away when Bob reports OSC 7501 itself, as Codex does.

## Settings

| Variable | Default | Effect |
|---|---|---|
| `BOB_HERDR_STATUS` | on in hc terminals only | `1`: the hooks and the shim report status in any terminal. `0`: they never report. The shim still types a first prompt in. |
| `BOB_HERDR_BOB` | the next `bob` on `PATH` | The real Bob that the shim runs. It must not be a bob-herdr shim. |
| `BOB_HERDR_READY_TEXT` | `/ for commands` | The text that shows Bob's input box is ready |
| `BOB_HERDR_READY_TIMEOUT` | `600` | Seconds to wait for that text |
| `BOB_HERDR_BIN_DIR` | `~/.local/bin` | Where `install` creates the links |
| `BOB_HERDR_BOB_SETTINGS` | `~/.bob/settings/settings.json` | The Bob settings file that `install` edits |
| `BOB_HERDR_APP_HOME` | `~/.config/herdr-app` | The Herdr app folder that `install` edits |

With `BOB_HERDR_STATUS=1` outside an hc terminal, the shim reports and clears
the status, but it cannot detect when Bob is ready or type a prompt in.

## Testing

[docs/testing.md](docs/testing.md) is a test plan for a coding agent running
in the Herdr app.

## License

[MIT](LICENSE)
