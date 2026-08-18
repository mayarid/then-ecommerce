/**
 * The steps after the administrator exists and before the store takes live
 * money.
 *
 * Shown on the admin overview. The same sequence is written out in "After the
 * first deploy" in README.md. Editing one without the other lets them drift.
 *
 * Nothing in this file may carry a secret.
 */
export type SetupGuideStep = {
  body: string;
  id: "livePayments" | "products" | "publicUrl" | "webhook";
  /** Shown as "Optional" so nobody is blocked by a step that does not block. */
  optional?: boolean;
  title: string;
  /** An in-app destination, when the step has one. */
  to?: "/admin/products";
};

export const setupGuideSteps: SetupGuideStep[] = [
  {
    body: "Copy the webhook URL from this page into the Mayar dashboard. Payment is always proved by looking the transaction up with Mayar, and a job reconciles orders every five minutes, so this only makes confirmation faster.",
    id: "webhook",
    optional: true,
    title: "Register the Mayar webhook",
  },
  {
    body: "Add BETTER_AUTH_URL as a Worker secret, set to your public URL. Without it, Better Auth reads the origin from each request and trusts whatever host served it.",
    id: "publicUrl",
    title: "Set your public URL",
  },
  {
    body: "The sample catalogue exists so the store is not empty on the first load. Replace it with your own products, prices, and images.",
    id: "products",
    title: "Replace the sample products",
    to: "/admin/products",
  },
  {
    body: "Set MAYAR_ENVIRONMENT to production in wrangler.jsonc and swap in your production Mayar API key. Do this after one sandbox checkout has worked end to end, not before.",
    id: "livePayments",
    title: "Switch to live payments",
  },
];
