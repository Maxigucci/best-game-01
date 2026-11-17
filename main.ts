// Emberlight's hand-in program (Node 22, standard library only).
//
// It stages the static game from game/ and the screenshots from screenshots/ into the output
// directory, checks them against the scorer's caps, and writes dossier.json with the vendored
// make.fun library. A bad entry fails here instead of at the judge.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Pass --out <dir> instead of the variable if you prefer.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outFlag = process.argv.indexOf('--out');
const out = outFlag === -1 ? (process.env.MAKEFUN_OUTPUT_DIR ?? '/output') : process.argv[outFlag + 1];

const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

if (!out) {
  console.error('main.ts: --out needs a directory');
  process.exit(1);
}

const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');
if (!existsSync(join(gameDir, 'index.html'))) {
  console.error('main.ts: game/index.html is missing');
  process.exit(1);
}
if (!existsSync(shotsDir)) {
  console.error('main.ts: screenshots/ is missing');
  process.exit(1);
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const gameFiles = walk(gameDir);
const gameBytes = gameFiles.reduce((sum, path) => sum + statSync(path).size, 0);
const longPath = gameFiles.find((path) => Buffer.byteLength('game/' + relative(gameDir, path)) > caps.game_path_max_bytes);
const shots = readdirSync(shotsDir).filter((name) => /\.(png|jpe?g)$/i.test(name)).sort();

const problems = [];
if (gameFiles.length > caps.game_max_files) problems.push(`${gameFiles.length} files in game/, at most ${caps.game_max_files}`);
if (gameBytes > caps.game_max_bytes) problems.push(`${gameBytes} bytes in game/, at most ${caps.game_max_bytes}`);
if (longPath) problems.push(`game path too long: game/${relative(gameDir, longPath)}`);
if (shots.length === 0) problems.push('no PNG or JPEG in screenshots/');
if (shots.length > caps.screenshots.max) problems.push(`${shots.length} screenshots, at most ${caps.screenshots.max}`);
for (const name of shots) {
  const { size } = statSync(join(shotsDir, name));
  if (size > caps.screenshots.max_bytes) problems.push(`${name} is ${size} bytes, at most ${caps.screenshots.max_bytes}`);
}
if (problems.length) {
  for (const problem of problems) console.error(`main.ts: ${problem}`);
  process.exit(1);
}

mkdirSync(out, { recursive: true });
for (const name of readdirSync(out)) rmSync(join(out, name), { recursive: true, force: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

writeFileSync(join(out, 'dossier.json'), buildDossier(out, caps));

console.log(`main.ts: staged ${gameFiles.length} game files and ${shots.length} screenshots (cover: ${shots[0]}) into ${out}`);
