# bob-herdr

bob-herdr makes [Herdr](https://herdr.dev) show what IBM Bob is doing:
waiting for your next prompt, working, blocked until you answer it, or done.

Herdr is an app for running coding agents in terminals. Its sidebar and tabs
show which agent is working, which is done and which needs you. An agent
tells Herdr its status with
[OSC 7501](https://superlogical.com/rex/docs/build/program-status), the
Program Status Protocol. Bob 2.1.0 does not send it, so Herdr runs Bob but
cannot tell what it is doing.

bob-herdr sends the status for Bob, through Bob's hooks and a shim: a small
script that stands in for the `bob` command and runs the real one. It also
adds Bob to the app's **Start an agent** menu.

It is written for the Herdr app and for
[herdr-core](https://herdr.dev/core/), the server that runs the app's
terminals and provides the `hc` command. Herdr TUI, the original terminal
app, is a separate program and is not covered.

It also works in [Rex](https://superlogical.com/rex/), which reads OSC 7501
too. In any other terminal that reads OSC 7501, set `BOB_HERDR_STATUS=1`:
everything in the table below works there except idle at launch and the
trust and sign-in questions, which the shim finds on Bob's screen through
`hc` or `rex`.

bob-herdr is unofficial and is not an IBM product.

## What works

| When Bob | Status | Detail |
|---|---|---|
| waits for your prompt, at launch and after `/clear` | idle | |
| works on a prompt | working | |
| asks you to approve a command or a file change | blocked | kind `permission`, with the tool and its command or file |
| asks you a question | blocked | kind `question`, with the question |
| asks whether to trust the folder | blocked | kind `permission` |
| shows its sign-in screen | blocked | kind `auth` |
| finishes a turn | done | the first line of its reply |
| exits | cleared | |

In the Herdr app, a Bob in its own tab is listed under Idle, Working, Needs
you or Done to match, and the app raises a notification when Bob needs you
and when it finishes. **+ → Start an agent** lists IBM Bob, and its tab
carries Bob's name and icon.

The app shows the status, not the detail. `hc get <terminal>` prints both,
so an agent that drives Bob can read why Bob is blocked without reading its
screen. See [Drive Bob with hc](docs/driving-bob.md).

## What does not work

| When | What you see | Why |
|---|---|---|
| You cancel a turn with Esc or Ctrl-C | working, until your next prompt | Bob runs no hook when a turn is cancelled |
| A turn fails | working | Bob runs no hook when a turn fails |
| An MCP server opens a form or asks you to open a link | working | Bob runs no hook when the dialog opens |
| Bob runs in a folder you chose not to trust | never working, blocked or done | Bob runs none of its settings hooks in that folder |
| Bob takes long to start, for example when its service is slow to answer | no status until its input box appears | bob-herdr reports nothing before Bob is ready |
| A [template](docs/driving-bob.md#give-bob-a-fixed-role-with-a-template) starts Bob, and Bob first asks whether to trust the folder, shows its sign-in screen, or needs more than 60 seconds to start | the template's text and task are not typed in | herdr-core drops a template's first message when Bob's first status is blocked, or when no status comes within about 60 seconds |
| You look for the reason Bob is blocked, or its reply, in the app | the status only | The app does not display the detail; `hc get` does |
| Bob was started from another terminal with `hc run` | a row under that terminal that looks idle once Bob is done, with no notification | The app shows rows under another terminal that way, for any agent |
| You reject an approval | done, with a detail that can read as if the command ran | The detail is Bob's last line, written before it asked |

bob-herdr has been run on macOS only. Linux is untested.

Two parts depend on text that Bob prints, and break if a Bob release changes
it: finding Bob's input box, and finding its trust and sign-in questions.
[Settings](docs/settings.md) lists the variables that adjust them.

## Requirements

- [Bob](https://www.npmjs.com/package/@ibm/bob) 2.1.0 or later on your
  `PATH`, installed with `bun add -g @ibm/bob` or `npm install -g @ibm/bob`.
  Earlier versions do not take a first prompt as an argument, and `install`
  skips its hooks for them.
- [herdr-core](https://herdr.dev/core/) (`hc`), or Rex with its `rex`
  command on your `PATH`. The Herdr app is optional.
- Node, which Bob also needs.
- macOS 13 or later, or Linux. The scripts call `realpath`, which older macOS
  versions do not have.

## Install

```sh
git clone https://github.com/gillesdandrea/bob-herdr.git
bob-herdr/bin/bob-herdr install
```

`install` makes four changes. Running it again is safe: it only reads Bob's
options afresh.

1. It links `bob-herdr` and the `bob` shim into `~/.local/bin`. That folder
   must come before the real `bob` on your `PATH`: see
   [Troubleshooting](docs/troubleshooting.md#the-shim-is-not-the-bob-that-runs).
2. It adds seven hook entries to `~/.bob/settings/settings.json`. Your other
   hooks stay as they are.
3. It records which of Bob's options take a value, read from `bob --help`,
   in `~/.config/bob-herdr/value-options`, or under `$XDG_CONFIG_HOME` when
   that is set.
4. If the Herdr app is installed, it adds a `bob` entry to
   `~/.config/herdr-app/programs.json` and copies an icon to
   `~/.config/herdr-app/bob-herdr/`.

```sh
bob-herdr status      # what is installed, which bob runs, and Bob's version
bob-herdr uninstall   # remove the links, the hooks, the options and the app entry
```

The links and the hooks point into the clone, so `git pull` updates them.
Run `install` again after an update of bob-herdr or of Bob: it adds hook
entries that a new version needs, and reads Bob's options again.

## Use

In the Herdr app, open a pane and run Bob as usual:

```sh
bob
bob "fix the failing test in src/x.ts"
bob --mode plan "outline the refactor"
```

Or choose **+ → Start an agent → IBM Bob** and type a task.

From another terminal, or from another agent, start Bob with `hc`:

```sh
hc run --bg --name fix ~/.local/bin/bob "fix the failing test in x.ts"
hc wait fix     # until Bob is done or needs you
hc get fix      # its status, and why it is blocked
```

[Drive Bob with hc](docs/driving-bob.md) covers this use in full.

## More

- [Drive Bob with hc](docs/driving-bob.md): start Bob from another agent,
  answer it when it is blocked, and give it a fixed role with a template.
- [How it works](docs/how-it-works.md): the hooks, the shim, and what
  `install` writes.
- [Settings](docs/settings.md): the environment variables.
- [Troubleshooting](docs/troubleshooting.md): what to check when Bob shows no
  status.
- [Testing](docs/testing.md): a test plan for a coding agent running in the
  Herdr app.

## License

[MIT](LICENSE)
