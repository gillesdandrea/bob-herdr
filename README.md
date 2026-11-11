# bob-herdr

bob-herdr makes IBM Bob report its status to [herdr](https://herdr.dev), so
the Herdr app shows Bob as idle, working, blocked or done. It also adds Bob
to the app's **Start an agent** menu.

herdr-core shows an agent's status only when the agent reports it with
[OSC 7501](https://superlogical.com/rex/docs/build/program-status), the
Program Status Protocol. Claude Code, Codex and Pi report it; Bob 2.1.0 does
not. bob-herdr reports it for Bob through Bob's hooks and a `bob` shim.

bob-herdr is unofficial and is not an IBM product.

## Features

- **Status:** the Herdr app shows Bob as idle, working, blocked or done in
  its agents sidebar and tab bar, and plays its notifications and sounds for
  Bob.
- **Blocked, with the reason:** when Bob waits for an approval, an answer to
  its question or a sign-in, the status says which and carries a short
  message, such as the command to approve. An `hc wait` ends at that point.
- **First prompt:** Bob takes a first prompt as an argument
  (`bob "fix the failing test"`), and the Herdr app and `hc run bob "task"`
  pass a task to Bob this way. The status then goes straight to working, so
  an `hc wait` started with Bob lasts until the first turn is done.
- **Herdr app entry:** Bob's tabs show its name and icon, and **+ → Start an
  agent** lists IBM Bob.

## Requirements

- [Bob](https://www.npmjs.com/package/@ibm/bob) 2.1.0 or later on your
  `PATH`, installed with `bun add -g @ibm/bob` or `npm install -g @ibm/bob`.
  Earlier versions are not supported: they do not take a first prompt as an
  argument, and the shim no longer types it in for them.
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
2. It adds seven hook entries to `~/.bob/settings/settings.json`. Your
   other hooks stay as they are.
3. If the Herdr app is installed, it adds a `bob` entry to
   `~/.config/herdr-app/programs.json` and copies an icon to
   `~/.config/herdr-app/bob-herdr/`. The entry starts the shim by its full
   path, `~/.local/bin/bob`. The icon is Bob's mascot when the IBM Bob IDE is
   installed, and a plain robot glyph otherwise. If the entry already exists,
   `install` keeps your own fields, such as a custom `run`, and only replaces
   the icon.

The links and the hooks point into the clone, so `git pull` updates them.
When a new version reports on more hook events, `bob-herdr status` shows
fewer status hooks than it expects, such as `2 of 7`: run `install` again.

```sh
bob-herdr status      # what is installed, and which bob runs
bob-herdr uninstall   # remove the links, the hooks and the app entry
```

### PATH order

The shim and the real Bob are both named `bob`, and the shell runs the one
that comes first on `PATH`. The herdr-core server has its own `PATH`: see
[Run Bob with hc](#run-bob-with-hc). If the real Bob comes first, the hooks
still report working, blocked and done, but Bob never shows as idle, and the
status is not cleared when Bob exits.

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

The shim passes every argument to Bob unchanged. It only checks whether they
hold a prompt, because it reports idle only when Bob starts without one. For
that check it knows the options of `bob` and `bob chat` in Bob 2.1.0. Write
any other option that takes a value as `--option=value`: the shim would take
a separate value for a prompt.

```sh
bob --new-option=value
```

`bob -p`, `bob run`, `bob mcp`, `bob extension` and `bob acp` run Bob
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

When Bob needs you, `hc wait` ends with the status blocked, and
`hc get fix` shows why: an approval (kind `permission`, with the command), a
question (kind `question`, with its text) or a sign-in (kind `auth`). Answer
with `hc keys fix enter` or `hc attach fix`.

## How it works

Bob's hooks report its status to the terminal as OSC 7501:

| Bob event | Status |
|---|---|
| `UserPromptSubmit` | working |
| `PermissionRequest` | blocked, kind `permission`, with the tool and its command or file |
| `PermissionResolved` | working, or idle when the task stopped before you answered |
| `PreToolUse` on `ask_followup_question` | blocked, kind `question`, with the question |
| `PostToolUse` on `ask_followup_question` | working |
| `Stop` | done, with the first line of Bob's reply |
| `SessionStart` after `/clear` or `/new` | idle |

A message is one line of at most 100 characters.

Bob runs its `SessionStart` hook at launch, but before its input box is
ready, and also when it starts with a prompt, so the shim reports idle at
launch instead.

The `bob` shim runs the next `bob` on `PATH` that is not a bob-herdr shim,
with the arguments it was given. In an hc terminal, the shim also:

1. Without a prompt, waits with `hc wait --output` until Bob's input box is
   on screen, then reports idle, so Bob appears as an agent as soon as it is
   ready. If Bob first asks whether to trust the folder, the wait lasts
   until you answer. herdr-core templates rely on this report: they type
   their first message after the agent first reports a status.
2. With a prompt, reports nothing itself unless Bob stops at its sign-in
   screen, which the shim reports as blocked with kind `auth`. The hook
   reports working once Bob has the prompt, a few seconds after its input
   box appears, so an `hc wait` started with Bob lasts until the first turn
   is done or Bob needs you.
3. Clears the status when Bob exits.

Before it reports, the shim checks that Bob is still running.

## Limitations

bob-herdr does not report everything OSC 7501 supports:

- **Cancelled turns stay working.** `Stop` does not run when you cancel a
  turn with Esc or Ctrl-C. Your next prompt sets the status again.
- **No error status.** No hook runs when a turn fails.
- **MCP dialogs show as working.** Bob has no hook for the moment an MCP
  server's form or link request opens.
- **No hook status in a folder you do not trust.** Bob runs none of its
  settings hooks there, so it never shows as working, blocked or done. The
  shim still reports idle and clears the status. While Bob asks whether to
  trust the folder, it shows no status.
- **Sign-in is reported only with a prompt.** Without one, as in a
  template, Bob shows no status on its sign-in screen. herdr-core drops a
  template's first message when the first status is blocked, and Bob sends
  a prompt given as an argument itself once you have signed in.

The shim and the protocol add their own limits:

- **Ready detection reads the screen.** The shim waits for the text
  `/ for commands` in Bob's placeholder line
  (`Build Anything, @ for context, / for commands, $ for skills`). If a Bob
  release changes that line, set `BOB_HERDR_READY_TEXT`. `hc wait --output`
  sees only output printed after it starts listening, so the shim starts
  listening 0.3 seconds before it starts Bob. If Bob still draws its input
  box first, the wait ends after `BOB_HERDR_READY_TIMEOUT` and Bob shows no
  status until your first prompt.
- **Sign-in detection reads the screen too.** Until the input box appears,
  and for at most `BOB_HERDR_READY_TIMEOUT` seconds, the shim looks at the
  screen about once a second for Bob's sign-in line. If a Bob release
  changes that line, set `BOB_HERDR_SIGNIN_TEXT`.
- **Options the shim does not know.** The shim takes the separate value of
  an unknown option for a prompt, and does not report idle. Use
  `--option=value` (see [Use](#use)).
- **Exiting Bob clears every status record in the terminal.** OSC 7501
  addresses a terminal's main status record only by clearing all records, so
  a done status left by an earlier program in the same pane disappears too.
- **macOS 13 or later.** The scripts need `realpath`.

These limits go away when Bob reports OSC 7501 itself, as Codex does.

## Settings

| Variable | Default | Effect |
|---|---|---|
| `BOB_HERDR_STATUS` | on in hc terminals only | `1`: the hooks and the shim report status in any terminal. `0`: they never report. |
| `BOB_HERDR_BOB` | the next `bob` on `PATH` | The real Bob that the shim runs. It must not be a bob-herdr shim. |
| `BOB_HERDR_READY_TEXT` | `/ for commands` | The text that shows Bob's input box is ready |
| `BOB_HERDR_READY_TIMEOUT` | `600` | Seconds the shim watches Bob's screen at launch for that text |
| `BOB_HERDR_SIGNIN_TEXT` | `Complete sign-in in your browser\|in your browser to sign in` | An extended regular expression that matches Bob's sign-in screen |
| `BOB_HERDR_BIN_DIR` | `~/.local/bin` | Where `install` creates the links |
| `BOB_HERDR_BOB_SETTINGS` | `~/.bob/settings/settings.json` | The Bob settings file that `install` edits |
| `BOB_HERDR_APP_HOME` | `~/.config/herdr-app` | The Herdr app folder that `install` edits |

With `BOB_HERDR_STATUS=1` outside an hc terminal, the hooks report as usual
and the shim clears the status, but the shim cannot see Bob's screen, so Bob
never shows as idle and its sign-in screen is not reported.

## Testing

[docs/testing.md](docs/testing.md) is a test plan for a coding agent running
in the Herdr app.

## License

[MIT](LICENSE)
