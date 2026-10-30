# OSC 7501 (Program Status Protocol) reports for Bob, shared by the bob shim
# and `bob-herdr hook`. Sourced, not run.

# Reports go out inside an hc terminal. BOB_HERDR_STATUS=1 forces them on
# (another terminal that reads OSC 7501), BOB_HERDR_STATUS=0 turns them off.
status_enabled() {
  case ${BOB_HERDR_STATUS:-} in
    0) return 1 ;;
    1) return 0 ;;
  esac
  [ -n "${HC_TERMINAL_ID:-}" ]
}

# report <pairs>, e.g. report state=working:app=bob. Written to the terminal
# itself: Bob captures a hook's stdout and feeds it to the model.
report() {
  printf '\033]7501;%s\033\\' "$1" 2>/dev/null >/dev/tty || :
}
