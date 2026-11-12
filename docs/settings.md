# Settings

bob-herdr reads these environment variables. None is required.

## What is reported

| Variable | Default | Effect |
|---|---|---|
| `BOB_HERDR_STATUS` | on in hc terminals only | `1`: the hooks and the shim report status in any terminal. `0`: they never report. |
| `BOB_HERDR_BOB` | the next `bob` on `PATH` | The real Bob that the shim runs. It must not be a bob-herdr shim. |

With `BOB_HERDR_STATUS=1` outside an hc terminal, the hooks report as usual
and the shim clears the status at exit. The shim cannot see Bob's screen
there, so Bob never shows as idle at launch, and its trust and sign-in
questions are not reported.

## Text that the shim looks for on Bob's screen

Change these when a Bob release rewords its screens.

| Variable | Default | Effect |
|---|---|---|
| `BOB_HERDR_READY_TEXT` | `/ for commands` | Plain text from Bob's input box. Bob is ready when it is on screen. |
| `BOB_HERDR_TRUST_TEXT` | `Do you trust this folder` | An extended regular expression that matches Bob's trust question |
| `BOB_HERDR_SIGNIN_TEXT` | `Complete sign-in in your browser\|in your browser to sign in` | An extended regular expression that matches Bob's sign-in screen |
| `BOB_HERDR_READY_TIMEOUT` | `600` | Seconds the shim watches Bob's screen at launch |

The input box line of Bob 2.1.0 reads
`Build Anything, @ for context, / for commands, $ for skills`.

## Where install writes

| Variable | Default | Effect |
|---|---|---|
| `BOB_HERDR_BIN_DIR` | `~/.local/bin` | Where `install` creates the links |
| `BOB_HERDR_BOB_SETTINGS` | `~/.bob/settings/settings.json` | The Bob settings file that `install` edits |
| `BOB_HERDR_OPTIONS` | `~/.config/bob-herdr/value-options`, under `$XDG_CONFIG_HOME` when that is set | The file that holds Bob's options that take a value. `install` overwrites it and `uninstall` deletes it. The shim reads it too, so set it for both. |
| `BOB_HERDR_APP_HOME` | `~/.config/herdr-app` | The Herdr app folder that `install` edits |
