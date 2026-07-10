---
description: Show the current state of all Stories - board, task statuses, blockers.
---

Read `.squad/stories/*/story.md` and `*/board.md`. Print a compact report:

- Per story: title, status (draft/approved/in_progress/done), progress (done/total).
- In-progress stories: the board (todo/doing/done), blocked tasks with their reasons,
  tasks that failed review and their attempt count.
- Drafts waiting for `/approve` and stories ready for `/run`.

Read-only: change nothing.
