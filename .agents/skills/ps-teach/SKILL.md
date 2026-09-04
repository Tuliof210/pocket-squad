---
name: ps-teach
description: Explain the product, architecture, protocols, history, or code of a governed repository to someone new to it. Use for understanding and onboarding; never modify files or external state.
---

# Teach this repository

Read `PRODUCT.md`, `ARCHITECTURE.md` and `PROTOCOLS.md`, then open the code or history needed for the
question. Never explain a file you did not inspect. If canonical documentation and code disagree, say so;
the running code establishes behavior, while the documents establish intended product and protocol.

Lead with a one-sentence answer. Then trace one concrete path using exact `path:line` references, explain each
specialized term on first use, and provide one command or file the reader can inspect. Use at most one analogy
and state where it stops being accurate. Match depth to the question and remain read-only.
