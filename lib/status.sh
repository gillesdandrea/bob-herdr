# OSC 7501 (Program Status Protocol) reports for Bob, shared by the bob shim
# and `bob-herdr hook`. Sourced, not run.

# Sets terminal to the terminal Bob runs in, when it reads OSC 7501 and can
# show its screen: hc for a herdr-core terminal, rex for a Rex block, empty
# for any other. hc comes first: a herdr-core terminal opened from Rex
# inherits REX_BLOCK. So does any program started from a Rex block, such as
# an editor with its own terminal, which sets its own TERM_PROGRAM. Inside
# tmux, GNU screen or zellij, REX_BLOCK names the block that runs them, and
# they drop the reports.
status_terminal() {
  if [ -n "${HC_TERMINAL_ID:-}" ]; then
    terminal=hc
  elif [ -n "${REX_BLOCK:-}" ] && [ "${TERM_PROGRAM:-}" = rex ] &&
    [ -z "${TMUX:-}" ] && [ -z "${STY:-}" ] && [ -z "${ZELLIJ:-}" ]; then
    terminal=rex
  else
    terminal=
  fi
}

# Reports go out in an hc terminal or a Rex block. BOB_HERDR_STATUS=1 forces
# them on (another terminal that reads OSC 7501), BOB_HERDR_STATUS=0 turns
# them off.
status_enabled() {
  case ${BOB_HERDR_STATUS:-} in
    0) return 1 ;;
    1) return 0 ;;
  esac
  status_terminal
  [ -n "$terminal" ]
}

# Standard base64 of one argument, on one line.
b64() {
  printf '%s' "$1" | base64 | tr -d '\n'
}

# report <pairs>, e.g. report state=working:app=bob. Written to the terminal
# itself: Bob captures a hook's stdout and feeds it to the model. Under the
# shim, the pairs are also kept in $BOB_HERDR_STATE/last, so the shim knows
# the last report without asking the terminal.
report() {
  if [ -n "${BOB_HERDR_STATE:-}" ] && [ -d "$BOB_HERDR_STATE" ]; then
    { printf '%s\n' "$1" >"$BOB_HERDR_STATE/last"; } 2>/dev/null
  fi
  printf '\033]7501;%s\033\\' "$1" 2>/dev/null >/dev/tty || :
}
