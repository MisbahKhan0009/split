# Expense modal smoke test

## 2026-08-17

The live workspace opened the redesigned Add expense modal from the Overview page. The modal now presents a clear title and subtitle, BDT amount field, payer selector, visual category cards, participant chips, split-mode cards, optional note, receipt toggle, and live split preview.

Filling `Brunch at Banani`, `৳ 3,600`, and a note updated the preview immediately to show the expense title, Food category, Rafi as payer, total `৳ 3,600`, four participants, and `৳ 900 each`. The save action changed from a disabled guidance label to `Save expense` once the required title and amount were present.

The receipt control changed to `Receipt attached` with a trust-oriented confirmation state. Adding Shuvo changed the participant count from four to five and recalculated the preview from `৳ 900 each` to `৳ 720 each`, confirming the participant chips and live arithmetic are interactive.
