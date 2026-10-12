---
description: "Approve a deal registration and start its protection period"
---

Read CLAUDE.md. Run `npm run partners -- approve-registration --json` with the flags the operator gave (--registration=... --actor=... [--override-reason=... when it clashes]).

Present the result as a short table with the numbers that matter. An empty list means no matching records, not that everything is fine.

Read the registration and its clashes first (`/registration`). If it clashes, ask the operator for the reason before passing `--override-reason`. Then offer `/draft-registration-reply`.

Never send anything. Drafts go to drafts/ for a person to send. Never invent a partner, an amount or a date.
