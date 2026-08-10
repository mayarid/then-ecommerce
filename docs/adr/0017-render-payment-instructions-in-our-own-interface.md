# Render payment instructions in our own interface

The order status page draws the payment step itself: the virtual account number, the QRIS code, or the e-wallet deeplink. The buyer pays without leaving the store. The hosted Mayar link stays on the page as a way out.

ADR-0016 said the last hop had to stay hosted. That was wrong, and this supersedes it.

**Where the instructions come from**

`POST /invoices/create` answers a channel-locked invoice with a `paymentDetail` object. Sandbox-verified shapes:

- `va/*` → `virtual_account.channel_properties.virtual_account_number`, a real number such as `889089999215045`, with `customer_name` and `expires_at`.
- `qris` → `qr_code.channel_properties.qr_string`.
- `ewallet/*` → `actions[]`, holding an `AUTH` entry with a deeplink URL and a `PRESENT_TO_CUSTOMER` entry with a QR string.
- retail → nothing at all.

The field is on no endpoint page. Its contents are plainly the upstream processor's response passed through, `channel_code: "XENDIT"` and customer names prefixed `XDT-`, which is the kind of detail a provider tidies away later.

**It is offered once**

`GET /invoices/{id}` does not return `paymentDetail`. Checked against four sandbox invoices covering QRIS, a virtual account, and two e-wallets: none carried it. So the value cannot be fetched again. It is captured at creation and written into `payment_attempt.metadata`, in the same batch that records the attempt.

Nothing else in the system reads it. If Mayar drops the field tomorrow, orders still work.

**Trust nothing in it**

`parsePaymentInstruction` takes `unknown` and returns either one of three narrow shapes or null. Null means the page falls back to the hosted link. Every unrecognised, missing, or malformed case lands there: a retail outlet, a channel Mayar failed to prepare, a new `type` this build has never seen.

The stored value is re-parsed on every read rather than trusted as written, so a row saved by an older build cannot put an unexpected shape in front of the renderer.

**A QRIS string is only drawn when it looks like one**

Sandbox answers `qr_string: "some-random-qr-string"` and `qr_code: "test-qr-string"`. Encoding those produces a QR that scans to nonsense, which is worse than sending the buyer to the hosted page, because it looks like it works.

So a QR is drawn only when the string starts with `000201`, the EMVCo payload format indicator that opens every real QRIS code. In sandbox this means QRIS and e-wallet QRs fall back to the hosted link, which is the correct outcome there. It also means the first production QRIS order is the first real test of that path.

**What this does not change**

Payment is still proved only by `GET /transactions/{id}`. The buyer paying a virtual account they read on our page is the same money arriving through the same channel, so ADR-0005 and ADR-0007 hold unchanged. Drawing our own screen grants nothing.

**Consequences**

- A QR encoder is now a dependency, `uqr`, chosen for having none of its own and for running in the Workers runtime. It renders to a matrix that the component draws as SVG rects, so no HTML is injected.
- `payment_attempt.metadata` now holds a virtual account number. It is shown to the buyer anyway and is scoped to one order, but it should not be logged.
- The instruction expiry inside `channel_properties` matches the invoice expiry we ask for, which is the reservation window. Nothing separate has to track it.
- The hosted link is now a quiet secondary link rather than the main button, and the main button is gone for channels that have instructions. Losing the instructions makes it the main button again.
