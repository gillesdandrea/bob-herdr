# Testing bob-herdr

This is a test plan for a coding agent running in the Herdr app. Run the
steps in order and finish with the report described at the end. Steps
marked **(person)** need the person at the window: ask them, wait for their
answer, and record it.

Name every terminal you start `bh-*`, and remove them all at the end. Do not
touch other terminals, and never stop or restart the herdr-core server.

## 0. Preconditions

- `echo $HC_TERMINAL_ID` prints a terminal address, so you are in an hc
  terminal.
- `hc --version` and `herdr-app status` work.
- `bob --version` prints a version. If it fails, stop and ask the person to
  fix their Bob install.

Terminals started with `hc run`, and templates, look up commands in the
herdr-core server's `PATH`, which can be older than yours. The steps call the
shim by its full path, `~/.local/bin/bob`, for that reason. Record what
`hc run --bg --name bh-which sh -c "command -v bob; sleep 5"` then
`hc read bh-which` prints: it shows which `bob` a bare command runs there.

## 1. Install

From the clone:

```sh
bin/bob-herdr install
bin/bob-herdr status
```

Expect:

- both links;
- `bob runs:` pointing at the shim in `~/.local/bin`;
- `Status hooks ...: 2 of 2`;
- a Herdr app entry whose `run` is the shim's full path.

If `bob runs:` is not the shim, stop and report the `PATH` order.

Run `bin/bob-herdr install` a second time. `status` must still say `2 of 2`.

## 2. Status and first prompt

```sh
hc run --bg --name bh-status ~/.local/bin/bob "Reply with the single word PINEAPPLE"
hc wait bh-status --json --timeout 120
```

The wait must end with `"reason":"status"` and `"status":"done"`, not
`idle`: with a prompt, the shim reports nothing until Bob has it. Poll
`hc get bh-status --json` once more: `.status` is `done` with
`"app":"bob"`.

If Bob asks whether to trust the folder, `hc read bh-status` shows the
question. Answer with `hc keys bh-status enter` and keep polling.

`hc read bh-status` must show the prompt once, with no `<hc>` tag, and the
answer PINEAPPLE.

## 3. Exit clears the status

```sh
hc keys bh-status ctrl+c
hc keys bh-status ctrl+c
```

After a few seconds, `hc get bh-status --json` must show `"status":null`, and
`pgrep -fl 'hc wait'` must show no wait for that terminal.

## 4. Exit before Bob is ready

The shell stays after Bob exits, so a prompt typed too late would land in it:

```sh
hc run --bg --name bh-early sh -c '~/.local/bin/bob "echo LEAKED"; exec sh'
sleep 1
hc keys bh-early ctrl+c
hc keys bh-early ctrl+c
```

Wait 15 seconds. `hc read bh-early` must not show `echo LEAKED` typed at the
shell prompt or `LEAKED` printed on its own line. `pgrep -fl 'hc wait'` must
show no wait for that terminal.

## 5. The app shows Bob (person)

```sh
hc run --bg --name bh-app ~/.local/bin/bob
```

Without a prompt, `hc get bh-app --json` shows `idle` once Bob's input box is
up. Ask the person to open `bh-app` from the agents sidebar and confirm two
things: the sidebar lists it with the Bob icon and the name IBM Bob, and its
tab shows the same icon.

Then ask them to type a short prompt in it, switch to another tab before Bob
finishes, and confirm that the done notification appears.

## 6. Start an agent (person)

Ask the person to choose **+ → Start an agent → IBM Bob** with the task
`Reply with the single word BANANA`. Find the new terminal with `hc ls`, then
check it as in step 2: it reaches `done` and answers BANANA.

## 7. A herdr-core template

```sh
mkdir -p ~/.config/herdr-core/templates
cat > ~/.config/herdr-core/templates/bh-bob.md <<'EOF'
---
name: bh-bob
description: bob-herdr test template
command: $HOME/.local/bin/bob
---
Answer in one word.
EOF
hc run --bg --name bh-template bh-bob "What fruit is yellow and curved?"
```

The `hc run` output must show `"first_message":{"sent":true,...}`, and the
status must reach `done` with a one-word answer. Then delete
`~/.config/herdr-core/templates/bh-bob.md`.

## 8. Known limitations

These checks confirm the documented behavior, so that a Bob release that
changes it gets noticed.

- **Permission prompt:** run
  `hc run --bg --name bh-perm ~/.local/bin/bob "Use your shell tool to run: touch bh-probe.txt"`.
  While Bob waits for approval, the status is `working`, never `blocked`.
  Deny with `hc keys bh-perm esc`.
- **Cancel:** run
  `hc run --bg --name bh-cancel ~/.local/bin/bob "Write a 600-word essay about lighthouses"`.
  Once the status is `working`, run `hc keys bh-cancel esc`. The status stays
  `working`.

## 9. Clean up

Kill and remove every `bh-*` terminal with `hc kill`, then `hc rm`. Delete
`bh-probe.txt` if Bob created it. Leave bob-herdr installed unless the person
asks you to remove it.

## Report

Write a table with one row per step: pass, fail or skipped. For each failure,
quote what you saw in `hc get` and `hc read`. After the table, list anything
that differed from this plan, even in steps that passed.
