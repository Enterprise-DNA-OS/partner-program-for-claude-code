---
description: "Record an MDF payment"
---

Read CLAUDE.md. Run `npm run partners -- pay-mdf --json` with the flags the operator gave (--request=... --paid-on=YYYY-MM-DD --payment-ref=... [--tax-invoice=...] --actor=...).

Present the result as a short table with the numbers that matter. An empty list means no matching records, not that everything is fine.

Record the payment made in the accounting system. Ask for the partner's tax invoice number if it is not on file.

Never send anything. Drafts go to drafts/ for a person to send. Never invent a partner, an amount or a date.
