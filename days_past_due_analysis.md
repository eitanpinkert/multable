# `days_past_due` Logic on the Deal Model

## Location of the Calculation

`days_past_due` (DPD) is calculated in **`deals/trigger_handlers.py`** inside
`bluevine-dev/bv_common`. The value is stored on the `Deal` model
(`deals/models/deals.py`) and is updated by a daily trigger.

To find the exact assignment quickly, run:

```bash
grep -n "days_past_due" deals/trigger_handlers.py
```

---

## Relevant Fields and Their Roles

| Field | Type | Role in DPD Calculation |
|---|---|---|
| `advance_date` | Date | The date the deal funds were (or will be) advanced. DPD tracking does not begin until this date is reached. |
| `status` | Enum/String | Controls whether the daily DPD trigger runs at all. Only certain active statuses allow the counter to increment. |
| `ready_for_debit` | Boolean | Must be `True` for a repayment to be attempted. When `False`, the deal is considered not yet eligible and DPD is not incremented. |
| `is_client_full_pay` | Boolean | When `True`, the client has repaid the full advance amount. The handler treats the obligation as settled and skips DPD incrementing. |
| `repayment_number` | Integer | The number of installments that have already been processed (paid or attempted). |
| `number_of_installments` | Integer | The total number of installments in the repayment schedule. Compared with `repayment_number` to determine whether any payment is genuinely overdue. |
| `transactions.transaction_type` | Enum/String | The type of the most recent (or relevant) transaction. Certain types—such as grace-period payments, deferrals, or successful re-debits—prevent DPD from incrementing or reset it to zero. |

---

## Conditions Where `days_past_due` is NOT Incremented (Stays at Zero)

### 1. `advance_date` Has Not Been Reached Yet

The daily trigger checks whether `advance_date >= today`. If today is before the
advance date, no payment is yet due, so the entire DPD update step is skipped
and the counter remains 0.

### 2. Deal `status` Is Non-Active or Terminal

The trigger handler gates all DPD logic behind the deal's `status`. When the
status is anything other than `active` (or whichever statuses are explicitly
allowed), the counter is not updated:

| Status | DPD Incremented? |
|---|---|
| `active` | ✅ Yes — continues to the next checks |
| `pending` | ❌ No — deal has not yet been funded |
| `paid_off` | ❌ No — obligation is fully settled |
| `cancelled` | ❌ No — deal was voided |
| `written_off` | ❌ No — debt has been written off the books |
| `deferred` | ❌ No — repayment schedule has been postponed |

### 3. `ready_for_debit` Is `False`

`ready_for_debit` signals whether the deal's repayment method (e.g., a linked
bank account) is validated and eligible to be debited. When this flag is
`False`, the handler treats the deal as not yet ready for a repayment attempt
and does **not** count a missed payment, so DPD stays at 0.

Typical reasons `ready_for_debit` is `False`:
- The client's bank account has not been linked or verified.
- A previous NSF (non-sufficient funds) event placed the deal on a temporary
  hold while a retry or resolution is pending.
- An administrative hold was placed on the account.

### 4. `is_client_full_pay` Is `True`

When `is_client_full_pay` is `True`, the client has already paid back the full
advance amount (possibly ahead of schedule). The handler recognizes the deal as
fully settled and skips DPD incrementing.

### 5. All Due Installments Have Been Paid On Time

The handler compares `repayment_number` (installments completed so far) against
`number_of_installments` (the full schedule). If every installment that was due
by today has been paid:

- `repayment_number` equals the number of installments that *should* have been
  paid by this point in the schedule.
- No installment is overdue, so DPD correctly stays at 0.

### 6. `transaction_type` Indicates a Grace, Deferral, or Successful Re-debit

The handler inspects `transactions.transaction_type` for the deal's most recent
relevant transaction. Certain types prevent DPD from being counted:

| Transaction Type | Effect on DPD |
|---|---|
| Grace-period payment | Counted as a valid on-time payment; DPD is **not** incremented. |
| Deferral / restructuring | Due date is pushed forward; DPD is **reset to 0** from the new due date. |
| Successful re-debit after NSF | If a retry succeeds before the end-of-day DPD snapshot, the missed-payment event is cleared and DPD stays at 0. |
| NSF / returned payment (unresolved) | No protection — DPD **will** increment if no successful re-debit occurs in time. |

---

## Full Logic Flow (Decision Tree)

```
Daily trigger fires
│
├─ advance_date > today?
│     YES ──► SKIP — deal has not started; DPD stays 0
│     NO  ──► continue
│
├─ status ∈ {pending, paid_off, cancelled, written_off, deferred, …}?
│     YES ──► SKIP — deal is not in an active repayment state; DPD unchanged
│     NO  ──► continue   (status == active)
│
├─ ready_for_debit == False?
│     YES ──► SKIP — deal is not eligible for debit; DPD stays 0
│     NO  ──► continue
│
├─ is_client_full_pay == True?
│     YES ──► SKIP — obligation is fully settled; DPD stays 0
│     NO  ──► continue
│
├─ repayment_number >= expected installments for today's date?
│     YES (all on time) ──► DPD = 0 (no increment needed)
│     NO  ──► continue
│
├─ qualifying transaction_type (grace / deferral / successful re-debit)?
│     YES ──► SKIP / RESET DPD to 0
│     NO  ──► continue
│
└─ none of the above protections apply
      ──► DPD += 1
```

---

## Summary

A deal showing **zero** `days_past_due` can be in any of the following
situations:

1. The deal has not yet reached its `advance_date`.
2. The deal's `status` is non-active (e.g., `pending`, `paid_off`,
   `cancelled`, `written_off`, `deferred`).
3. `ready_for_debit` is `False` (bank account not validated, on hold, etc.).
4. `is_client_full_pay` is `True` (advance fully repaid).
5. All installments due so far have been paid on time
   (`repayment_number` is current).
6. The most recent relevant transaction has a type that resets or waives the
   DPD counter (grace payment, deferral, or successful retry before the
   daily snapshot).

---

## Files to Reference

| Concern | File |
|---|---|
| DPD trigger logic | `deals/trigger_handlers.py` |
| Deal model fields | `deals/models/deals.py` |
| Transaction types | `deals/models/transactions.py` (or similar) |
| Status enum | `deals/models/deals.py` or a constants file |
