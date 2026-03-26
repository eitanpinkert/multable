# `days_past_due` on the Deal Model — Edge Cases & Logic

## Overview

`days_past_due` (DPD) tracks how many calendar days a deal is overdue. It is
calculated in `deals/trigger_handlers.py` and stored on the `Deal` model.

A deal can show **zero** DPD for several distinct reasons. The sections below
describe each condition.

---

## Conditions That Keep `days_past_due` at Zero

### 1. Advance date not yet reached

The trigger that increments DPD only fires after the deal's `advance_date`.
If today is before `advance_date`, no payment is yet due and DPD remains 0.

### 2. Deal status is in a terminal or non-active state

Common statuses that gate the DPD counter:

| Status | DPD incremented? |
|---|---|
| `active` | ✅ Yes |
| `paid_off` | ❌ No |
| `cancelled` | ❌ No |
| `pending` | ❌ No |
| `written_off` | ❌ No |
| `deferred` | ❌ No |

The trigger handler skips the DPD update entirely when the deal is in one of
these terminal states.

### 3. `ready_for_debit` is `False`

`ready_for_debit` must be `True` for a repayment attempt to be eligible. When
it is `False` (e.g., the client's bank account is not yet linked or validated),
the handler does not count a missed payment and DPD stays at 0.

### 4. `is_client_full_pay` is `True`

When `is_client_full_pay` is set, the client has fully repaid the advance. The
handler treats the deal as settled and does not increment DPD.

### 5. No installments are overdue yet

DPD is driven by the relationship between `repayment_number` (installments
already processed) and `number_of_installments` (total installments). If every
installment due so far has been paid on time, DPD is correctly 0.

### 6. A qualifying transaction type resets or pauses DPD

Certain values of `transactions.transaction_type` signal events like:

- **Grace-period payment** — the payment is accepted without penalty; DPD
  is not incremented.
- **Deferral / restructuring** — the due date is pushed forward; DPD is
  reset to 0 from the new due date.
- **NSF / returned payment that was later re-attempted successfully** — the
  handler may detect the successful re-debit before closing the day, leaving
  DPD at 0.

---

## Summary Decision Tree

```
Deal trigger fires (daily)
│
├─ advance_date >= today? ──► SKIP (deal hasn't started yet; DPD stays 0)
│
├─ status ∈ {paid_off, cancelled, pending, written_off, deferred}? ──► SKIP
│  (status == active continues to next check)
│
├─ ready_for_debit == False? ──► SKIP
│
├─ is_client_full_pay == True? ──► SKIP
│
├─ all installments paid on time? ──► DPD = 0 (no increment needed)
│
├─ qualifying transaction_type (grace / deferral / successful re-debit)? ──► SKIP / RESET
│
└─ none of the above ──► DPD += 1
```

---

## Where to Look in the Code

| Concern | File |
|---|---|
| DPD calculation / trigger | `deals/trigger_handlers.py` |
| Deal model fields | `deals/models/deals.py` |
| Transaction types | `deals/models/transactions.py` (or similar) |

Search the trigger handler for the `days_past_due` assignment to find the
exact conditional chain:

```bash
grep -n "days_past_due" deals/trigger_handlers.py
```
