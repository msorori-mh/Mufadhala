#!/usr/bin/env node
/**
 * One-shot APK build pipeline for Mufadhala.
 *
 * Runs (in order):
 *   1. vite build               → dist/
 *   2. npx cap sync android     → copies web assets into android/
 *   3. sync-android-version.mjs → injects versionCode + versionName into build.gradle
 *   4. ./gradlew assembleRelease (optional, with --gradle flag)
 *
 * Usage:
 *   node scripts/build-apk.mjs           # steps 1-3 only (then build manually in Android Studio)
 *   node scripts/build-apk.mjs --gradle  # full pipeline including ./gradlew assembleRelease
 *   node scripts/build-apk.mjs --skip-build  # skip vite build (if dist/ already fresh)
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const args = process.argv.slice(2);
const runGradle = args.includes("--gradle");
const skipBuild = args.includes("--skip-build");

const c = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

function step(n, total, label) {
  console.log(
    `\n${c.cyan}${c.bold}━━━ [${n}/${total}] ${label} ━━━${c.reset}`,
  );
}

function ok(msg) {
  console.log(`${c.green}✓ ${msg}${c.reset}`);
}

function fail(msg, code = 1) {
  console.error(`\n${c.red}${c.bold}✗ ${msg}${c.reset}\n`);
  process.exit(code);
}

function run(cmd, cmdArgs, opts = {}) {
  console.log(`${c.dim}$ ${cmd} ${cmdArgs.join(" ")}${c.reset}`);
  const result = spawnSync(cmd, cmdArgs, {
    cwd: opts.cwd || ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    fail(`Command failed: ${cmd} ${cmdArgs.join(" ")}`);
  }
}

const totalSteps = runGradle ? 4 : 3;
let stepNum = 1;

// Step 1: vite build
if (!skipBuild) {
  step(stepNum++, totalSteps, "Building web assets (vite build)");
  run("npm", ["run", "build"]);
  ok("Web assets built into dist/");
} else {
  console.log(
    `${c.yellow}⊘ Skipping vite build (--skip-build)${c.reset}`,
  );
  totalSteps - 1;
}

// Step 2: cap sync android
step(stepNum++, totalSteps, "Syncing Capacitor to android/");
if (!existsSync(resolve(ROOT, "android"))) {
  fail(
    `android/ folder not found.\n` +
      `Run "npx cap add android" once before using this script.`,
  );
}
run("npx", ["cap", "sync", "android"]);
ok("Capacitor synced");

// Step 3: sync version
step(stepNum++, totalSteps, "Syncing version into build.gradle");
run("node", [resolve(__dirname, "sync-android-version.mjs")]);

// Step 4: gradle assembleRelease (optional)
if (runGradle) {
  step(stepNum++, totalSteps, "Building signed APK (./gradlew assembleRelease)");
  const gradleCmd = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  run(gradleCmd, ["assembleRelease"], {
    cwd: resolve(ROOT, "android"),
  });
  ok("APK built → android/app/build/outputs/apk/release/app-release.apk");
} else {
  console.log(
    `\n${c.yellow}Next:${c.reset} cd android && ./gradlew assembleRelease`,
  );
  console.log(
    `${c.dim}Tip: re-run with --gradle to chain the APK build automatically.${c.reset}`,
  );
}

console.log(`\n${c.green}${c.bold}✓ Done.${c.reset}\n`);
