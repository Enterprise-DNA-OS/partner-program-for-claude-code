---
description: "Add a partner, person, certification, agreement, direct account, registration, sale, MDF fund or request, onboarding step or tier"
---

Read CLAUDE.md. Run `npm run partners -- add --json` with the flags the operator gave (--type=partner|contact|certification|agreement|house-account|registration|sale|fund|mdf-request|step|tier --actor=... (fields: see README)).

Present the result as a short table with the numbers that matter. An empty list means no matching records, not that everything is fine.

Ask for any required field you do not have. Never invent a value, a date or a person.

Never send anything. Drafts go to drafts/ for a person to send. Never invent a partner, an amount or a date.
