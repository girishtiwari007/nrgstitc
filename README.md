# NR GST ITC Flagging Reference

Standalone GST ITC flagging portal for Northern Railway / Moradabad Division.

## Separation

This folder is intentionally separate from the Revenue Liability Portal in the workspace root.

- GST ITC portal: `nrgstitc/index.html`
- Revenue Liability Portal: `../index.html`

Do not merge these two HTML files unless a separate integration task is planned.

## Current Update

- Futuristic government-style interface added.
- RBA 19/2024 PDF reviewed and reflected in the page.
- RBA 19/2024 substitution rules added for RBA 27/2018 items 3, 7 and 9.
- Four-digit-only HSN/SAC values removed from data fields.
- Exact 6-digit SACs are used where clear.
- Variable goods/services now require invoice-level HSN/SAC confirmation.

## Compliance Basis

The tool follows this decision flow:

1. Confirm invoice HSN/SAC and GST rate.
2. Check basic ITC eligibility under CGST Section 16.
3. Check non-business/exempt use under Section 17(1) and 17(2).
4. Check blocked credits under Section 17(5).
5. Use C2 only where Rule 42/43 apportionment is required.

RBA 19/2024 controls:

- Goods for repairing wagons, coaches and locomotives: T3.
- Goods for construction of Plant & Machinery such as tracks, signalling, telecom equipment, sleepers, machines and cranes: T3.
- GTA services: C2 where ITC is otherwise available; T3 where ITC is restricted under Section 17(5) or rate condition.
