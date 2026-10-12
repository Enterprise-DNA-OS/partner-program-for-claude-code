<h1 align="center">Partner Program for Claude Code</h1>

<p align="center">
  <strong>The open-source partner program system that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your Impartner PRM data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=impartner">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/impartner?utm_source=github&utm_medium=readme&utm_campaign=impartner">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#instead-of-impartner-prm">Instead of Impartner PRM</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>
## What is this

Partner Program for Claude Code does the job you pay Impartner PRM for, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it can answer questions the Impartner dashboard cannot.

Impartner sells Impartner PRM on AWS Marketplace as a 12-month contract: US$25,000 for Emerge, US$45,000 for Ignite, US$75,000 for Pro and US$150,000 for Enterprise ([AWS Marketplace listing](https://aws.amazon.com/marketplace/pp/prodview-l75vriw7iffmw), checked 12 October 2026). Implementation and add-on modules are quoted on top.

Want the same thing with a web front end, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=impartner).

It is for software vendors, wholesalers and manufacturers in New Zealand and Australia who sell through partners: resellers, managed service providers, integrators, distributors and referral partners. It holds the partner tiers and what each needs, the people and their certifications, the partner agreements, deal registrations and their protection periods, partner-sourced revenue, market development funds (MDF) from request to payment, and onboarding. The channel manager runs the program by asking for it.

```
$ npm run partners -- attention
  kind        partner                 item                    detail
  ----------  ----------------------  ----------------------  -------------------------------------------------------------------------
  decide      Harbour Digital         HD-0093                 Within 2 days, waiting 1 days; clashes with KIT-0412 (Kauri IT Solutions)
  decide      Southern Cross Systems  SCS-1187                Overdue, waiting 5 days
  mdf         Southern Cross Systems  SCS-MDF-01              Claims more than pre-approved (2500.00)
  protection  Harbour Digital         HD-0071                 Lapsed 10 days ago, still approved
  tier        Kauri IT Solutions      Gold                    Below tier: 1 more certified person needed
  tier        Outback Networks        Registered              Eligible to move up: Meets every Silver requirement
```

(Fictional demo data. Trimmed.)

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no tiers, no add-ons. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/partner-program-for-claude-code.git
cd partner-program-for-claude-code
npm install
npm run demo
```

Then open the folder in Claude Code and type `/attention`, or ask "which partners would drop a tier if we reviewed them today?"

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee.

## The commands

| Command | What it does |
|---|---|
| `/attention` | Everything that needs doing: decisions owed, clashes, protection lapsing, tiers, certifications, MDF, onboarding, agreements, rule checks, quiet partners |
| `/to-decide` | Registrations waiting on a decision, oldest first, against your two-day promise, with clashes |
| `/conflicts` | Open registrations that clash with another partner's or with a direct account, by website or customer name |
| `/approve-registration` | Approve and start the protection period; a clash needs an override reason |
| `/reject-registration` | Reject with a reason the partner will read |
| `/extend-registration` | Extend protection up to 90 days, with a reason |
| `/close-registration` | Record a registered deal won or lost |
| `/expiring`, `/expire-registrations` | Protection ending in 30 days, and mark the lapsed ones |
| `/pipeline`, `/win-rate` | Open registered pipeline by partner; won, lost and lapsed in 12 months, and days to win |
| `/tier-review` | Every active partner against its tier: below, at risk in 60 days, eligible to move up, and the gap to the next |
| `/set-tier` | Move a partner's tier, with the reason on the record |
| `/certifications` | Certifications lapsing in 60 days or lapsed in the last 90 |
| `/mdf` | Each fund: allocated, committed, paid, left, days to the end of the period |
| `/mdf-queue` | Requests to pre-approve, claims overdue or over the pre-approved amount, claims to approve, payments to make |
| `/preapprove-mdf`, `/claim-mdf`, `/approve-claim`, `/pay-mdf`, `/tax-invoice`, `/reject-mdf` | MDF from request to payment, with a second person on every approval |
| `/mdf-return` | What MDF paid in 12 months returned: leads, pipeline, revenue per MDF dollar |
| `/partner-revenue` | Revenue by partner and the share that came through a registration |
| `/quiet-partners` | Active partners with no registration and no sale in 90 days |
| `/onboarding`, `/complete-step` | New partners' onboarding steps, overdue first |
| `/partner-watch` | Partners with no current signed agreement, or one ending in 60 days |
| `/compliance` | Agreements and MDF payments against the cited rules |
| `/weekly-review` | The Monday review, drafted from four commands |
| `/draft-tier-letter` | A tier move, warning or progress letter for a partner, to drafts/ |
| `/draft-registration-reply` | The decision on a registration, to drafts/ |
| `/draft-qbr` | A quarterly business review pack for a partner, to drafts/ |
| `/partners`, `/partner`, `/tiers`, `/agreements`, `/registrations`, `/registration`, `/search`, `/history` | Read the records |
| `/add`, `/log` | Add partners, people, certifications, agreements, direct accounts, registrations, sales, funds, MDF requests, onboarding steps and tiers; record notes |
| `/import` | Bring partners, people and registrations across from an Impartner export |
| `/export` | Back up every record to one JSON file |
| `/customise` | Change a field, a rule or a document in plain language |
| `/new-view` | Add a read-only HTML view |

Every command runs `npm run partners -- <command>` underneath, with `--json` for machines. Names match without case; a reference or a partial id works; an ambiguous name lists the candidates and exits 1. Every write needs `--actor` (a name for the history, not a login). Nothing here sends anything.

## How the program rules work

- **Revenue** is partner-sourced sales in the last 12 months, excluding GST, in the partner's currency (NZD for NZ, AUD for AU). Each tier sets a New Zealand and an Australian threshold.
- **Certified** means a person at the partner holds at least one certification that is current today. A tier needs revenue and certified people both.
- **Tier review** compares what the partner earns today with its tier, and again with the certifications that will still be current in 60 days. Nothing moves a tier until a person runs `set-tier`.
- **Deal registration** protects an opportunity for the partner for 90 days from approval (set in the `program` table, with the two-day decision promise, the 60-day MDF claim window and the 90-day quiet window). A clash is the same website or the same customer name, with "Ltd", "Pty", "Group" and the like ignored.
- **MDF** goes requested, pre-approved, claimed (with proof), approved by a different person, paid. A claim above the pre-approved amount is approved at the pre-approved amount or rejected. A request cannot be pre-approved past what is left in the fund.

Tier points, multiple certifications per tier, MDF as a share of revenue, different protection periods by deal size: ask for it with `/customise`.

## Ten questions your partner records answer

Each one runs today on the demo data. Impartner has its own dashboards; these are answered from records you own, in plain language, without building a report.

1. Which partners would drop a tier if we reviewed them today, and what are they short? `tier-review`
2. Which partners have earned a move up and have not been told? `tier-review`
3. Whose certifications lapse in the next 60 days, and which tier does that put at risk? `tier-review`, `certifications`
4. Which deal registrations clash with another partner or with one of our direct accounts? `conflicts`
5. Which registrations have waited longer than our two-day promise? `to-decide`
6. What did every MDF dollar return, by partner, in leads, pipeline and revenue? `mdf-return`
7. Which MDF claims ask for more than we pre-approved? `mdf-queue`
8. What share of each partner's revenue came through a registered deal? `partner-revenue`
9. Which partners win what they register, and how long does it take? `win-rate`
10. Which partner agreements set a minimum resale price, or are standard terms with a small business nobody has reviewed? `compliance`

## Your first hour: ten things to ask for

1. Put our name and logo on the scorecard and the remittance advice (`brand.json`).
2. Set up our tiers and what each one needs.
3. Import our partners, people and deal registrations from the Impartner export, as a test run first.
4. Add our direct accounts so registrations that clash with them are caught.
5. Show every partner against its tier.
6. Our registrations are protected for 120 days, not 90: change it.
7. Load this year's MDF allocations.
8. Which registrations are waiting on us?
9. Draft a QBR pack for our biggest partner.
10. Draft the Monday partner review.

## Instead of Impartner PRM

Impartner's own help is behind its customer login. The records come out two ways: a CSV export of partner accounts, users and deal registrations from Impartner's reports, or the same records from your CRM where Impartner syncs them (the AWS listing names Salesforce, Dynamics 365 and HubSpot). Then:

```bash
npm run partners -- import impartner --object=partners --file=export/partners.csv --actor="Your name" --dry-run
```

Dry-run first, then partners, contacts and registrations for real. Headings differ between Impartner setups, so `--mapping` points any field at your column name, and `--date-format=dmy` reads NZ and AU dates. Tiers come across by name. Certifications, agreements, MDF and onboarding are entered with `add`. The full guide, with what maps and what does not: [docs/replace-impartner.md](docs/replace-impartner.md).

## Documents, views and the rules

- `npm run docs` renders a scorecard for every active partner, a confirmation for every approved registration and a remittance advice for every MDF payment into `docs-out/`, in your brand.
- `npm run view` renders the program week and program health into `views/`.
- `/compliance` checks partner agreements for minimum resale price clauses (Competition and Consumer Act s48, Commerce Act s37), standard form agreements with small business partners under the unfair contract terms rules (AU and NZ), and MDF paid to GST-registered partners with no tax invoice on file. Sources and limits: [docs/compliance.md](docs/compliance.md). Not legal or tax advice.

## Validation

`npm test` builds a temporary database and runs every command: the tier review checked against the rules, registration clashes, overrides and lapsing, MDF approval by a second person with fund limits, the four rules, an atomic Impartner import with repeats, changes, mapping and dates, drafts, backups and escaped HTML. CI runs it on Linux and Windows, Node 20 and 22, and on PostgreSQL 17.

## Architecture

```
partner-program-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/partners.mjs      the CLI the commands drive
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema and views
  supabase/seed.sql         demo data
  views.json, documents.json  the HTML views and documents
  docs/                     the rules, the thesis and the migration guide
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Partner Program for Claude Code for your business, migrates your Impartner PRM data, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=impartner)
- Read more: [enterprisedna.co/omni/instead-of/impartner](https://enterprisedna.co/omni/instead-of/impartner?utm_source=github&utm_medium=readme&utm_campaign=impartner)

## License

MIT. Copyright (c) 2026 Enterprise DNA.
