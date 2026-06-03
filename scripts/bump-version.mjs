#!/usr/bin/env node
/**
 * Conventional-commit version bumper for CI.
 *
 * Rules (in priority order):
 *   BREAKING CHANGE in commit body, or type with ! (e.g. feat!:)  → major
 *   feat: / feat(scope):                                           → minor
 *   anything else (fix:, chore:, plain message, …)                → patch
 *
 * Reads the current version from app.json, applies the bump, writes it back,
 * and emits "version=X.Y.Z" to $GITHUB_OUTPUT (or stdout in local runs).
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appJsonPath = resolve(root, 'app.json');

// ── 1. Find the range of commits to analyse ──────────────────────────────────

let lastTag = '';
try {
  lastTag = execSync('git describe --tags --abbrev=0 --match "v*"', {
    cwd: root,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
    .toString()
    .trim();
} catch {
  // No previous v* tag — analyse all commits.
}

const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';
const log = execSync(`git log ${range} --format=%B`, { cwd: root })
  .toString();

// ── 2. Determine bump level ───────────────────────────────────────────────────

const BREAKING_RE = /BREAKING[- ]CHANGE|^[a-z]+(\([^)]*\))?!:/m;
const FEAT_RE = /^feat(\([^)]*\))?:/m;

let bump;
if (BREAKING_RE.test(log)) {
  bump = 'major';
} else if (FEAT_RE.test(log)) {
  bump = 'minor';
} else {
  bump = 'patch';
}

// ── 3. Read and increment the version in app.json ────────────────────────────

const raw = readFileSync(appJsonPath, 'utf8');
const json = JSON.parse(raw);
const current = json.expo.version;

const [maj, min, pat] = current.split('.').map(Number);
let nextVersion;
if (bump === 'major') {
  nextVersion = `${maj + 1}.0.0`;
} else if (bump === 'minor') {
  nextVersion = `${maj}.${min + 1}.0`;
} else {
  nextVersion = `${maj}.${min}.${pat + 1}`;
}

json.expo.version = nextVersion;
writeFileSync(appJsonPath, JSON.stringify(json, null, 2) + '\n', 'utf8');

// ── 4. Emit the new version ───────────────────────────────────────────────────

const output = `version=${nextVersion}`;
console.log(`Bump: ${current} → ${nextVersion} (${bump}), range: ${range || 'all'}`);

const ghOutput = process.env.GITHUB_OUTPUT;
if (ghOutput) {
  appendFileSync(ghOutput, output + '\n');
} else {
  console.log(output);
}
