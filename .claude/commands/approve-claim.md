---
description: "Approve an MDF claim (a different person from whoever pre-approved it)"
---

Read CLAUDE.md. Run `npm run partners -- approve-claim --json` with the flags the operator gave (--request=... [--amount=... up to the pre-approved amount] --actor=... (not whoever pre-approved it)).

Present the result as a short table with the numbers that matter. An empty list means no matching records, not that everything is fine.

The approver must be a different person from whoever pre-approved. If the claim is more than was pre-approved, approve the pre-approved amount with `--amount` or reject; say which to the operator.

Never send anything. Drafts go to drafts/ for a person to send. Never invent a partner, an amount or a date.
