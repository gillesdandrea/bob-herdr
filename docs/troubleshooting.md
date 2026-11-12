# Troubleshooting

Start with `bob-herdr status`. It prints what is installed, which `bob`
runs, Bob's version and how many status hooks are in Bob's settings.

## Bob shows no status at all

Check these in order.

1. **You are not in an hc terminal.** Reports go out only where
   `HC_TERMINAL_ID` is set: a pane in the Herdr app, or a terminal started
   with `hc run`.
2. **The folder is not trusted.** Bob runs none of its settings hooks in a
   folder you answered "Don't trust" for, so it never shows as working,
   blocked or done there.
3. **Bob is still starting.** There is no status until Bob's input box
   appears. A start can take over a minute when Bob's service is slow to
   answer; `hc read <terminal>` shows what Bob is waiting for.
4. **`status` shows fewer hooks than it expects**, such as `2 of 7`. Run
   `bob-herdr install` again.
5. **Bob is older than 2.1.0.** `install` then skips the hooks. Update Bob
   and run `install` again.

## A template started Bob, but its task was not typed in

herdr-core types a template's first message when Bob first reports idle.
It drops the message when Bob's first status is blocked, and when no status
comes within about 60 seconds. `hc run` then prints
`"first_message":{"sent":false,...}` with the reason. Bob asked whether to
trust the folder, showed its sign-in screen, or was slow to start. Answer
Bob in its terminal, then send the text and the task with `hc send`.

## Bob shows working, done and blocked, but never idle

The real Bob runs instead of the shim: see the next section. The hooks still
report, but nothing reports idle at launch, and the status is not cleared
when Bob exits.

A Bob release may also have reworded its input box. Set
`BOB_HERDR_READY_TEXT`: see [Settings](settings.md).

## The shim is not the bob that runs

The shim and the real Bob are both named `bob`, and the shell runs the one
that comes first on `PATH`. `bob-herdr status` prints which one that is. The
real Bob is in a different folder depending on how you installed it:

| Installed with | Real `bob` in |
|---|---|
| `bun add -g` | `~/.bun/bin` |
| `npm install -g` | your Node's `bin` folder, or the shims folder of a version manager such as mise or asdf |

Put `~/.local/bin` ahead of that folder in the file that sets your `PATH`
(`~/.zshenv`, `~/.zprofile`, `~/.bashrc`, ...), then open a new shell. A
version manager that changes `PATH` in interactive shells, such as
`mise activate`, can put its folders back in front, so check again in a new
terminal.

Terminals started with `hc run` use the herdr-core server's `PATH`, not your
shell's. Call the shim by its full path there, `~/.local/bin/bob`, or run
`hc server restart` from a shell with your current `PATH`. See
[Drive Bob with hc](driving-bob.md#why-the-full-path).

An npm global install belongs to one Node version. After a Node upgrade, the
version manager's `bob` can fail with "No version is set". A `bun add -g`
install does not depend on the Node version.

## Bob asks to sign in in every terminal started with hc run

The herdr-core server has its own environment, taken from the shell that
started it. If you sign in to Bob with an API key in an environment
variable, the server may not have it. Run `hc server restart` from a shell
that has the key, or sign in to Bob with `/login`.

## Bob starts with a prompt but shows idle, or the reverse

The shim took an option's value for a prompt, or a prompt for a value. It
knows Bob's options from the last `bob-herdr install`. Run `install` again
after a Bob update, or write the option as `--option=value`.

## The status stays working after you cancel

Bob runs no hook when you cancel a turn with Esc or Ctrl-C. Your next prompt
sets the status again.

## hc wait returns at once, still blocked

The status leaves blocked a second or two after you answer Bob. Pause before
the next `hc wait`.
