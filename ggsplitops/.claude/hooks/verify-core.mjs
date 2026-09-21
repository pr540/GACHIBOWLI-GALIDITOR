#!/usr/bin/env node
/**
 * PostToolUse hook: whenever packages/core is edited, run its tests.
 *
 * packages/core holds every rule about money. A silent break there does not
 * throw — it produces balances that are quietly off by a cent, which nobody
 * notices until settle-up refuses to finish. The suite runs in about a second,
 * so there is no reason not to run it on every edit.
 *
 * Node rather than a shell script so this behaves identically on Windows and
 * POSIX.
 *
 * Exit codes: 0 nothing to say · 2 tests failed, block · 1 could not run.
 * The last one matters — a verification hook that silently passes when it
 * cannot verify is worse than no hook, because it looks like protection.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const raw = await new Promise((resolve) => {
  let data = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => (data += chunk));
  process.stdin.on("end", () => resolve(data));
});

let input;
try {
  input = JSON.parse(raw || "{}");
} catch {
  process.exit(0); // Malformed hook input is not the edit's problem.
}

const edited = (input?.tool_input?.file_path ?? "").replaceAll("\\", "/");

const MARKER = "packages/core/src/";
const markerAt = edited.indexOf(MARKER);
if (markerAt === -1) process.exit(0);

/*
 * Derive the package root from the edited file rather than from `cwd`.
 * The hook's `cwd` can arrive in a shell-specific form (Git Bash reports
 * "/c/Users/..."), which Node on Windows cannot stat — resolving from it made
 * this hook exit 0 without ever running a test.
 */
const candidates = [
  edited.slice(0, markerAt) + "packages/core",
  input.cwd ? path.join(input.cwd, "packages", "core") : null,
  path.join(process.cwd(), "packages", "core"),
].filter(Boolean);

const coreDir = candidates.find((dir) => existsSync(path.join(dir, "package.json")));

if (!coreDir) {
  process.stderr.write(
    `verify-core: could not locate packages/core, so the money engine was NOT verified.\n` +
      `Tried:\n${candidates.map((c) => `  ${c}`).join("\n")}\n` +
      `Run 'pnpm --filter @splitbills/core test' by hand.\n`,
  );
  process.exit(1); // Non-blocking, but loudly not-a-pass.
}

try {
  execFileSync(process.execPath, ["--test", "src/core.test.ts"], {
    cwd: coreDir,
    stdio: "pipe",
    encoding: "utf8",
  });
  process.exit(0);
} catch (err) {
  const output = `${err.stdout ?? ""}${err.stderr ?? ""}`;

  // Surface the assertion lines, not 400 lines of TAP.
  const failed = output.match(/^not ok \d+ - .*$/gm) ?? [];
  const counts = output.match(/^# (?:pass|fail) \d+$/gm) ?? [];

  process.stderr.write(
    `The money engine's tests are failing after this edit. ` +
      `Do not build on packages/core until they pass.\n\n` +
      `${counts.join("  ")}\n${failed.slice(0, 20).join("\n") || output.slice(-1200)}\n\n` +
      `Reproduce: pnpm --filter @splitbills/core test\n`,
  );
  process.exit(2); // Blocking: Claude must address this.
}
