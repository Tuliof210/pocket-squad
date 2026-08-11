#!/bin/sh
# pocket-squad — the mechanical half of the workflow. Meant to be RUN, never read
# into a model's context: the /ps:* commands call it and quote its output.
#
#   sh .claude/ps-check.sh warm <path>     share this checkout's installed deps with a
#                                          fresh worktree — no install per task
#   sh .claude/ps-check.sh publish <pr>    squash-merge, delete the branch everywhere,
#                                          remove the worktree, go home and pull
#   sh .claude/ps-check.sh sweep           remove worktrees/branches of merged PRs
#
# Provider-agnostic: plain git, plus gh or glab if the machine happens to have one.
# Without a provider CLI it can read merge state from nowhere, so it removes nothing
# and says so — silence would read as "swept clean".
#
# Every mode costs at most ONE network call beyond the merge itself. The provider is
# listed once into $PRS and every lookup after that is a local awk over it.
set -u

MODE=${1:-}
ARG=${2:-}

git rev-parse --git-dir >/dev/null 2>&1 || { echo "ps-check: not a git repository"; exit 1; }

# The main checkout, even when invoked from inside a worktree: it is where the task
# prompts and the installed dependencies live, and where publish ends up.
MAIN=$(git worktree list --porcelain 2>/dev/null | awk '/^worktree /{print $2; exit}')
[ -n "$MAIN" ] || MAIN=$(git rev-parse --show-toplevel)
cd "$MAIN" || exit 1

PROVIDER=
if command -v gh >/dev/null 2>&1; then PROVIDER=gh
elif command -v glab >/dev/null 2>&1; then PROVIDER=glab
fi

LEFT=0

# Worktree paths resolved once: "<branch><TAB><path>".
wt_list() {
  git worktree list --porcelain 2>/dev/null |
    awk '/^worktree /{p=$2} /^branch /{sub("refs/heads/","",$2); print $2"\t"p}'
}
wt_of() { printf '%s\n' "$WT" | awk -F'\t' -v b="$1" '$1 == b { print $2; exit }'; }

# Remove the worktree and local branch a finished PR left behind. $1 = branch.
drop_branch() {
  b=$1
  wt=$(wt_of "$b")
  if [ -n "$wt" ]; then
    # The dep links `warm` created point outside the worktree; git removes the links,
    # never what they point at.
    if git worktree remove "$wt" 2>/dev/null; then
      printf '  ok  removed worktree %s\n' "$wt"
    else
      printf '  !   worktree %s refused removal (uncommitted changes?) — left alone\n' "$wt"
      LEFT=$((LEFT + 1))
      return 1
    fi
  fi
  git worktree prune 2>/dev/null
  git branch -D "$b" >/dev/null 2>&1 && printf '  ok  deleted local branch %s\n' "$b"
  return 0
}

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

# --------------------------------------------------------------------- publish
# The whole terminal step of a task, deterministic. /ps:publish decides one thing —
# whether the review approved — and then calls this. Exit 2 means CONFLICT and nothing
# was merged: resolve it on the branch and run this again, unchanged.
if [ "$MODE" = publish ]; then
  [ -n "$ARG" ] || { echo "ps-check: publish needs a PR number"; exit 1; }
  [ "$PROVIDER" = gh ] || { echo "ps-check: publish needs the gh CLI (GitHub); merge by hand"; exit 1; }

  # Uncommitted work in the main checkout would be caught by the checkout/pull below,
  # halfway through, with the merge already done. Untracked files are fine — a fresh
  # `.squad/tasks/*.prompt.md` is untracked until /ps:task commits it.
  if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "ABORT  main checkout has uncommitted changes to tracked files — commit or stash first"
    exit 1
  fi

  info=$(gh pr view "$ARG" --json headRefName,baseRefName,state,mergeable \
           --jq '[.headRefName, .baseRefName, .state, .mergeable] | @tsv' 2>/dev/null) ||
    { printf 'ABORT  could not read PR %s\n' "$ARG"; exit 1; }
  head=$(printf '%s' "$info" | cut -f1)
  base=$(printf '%s' "$info" | cut -f2)
  state=$(printf '%s' "$info" | cut -f3)
  mergeable=$(printf '%s' "$info" | cut -f4)

  printf 'PUBLISH #%s  %s -> %s\n' "$ARG" "$head" "$base"
  [ "$state" = OPEN ] || { printf 'ABORT  PR is %s, not OPEN\n' "$state"; exit 1; }
  if [ "$mergeable" = CONFLICTING ]; then
    printf 'CONFLICT  %s cannot merge into %s — resolve it on the branch, then run this again\n' "$head" "$base"
    exit 2
  fi

  # Squash on purpose: the base branch gets one commit per task. The per-step commits
  # stay in this PR's commit list.
  gh pr merge "$ARG" --squash --delete-branch ||
    { echo 'ABORT  merge refused — nothing was changed locally'; exit 1; }
  printf '  ok  squash-merged, remote branch %s deleted\n' "$head"

  WT=$(wt_list)
  drop_branch "$head"

  git checkout -q "$base" 2>/dev/null && printf '  ok  on %s\n' "$base" ||
    { printf '  !   could not check out %s\n' "$base"; LEFT=$((LEFT + 1)); }
  git pull --rebase --quiet && printf '  ok  pulled %s\n' "$base" ||
    { printf '  !   pull --rebase failed on %s — do it by hand\n' "$base"; LEFT=$((LEFT + 1)); }

  printf 'SUMMARY  needs attention: %s\n' "$LEFT"
  exit 0
fi

# ----------------------------------------------------------------------- sweep
# Strays: worktrees and branches of PRs that finished without going through
# `publish` — abandoned tasks, PRs merged in the browser. Branches are only deleted
# on MERGED; a CLOSED PR may be abandoned work worth keeping.
#
# `ps-story/*` and `ps/*` are still matched so branches left by v3 and earlier get
# swept too.
if [ "$MODE" != sweep ]; then
  echo "usage: sh .claude/ps-check.sh warm <path> | publish <pr> | sweep"
  exit 1
fi

# One provider call, every state. Lines are "<head-branch><TAB><STATE>".
PRS=
git fetch --prune --quiet 2>/dev/null
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

echo "STALE"
[ -n "$PROVIDER" ] || echo "  --  no gh/glab on this machine — merge state unknown, nothing removed"
found=0
WT=$(wt_list)

for b in $(git for-each-ref --format='%(refname:short)' refs/heads 2>/dev/null | grep -E '^(task|ps-story|ps)/'); do
  st=$(pr_state "$b")
  case $st in MERGED|CLOSED) ;; *) continue ;; esac
  found=$((found + 1))
  if [ "$st" = MERGED ]; then
    drop_branch "$b"
  else
    wt=$(wt_of "$b")
    [ -z "$wt" ] || printf '  ~   worktree %s kept (PR closed, not merged)\n' "$wt"
    printf '  ~   branch %s kept (PR closed, not merged)\n' "$b"
  fi
done

for r in $(git for-each-ref --format='%(refname:short)' refs/remotes 2>/dev/null | grep -E '/(task|ps-story|ps)/'); do
  remote=${r%%/*}
  b=${r#*/}
  [ "$(pr_state "$b")" = MERGED ] || continue
  found=$((found + 1))
  if git push --quiet "$remote" --delete "$b" 2>/dev/null; then
    printf '  ok  deleted remote branch %s\n' "$r"
  else
    printf '  !   could not delete remote branch %s\n' "$r"
    LEFT=$((LEFT + 1))
  fi
done
[ "$found" -eq 0 ] && echo "  none"

printf 'SUMMARY  needs attention: %s\n' "$LEFT"
