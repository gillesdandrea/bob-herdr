# Testing bob-herdr

This is a test plan for a coding agent running in the Herdr app. Run the
steps in order and finish with the report described at the end. Steps
marked **(person)** need the person at the window: ask them, wait for their
answer, and record it.

Name every terminal you start `bh-*`, and remove them all at the end. Do not
touch other terminals, and never stop or restart the herdr-core server.

## 0. Preconditions

- `echo $HC_TERMINAL_ID` prints a terminal address, so you are in an hc
  terminal. Without one, stop: the terminals you start have no parent and do
  not appear in the app's sidebar.
- `hc --version` and `herdr-app status` work.
- `bob --version` prints 2.1.0 or later. If it fails or prints an earlier
  version, stop and ask the person to fix their Bob install.

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
- `Status hooks ...: 7 of 7`;
- a Herdr app entry whose `run` is the shim's full path.

If `bob runs:` is not the shim, stop and report the `PATH` order.

Run `bin/bob-herdr install` a second time. `status` must still say `7 of 7`.

## 2. Status and first prompt

```sh
hc run --bg --name bh-status ~/.local/bin/bob "Reply with the single word PINEAPPLE"
hc wait bh-status --json --timeout 120
```

The wait must end with `"reason":"status"` and `"status":"done"`, not
`idle`: with a prompt, the shim reports nothing until Bob has it. Poll
`hc get bh-status --json` once more: `.status` is `done` with
`"app":"bob"` and a `msg` that is the first line of Bob's reply.

If Bob asks whether to trust the folder, `hc read bh-status` shows the
question. Answer with `hc keys bh-status enter` and keep polling.

`hc read bh-status` must show the prompt once and the answer PINEAPPLE.

## 3. Exit clears the status

```sh
hc keys bh-status ctrl+c
hc keys bh-status ctrl+c
```

After a few seconds, `hc get bh-status --json` must show `"status":null`, and
`pgrep -fl 'hc wait'` must show no wait for that terminal.

Not covered: a Bob that exits before its input box appears. The shim then
reports nothing, but that moment is too short to hit reliably in a test.

## 4. The app shows Bob (person)

```sh
hc run --bg --name bh-app ~/.local/bin/bob
```

Without a prompt, `hc get bh-app --json` shows `idle` once Bob's input box is
up. Ask the person to confirm that the agents sidebar lists `bh-app` as a row
under your own terminal's row, with the Bob icon.

The app labels that row with the terminal's name, shows its done as idle and
raises no notification for it. Those belong to the next step.

## 5. Start an agent (person)

Ask the person to choose **+ → Start an agent → IBM Bob** with the task
`Reply with the single word BANANA`. Find the new terminal with `hc ls`, then
check it as in step 2: it reaches `done` and answers BANANA. Ask the person
to confirm that its tab is titled IBM Bob and shows the Bob icon.

Then ask them to type a short prompt in it, switch to another tab before Bob
finishes, and confirm that the "IBM Bob finished" notification appears and
that the sidebar lists the terminal under Done.

## 6. A herdr-core template

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

## 7. Blocked status

One terminal covers an approval, a question and `/clear`:

```sh
hc run --bg --name bh-blocked ~/.local/bin/bob "Use your shell tool to run: touch bh-probe.txt"
hc wait bh-blocked --json --timeout 120
```

- **Approval:** the wait must end with `"status":"blocked"`.
  `hc get bh-blocked --json` shows `"kind":"permission"` and a `msg` that
  starts with `execute_command: touch bh-probe.txt`. Reject with
  `hc keys bh-blocked esc`: the status becomes `working`, then `done`. If
  Bob runs the command without asking, the person's settings approve it:
  skip this check and say so.
- **Question:** run
  `hc send bh-blocked "Use your ask_followup_question tool to ask me one question: apple or pear?"`,
  then the same `hc wait`. It must end with `"status":"blocked"`, and
  `hc get` shows `"kind":"question"` with the question as `msg`. Answer with
  `hc keys bh-blocked enter`: the status becomes `working`, then `done`.
- **`/clear`:** type it with `hc keys bh-blocked / c l e a r`, then
  `hc keys bh-blocked enter`. Within 15 seconds the status is `idle`. Do not
  use `hc send` here: from an hc terminal it wraps the text in an `<hc>` tag,
  and Bob takes that for a prompt.

The status leaves `blocked` a second or two after your key, so pause before
the next `hc wait`, which would otherwise return at once.

Not covered: the sign-in screen, which needs a Bob that is signed out. With
one, `hc run --bg --name bh-auth ~/.local/bin/bob "hello"` then `hc wait`
ends with `"status":"blocked"` and `"kind":"auth"`.

## 8. Known limitations

These checks confirm the documented behavior, so that a Bob release that
changes it gets noticed.

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
