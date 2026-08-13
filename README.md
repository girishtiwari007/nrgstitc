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
- Railway-division service SACs expanded for professional, technical and support services, including 998349, 998334, 998339, 998346, 998347, 998513, 998525, 998531 and 998538.
- GST 2.0 rate tags reverified on 13-Aug-2026. Portal notes RBA 27/2025 / 22.09.2025 rate changes and CBIC Notification 01/2026-CT(R) alignment from 01.05.2026.

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
