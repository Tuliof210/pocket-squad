---
description: Show the current state of all Stories - board, task statuses, blockers, PRs.
---

Read `.squad/stories/*/story.md` and `*/board.md`. Print a compact report:

- Per story: title, status (draft/in_progress/done), progress (done/total), PR if any.
- In-progress stories: the board (todo/doing/done), blocked tasks with their reasons,
  tasks that failed review and their attempt count.
- Drafts ready for `/ps:run` (and their story-level `depends_on` order).

Read-only: change nothing.
