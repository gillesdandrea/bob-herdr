# How it works

bob-herdr reports Bob's status to the terminal as
[OSC 7501](https://superlogical.com/rex/docs/build/program-status), which
herdr-core reads. Two parts send the reports: Bob's hooks, and a shim that
stands in for the `bob` command.

## The hooks

`install` adds seven hook entries to Bob's settings. Each one runs
`bob-herdr hook`, which reads the event and writes one report.

| Bob event | Report |
|---|---|
| `UserPromptSubmit` | working |
| `PermissionRequest` | blocked, kind `permission`, with the tool and its command or file |
| `PermissionResolved` | working, or idle when the task stopped before you answered |
| `PreToolUse` on `ask_followup_question` | blocked, kind `question`, with the question |
| `PostToolUse` on `ask_followup_question` | working |
| `Stop` | done, with the first line of Bob's reply |
| `SessionStart` after `/clear` or `/new` | idle |

A message is one line of at most 100 characters.

Bob waits for each hook, so `bob-herdr hook` does as little as it can. When
reports are off it starts no process. When they are on it starts one, a
`node` script, with a timeout of 10 seconds. The report goes to the terminal
itself, not to the hook's output, which Bob would read as an answer.

Bob runs no settings hooks in a folder you chose not to trust. In such a
folder the hooks report nothing.

## The shim

The shim is the file `bin/bob`, linked as `~/.local/bin/bob`. It runs the
next `bob` on `PATH` that is not itself, with the arguments it was given.
Inside an hc terminal it also reports what the hooks cannot.

**At launch.** The shim reads Bob's screen with `hc read` about twice a
second until Bob's input box is on screen, for about
`BOB_HERDR_READY_TIMEOUT` seconds at most. It looks for three texts:

- Bob's question whether to trust the folder, and its sign-in screen. The
  shim reports each as blocked while it is on screen, and clears that report
  when the question goes. In a folder you chose not to trust, no hook
  follows to replace it.
- The text `/ for commands` from Bob's input box. Bob is ready then. If Bob
  started without a prompt, the shim reports idle, unless a hook has
  already reported working or blocked. herdr-core templates rely on that
  report: they type their first message when Bob first reports idle.

With a prompt, the shim does not report idle: that would end an `hc wait`
before Bob has the prompt. The hook reports working once Bob has it, a few
seconds after the input box appears.

Bob's `SessionStart` hook cannot report idle at launch. Bob runs it before
its input box is ready, and also when it starts with a prompt.

An earlier program may have left one of the three texts on the screen. The
shim's first look comes before Bob draws anything. If that look shows one of
the texts, nothing counts until a look shows none, which is Bob clearing
the screen.

**Cleared at exit.** The shim clears the status when Bob exits.

OSC 7501 addresses a terminal's main status record only by clearing all
records. So each clear, at exit or when a question goes, also removes a done
status left by an earlier program in the same pane.

Before each report, the shim checks that Bob is still running.

### Telling a prompt from an option's value

The shim never changes Bob's arguments. It only needs to know whether they
hold a prompt. A word is a prompt unless it is an option, the value of an
option, or the name of one of Bob's commands.

`install` reads the options that take a value from `bob --help` and
`bob chat --help`, and records them in `~/.config/bob-herdr/value-options`,
or under `$XDG_CONFIG_HOME` when that is set. The shim adds them to the
options of Bob 2.1.0, which it carries itself. If a later Bob adds such an
option before you run `install` again, the shim takes its value for a prompt
and does not report idle. Writing the option as `--option=value` avoids
that.

## What install writes

| Change | Where |
|---|---|
| Links to `bob-herdr` and the shim | `~/.local/bin` |
| Seven hook entries; your other hooks stay | `~/.bob/settings/settings.json` |
| Bob's options that take a value | `~/.config/bob-herdr/value-options` |
| A `bob` entry and an icon, when the Herdr app is installed | `~/.config/herdr-app/programs.json` and `~/.config/herdr-app/bob-herdr/` |

The app entry starts the shim by its full path, because the app starts
agents through herdr-core, whose `PATH` may find the real Bob first. The
icon is Bob's mascot when the IBM Bob IDE is installed, and a plain robot
glyph otherwise. If the entry already exists, `install` keeps your own
fields, such as a custom `run`, and only replaces the icon.

`install` skips the hook entries when Bob is older than 2.1.0. Bob ignores
every hook in a settings file that names an event it does not know, yours
included.

`uninstall` removes all four, and leaves your own hooks and app entries.
