# Moving off Impartner PRM

What comes across, how, and what you re-enter. Do a test run first: every import takes `--dry-run`, which writes nothing.

## 1. Get the records out

Impartner's help centre is behind its customer login, so check the exact menu names there. The records come out two ways:

- **From Impartner.** Export a report of partner accounts, a report of partner users, and a report of deal registrations to CSV. Include each record's Impartner Id: the import uses it to skip repeats.
- **From your CRM.** Impartner syncs with Salesforce, Dynamics 365 or HubSpot. If your partner accounts and registered deals live there too, export them from the CRM instead.

## 2. Set up tiers first

Tiers come across by name, so add them before the partners:

```bash
npm run partners -- add --type=tier --name=Silver --rank=2 --min-revenue-nz=100000 --min-revenue-au=90000 --min-certified=2 --discount=20 --mdf=2 --actor="Your name"
```

## 3. Import, in this order

```bash
npm run partners -- import impartner --object=partners --file=export/partners.csv --actor="Your name" --dry-run
npm run partners -- import impartner --object=partners --file=export/partners.csv --actor="Your name"
npm run partners -- import impartner --object=contacts --file=export/users.csv --actor="Your name"
npm run partners -- import impartner --object=registrations --file=export/registrations.csv --actor="Your name"
```

## What maps

| Impartner heading (any of) | Here |
|---|---|
| Id, Account Id, Partner Id | partner `source_id` (kept as `impartner:<Id>`) |
| Account Name, Partner Name, Name | partner name |
| Partner Level, Partner Tier, Tier | tier, matched by name (blank is your lowest tier) |
| Billing Country, Country | NZ or AU, which sets the currency |
| Partner Type, Type | reseller, msp, integrator, distributor or referral |
| Channel Manager, Partner Manager, Owner | owner |
| Status, Partner Status | active, onboarding, suspended or exited |
| First Name, Last Name, Email, Title | the partner's people |
| Deal Registration Number, Registration Number | registration reference |
| Customer Company, End Customer | end customer |
| Customer Website, Website | customer domain (used to find clashes) |
| Amount, Deal Value | value |
| Status, Registration Status, Stage | submitted, approved, rejected, won, lost or expired |
| Submitted Date, Created Date | submitted on |
| Expiration Date | protection end (approved without one: submitted date plus your protection days) |

Your headings are different? Write a mapping file (see `examples/column-mapping.json`) and pass `--mapping=file.json`. Dates written as 05/10/2026 need `--date-format=dmy` (NZ and AU) or `--date-format=mdy` (US).

## What the import will not do

- **Overwrite.** A row whose Id is already here is skipped if unchanged, and refused if it changed since the last import. Reconcile it by hand.
- **Half an import.** One bad row and nothing from that file is written.

## What you re-enter

- **Certifications.** Impartner's learning records vary by setup. Add them with `add --type=certification`, or ask Claude Code to map your training export.
- **Partner agreements.** Add each current agreement with its dates, whether it is standard form, and when its terms were last reviewed. `/compliance` depends on these.
- **MDF.** Add this period's funds and any open requests. Paid history can stay in Impartner's export for reference.
- **Direct accounts.** Add the customers your own team sells to, so clashes with them are caught.
- **Content, training courses and the partner portal.** These are not records, and they do not come across. Enterprise DNA builds a partner-facing form or portal in the customised version if you need one.
