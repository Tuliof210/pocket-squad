#!/bin/sh
# pocket-squad — the mechanical half of the workflow. Meant to be RUN, never read
# into a model's context: the /ps:* commands call it and quote its output.
#
#   sh .claude/ps-check.sh                report  — open windows, learnings size,
#                                                   debt to sweep, stale refs
#   sh .claude/ps-check.sh status <slug>  per-task state of one story, from PR state
#   sh .claude/ps-check.sh sync   <slug>  status, and tick story.md for merged tasks
#   sh .claude/ps-check.sh warm   <path>  share this checkout's installed deps with a
#                                         fresh worktree — no install per task
#   sh .claude/ps-check.sh sweep          remove worktrees/branches of merged PRs
#
# Provider-agnostic: plain git, plus gh or glab if the machine happens to have one.
# Without a provider CLI it can read merge state from nowhere, so it removes nothing
# and says so — silence would read as "swept clean".
#
# Every mode costs at most ONE network call. The provider is listed once into $PRS
# and every lookup after that is a local awk over it. Up to v0.5 this asked the
# provider once per branch, twice for a branch that also had a remote ref, and did it
# again on every invocation — tens of seconds per task, all of it spent waiting.
set -u

MODE=${1:-report}
ARG=${2:-}
CAP=6144

git rev-parse --git-dir >/dev/null 2>&1 || { echo "ps-check: not a git repository"; exit 1; }

# The main checkout, even when invoked from inside a worktree: it is where the
# stories, the knowledge files and the installed dependencies live.
MAIN=$(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2; exit}')
[ -n "$MAIN" ] || MAIN=$(git rev-parse --show-toplevel)
cd "$MAIN" || exit 1

PROVIDER=
if command -v gh >/dev/null 2>&1; then PROVIDER=gh
elif command -v glab >/dev/null 2>&1; then PROVIDER=glab
fi

WINDOWS=0
LEFT=0

# -------------------------------------------------------------------- pr cache
# One call, every state. Lines are "<head-branch><TAB><STATE>".
PRS=
load_prs() {
  case $PROVIDER in
    gh)
      PRS=$(gh pr list --state all --limit 300 --json state,headRefName \
              --jq '.[] | "\(.headRefName)\t\(.state)"' 2>/dev/null) || PRS=
      ;;
    glab)
      # Field order is not guaranteed, so pull each key independently per object.
      PRS=$(glab mr list --all -F json 2>/dev/null | tr '}' '\n' | while IFS= read -r o; do
              b=$(printf '%s' "$o" | grep -o '"source_branch":"[^"]*"' | cut -d'"' -f4)
              s=$(printf '%s' "$o" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)
              [ -n "$b" ] && printf '%s\t%s\n' "$b" "$s"
            done) || PRS=
      ;;
  esac
}
[ -n "$PROVIDER" ] && load_prs

# <branch> -> MERGED | CLOSED | OPEN | NONE | UNKNOWN   (local lookup, no network)
pr_state() {
  [ -n "$PROVIDER" ] || { echo UNKNOWN; return; }
  s=$(printf '%s\n' "$PRS" | awk -F'\t' -v b="$1" '$1 == b { print $2; exit }')
  case $(printf '%s' "$s" | tr 'a-z' 'A-Z') in
    MERGED)      echo MERGED ;;
    CLOSED)      echo CLOSED ;;
    OPEN|OPENED) echo OPEN ;;
    '')          echo NONE ;;
    *)           echo UNKNOWN ;;
  esac
}

# tasks/07-recursive-parser.md in story <slug> -> ps/<slug>/recursive-parser
task_branch() {
  b=$(basename "$2" .md)
  printf 'ps/%s/%s' "$1" "${b#*-}"
}

# --------------------------------------------------------------- status / sync
# A task is done when its PR is merged — not when someone remembered to tick a box.
# Up to v0.5 the box was ticked inside the task's own PR, which made every pair of
# sibling PRs conflict on story.md. `sync` ticks them here, on the base branch, after
# the merge that made them true.
if [ "$MODE" = status ] || [ "$MODE" = sync ]; then
  [ -n "$ARG" ] || { echo "ps-check: $MODE needs a story slug"; exit 1; }
  story=$(ls -d .squad/stories/*"$ARG"*/ 2>/dev/null | head -1)
  [ -n "$story" ] || { echo "ps-check: no story matching '$ARG'"; exit 1; }
  slug=$(basename "${story%/}")

  printf '%s %s\n' "$(printf '%s' "$MODE" | tr 'a-z' 'A-Z')" "$slug"
  n=0; ndone=0; nopen=0; ntodo=0
  ticks=

  for task in "$story"tasks/*.md; do
    [ -f "$task" ] || continue
    n=$((n + 1))
    rel="tasks/$(basename "$task")"
    br=$(task_branch "$slug" "$task")
    case $(pr_state "$br") in
      MERGED) ndone=$((ndone + 1)); printf '  done  %s\n' "$rel"
              ticks="$ticks $rel" ;;
      OPEN)   nopen=$((nopen + 1)); printf '  open  %s  (%s)\n' "$rel" "$br" ;;
      *)      # No PR, or no provider to ask — fall back to the box someone ticked.
              if grep -qE "^- \[[xX]\] $rel" "$story/story.md" 2>/dev/null; then
                ndone=$((ndone + 1)); printf '  done  %s  (ticked, no PR found)\n' "$rel"
              else
                ntodo=$((ntodo + 1)); printf '  todo  %s\n' "$rel"
              fi ;;
    esac
  done

  if [ "$MODE" = sync ] && [ -n "$ticks" ]; then
    tmp="$story/story.md.ps-tmp"
    cp "$story/story.md" "$tmp" || exit 1
    for rel in $ticks; do
      sed "s|^- \[ \] $rel|- [x] $rel|" "$tmp" > "$tmp.2" && mv "$tmp.2" "$tmp"
    done
    if cmp -s "$tmp" "$story/story.md"; then
      rm -f "$tmp"
    else
      mv "$tmp" "$story/story.md"
      echo "  ~~  story.md ticked for merged tasks"
    fi
  fi

  printf 'SUMMARY  %s tasks | done: %s | open: %s | todo: %s | remaining: %s\n' \
    "$n" "$ndone" "$nopen" "$ntodo" "$((nopen + ntodo))"
  exit 0
fi

# ------------------------------------------------------------------------ warm
# A fresh worktree has no node_modules / .venv / vendor and no build cache. Installing
# them per task was the largest fixed cost in the loop — and `git worktree add` cuts
# from this checkout, so at this moment the lockfiles are identical by construction
# and the directory is safe to share.
#
# ponytail: symlink, not copy — these trees are too big to copy per task. The ceiling
# is a task that CHANGES a lockfile: it would install into the shared directory and
# corrupt the main checkout. Nothing here can see that coming, so it is printed as a
# guard for the caller instead. Upgrade path if it ever bites: `cp -c` (APFS clone) on
# macOS, `cp --reflink=auto` on Linux.
if [ "$MODE" = warm ]; then
  [ -n "$ARG" ] || { echo "ps-check: warm needs a worktree path"; exit 1; }
  [ -d "$ARG" ] || { echo "ps-check: no such worktree: $ARG"; exit 1; }
  wt=$(cd "$ARG" && pwd)
  [ "$wt" = "$MAIN" ] && { echo "ps-check: refusing to warm the main checkout"; exit 1; }
  echo "WARM $wt"
  linked=0
  for dep in node_modules .venv venv vendor target .next .nuxt; do
    [ -d "$MAIN/$dep" ] || continue
    [ -e "$wt/$dep" ] && continue
    if ln -s "$MAIN/$dep" "$wt/$dep" 2>/dev/null; then
      printf '  ok  %s -> %s\n' "$dep" "$MAIN/$dep"
      linked=$((linked + 1))
    else
      printf '  !   could not link %s — install it in the worktree\n' "$dep"
    fi
  done
  if [ "$linked" -eq 0 ]; then
    echo "  --  nothing installed here to share — run the project's install in the worktree"
  else
    echo "  !!  SHARED, NOT COPIED: if this task changes a lockfile, delete the link"
    echo "      it names and run the project's real install before anything else."
  fi
  exit 0
fi

# ----------------------------------------------------------------- open windows
# A task may declare `window: <closing-task-stem> — <what degrades>`. The window is
# closed once that task is merged, and covered while its PR is open. Anything else is
# a planned regression with nothing scheduled to undo it.
echo "WINDOWS"
# One grep across every task file, instead of a loop with a grep inside it: the story
# directory only ever grows and nothing here archives it.
for task in $(grep -l '^window:' .squad/stories/*/tasks/*.md 2>/dev/null); do
  story=${task%/tasks/*}
  slug=$(basename "$story")
  line=$(grep -m1 '^window:' "$task")
  closer=$(printf '%s' "$line" | sed 's/^window:[[:space:]]*//' | awk '{print $1}')
  st=NONE
  if grep -qE "^- \[[xX]\] tasks/$closer" "$story/story.md" 2>/dev/null; then
    st=MERGED
  else
    cf=$(ls "$story"/tasks/"$closer"*.md 2>/dev/null | head -1)
    [ -n "$cf" ] && st=$(pr_state "$(task_branch "$slug" "$cf")")
  fi
  case $st in
    MERGED) printf '  ok  %s — closed, %s is merged\n' "$task" "$closer" ;;
    OPEN)   printf '  ~   %s — %s has an open PR\n' "$task" "$closer" ;;
    *)      printf '  !   OPEN WINDOW  %s — waits on %s, which has no PR\n' "$task" "$closer"
            WINDOWS=$((WINDOWS + 1)) ;;
  esac
done
[ "$WINDOWS" -eq 0 ] && echo "  none open"

# -------------------------------------------------------------------- learnings
echo "LEARNINGS"
if [ -f .squad/learnings.md ]; then
  bytes=$(wc -c < .squad/learnings.md | tr -d ' ')
  if [ "$bytes" -gt "$CAP" ]; then
    printf '  !   %s bytes / %s cap — OVER: compress or drop before appending\n' "$bytes" "$CAP"
    LEFT=$((LEFT + 1))
  else
    printf '  ok  %s bytes / %s cap\n' "$bytes" "$CAP"
  fi
  # A rule carrying two dates was grown in place instead of rewritten or promoted —
  # the second date is the rule announcing it did not work the first time.
  D='[0-9]{4}-[0-9]{2}-[0-9]{2}'
  grown=$(grep -cE "$D.*$D" .squad/learnings.md) || grown=0
  if [ "$grown" -gt 0 ]; then
    printf '  !   %s rule(s) grown in place — rewrite as one line, or promote to config/test/task\n' "$grown"
    LEFT=$((LEFT + 1))
  fi
else
  echo "  --  no .squad/learnings.md yet"
fi

# ------------------------------------------------------------------------- debt
# Debt has no cap — it grows honestly. It stays short by being swept: an entry whose
# path is gone died with the code, and one with no `until` never said what would earn
# it a fix, which makes it a wish.
echo "DEBT"
if [ -f .squad/debt.md ]; then
  n=0
  bad=0
  while IFS= read -r line; do
    case $line in '- ['*) ;; *) continue ;; esac
    n=$((n + 1))
    p=$(printf '%s' "$line" | sed 's/^- \[//; s/[]:].*//')
    why=
    [ -e "$p" ] || why="path is gone — delete the entry"
    case $line in *' until '*) ;; *) why="${why:+$why, and }no 'until' — say what earns it a fix" ;; esac
    [ -z "$why" ] || { printf '  !   %s — %s\n' "$p" "$why"; bad=$((bad + 1)); }
  done < .squad/debt.md
  printf '  %s  %s entries, %s to sweep\n' "$([ "$bad" -eq 0 ] && echo ok || echo '! ')" "$n" "$bad"
  LEFT=$((LEFT + bad))
else
  echo "  --  no .squad/debt.md yet"
fi

# ------------------------------------------------------------------- stale refs
# Worktrees of merged/closed PRs, and the branches they leave behind. Branches are
# only deleted on MERGED: a CLOSED PR may be abandoned work worth keeping.
echo "STALE"
if [ "$MODE" = sweep ]; then
  git fetch --prune --quiet 2>/dev/null
  load_prs                      # refs just moved; the single call is worth repeating
fi
[ -n "$PROVIDER" ] || echo "  --  no gh/glab on this machine — merge state unknown, nothing removed"
found=0

# Worktree paths resolved once, instead of re-walking the porcelain per branch.
WT=$(git worktree list --porcelain 2>/dev/null |
     awk '/^worktree /{p=$2} /^branch /{sub("refs/heads/","",$2); print $2"\t"p}')

for b in $(git for-each-ref --format='%(refname:short)' refs/heads 2>/dev/null | grep '^ps/'); do
  st=$(pr_state "$b")
  case $st in MERGED|CLOSED) ;; *) continue ;; esac
  found=$((found + 1))
  wt=$(printf '%s\n' "$WT" | awk -F'\t' -v b="$b" '$1 == b { print $2; exit }')
  if [ "$MODE" != sweep ]; then
    printf '  ~   %s (PR %s) — would remove %s\n' "$b" "$st" "${wt:-branch only}"
    continue
  fi
  if [ -n "$wt" ]; then
    # The dep links `warm` created point outside the worktree; git removes the links,
    # never what they point at.
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
