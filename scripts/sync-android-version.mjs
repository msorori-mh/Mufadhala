#!/usr/bin/env node
/**
 * Sync Android versionCode + versionName from src/domain/version.ts
 * into android/app/build.gradle.
 *
 * Usage:
 *   node scripts/sync-android-version.mjs
 *
 * Recommended workflow:
 *   git pull
 *   npm install
 *   npm run build
 *   npx cap sync android
 *   node scripts/sync-android-version.mjs   ← هنا
 *   cd android && ./gradlew assembleRelease
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const VERSION_FILE = resolve(ROOT, "src/domain/version.ts");
const GRADLE_FILE = resolve(ROOT, "android/app/build.gradle");

const c = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function fail(msg) {
  console.error(`${c.red}${c.bold}✗ ${msg}${c.reset}`);
  process.exit(1);
}

function info(msg) {
  console.log(`${c.cyan}ℹ ${msg}${c.reset}`);
}

function ok(msg) {
  console.log(`${c.green}✓ ${msg}${c.reset}`);
}

// 1) Read version.ts
if (!existsSync(VERSION_FILE)) {
  fail(`Version file not found: ${VERSION_FILE}`);
}
const versionSrc = readFileSync(VERSION_FILE, "utf8");

const nameMatch = versionSrc.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
const codeMatch = versionSrc.match(/APP_VERSION_CODE\s*=\s*(\d+)/);

if (!nameMatch || !codeMatch) {
  fail("Could not parse APP_VERSION / APP_VERSION_CODE from src/domain/version.ts");
}

const fullName = nameMatch[1]; // e.g. "v5.1.0-stable"
const versionCode = parseInt(codeMatch[1], 10);

// Strip leading "v" and any "-suffix" (Android requires plain semver-ish)
const versionName = fullName
  .replace(/^v/i, "")
  .replace(/-.*$/, "");

info(`Source:  APP_VERSION="${fullName}", APP_VERSION_CODE=${versionCode}`);
info(`Android: versionName="${versionName}", versionCode=${versionCode}`);

// 2) Check gradle file
if (!existsSync(GRADLE_FILE)) {
  fail(
    `Gradle file not found: ${GRADLE_FILE}\n` +
      `Run "npx cap add android" first to generate the android/ folder.`,
  );
}

let gradle = readFileSync(GRADLE_FILE, "utf8");
const original = gradle;

// 3) Replace versionCode + versionName (only inside defaultConfig — first match is enough)
const codeRegex = /(versionCode\s+)\d+/;
const nameRegex = /(versionName\s+)"[^"]*"/;

if (!codeRegex.test(gradle)) fail("versionCode line not found in build.gradle");
if (!nameRegex.test(gradle)) fail("versionName line not found in build.gradle");

gradle = gradle.replace(codeRegex, `$1${versionCode}`);
gradle = gradle.replace(nameRegex, `$1"${versionName}"`);

if (gradle === original) {
  ok("build.gradle already up-to-date — nothing to change.");
  process.exit(0);
}

writeFileSync(GRADLE_FILE, gradle, "utf8");
ok(`Updated ${GRADLE_FILE}`);
ok(`versionCode = ${versionCode}, versionName = "${versionName}"`);
console.log(
  `\n${c.yellow}Next:${c.reset} cd android && ./gradlew assembleRelease`,
);
