# Partner Program for Claude Code: operating instructions

This file is the brain. Claude Code reads it at the start of every session. It says who this is for, how work gets done, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR BUSINESS]
- **Operator:** [YOUR NAME], [your role]
- **What matters most:** [the one or two outcomes you care about]

Fill this in once. A worker with context knows. A worker without it guesses.

## How to work

1. **Take a brief, not a script.** The operator describes the outcome. You run the right command and present the answer.
2. **Read before you write.** Before drafting anything about a record, read its full history first.
3. **Plain language.** Short sentences. No filler. Numbers in tables.
4. **Silent success, loud problems.** No play-by-play. Say what broke and what you did about it.
5. **Stop at the line.** Anything that sends, deletes, or faces a customer waits for a yes in this session.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| What needs doing | `/attention` |
| Registrations waiting on us | `/to-decide`, then `/approve-registration` or `/reject-registration` |
| Two partners on one customer | `/conflicts` |
| Protection ending or lapsed | `/expiring`, `/extend-registration`, `/expire-registrations` |
| A registered deal closed | `/close-registration` |
| Registered pipeline, win rates | `/pipeline`, `/win-rate` |
| Who is below, at risk of, or ready for a tier | `/tier-review`, then `/set-tier` |
| Certifications lapsing | `/certifications` |
| MDF left in each fund | `/mdf` |
| MDF requests and claims waiting | `/mdf-queue`, then `/preapprove-mdf`, `/claim-mdf`, `/approve-claim`, `/pay-mdf`, `/tax-invoice` or `/reject-mdf` |
| What MDF returned | `/mdf-return` |
| Revenue by partner | `/partner-revenue` |
| New partners stuck | `/onboarding`, `/complete-step` |
| Agreements missing or ending | `/partner-watch` |
| Rule checks | `/compliance` |
| Partners gone quiet | `/quiet-partners` |
| The Monday review | `/weekly-review` |
| A letter about a partner's tier | `/draft-tier-letter` |
| Tell a partner the decision on a registration | `/draft-registration-reply` |
| A QBR pack | `/draft-qbr` |
| One partner or one registration | `/partner`, `/registration`, `/search` |
| Add a record | `/add`, `/log` |
| Bring Impartner data across | `/import` |
| Back up | `/export` |
| Change how it works | `/customise` |
| A new report | `/new-view` |

If an ask fits nothing here, run the CLI directly (`npm run partners -- help`) and then propose a new command for it.

## Hard rules

- Never send email or messages from here. Draft to `drafts/`, a person sends.
- Never delete records without an explicit yes in this session. Prefer marking closed or archived.
- Never invent a record. If a name is ambiguous, list the candidates and ask.
- The database is the source of truth. If the answer is not in it, say so.

## Partner program rules

- Amounts exclude GST and are in the partner's currency (NZD for NZ, AUD for AU). Never add NZD to AUD.
- Never change a partner's tier without the operator's say-so. Quote `tier-review` in the reason.
- Never approve a registration that clashes without a reason the operator gave. The override is on the record.
- An MDF claim is approved by a different person from whoever pre-approved it, never above the pre-approved amount, and only with proof. Never approve on the operator's behalf with someone else's name.
- Read docs/compliance.md before reporting rule checks. They are prompts, not legal or tax advice.
- The demo data is fictional. Never present it as real.

## Where things live

- `scripts/` the CLI. `scripts/lib/db.mjs` picks `DATABASE_URL` (Postgres, Supabase) or the embedded database in `.data/`.
- `supabase/migrations/` the schema, plain SQL. `npm run migrate` applies it.
- `.claude/commands/` the slash commands. Add one every time the same ask comes twice.
- `docs/` the thesis and the guide for moving off Impartner PRM.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/instead-of/impartner
