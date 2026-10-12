# Rules the compliance command checks

`npm run partners -- compliance` runs the `compliance_gaps` view. Each rule below says where it comes from, what a gap looks like in the records, and what a person does about it. These are prompts for someone to check, not legal or tax advice. When a rule changes, update this file and the view together, through `/customise`.

Sources checked 12 October 2026.

## RPM-MIN-PRICE: no minimum resale price in a partner agreement

- **Australia.** Section 48 of the Competition and Consumer Act 2010 prohibits resale price maintenance: a supplier stopping, or trying to stop, a reseller from selling or advertising below a price the supplier sets. It is a per se breach, whatever its effect on competition. The ACCC says this includes offering a discount or other incentive on condition the reseller sells at or above a set price, and taking a discount away for selling below one. A supplier may recommend a price, or set a maximum. https://www.accc.gov.au/business/competition-and-exemptions/minimum-resale-prices
- **New Zealand.** Sections 37 and 38 of the Commerce Act 1986 prohibit resale price maintenance, including an agreement whose terms set a minimum resale price, unless the Commerce Commission authorises it. https://www.comcom.govt.nz/assets/pdf_file/0025/96181/Resale-price-maintenance-Fact-sheet-June-2022.pdf
- **Why a partner program is exposed:** tier discounts, MDF and deal protection are exactly the "discount or other incentive" the ACCC describes. A condition such as "must not advertise below RRP less 10%" in the agreement, or in the tier rules, is the gap.
- **In the data:** a current agreement (ends today or later) with text in `minimum_resale_price`.
- **Fix:** take the clause to your lawyer. Record the reviewed version as a new agreement through `/add` with `minimum_resale_price` empty. Recommended prices are fine; say so in the agreement.

## UNFAIR-TERMS-AU: standard form agreements with small business partners (Australia)

- **Source.** Australian Consumer Law (Schedule 2 to the Competition and Consumer Act 2010), sections 23 to 25, as amended by the Treasury Laws Amendment (More Competition, Better Prices) Act 2022. From 9 November 2023 it is prohibited to propose, use or rely on an unfair term in a standard form small business contract, with penalties. A small business is one with fewer than 100 employees or under $10 million turnover. https://www.accc.gov.au/business/business-rights-and-protections/unfair-contract-terms
- **In the data:** a current agreement marked `standard_form` with an AU partner marked `small_business`, where `terms_reviewed_on` is empty or before 9 November 2023.
- **Fix:** have the standard terms reviewed for unfair terms (one-sided termination, unilateral variation, wide indemnities are the usual ones), then record the date with `/customise` or a new agreement version.

## UNFAIR-TERMS-NZ: standard form small trade contracts (New Zealand)

- **Source.** Fair Trading Act 1986 as amended by the Fair Trading Amendment Act 2021: from 16 August 2022 the unfair contract terms rules cover standard form small trade contracts, meaning business-to-business contracts where the trading relationship is worth no more than $250,000 a year including GST. They apply to contracts entered into, renewed or varied on or after that date. https://www.legislation.govt.nz/act/public/1986/0121/latest/whole.html
- **In the data:** a current agreement marked `standard_form` with an NZ partner marked `small_business`, where `terms_reviewed_on` is empty or before 16 August 2022. Mark a partner `small_business` when the relationship is under the $250,000 a year line at the start.
- **Fix:** as for Australia: review the terms, then record the date.

## GST-TAX-INVOICE: a tax invoice for MDF paid to a GST-registered partner

- **Australia.** To claim a GST credit on a purchase over $82.50 including GST you need a valid tax invoice from the supplier. https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/claiming-gst-credits/when-you-can-claim-a-gst-credit
- **New Zealand.** For supplies over $200 including GST the buyer needs taxable supply information that includes the seller's GST number and the GST in the price. https://www.ird.govt.nz/gst/taxable-supply-information-for-gst/how-taxable-supply-information-for-gst-works
- **Assumption to check:** the check treats an MDF payment as paying for the partner's marketing work, so the partner invoices you for it. If your accountant treats MDF as something else (a price adjustment, for example), change the rule.
- **In the data:** a paid MDF request to a partner marked `gst_registered`, with the amount plus GST above the threshold for its country, and no `tax_invoice_ref`.
- **Fix:** ask the partner for the tax invoice, then `tax-invoice --request=... --ref=<number>`.

## Controls the database enforces itself

These are not law. They are the controls a partner program audit asks about, built into the schema so they cannot be skipped:

- A deal registration that clashes with another partner's open registration or a direct account is not approved without an override reason, and the reason stays on the record.
- An approved registration always has a protection end date. Rejections carry a reason.
- An MDF request is pre-approved only up to what is left in the partner's fund.
- An MDF claim needs proof, is approved by a different person from whoever pre-approved it, and is never approved above the pre-approved amount. A payment needs a date and a reference.
- Every write records who did it in `history`.
