# Lock invoices to a chosen payment channel

Checkout asks the buyer which payment channel to use, and the Mayar invoice is created locked to that channel. The buyer no longer meets a generic hosted page listing every channel the store accepts.

**The last hop stays hosted, for now**

The documented V2 surface publishes no raw payment instructions. `GET /invoices/{id}` returns a `paymentUrl`, and `GET /transactions/{id}` names the `paymentMethod` but carries no instruction payload.

`POST /qr-codes/create` does return a QR image, but only `{ url, amount }`. It carries no transaction ID and no `extraData`, so nothing ties that QR to an order. Using it for checkout would leave payment confirmation with no way to name the order that was paid, which is exactly the evidence ADR-0005 and ADR-0007 depend on. It is therefore not used.

Sandbox probing found something the documentation does not mention: a channel-locked `POST /invoices/create` response carries a `paymentDetail` object holding the real instructions. A `va/bni` invoice returned `paymentDetail.virtual_account.channel_properties.virtual_account_number`, and a `qris` invoice returned a `qr_code.channel_properties.qr_string`. A payment step rendered entirely inside this application is therefore probably reachable.

It is not built on here. The field appears on no endpoint page, so it carries no compatibility promise, and the sandbox `qr_string` was the placeholder `some-random-qr-string` rather than a payable code. Rendering our own QR from an unverified field would produce a checkout that looks finished and cannot take money. The choice is what this store owns; the hosted page finishes it. Revisit when Mayar documents the field or a production QRIS invoice proves the string is real.

`paymentDetail` is read for one purpose only: detecting failure. See below.

**The channel map is written by hand, and the documented enum is not trustworthy**

`GET /payment-channels` reports enabled channels as `{ type, code }` pairs such as `{ type: "va", code: "BNI" }`. `POST /invoices/create` accepts a different spelling, `va/bni`. No endpoint publishes the mapping between the two, so `src/lib/payment-channels.ts` states it. Adding a channel means editing that file.

The lookup key is `type:code`, not `code` alone. The sandbox reports both a virtual account and a retail channel under the code `BRI`, and matching on the code would turn BRILink into a BRI virtual account.

Every value in that file was checked against the sandbox rather than copied from the page, and one was wrong. The enum lists `ewallet/jenius`, which the API refuses with `Payment method "ewallet/jenius" is not available or disabled`. The value it accepts is `ewallet/jeniuspay`, the spelling used further down the same page in the `cashtag` note. Treat the enum as a starting point to verify, not as a specification.

**Channels that cannot be locked are hidden**

The documented `paymentMethod` list holds fourteen values. A store can have more channels enabled than that. On the sandbox account, OVO, Flip, Bank Lainnya, Indomaret, and BRILink are all enabled and all absent from the list.

An undocumented value is not rejected. `ewallet/ovo` returned `200 success`, and the invoice came back with an empty `paymentDetail` and no channel prepared: the value was accepted and then ignored, producing an ordinary unrestricted invoice. A buyer who picked OVO would have landed on a page listing every other channel, which is exactly what choosing was supposed to prevent.

So those channels are not offered, and the checkout schema refuses any value outside the fourteen. Losing a channel is the smaller cost; the alternative hides a broken promise inside a working-looking interface.

**The enabled list is server-owned and cached**

The value from the browser is a candidate, never a decision. `assertPaymentMethodEnabled` runs before checkout writes any row, so a channel the merchant does not offer never reserves stock that then has to be released.

The list is cached in `setup_metadata` for six hours. Mayar allows 50 requests per minute for the whole API key, and checkout spends that budget creating invoices; asking for the channel list on every checkout view would compete with the requests that actually take money. A channel switched on in the Mayar dashboard appears within that window.

When Mayar is unreachable and a cached list exists, the cached list is served. A checkout built on a slightly old list still ends in a real invoice, and Mayar rejects a channel it has since disabled. With no cache and no answer, the checkout page renders with no channels and refuses to submit, rather than guessing.

**The channel is part of the checkout attempt**

`checkoutFingerprint` includes the chosen channel. The invoice is locked to it, so an idempotency key replayed with a different channel is asking for a different checkout and is refused, exactly as a changed address is. The checkout form issues a fresh key whenever the buyer changes channel. See ADR-0003.

**A 200 response can still be a failed invoice**

Asking for Jenius without a cashtag returns `200 success` with an invoice and a link, while `paymentDetail` carries `status: 400` and `Invalid channel_properties for ID_JENIUSPAY. Expecting cashtag to be present`. The envelope says success; the payment method was never prepared.

`createMayarInvoice` therefore rejects a response whose `paymentDetail.status` is a number of 400 or more. A prepared channel reports a word there instead, such as `PENDING` or `ACTIVE`, so the two cases are told apart by type. The existing failure path then releases the reservation, rather than leaving the buyer with reserved stock behind a link that cannot take money.

The checkout schema also refuses Jenius without a cashtag before the request is ever made. The response check is the second line, for the case a future channel needs a field nobody knew about.

**Consequences**

- Fulfillment is untouched. `settleVerifiedPayment` still proves payment through `GET /transactions/{id}`, so a forged webhook payload still settles nothing. The chosen channel is recorded in `payment_attempt.metadata` for display only, and never grants access.
- A buyer who wants OVO or Indomaret can no longer reach it through this store until Mayar adds those values to `paymentMethod`.
- Jenius needs a second field. `POST /invoices/create` requires `cashtag` for it, so the picker reveals one input when Jenius is chosen, and the checkout schema refuses the combination without it.
- Channel logos come from local icons. `GET /payment-channels` returns a relative path such as `/dana.png` and publishes no host to resolve it against, so guessing one would break silently.
