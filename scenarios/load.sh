#!/usr/bin/env bash
set -euo pipefail

# Load generator for claims-api.
#
# Usage:
#   ./load.sh                   # default: mixed pattern for 60s
#   ./load.sh <pattern> [secs]  # run a specific pattern for N seconds
#   ./load.sh all               # cycle through every pattern
#
# Patterns:
#   steady  - constant ~2 req/s
#   burst   - idle periods punctuated by bursts of 20 parallel requests
#   ramp    - request rate ramps from 1/s up to ~10/s
#   wave    - sinusoidal rate between ~1/s and ~8/s
#   reads   - mostly GET /claims/:id against previously-created IDs
#   mixed   - blends writes, reads and occasional 4xx/5xx triggers (default)
#   all     - run every pattern back-to-back
#
# Env overrides:
#   BASE_URL   (default http://localhost:8080)
#   VERBOSE=1  print per-request status codes instead of a progress bar

BASE_URL="${BASE_URL:-http://localhost:8080}"
PATTERN="${1:-mixed}"
DURATION="${2:-60}"
VERBOSE="${VERBOSE:-0}"

CUSTOMERS=(c1 c2 c3 c4 c5 c-premium c-fraud-watch c-enterprise)
DESCRIPTIONS=(
  "windshield crack"
  "rear bumper dent"
  "hailstorm damage"
  "stolen laptop"
  "water leak kitchen"
  "travel cancellation"
  "bike theft"
  "phone screen"
)

# Shared counters (use a temp file because bash subshells/backgrounded curls cannot share vars).
STATE_DIR="$(mktemp -d 2>/dev/null || mktemp -d -t loadsh)"
trap 'rm -rf "$STATE_DIR"' EXIT
: >"$STATE_DIR/total"
: >"$STATE_DIR/ok"
: >"$STATE_DIR/fail"
: >"$STATE_DIR/ids"

incr() { printf '.' >>"$STATE_DIR/$1"; }
count() { wc -c <"$STATE_DIR/$1" | tr -d ' '; }

# ANSI helpers (disabled if not a TTY).
if [[ -t 1 ]]; then
  C_DIM=$'\033[2m'; C_BOLD=$'\033[1m'; C_GREEN=$'\033[32m'; C_RED=$'\033[31m'
  C_CYAN=$'\033[36m'; C_YEL=$'\033[33m'; C_RESET=$'\033[0m'; CR=$'\r'
else
  C_DIM=""; C_BOLD=""; C_GREEN=""; C_RED=""; C_CYAN=""; C_YEL=""; C_RESET=""; CR=$'\n'
fi

log_phase() {
  printf "\n%s[%s]%s %s\n" "$C_BOLD$C_CYAN" "$(date +%H:%M:%S)" "$C_RESET" "$*"
}

render_progress() {
  local phase="$1" elapsed="$2" total_dur="$3"
  local t ok f rate
  t=$(count total); ok=$(count ok); f=$(count fail)
  if (( elapsed > 0 )); then rate=$(( t / elapsed )); else rate=0; fi
  local bar_width=24
  local filled=0
  if (( total_dur > 0 )); then filled=$(( elapsed * bar_width / total_dur )); fi
  (( filled > bar_width )) && filled=$bar_width
  local bar=""
  local i
  for ((i=0; i<filled; i++)); do bar+="█"; done
  for ((i=filled; i<bar_width; i++)); do bar+="·"; done
  printf "%s%s%s %s[%s]%s %ds/%ds  req=%d %sok=%d%s %sfail=%d%s  %d req/s    %s" \
    "$CR" "$C_BOLD" "$phase" "$C_DIM" "$bar" "$C_RESET" \
    "$elapsed" "$total_dur" "$t" "$C_GREEN" "$ok" "$C_RESET" \
    "$C_RED" "$f" "$C_RESET" "$rate" ""
}

# fire_post [async]  - POSTs a claim. If $1 == "bg" runs in background.
fire_post() {
  local async="${1:-}"
  local cust="${CUSTOMERS[RANDOM % ${#CUSTOMERS[@]}]}"
  local desc="${DESCRIPTIONS[RANDOM % ${#DESCRIPTIONS[@]}]}"
  local amt=$(( (RANDOM % 200000) + 500 ))
  local body
  body=$(printf '{"customerId":"%s","amountCents":%d,"description":"%s"}' "$cust" "$amt" "$desc")
  incr total
  local code body_file="$STATE_DIR/last_body.$$.$RANDOM"
  if [[ "$async" == "bg" ]]; then
    (
      code=$(curl -sS -o "$body_file" -w "%{http_code}" --max-time 10 \
        -X POST "$BASE_URL/claims" -H "content-type: application/json" -d "$body" 2>/dev/null || echo "000")
      if [[ "$code" =~ ^2 ]]; then
        incr ok
        id=$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' "$body_file" 2>/dev/null || true)
        [[ -n "$id" ]] && printf '%s\n' "$id" >>"$STATE_DIR/ids"
      else
        incr fail
      fi
      [[ "$VERBOSE" == "1" ]] && printf "POST /claims -> %s\n" "$code"
      rm -f "$body_file"
    ) &
  else
    code=$(curl -sS -o "$body_file" -w "%{http_code}" --max-time 10 \
      -X POST "$BASE_URL/claims" -H "content-type: application/json" -d "$body" 2>/dev/null || echo "000")
    if [[ "$code" =~ ^2 ]]; then
      incr ok
      id=$(sed -n 's/.*"id":"\([^"]*\)".*/\1/p' "$body_file" 2>/dev/null || true)
      [[ -n "$id" ]] && printf '%s\n' "$id" >>"$STATE_DIR/ids"
    else
      incr fail
    fi
    [[ "$VERBOSE" == "1" ]] && printf "POST /claims -> %s\n" "$code"
    rm -f "$body_file"
  fi
  return 0
}

fire_get() {
  local id="" code
  # Prefer a real ID we created earlier; fall back to a random UUID (likely 404).
  if [[ -s "$STATE_DIR/ids" ]]; then
    id=$(shuf -n1 "$STATE_DIR/ids" 2>/dev/null || awk 'NR==1{print}' "$STATE_DIR/ids")
  fi
  if [[ -z "$id" ]]; then
    id="00000000-0000-0000-0000-$(printf '%012d' $RANDOM$RANDOM)"
  fi
  incr total
  code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 \
    "$BASE_URL/claims/$id" 2>/dev/null || echo "000")
  # Treat 404s from random lookups as "ok" traffic (intended look-miss), real failures = 5xx/timeouts.
  if [[ "$code" =~ ^[23] ]] || [[ "$code" == "404" ]]; then incr ok; else incr fail; fi
  [[ "$VERBOSE" == "1" ]] && printf "GET  /claims/%s -> %s\n" "${id:0:8}" "$code"
  return 0
}

fire_bad_post() {
  # Malformed payload -> should get 400. Useful for seeing 4xx on dashboards.
  incr total
  local code
  code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 \
    -X POST "$BASE_URL/claims" -H "content-type: application/json" \
    -d '{"nope":true}' 2>/dev/null || echo "000")
  if [[ "$code" =~ ^4 ]]; then incr ok; else incr fail; fi
  [[ "$VERBOSE" == "1" ]] && printf "POST /claims (bad) -> %s\n" "$code"
  return 0
}

run_for() {
  # run_for <seconds> <tick-fn>   - calls tick-fn(elapsed) roughly each second.
  local dur="$1" tick="$2"
  local start elapsed=0
  start=$(date +%s)
  while (( elapsed < dur )); do
    "$tick" "$elapsed" "$dur"
    [[ "$VERBOSE" != "1" ]] && render_progress "$CURRENT_PHASE" "$elapsed" "$dur"
    elapsed=$(( $(date +%s) - start ))
  done
  [[ "$VERBOSE" != "1" ]] && render_progress "$CURRENT_PHASE" "$dur" "$dur" && echo
  return 0
}

# ---------- patterns ----------

pattern_steady() {
  CURRENT_PHASE="steady  (≈2 req/s)"
  log_phase "$CURRENT_PHASE for ${1}s"
  _tick_steady() { fire_post; sleep 0.5; }
  run_for "$1" _tick_steady
}

pattern_burst() {
  CURRENT_PHASE="burst   (20 parallel every 10s)"
  log_phase "$CURRENT_PHASE for ${1}s"
  _tick_burst() {
    local elapsed="$1"
    if (( elapsed % 10 == 0 )); then
      local i
      for i in $(seq 1 20); do fire_post bg; done
      wait
      sleep 1
    else
      fire_post; sleep 1
    fi
  }
  run_for "$1" _tick_burst
}

pattern_ramp() {
  CURRENT_PHASE="ramp    (1 -> ~10 req/s)"
  log_phase "$CURRENT_PHASE for ${1}s"
  _tick_ramp() {
    local elapsed="$1" dur="$2"
    # requests per second grows linearly from 1 to 10.
    local rps=$(( 1 + (elapsed * 9) / (dur > 0 ? dur : 1) ))
    (( rps < 1 )) && rps=1
    local i
    for i in $(seq 1 "$rps"); do fire_post bg; done
    wait
    sleep 1
  }
  run_for "$1" _tick_ramp
}

pattern_wave() {
  CURRENT_PHASE="wave    (sinusoidal 1-8 req/s)"
  log_phase "$CURRENT_PHASE for ${1}s"
  _tick_wave() {
    local elapsed="$1"
    # period 20s, amplitude 4 around mean 5  -> floor(5 + 4*sin(2πt/20))
    local rps
    rps=$(python3 -c "import math; print(max(1, int(round(5 + 4*math.sin(2*math.pi*$elapsed/20)))))" 2>/dev/null || echo 3)
    local i
    for i in $(seq 1 "$rps"); do fire_post bg; done
    wait
    sleep 1
  }
  run_for "$1" _tick_wave
}

pattern_reads() {
  CURRENT_PHASE="reads   (GET-heavy, 5:1)"
  log_phase "$CURRENT_PHASE for ${1}s"
  # Seed a few IDs first so reads land on real rows.
  local i
  for i in 1 2 3 4 5; do fire_post; done
  _tick_reads() {
    local i
    for i in 1 2 3 4 5; do fire_get; done
    fire_post
    sleep 1
  }
  run_for "$1" _tick_reads
}

pattern_mixed() {
  CURRENT_PHASE="mixed   (writes + reads + 4xx)"
  log_phase "$CURRENT_PHASE for ${1}s"
  _tick_mixed() {
    local r=$((RANDOM % 100))
    if   (( r < 55 )); then fire_post
    elif (( r < 90 )); then fire_get
    else                    fire_bad_post
    fi
    sleep 0.4
  }
  run_for "$1" _tick_mixed
}

pattern_all() {
  local slice=$(( $1 / 5 ))
  (( slice < 10 )) && slice=10
  pattern_steady "$slice"
  pattern_ramp   "$slice"
  pattern_wave   "$slice"
  pattern_burst  "$slice"
  pattern_mixed  "$slice"
}

# ---------- main ----------

print_header() {
  printf "%s╭─ claims-api load generator ─────────────────────────╮%s\n" "$C_CYAN" "$C_RESET"
  printf "%s│%s target : %-42s %s│%s\n"  "$C_CYAN" "$C_RESET" "$BASE_URL" "$C_CYAN" "$C_RESET"
  printf "%s│%s pattern: %-42s %s│%s\n"  "$C_CYAN" "$C_RESET" "$PATTERN" "$C_CYAN" "$C_RESET"
  printf "%s│%s budget : %-42s %s│%s\n"  "$C_CYAN" "$C_RESET" "${DURATION}s" "$C_CYAN" "$C_RESET"
  printf "%s╰─────────────────────────────────────────────────────╯%s\n" "$C_CYAN" "$C_RESET"
}

print_summary() {
  local t ok f elapsed
  t=$(count total); ok=$(count ok); f=$(count fail)
  elapsed=$(( $(date +%s) - OVERALL_START ))
  local rate=0
  (( elapsed > 0 )) && rate=$(( t / elapsed ))
  local pct=0
  (( t > 0 )) && pct=$(( ok * 100 / t ))
  printf "\n%s── summary ─────────────────────────────%s\n" "$C_BOLD" "$C_RESET"
  printf " duration : %ds\n" "$elapsed"
  printf " requests : %d  (%d req/s avg)\n" "$t" "$rate"
  printf " ok       : %s%d%s  (%d%%)\n" "$C_GREEN" "$ok" "$C_RESET" "$pct"
  printf " failed   : %s%d%s\n" "$C_RED" "$f" "$C_RESET"
  printf " ids seen : %d\n" "$(wc -l <"$STATE_DIR/ids" | tr -d ' ')"
  printf "%s────────────────────────────────────────%s\n" "$C_BOLD" "$C_RESET"
}

OVERALL_START=$(date +%s)
CURRENT_PHASE="$PATTERN"

print_header

# Preflight.
if ! curl -sS -m 3 -o /dev/null "$BASE_URL/health"; then
  printf "%s!! %s/health did not respond - is the stack up?%s\n" "$C_YEL" "$BASE_URL" "$C_RESET" >&2
fi

case "$PATTERN" in
  steady)  pattern_steady "$DURATION" ;;
  burst)   pattern_burst  "$DURATION" ;;
  ramp)    pattern_ramp   "$DURATION" ;;
  wave)    pattern_wave   "$DURATION" ;;
  reads)   pattern_reads  "$DURATION" ;;
  mixed)   pattern_mixed  "$DURATION" ;;
  all)     pattern_all    "$DURATION" ;;
  *)
    printf "Unknown pattern: %s\n" "$PATTERN" >&2
    printf "Patterns: steady | burst | ramp | wave | reads | mixed | all\n" >&2
    exit 2
    ;;
esac

print_summary
