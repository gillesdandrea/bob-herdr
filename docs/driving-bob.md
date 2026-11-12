# Drive Bob with hc

`hc` is the command of [herdr-core](https://herdr.dev/core/). It starts a
program in a terminal that keeps running, and lets you or another agent wait
for it, read its screen and type into it. With bob-herdr installed, `hc`
also knows Bob's status.

## Start Bob and wait for it

From any terminal, including another agent's:

```sh
hc run --bg --name fix --cwd ~/src/app ~/.local/bin/bob "fix the failing test in x.ts"
hc wait fix                  # until Bob stops working
hc get fix                   # its status
hc read --lines 50 fix       # its screen
hc send fix "now add a test for the empty case"
hc attach fix                # take over; ctrl+\ detaches
hc kill fix && hc rm fix     # when you accept the work
```

`hc ls` lists the terminal with your other terminals.

Bob's own options go with the prompt, and the shim passes every argument to
Bob unchanged:

```sh
hc run --bg --name plan ~/.local/bin/bob --mode plan "outline the refactor"
```

`bob -p`, `bob run`, `bob mcp`, `bob extension` and `bob acp` run Bob
directly, without the shim, as do `--help`, `--version` and `--list-tasks`.

### Why the full path

The examples call the shim as `~/.local/bin/bob`. Terminals started with
`hc run`, and templates, look up commands in the herdr-core server's `PATH`,
not in your shell's. The server keeps the `PATH` it had when it started. If
it started before you put `~/.local/bin` first, a bare `bob` runs the real
Bob, without the shim.

`hc server restart`, run from a shell with your current `PATH`, gives the
server that `PATH`. Running terminals and their programs keep going. The
server takes the whole environment of the shell that restarts it, including
a Bob API key if that shell has one.

Panes in the Herdr app run your shell, which sets its own `PATH`, so a bare
`bob` works there.

## Read the status

`hc get fix --json` holds the status under `status`:

```json
{ "app": "bob", "state": "blocked", "kind": "permission", "msg": "execute_command: npm test" }
```

| `state` | `kind` | `msg` | Meaning |
|---|---|---|---|
| `idle` | | | Bob waits for a prompt |
| `working` | | | Bob works on a prompt |
| `blocked` | `permission` | the tool, and its command or file | Bob asks you to approve a tool call |
| `blocked` | `permission` | `Bob asks whether to trust this folder` | Bob asks whether to trust the folder |
| `blocked` | `question` | the question | Bob asks you a question |
| `blocked` | `auth` | `Sign in to Bob in your browser` | Bob shows its sign-in screen |
| `done` | | the first line of Bob's reply | Bob finished a turn |

A `msg` is one line of at most 100 characters. There is no status before
Bob's first report, and none after Bob exits.

`hc wait fix` ends when Bob stops working: when the status becomes `done`,
`blocked` or `idle`. It keeps waiting while there is no status, which is the
case while Bob starts.

## Answer a blocked Bob

Read `kind` and `msg` before you press a key. Enter accepts the first choice
on Bob's screen, and the first choice differs by question:

| Bob asks | Enter | To refuse |
|---|---|---|
| to approve a tool call | approves it once | `hc keys fix esc` rejects it |
| whether to trust the folder | trusts the folder, for this and later sessions | choose "Don't trust" with `hc keys fix down down enter`, or exit with `hc keys fix esc` |
| a question | picks the first suggested answer | `hc keys fix esc` leaves it unanswered |
| to sign in | not an answer: you sign in in the browser | `hc keys fix esc` exits Bob |

`hc attach fix` lets a person answer instead.

The status leaves blocked a second or two after the answer. Pause before the
next `hc wait`, which would otherwise return at once with the old status.

Bob asks whether to trust the folder, and shows its sign-in screen, before
its input box appears. A prompt given as an argument is not lost: Bob sends
it itself once you have answered. In a folder you chose not to trust, Bob
then works without reporting anything: see
[What does not work](../README.md#what-does-not-work).

## Send a later prompt

`hc send fix "text"` types the text into Bob and presses Enter. When you
call it from an hc terminal, hc wraps the text in an `<hc>` tag that names
the sender. Bob reads the tag as part of the prompt, which is harmless for a
task. A slash command does not survive it: type `/clear` with
`hc keys fix / c l e a r`, then `hc keys fix enter`.

## Give Bob a fixed role with a template

A herdr-core template starts a program with a first message. Save this as
`~/.config/herdr-core/templates/bob-reviewer.md`:

```markdown
---
name: bob-reviewer
description: Bob reviews a change, read-only
command: $HOME/.local/bin/bob --mode ask
---
Review the change below. Do not edit files. Report findings by severity.
```

Then run:

```sh
hc run --bg --name review bob-reviewer "review the diff on this branch"
```

herdr-core types the template's text and the task into Bob when Bob reports
idle, which is when its input box is on screen.

The template's text and the task are not typed in, and `hc run` prints
`"first_message":{"sent":false,...}` with the reason, in two cases:

- Bob's first status is blocked, because it asks whether to trust the folder
  or shows its sign-in screen.
- Bob reports no status within about 60 seconds, because it is slow to
  start.

Answer Bob in its terminal, wait until it is idle, then send the text and
the task yourself with `hc send`.

## How the Herdr app shows a Bob started with hc

A Bob started with `hc run` from another terminal appears in the agents
sidebar as a row under that terminal, labeled with the name you gave it.

- While Bob works, the row shows a spinner.
- When Bob is blocked, the row shows a red mark and the terminal above it
  moves to Needs you.
- When Bob is done, the row looks idle and the app raises no notification.
  Bob's floating window says "finished".

The app lists Done and raises its notifications for a Bob in its own pane or
tab. A terminal started without a pane opens in a floating window.
