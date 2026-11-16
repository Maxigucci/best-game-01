# Emberlight

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Maxigucci/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Maxigucci/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Emberlight is a small arcade game about a firefly's last night. Gather 18 embers before dawn, but every ember makes you burn brighter — and the shadow moths hunt light. Vent your glow with Space to scatter them, and trade the score you could have had for the night you get to keep.

A complete night has a title, a HUD, a win and a loss, a pause, sound and a restart. It is plain canvas and ES modules: no build step, no network request, no image or font files.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 and press Enter.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with `vendor/makefun-game.ts`.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | fly |
| Space | vent your glow, scattering nearby moths |
| P / Escape | pause |
| M | mute |
| Enter | start, and restart after the night ends |

## Layout

- `game/index.html` — the canvas, the page shell and the title.
- `game/src/main.js` — boot, input, the loop and the rules of the night.
- `game/src/state.js` — tuning, palette, maths and the seeded random source.
- `game/src/firefly.js` — the player: steering, glow meter, vent and sting.
- `game/src/embers.js` — the drifting embers you collect and knock loose.
- `game/src/moths.js` — the shadow moths that follow brightness.
- `game/src/particles.js` — trails, sparks and vent rings.
- `game/src/render.js` — the garden, HUD, title and result screens.
- `game/src/audio.js` — procedural Web Audio sound effects.

---

<sub>Entered on [make.fun](https://make.fun/?ref=jng0knmh&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
