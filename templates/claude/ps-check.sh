#!/bin/sh
# pocket-squad — the mechanical half of the workflow. Meant to be RUN, never read
# into a model's context: /ps:load and /ps:publish call it and quote its output.
#
#   sh .claude/ps-check.sh          report  — read-only: open windows, learnings size,
#                                             stale refs a sweep would remove
#   sh .claude/ps-check.sh sweep    act     — remove the worktrees/branches of merged
#                                             PRs, then report what survived
#
# Provider-agnostic: plain git, plus gh or glab if the machine happens to have one.
# Without a provider CLI it can read merge state from nowhere, so it removes nothing
# and says so — silence would read as "swept clean".
set -u

MODE=${1:-report}
CAP=6144

ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || ROOT=
[ -n "$ROOT" ] || { echo "ps-check: not a git repository"; exit 1; }
cd "$ROOT" || exit 1

PROVIDER=
if command -v gh >/dev/null 2>&1; then PROVIDER=gh
elif command -v glab >/dev/null 2>&1; then PROVIDER=glab
fi

WINDOWS=0
LEFT=0

# <branch> -> MERGED | CLOSED | OPEN | NONE | UNKNOWN
pr_state() {
  s=
  case $PROVIDER in
    gh)   s=$(gh pr list --head "$1" --state all --json state --jq '.[0].state' 2>/dev/null) ;;
    glab) s=$(glab mr list --source-branch "$1" --all -F json 2>/dev/null |
              tr ',{' '\n' | grep -m1 '"state"' | cut -d'"' -f4) ;;
    *)    echo UNKNOWN; return ;;
  esac
  case $(printf '%s' "$s" | tr 'a-z' 'A-Z') in
    MERGED)      echo MERGED ;;
    CLOSED)      echo CLOSED ;;
    OPEN|OPENED) echo OPEN ;;
    ''|NULL)     echo NONE ;;
    *)           echo UNKNOWN ;;
  esac
}

# ---------------------------------------------------------------- open windows
# A task may declare `window: <closing-task-stem> — <what degrades>`. The window is
# closed once that task is merged, and covered while its PR is open. Anything else is
# a planned regression with nothing scheduled to undo it.
echo "WINDOWS"
for story in .squad/stories/*/; do
  [ -d "$story" ] || continue
  for task in "$story"tasks/*.md; do
    [ -f "$task" ] || continue
    line=$(grep -m1 '^window:' "$task" 2>/dev/null) || line=
    [ -n "$line" ] || continue
    closer=$(printf '%s' "$line" | sed 's/^window:[[:space:]]*//' | awk '{print $1}')
    if grep -qE "^- \[[xX]\] tasks/$closer" "$story/story.md" 2>/dev/null; then
      printf '  ok  %s — closed, %s is merged\n' "$task" "$closer"
      continue
    fi
    br=$(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes 2>/dev/null |
         grep -m1 "ps/.*${closer#*-}\$") || br=
    st=UNKNOWN
    [ -n "$br" ] && st=$(pr_state "${br#*/}")
    case $st in
      MERGED) printf '  ok  %s — closed, %s is merged\n' "$task" "$closer" ;;
      OPEN)   printf '  ~   %s — %s has an open PR (%s)\n' "$task" "$closer" "$br" ;;
      *)      printf '  !   OPEN WINDOW  %s — waits on %s, which has no PR\n' "$task" "$closer"
              WINDOWS=$((WINDOWS + 1)) ;;
    esac
  done
done
[ "$WINDOWS" -eq 0 ] && echo "  none open"

# ------------------------------------------------------------------- learnings
echo "LEARNINGS"
if [ -f .squad/learnings.md ]; then
  bytes=$(wc -c < .squad/learnings.md | tr -d ' ')
  if [ "$bytes" -gt "$CAP" ]; then
    printf '  !   %s bytes / %s cap — OVER: compress or drop before appending\n' "$bytes" "$CAP"
    LEFT=$((LEFT + 1))
  else
    printf '  ok  %s bytes / %s cap\n' "$bytes" "$CAP"
  fi
else
  echo "  --  no .squad/learnings.md yet"
fi

# ----------------------------------------------------------------- stale refs
# Worktrees of merged/closed PRs, and the branches they leave behind. Branches are
# only deleted on MERGED: a CLOSED PR may be abandoned work worth keeping.
echo "STALE"
[ "$MODE" = sweep ] && git fetch --prune --quiet 2>/dev/null
if [ -z "$PROVIDER" ]; then
  echo "  --  no gh/glab on this machine — merge state unknown, nothing removed"
fi
found=0

for b in $(git for-each-ref --format='%(refname:short)' refs/heads 2>/dev/null | grep '^ps/'); do
  st=$(pr_state "$b")
  case $st in MERGED|CLOSED) ;; *) continue ;; esac
  found=$((found + 1))
  wt=$(git worktree list --porcelain 2>/dev/null |
       awk -v want="refs/heads/$b" '/^worktree /{p=$2} /^branch /{if ($2==want) print p}')
  if [ "$MODE" != sweep ]; then
    printf '  ~   %s (PR %s) — would remove %s\n' "$b" "$st" "${wt:-branch only}"
    continue
  fi
  if [ -n "$wt" ]; then
    if git worktree remove "$wt" 2>/dev/null; then
      printf '  ok  removed worktree %s\n' "$wt"
    else
      printf '  !   worktree %s refused removal (uncommitted changes?) — left alone\n' "$wt"
      LEFT=$((LEFT + 1))
      continue
    fi
  fi
  [ "$st" = MERGED ] || { printf '  ~   branch %s kept (PR closed, not merged)\n' "$b"; continue; }
  git branch -D "$b" >/dev/null 2>&1 && printf '  ok  deleted local branch %s\n' "$b"
done
[ "$MODE" = sweep ] && git worktree prune 2>/dev/null

for r in $(git for-each-ref --format='%(refname:short)' refs/remotes 2>/dev/null | grep '/ps/'); do
  remote=${r%%/*}
  b=${r#*/}
  [ "$(pr_state "$b")" = MERGED ] || continue
  found=$((found + 1))
  if [ "$MODE" != sweep ]; then
    printf '  ~   %s (PR merged) — would delete on the remote\n' "$r"
  elif git push --quiet "$remote" --delete "$b" 2>/dev/null; then
    printf '  ok  deleted remote branch %s\n' "$r"
  else
    printf '  !   could not delete remote branch %s\n' "$r"
    LEFT=$((LEFT + 1))
  fi
done
[ "$found" -eq 0 ] && echo "  none"

printf 'SUMMARY  open windows: %s | needs attention: %s\n' "$WINDOWS" "$LEFT"
