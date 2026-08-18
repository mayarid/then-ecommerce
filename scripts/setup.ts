import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";

/**
 * Prepares a local development environment.
 *
 * This script only does the work that needs a terminal: prune keys the app no
 * longer reads from `.dev.vars`, pin local-only overrides there, and apply
 * migrations to the local D1. The Worker mints `BETTER_AUTH_SECRET` itself on
 * first use (ADR-0017), and creating the administrator and seeding the
 * catalogue happen at `/setup`, so that one-click deploys and local clones
 * follow the same path. See ADR-0016.
 */

const ENV_PATH = ".dev.vars";

function fail(message: string): never {
  console.error(`Setup failed: ${message}`);
  process.exit(1);
}

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { stdio: "inherit" });

  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} exited with status ${result.status}`);
  }
}

function readDevVars() {
  return existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
}

function hasKey(contents: string, key: string) {
  return new RegExp(`^${key}=.+$`, "m").test(contents);
}

function removeKey(key: string) {
  const current = readDevVars();
  const next = current.replace(new RegExp(`^${key}=.*\\n?`, "m"), "");

  if (next === current) {
    return;
  }

  writeFileSync(ENV_PATH, next, { mode: 0o600 });
  chmodSync(ENV_PATH, 0o600);
  console.log(`Removed unused ${key} from ${ENV_PATH}`);
}

function ensureKey(key: string, value: string) {
  const contents = readDevVars();

  if (hasKey(contents, key)) {
    return;
  }

  const separator = contents.length > 0 && !contents.endsWith("\n") ? "\n" : "";

  writeFileSync(ENV_PATH, `${contents}${separator}${key}=${value}\n`, {
    mode: 0o600,
  });
  // `mode` only applies when the file is created, and this file holds secrets.
  chmodSync(ENV_PATH, 0o600);
  console.log(`Set ${key}=${value} in ${ENV_PATH}`);
}

function removeUnusedKeys() {
  removeKey("SETUP_TOKEN");
  // The Worker mints this itself now. See ADR-0017.
  removeKey("BETTER_AUTH_SECRET");
}

function pinLocalOverrides() {
  // wrangler.jsonc defaults deploys to production, and `wrangler dev` reads
  // those vars too. .dev.vars wins locally, so local checkouts stay in
  // sandbox unless the developer changes this by hand. See ADR-0018.
  ensureKey("MAYAR_ENVIRONMENT", "sandbox");
}

function reportMissing() {
  const contents = readDevVars();
  const missing = ["MAYAR_API_KEY"].filter((key) => !hasKey(contents, key));

  if (missing.length > 0) {
    console.log(
      `\nAdd these to ${ENV_PATH} before checkout will work: ${missing.join(", ")}`
    );
  }
}

function printNextSteps() {
  console.log("\nSetup complete. Next steps:");
  console.log("  1. bun dev");
  console.log("  2. Open http://localhost:3000/setup");
  console.log(
    "\nThe setup page creates your administrator, seeds the catalogue, and"
  );
  console.log("shows the Mayar webhook URL to register.");
}

function main() {
  removeUnusedKeys();
  pinLocalOverrides();
  run("bunx", ["wrangler", "d1", "migrations", "apply", "DB", "--local"]);
  reportMissing();
  printNextSteps();
}

main();
