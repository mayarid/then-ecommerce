# Default deploys to live payments

The Deploy to Cloudflare form used to default `MAYAR_ENVIRONMENT` to `sandbox`. Most deployers are merchants who paste their production Mayar key, and the sandbox default made their first checkout fail with an authentication error against the sandbox API until they found the setting in `wrangler.jsonc`.

The default is now `production`. This is safe because every mismatch fails loud: sandbox and production keys come from different Mayar dashboards and are not valid across environments, so a wrong key always surfaces as an API error at checkout. There is no mode in which payments appear to succeed but no money moves. A deployer who wants to test first can still edit the field in the deploy form.

Local development keeps the old behaviour. `wrangler dev` reads `vars` from `wrangler.jsonc` too, so `scripts/setup.ts` writes `MAYAR_ENVIRONMENT=sandbox` into `.dev.vars`, which overrides `wrangler.jsonc` locally.

**Consequences**

- The deploy form defaults to live payments; the field stays editable.
- `bun run setup` keeps local clones in sandbox without asking. A developer who wants to test against production locally edits `.dev.vars` by hand.
- The "Switch to live payments" setup guide step is already done on a default deploy and only remains for stores deployed with sandbox.
