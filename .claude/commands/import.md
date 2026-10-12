---
description: "Bring partners, people and deal registrations across from an Impartner export"
---

Read CLAUDE.md. Run `npm run partners -- import --json` with the flags the operator gave (impartner --object=partners|contacts|registrations --file=export.csv --actor=... [--mapping=file.json] [--date-format=ymd|dmy|mdy] [--dry-run]).

Present the result as a short table with the numbers that matter. An empty list means no matching records, not that everything is fine.

Read docs/replace-impartner.md. Always `--dry-run` first and show what would come across. Partners, then contacts, then registrations.

Never send anything. Drafts go to drafts/ for a person to send. Never invent a partner, an amount or a date.
