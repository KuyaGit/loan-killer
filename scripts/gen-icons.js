/**
 * gen-icons.js — generate all app icon assets from loan-killer.png (transparent bg).
 * Run once: node scripts/gen-icons.js
 * Uses jimp-compact (already a transitive dep of Expo).
 * Do NOT commit this script (or commit it as a dev utility — it's harmless).
 */

'use strict';

const path = require('path');
const j = require(path.join(__dirname, '../node_modules/jimp-compact'));

const SRC = path.join(__dirname, '../loan-killer.png');
const OUT = path.join(__dirname, '../assets/images');

async function main() {
  const src = await j.read(SRC);
  const W = src.getWidth(); // 1024
  const H = src.getHeight(); // 1024
  console.log(`Source: ${W}x${H}`);

  // ── 1. icon.png — 1024×1024, direct copy ────────────────────────────────
  await src.clone().writeAsync(path.join(OUT, 'icon.png'));
  console.log('✓ icon.png (1024×1024)');

  // ── 2. splash-icon.png — 1024×1024, direct copy ─────────────────────────
  await src.clone().writeAsync(path.join(OUT, 'splash-icon.png'));
  console.log('✓ splash-icon.png (1024×1024)');

  // ── 3. android-icon-foreground.png — logo at 66% centred on 1024 canvas ─
  // Adaptive icon safe zone is the inner 66% (i.e. a 676px circle on 1024px)
  const FG_SIZE = 1024;
  const LOGO_SIZE = Math.round(FG_SIZE * 0.66); // 676
  const offset = Math.round((FG_SIZE - LOGO_SIZE) / 2); // 174
  const scaled = src.clone().resize(LOGO_SIZE, LOGO_SIZE);
  const fg = await j.read(FG_SIZE, FG_SIZE, 0x00000000);
  fg.composite(scaled, offset, offset);
  await fg.writeAsync(path.join(OUT, 'android-icon-foreground.png'));
  console.log('✓ android-icon-foreground.png (logo 676px centred on 1024×1024 transparent)');

  // ── 4. android-icon-background.png — solid white 1024×1024 ───────────────
  const bg = await j.read(FG_SIZE, FG_SIZE, 0xffffffff);
  await bg.writeAsync(path.join(OUT, 'android-icon-background.png'));
  console.log('✓ android-icon-background.png (solid white 1024×1024)');

  // ── 5. android-icon-monochrome.png — greyscale silhouette, same safe-zone padding
  const monoScaled = src.clone().resize(LOGO_SIZE, LOGO_SIZE).greyscale();
  const mono = await j.read(FG_SIZE, FG_SIZE, 0x00000000);
  mono.composite(monoScaled, offset, offset);
  await mono.writeAsync(path.join(OUT, 'android-icon-monochrome.png'));
  console.log('✓ android-icon-monochrome.png (greyscale, safe-zone padded)');

  // ── 6. favicon.png — 64×64 ───────────────────────────────────────────────
  await src.clone().resize(64, 64).writeAsync(path.join(OUT, 'favicon.png'));
  console.log('✓ favicon.png (64×64)');

  console.log('\nDone. All icons written to assets/images/');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
