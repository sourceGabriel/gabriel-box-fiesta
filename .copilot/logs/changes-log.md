# Change log

## 2026-09-04
- Review completed against the master prompt.
- Saved repo-level Copilot guidance in `.github/copilot-instructions.md`.
- Saved spec kit under `.copilot/spec-kit/`.
- Added repository review in `docs/repository-gap-review.md`.
- Added changelog in `docs/CHANGELOG.md`.
- Identified the main remaining gap: host game board rendering is still missing despite server state and game start working.

## Rationale
The project is currently between the room lifecycle phase and the actual host game board phase. The backend can start the match and broadcast public game state, but the host application still fails to render the UNO table, which blocks complete gameplay validation and violates the MVP objective described in the master prompt.

## 2026-09-05
- Delivered Fases 5–10 + hardening on branch `feature/testa-claudin` (PR #2): host game board, multi-round scoring + end-of-game + `NEXT_ROUND`, UNO challenge UI, owner pause/resume, post-play colour modal (§25/26), host event feed, Fase 10 event-driven animations, mobile party visual overhaul, 30s disconnect grace, auto-reconnect + backoff, +3 integration tests (server suite 25 green).
- See `docs/CHANGELOG.md` (2026-09-05 entry) for the itemised list and rationale.

## 2026-09-06
- Reviewed the ChatGPT-drafted multi-game plan; fetched and analysed 5 reference repos (rodwilco/rumpus, AndriGitDev/bodbjanar, christabella/freewee, inosaint/amoebas, 8tp/Coup).
- Wrote the phased plan `C:\Users\gabri\.claude\plans\antes-dos-proximos-passos-elegant-clover.md` (Fase A→D) to make the core game-agnostic (master prompt §52) without touching `core/`/`ws-server`/frontend shell when a new game is added.
- Refreshed `docs/repository-gap-review.md` and `docs/CHANGELOG.md` to current reality (they were frozen at 2026-09-04).

## Rationale (2026-09-06)
- The 4 platform reference repos are small and immature; our infra already exceeds them. Only rumpus's plugin-registry pattern is worth borrowing. 8tp/Coup is a rules reference only (mobile-first, no TV screen, incompatible stack).
- A second complete game is ready in a separate repo. Doing the core abstraction first (proven with the existing UNO game) — a deliberate reorder ahead of Fase 11 — avoids refactoring the frontend twice.

## 2026-09-06 — Fase A / PR A1 (branch `feature/coup-ou-coupa`)
- `shared/src/games/{meta,status,lifecycle,index}.ts`: `GameMeta`, `GameStatus` (`setup|active|intermission|complete`), `LifecycleEvent`.
- `shared/src/protocol/messages.ts` (additive): `SELECT_GAME`, `GAME_ACTION { action: unknown }`, `START_GAME { gameId? }`, `GAME_CATALOG`, `LIFECYCLE_EVENT`.
- Non-breaking: no server/host/mobile logic changed, `shared/` stays types-only, 25 server tests + 4 builds + 2 lints green. Nothing emits the new messages yet — that's PR A2.

## 2026-09-06 — Fase A / PR A2 (branch `feature/coup-ou-coupa`)
- New: `server/src/core/game-plugin.ts` (`GamePlugin`, `GameInstance`, `GameContext`, capability interfaces + guards), `server/src/games/registry.ts` (`GAMES`), `server/src/games/uno/{plugin,action-schema}.ts`.
- `Room` is game-agnostic (`GameInstance`, `selectGame`, plugin-driven `startGame`, `applyGameAction(playerId, action)`, capability guards). `server/src/core/game.ts` deleted.
- `UnoGame`: `GameContext` ctor, injected RNG (determinism fix), `handleAction(playerId, unknown)` + private `dispatch`, `getStatus()`, `getTimer()`.
- `ws-server`: `SELECT_GAME` + `GAME_ACTION` handlers; 5 legacy UNO verbs kept (dual protocol); `GAME_CATALOG` on join; capability-gated timer tick. Wire state/event payload shapes unchanged (boundary casts, `TODO(A5)`).
- Tests migrated + 2 new; 27 server tests green (stable ×4). No frontend changes. Backward-compatible except `ROOM_STATE.handCount` → `0` (no consumer).

## 2026-09-06 — Fase A / PR A3 (branch `feature/coup-ou-coupa`)
- New: `host/src/shell/` (`messages.ts`, `useRoomConnection.ts`, `LobbyScreen.tsx`, `shell.css`) — game-agnostic connection + lobby + chrome; `useRoomConnection` exposes `publicState`/`events` as opaque `unknown`.
- New: `host/src/games/{types,registry}.ts` (`HostGameViewProps`, `HOST_GAMES = { uno: UnoHostView }`) + `host/src/games/uno/` (`UnoHostView.tsx`, `describeEvent.ts`, `animations.ts`, `cardArt.ts` moved, `uno-host.css`).
- `host/src/App.tsx` → ~55-line dispatcher (lobby until `activeGameId && publicState`, then `HOST_GAMES[activeGameId]`). No UNO knowledge in the shell.
- `host/src/index.css` dead Vite-template block replaced with a minimal reset + design tokens; `host/src/App.css` and template `host/src/assets/` removed.
- No wire change (server + mobile untouched). Host build + root build + `npm run -w host lint` + 27 server tests green.

## 2026-09-06 — Claude Code config for efficiency (branch `feature/claude-config`, off `ec44dff`)
- New `.claude/`: `settings.json` (Read-deny on `package-lock.json` / card `*.png` / `*.min.*`; Bash allow for safe read-only `npm`/`npx`/`git`/`gh` commands; `Stop` typecheck hook), `hooks/typecheck-on-stop.mjs`, `commands/{validate,run,checkpoint,phase}.md`, `launch.json` (un-ignored + committed).
- `CLAUDE.md`: added a "Working efficiently" section; validation block references `/validate` and stops hardcoding the test count. (The "Current state / Fase A" section stays — kept in full by the user.)
- `.gitignore`: un-ignore `.claude/launch.json`; ignore `.claude/settings.local.json`.
- Config only — no app code touched. Goal: fewer permission prompts, no accidental token-heavy reads, type errors caught in the same turn.

## 2026-09-06 — Fase A / PR A4 (branch `feature/coup-ou-coupa`)
- New: `mobile/src/shell/` — `session.ts` (reconnect subsystem, extracted verbatim: same localStorage key formats + recovery), `useRoomConnection.ts` (WS + backoff + `RECONNECT_SESSION` + token persistence + `joinOrReconnect`), `messages.ts`, `MobileHeader.tsx`, `JoinScreen.tsx`, `WaitingScreen.tsx` (shows selected game name), `shell.css`. `publicState`/`privateState` opaque.
- New: `mobile/src/games/{types,registry}.ts` (`ControllerGameViewProps`, `CONTROLLER_GAMES = { uno: UnoControllerView }`) + `mobile/src/games/uno/` (`UnoControllerView.tsx` — still emits the legacy UNO verbs, `cardArt.ts` moved, `uno-controller.css`).
- `mobile/src/App.tsx` → ~70-line dispatcher (`JoinScreen` → `WaitingScreen` until `privateState && publicState && registered game` → controller view; renders the error toast). Shell now handles `GAME_CATALOG` + `GAME_STARTED`; infers active game on mid-game reconnect.
- Removed template `mobile/src/assets/`. No wire change. Builds + host/mobile lint + server tsc + 27 server tests green; browser smoke (join / waiting / play / mid-game reload / waiting reload) passed.

## 2026-09-06 — Fase B design elaborated (no code yet)
- Decided with the user: the **TV/host is the control point** for game selection (phones never show a catalog); `assertOwner` already allows `role:'host'` so no server auth change.
- Host gets a **3-screen pre-match flow**: `attract` ("Box Fiesta" wordmark + room code + connected count) → `catalog` (game grid from `GAME_CATALOG`, cover art from the host game module, arrows+Enter / click / touch) → `lobby` (big QR + players + "Iniciar {game}"). Catalog grid moves out of `LobbyScreen`.
- Post-match → back to the **lobby of the same game** ("Jogar de novo" = re-`START_GAME`, "Trocar de jogo" → `catalog`). No new wire messages (reuses `END_GAME`/`START_GAME`).
- Server change queued for Fase B: `Room.endGame()` → `state='accepting_players'` keeping `selectedGameId` (today `'ended'` blocks `selectGame`); re-broadcast `GAME_CATALOG` after `END_GAME`.
- Order unchanged: Fase A finishes (A5) first, then Fase B. Full detail in the plan file's FASE B section + `docs/CHANGELOG.md`.

## 2026-09-06 — Fase A / PR A5 (branch `feature/coup-ou-coupa`) — BREAKING wire
- `shared`: dropped 5 legacy UNO client verbs (only `GAME_ACTION` left); `GAME_STATE_PUBLIC`/`PLAYER_STATE_PRIVATE`/`GAME_EVENT` → `{ gameId, state|event: unknown, stateVersion }`; `GAME_STARTED` → `{ gameId }`; `ROOM_STATE` lost `handCount`. `events/game-events.ts` → `games/uno/events.ts` (`UnoGameEvent`, 4 dead variants dropped). `Direction`/`Phase` moved `common.ts` → `models/uno.ts` (`Direction`, `UnoPhase`).
- `server`: `ws-server` deleted the 5 UNO verb handlers, adds `gameId` to the 3 broadcasts + `GAME_STARTED`, no boundary casts; `protocol.ts` dropped the 5 UNO zod schemas + `color` enum; `uno-game.ts` `GameEvent`→`UnoGameEvent`.
- `host`/`mobile`: `useRoomConnection` resolves `activeGameId` from `payload.gameId`; host UNO module `GameEvent`→`UnoGameEvent`; `UnoControllerView` senders → `send('GAME_ACTION', { action: {...} })`.
- Tests: `multiplayer.integration.test.ts` migrated (`gameAction()` helper + `pubState()`/`privState()` casts + `gameId` asserts). 27 server tests green; builds + host/mobile oxlint + server tsc green; browser smoke incl. mid-game reload passed.
- **Fase A (game-agnostic core, §52) is complete.** Next: Fase B.

## 2026-09-06 — Fase B (branch `feature/coup-ou-coupa`) — 3-screen host flow + return-to-lobby
- `host`: new `shell/AttractScreen.tsx` ("Box Fiesta" wordmark, room code, phone count, manual advance, no QR), `shell/CatalogScreen.tsx` (game grid + cover art, keyboard + click nav, no QR), `games/uno/UnoCover.tsx` (inline SVG cover). `HOST_GAMES` entries → `{ View, Cover }`. `App.tsx` flow machine `attract | catalog | lobby` (in-game wins; game-end → lobby). `LobbyScreen` loses the catalog grid, gains "Trocar de jogo" + game name/tagline; QR only here.
- `server`: `Room.endGame()` → `state='accepting_players'` keeping `selectedGameId` (`'ended'` removed from `RoomState`); `ws-server` re-broadcasts `GAME_CATALOG` after `END_GAME`.
- `mobile`: `useRoomConnection` handles `GAME_ENDED` (→ waiting, session kept); `WaitingScreen` shows game name + tagline.
- Tests: `room.test.ts` +1 (endGame → accepting_players + selectedGameId kept + play-again/switch work). **28 server tests green.** Builds + host/mobile oxlint + server tsc green; browser smoke of the full loop passed.
- Decisions applied: QR only on lobby, attract advances manually, UNO cover generated as inline SVG. No new wire messages.
- Next: **Fase C** (`@party/ui` design system + synth Web Audio sounds; folds in Fase 11 §47).

## 2026-09-06 — Fase C / PR C1 (branch `feature/coup-ou-coupa`)
- New workspace `ui/` (`@party/ui`) — cross-app React/CSS/audio home; consumed as source by Vite; added to root `workspaces`; `host`+`mobile` get `file:../ui` dep.
- `ui/src/tokens.css` — single source of design tokens; imported per app in `main.tsx`. Resolved host/mobile token divergence (canonical `--panel #161d29`, `--panel-2 #1d2634`, `--line #2b3646`, `--muted #94a3b8`).
- `host`/`mobile` `index.css` keep only the reset (+ mobile keeps its gradient + `--uno-*`). Builds (5 ws) + lints + 28 server tests green; browser smoke visually unchanged.
- Next: C2 (shared components), C3 (synth sounds), C4 (consolidate `cardArt.ts`). §47 "UNO" name kept.

## 2026-09-06 — Fase C / PR C2 (branch `feature/coup-ou-coupa`)
- New `ui/src/components/` + `components.css`: `BrandMark` (game/platform variant — §47 rename point), `Button`, `Panel`, `Overlay`, `Timer` (warn + active glow), `QrPanel`, `PlayerRoster` (list/pills).
- Retrofit: host Attract/Catalog/Lobby + `UnoHostView` (BrandMark, Timer, Overlay, Button); mobile Join/Waiting + `UnoControllerView` (Timer, Button).
- Removed ~116 lines of now-duplicated CSS across host `shell.css`/`uno-host.css` and mobile `shell.css`/`uno-controller.css`. `vite.config` both got `optimizeDeps.exclude: ['@party/ui']`.
- Builds (5 ws) + host/mobile oxlint + server tsc + 28 tests green; browser smoke of every screen unchanged.
- Next: C3 (synth sounds), C4 (consolidate cardArt).

## 2026-09-06 — Fase C / PR C3 (branch `feature/coup-ou-coupa`)
- `ui/src/sound.ts` — synth Web Audio engine (no files, §47): `createSounds(ctx?)` (test-injectable) + `getSounds()` singleton; sounds `cardPlay`/`draw`/`turn`/`special`/`uno`/`win`/`error`/`select`; one-time gesture listener resumes the ctx; mute persists in `localStorage[party:sound]`; silent no-op fallback.
- `host/src/games/uno/sound-map.ts` — `soundForEvent(UnoGameEvent)`; wired into `UnoHostView` (per fresh event, before the reduced-motion guard) + a mute ghost button.
- `ui/src/sound.test.ts` (3 tests, fake AudioContext). Builds (5 ws) + host/mobile oxlint + server tsc + 28 server tests green; browser smoke confirmed oscillators created per event and mute silences them.
- Mobile stays silent for now. Next: C4 (consolidate `cardArt.ts`) closes Fase C.

## 2026-09-06 — Fase C / PR C4 (branch `feature/coup-ou-coupa`) — Fase C complete
- `host`/`mobile` `games/uno/cardArt.ts` (near-identical) → `ui/src/uno-cards.ts` (`@party/ui/uno-cards`). `getCardBackArt` unified to `wildColor` (host behaviour). `ui/src/assets.d.ts` ambient `*.png`.
- Both UNO views import from `@party/ui/uno-cards`; crops stay at repo root (`../../uno_card_sheet_crops/`). 55 PNGs still emitted per app; browser smoke: host board + mobile hand show real card art.
- **Fase C done.** `@party/ui` = tokens + components + sounds + uno-cards; no duplicated frontend code between the apps. §47 "UNO" name kept (`BrandMark.text` = single rename point).
- Next: **Fase D** (integrate game #2 — repo pending from user).

## 2026-09-06 — Fase D (branch `feature/coupzin`) — Coup as game #2 (classic)
- **D1** `shared/src/models/coup.ts` + `shared/src/games/coup/events.ts` (types-only; string values == server enum values).
- **D2** `server/src/games/coup/` ported from `Jogos/Coup/src/engine/` classic-only (no Reformation): `deck`/`player`/`game` (injected `ctx.random`/`ctx.now`), `action-resolver`, `coup-game.ts` (`CoupGame implements PausableGame, TurnTimedGame` — absorbs the standalone `GameEngine`; no `setTimeout`, one deadline via `getTimer()`/`onTurnTimeout()`; 1-influence forced losses auto-resolve), `action-schema.ts` (zod, 9 intents), `plugin.ts`. Registry +1. `coup-game.test.ts` (27) + integration Coup path. **56 → 57 server tests** (D5 adds 1).
- **D3** `host/src/games/coup/` (`CoupHostView` + `CoupCover` + `describeEvent` + `coupCards` + css). Registry +1.
- **D4** `mobile/src/games/coup/` (`CoupControllerView` — one prompt per `pendingDecision` + `HowToPlay` overlay). Registry +1.
- **D5** generic emoji reactions: `SEND_REACTION`/`REACTION` in `shared/protocol` + `ws-server` rebroadcast (1.2s cooldown) + `reactions: LiveReaction[]` in both `useRoomConnection` + threaded to game views. Coup UI: controller emoji bar + TV/controller bubbles. `multiplayer.integration.test.ts` +1.
- **§52 proof held:** the game touched zero `core/`/`ws-server`/shell/`shared/protocol` files; only D5 (a platform feature) touched protocol + shells.
- Live smoke (host + 2 phones): full Coup match incl. bluff→challenge→reveal→influence-loss→turn-advance, pause/resume, 2-player endgame, game-over overlay, "Nova partida", reaction bubble on TV. No errors. server tsc + host/mobile oxlint + build (5 ws) green.
- **Deferred from v1:** D6 polish (sound-map, card-flip anim), bots (needs platform "virtual player" concept — Coup's `BotBrain` is ~1100 lines pure TS), Reformation expansion.
- Committed as 5 commits (D1–D5) on `feature/coupzin`.

## 2026-09-06 — Fase D docs refresh (branch `feature/coupzin`)
- After push: reviewed + updated every doc/README that had gone stale pre-Coup.
- `README.md` — intro (two games), dir tree (`games/coup/`, `ui/`), "Implementação atual" (Fases A–D ✅), validate block (57 tests, 5 workspaces), "Jogar" made game-neutral.
- `server/README.md` — `coup/` in the games map + a Coup engine row; test count; `SEND_REACTION` note; "shared stays types-only, zod lives in `games/<id>/action-schema.ts`".
- `shared/README.md` — `models/coup.ts` + `games/coup/events.ts` rows; `SEND_REACTION`/`REACTION` in the protocol row.
- `host/README.md` / `mobile/README.md` — `HOST_GAMES`/`CONTROLLER_GAMES` with `coup`; `games/coup/` file lists; `reactions` in the `useRoomConnection` exposes.
- `ui/README.md` — **new** (the workspace had none): tokens/components/sound/uno-cards, the "game colours + sound-maps live in the game module" rule.
- `.github/copilot-instructions.md` — mission (two games), current focus (A–D done, deferred list), `CoupGame` in the naming examples.
- `.copilot/spec-kit/README.md` + `copilot-operating-standards.md` — roadmap: Fase D ✅ COMPLETE with the D1–D5 breakdown + deferred (bots/Reformation/D6); both plan files listed.
- `CLAUDE.md` — test count 28→57, 4→5 workspaces, §52-proof line (now "confirmed by Coup"), reference-repos Coup line (ported, not just reference; standalone repo path + `BotBrain` pointer), git-conventions branch history (`feature/coupzin`).
- Docs-only — no code touched.

## 2026-09-06 — Fase D / D6a: Coup real card art (branch `feature/coupzin`)
- `coup_card_art/` (repo root): 6 `.webp` portraits from `Jogos/Coup/public/assets/cards/focus/` (duke/assassin/captain/ambassador/contessa) + `back-v2.webp`.
- `ui/src/coup-cards.ts` → `@party/ui/coup-cards` (mirrors `uno-cards`): `CHARACTER_META` gains `art`, `getCoupCardArt`/`getCoupCardBackArt`. `ui/package.json` +`./coup-cards` export; `assets.d.ts` +`*.webp`.
- Both `coupCards.ts` re-export `CHARACTER_META` from the ui module (was duplicated). Host `InfluenceCard` + mobile `coup-mini`/exchange cards + `CoupCover` now render portrait `<img>`s; CSS reworked to image tiles.
- Fulfils the plan §11 "reusar os `.webp`" decision deferred through D1–D5. §47 still deferred (swappable via one module).
- 57 server tests green · host/mobile lint clean · 5-ws build green (6 `.webp` bundled per app). Live smoke: portraits on catalog cover + controller + revealed-card-on-TV path. No errors.

## 2026-09-07 — Customizable pixel avatars (branch `feature/avatar`)
- Replaced the single-emoji avatar (prepended to the name string) with a per-player LPC pixel-art "3x4 photo" `AvatarSpec` (`{ gender, skin, hair, hairColor, eyes, shirt, hat, bg }` — catalog ids) customized on the join screen. User picked: female + male bodies, catalog ~doubled, hybrid render (bake finite parts, runtime-recolour hair), sources vendored in-repo, license a non-issue (local-only) but credits kept.
- `tools/build-avatars.py` + `tools/lpc-source/` — extractor + vendored subset (56 south idle frames + body/hair/eye/cloth palettes + credits) from the Universal LPC Spritesheet Character Generator. `python tools/build-avatars.py` regenerates `ui/src/avatar-assets/` (69 PNGs, ~35 KB + `palettes.ts` + typed `index.ts` + `CREDITS.md`). Everything committed.
- `shared/src/models/avatar.ts` — `AvatarSpec` type only (now 8 fields). `Player`, `JOIN_ROOM` (optional), `ROOM_STATE.players[]`, `PLAYER_JOINED` carry it. `server/src/websocket/protocol.ts` validates shape (8 strings ≤24, `.strict()`).
- `@party/ui`: `ui/src/avatar.ts` (catalogs 2/6/25/12/6/8/10/8 — `DEFAULT_AVATAR`, `sanitizeAvatar`, `randomAvatar`, `bgHex`), `components/Avatar.tsx` (46×46 `<canvas>` paperdoll: bg → hair-back → body+head → eyes → shirt → hair-front → hat; runtime hair palette-swap; module-wide image + recolour caches; `image-rendering: pixelated`), `components/AvatarEditor.tsx` (preview + Surpresa + per-attribute rows incl. Corpo + Camisa). `ui/src/avatar.test.ts` refreshed (ui suite 7).
- `server/src/core/room.ts` — `joinPlayer(name, avatar, now)`, `Player.avatar` (local `FALLBACK_AVATAR` mirrors ui default). Server tests **57 → 60** (room avatar default; integration `PLAYER_JOINED`/`ROOM_STATE` carry avatar; malformed → `BAD_REQUEST`).
- `mobile` — `AvatarEditor` on `JoinScreen` (+ small LPC credit line), `Avatar` on `WaitingScreen`, `App.tsx` persists `localStorage['party:avatar']`, `joinOrReconnect` sends structured avatar + clean name (emoji prefix gone). `ControllerGameViewProps` +`roomPlayers`; UNO/Coup controller rosters show opponent mini-avatars.
- `host` — `ShellPlayer` +`avatar`; `@party/ui` `PlayerRoster` renders a mini `<Avatar>`; `UnoHostView`/`CoupHostView` seat rows resolve `avatarOf(id)` from the `players` prop.
- §52 held — zero edits to `core/` orchestration, `ws-server` routing, either shell flow, or any engine (host/controller views map `playerId` → avatar via the existing `ROOM_STATE` roster).
- 60 server tests · ui 7 · host/mobile lint clean · 5-ws build green. Live smoke: edit (gender/skin/hair+recolour/eyes/shirt/hat/bg/Surpresa) → join → waiting → lobby → in-game (TV canvas seats + phone pills). No errors.

## 2026-09-07 — Stack merged + next-games direction (branch `feature/quiplaxi`, no code)
- `main`/`develop` fast-forwarded to `0079344` — whole Fases A–D + pixel-avatars stack now on `main`. Branch stack resolved. New working branch **`feature/quiplaxi`** (off `main`, empty) for **game #3, a Quiplash-inspired party game**.
- **Decision: NO BOTS** — bots / virtual players descoped for every game (not deferred). Do not port 8tp/Coup `BotBrain`; do not propose a virtual-player phase. Coup **Reformation** stays deferred (not descoped). **§47** (own game names) still open — blocks naming a Quiplash-like game.
- Re-validated the 5 `Jogos/*` reference repos by reading the code: read-only references, nothing to import architecturally (our platform exceeds all). `rumpus/games/quiplash.js` + `fibbage.js` (~300 lines each) = mechanics reference for games #3/#4 — rumpus is **AGPLv3**, reimplement clean-room, never copy into this ISC repo. Real effort for text games = original PT-BR prompt/question banks.
- Roadmap: #3 Quiplash-inspired (needs a new free-text mobile input component; §52 checklist) → #4 Fibbage-inspired → #5 Trivia. Plus Coup D6 polish (sound-map, card-flip).
- Docs synced: `CLAUDE.md`, `docs/CHANGELOG.md`, `docs/repository-gap-review.md`, this file; plan `~/.claude/plans/quiplax-e-proximos-jogos.md`; memory `no-bots` + `party-game-reference-repos` added. Implementation happens in a fresh chat.

## 2026-09-07 — Zap! (game #3) / PR Z1 — shared contract (branch `feature/quiplaxi`)
- Locked with the user: name **"Zap!"** (`gameId: "zap"`, §47); **real Quiplash** head-to-head-duel mechanic (single-shared-prompt variant parked for a future CAH-style game); **3 rounds**, round 3 = **"Última Chance"** (one shared prompt, 3× points); circle pairing (`prompt_i → player_i + player_{i+1}`); **minPlayers 3**; 100/vote + "ZAP!" sweep bonus; TV votes one duel at a time.
- `shared/src/models/zap.ts` + `shared/src/games/zap/events.ts` (types-only): public/private state, `ZapPhase`, `ZapDuel`/`ZapDuelResult`, `ZapAction`, `ZapGameEvent`. `shared/src/index.ts` re-exports both. Answer authors hidden in the public state during `voting`; events carry no answer/vote text.
- `npm run -w shared build` green; 60 server tests + 5-ws build green (no runtime added).

## 2026-09-07 — Zap! (game #3) / PR Z2 — server engine + plugin (branch `feature/quiplaxi`)
- `server/src/games/zap/`: `constants.ts`, `prompts.ts` (54 original PT-BR prompts), `pairing.ts` (pure circle-pairing planner — `planNormalRound`/`planFinalRound`), `zap-game.ts` (`ZapGame implements PausableGame, TurnTimedGame` — self-advancing via one server-ticked deadline; `answering`→`voting` one duel at a time→`roundResults`→next round/`gameover`; blanks filled, all-blank duels dropped; 100/vote, ×3 final round, +50 sweep bonus), `action-schema.ts` (zod `submitAnswer`/`castVote`), `plugin.ts` (`zapPlugin`, "Zap!", 3–8p).
- `server/src/games/registry.ts`: +1 import +1 entry.
- Z1 shared types tweaked: duel slots `0|1`→`number`, `votes` tuple→`number[]` (final round = one N-way duel).
- `zap-game.test.ts` (16) + integration path (+1). **Server tests 60 → 77.** `tsc` server+shared clean, host/mobile lint clean, 5-ws build green.
- **§52 held** — no edits to `core/`, `ws-server`, shells, `shared/protocol`.

## 2026-09-07 — Zap! (game #3) / PR Z3 — host / TV view (branch `feature/quiplaxi`)
- `host/src/games/zap/`: `ZapHostView.tsx` (phase-driven TV view — `answering` progress + ✍️/✅ roster from the event stream, `voting` `DuelBoard` for `currentDuelIndex`, `roundResults` duel grid with winner ring + `⚡ ZAP!` burst, `gameover` Overlay + final standings; side panel = live standings + `describeEvent` feed + pause/end), `ZapCover.tsx` (inline SVG), `describeEvent.ts`, `zap-host.css` (all scoped under `.zap-host`). `host/src/games/registry.ts` +2 imports +1 entry.
- oxlint host clean, 5-ws build green, 77 server tests green. Live smoke (host + 3 phones): catalog cover → Iniciar → `answering` renders live (timer/progress/roster/standings/feed), self-advancing loop ran rounds 1→2→3 (Última Chance) with the shared prompt + triple-points styling, zero console errors. `voting`/results-with-answers/`gameover` visuals fully exercised at Z4 (needs the controller to submit).
- Next: **Z4** mobile controller + free-text input (1 line in `CONTROLLER_GAMES`) · **Z5** polish.

## 2026-09-07 — Zap! (game #3) / PR Z4 — phone controller + free-text input (branch `feature/quiplaxi`)
- `@party/ui` `TextAnswerInput` (prompt + textarea + counter + submit; "✓ enviado" / "Atualizar"; **reusable by Fibbage**) + `.ui-answer*` CSS. Exported from `@party/ui`.
- `mobile/src/games/zap/`: `ZapControllerView.tsx` (phase-driven — `answering` = one `TextAnswerInput` per assignment keyed `round-slot`; `voting` = tap-to-vote ballot that locks; `roundResults`/`gameover` summaries; standings + reactions + `HowToPlay`), `HowToPlay.tsx`, `zap-controller.css` (scoped `.zap-*`). `registry.ts` +1 import +1 entry.
- ui 7 tests + `tsc` clean, oxlint mobile clean, 5-ws build green, 77 server tests green.
- **Full live smoke**: complete 3-round match, host TV + 3 phones. minPlayers-3 lobby gate, per-phone prompts, auto-advance answering→voting→results, per-duel ballots, `DuelBoard` reveal + winner ring + ⚡ZAP +50, round 3 Última Chance N-way duel ×3, `gameover` overlay + per-phone rank. 0 controller console errors (host had shell reconnect-backoff noise during server startup — not this slice).
- Next: **Z5** polish (reveal/vote animation, phone "ZAP!" burst, `sound-map.ts`).

## 2026-09-07 — Zap! (game #3) / PR Z5 — polish: sound + animation (branch `feature/quiplaxi`)
- `host/src/games/zap/sound-map.ts` (`soundForEvent`, mirrors uno) wired into `ZapHostView` off the raw event stream + a "🔊 Som ligado/🔇" toggle. First non-UNO game with sound.
- Animations (all `prefers-reduced-motion`-guarded): host `zap-winner-pop` on the winning answer + `zap-foot-in` on reveal; controller `⚡ +N ⚡` cheer on roundResults when you scored + `zap-chosen-pop` on the picked vote.
- 77 server + 7 ui tests, tsc + oxlint clean, 5-ws build green. Live smoke: full 3-round match to gameover, winner pop + sound toggle render, 0 game console errors.
- **Zap! (game #3) COMPLETE** (Z1–Z5). §52 held: whole game = `shared/{models,games}/zap`, `server/src/games/zap/`, `host/src/games/zap/`, `mobile/src/games/zap/`, one `@party/ui` component, +1 line in each of 3 registries. Zero edits to `core/`/`ws-server`/shells/`shared/protocol`.

## 2026-09-08 — UX: lobby avatar re-edit + cancelable UNO colour picker (branch `feature/quiplaxi`)
- New `UPDATE_AVATAR { avatar }` (shared/protocol + server/protocol reusing `avatarSchema`); `Room.setAvatar` (gated to `accepting_players`); `ws-server` handler → `broadcastRoomState`. Platform message, like `SEND_REACTION`.
- Mobile `WaitingScreen`: "✏️ Editar avatar" → inline `<AvatarEditor>` (Cancelar/Salvar) → `App.changeAvatar` persists locally + sends `UPDATE_AVATAR`.
- Mobile `UnoControllerView`: wild cards pick colour BEFORE playing — "Jogar" opens a local popup with ✕ (cancel keeps the card selected, nothing sent); a colour sends `play_card { cardId, chosenColor }` in one shot. Server `awaiting_color_choice` modal kept as timeout/reconnect fallback. No engine change.
- Tests: `room.test.ts` +1, `multiplayer.integration.test.ts` +1. **Server 77 → 79.** tsc + ui(7) + oxlint + 5-ws build green. Live smoke passed both flows.

## 2026-09-08 — Lorota! (game #4, Fibbage-inspired) — full slice (branch `feature/fibbage`, off `main` @ ecfcf00)
- §47 name **"Lorota!"** (`gameId: "lorota"`). Loop: fact-with-blank → invent a lie → server shuffles lies + truth → hunt the truth. +1000 find truth, +500 per player fooled, final round ×2, 3 rounds, minPlayers 3.
- `shared/src/models/lorota.ts` + `shared/src/games/lorota/events.ts` (types-only). `shared/src/index.ts` +2 exports.
- `server/src/games/lorota/`: `constants`, `questions.ts` (45 original PT-BR "fato com lacuna"), `lorota-game.ts` (`implements PausableGame, TurnTimedGame`; accent/case/punct-insensitive `normalize`; truth-collision bounced silently + `lieWasTheTruth` flag; identical lies collapse crediting all authors; self-advancing), `action-schema` (zod), `plugin`. **+1 line in `GAMES`.**
- `host/src/games/lorota/` (`LorotaHostView` phase-driven, `LorotaCover` SVG, `describeEvent`, `sound-map.ts`, `lorota-host.css` scoped `.lorota-host`) +2 imports +1 entry in `HOST_GAMES`.
- `mobile/src/games/lorota/` (`LorotaControllerView` reusing `@party/ui TextAnswerInput`, `HowToPlay`, `lorota-controller.css`) +1 line in `CONTROLLER_GAMES`.
- `lorota-game.test.ts` (14) + integration path (+1). **Server 79 → 94.** tsc + ui(7) + oxlint + 5-ws build green.
- Full live smoke: 3-round match host + 4 controllers — lying/guessing/reveal/gameover all render, truth-collision nudge, identical-lie collapse, scoring (truth +1000, fool +500, final ×2). 0 game console errors.
- **§52 held** — nothing in `core/`, `ws-server`, shells, `shared/protocol`. **4 games in the catalog.**

## 2026-09-08 — Pack adulto (+18): Zap! + Lorota! (branch `feature/pack-adulto`, off `main`)
- User asked for dark / crude / +18 humour in the party games. Content-only.
- `server/src/games/zap/prompts.ts` — +32 PT-BR prompts in a `PACK ADULTO (+18)` section (64 → 96), merged into the same shuffled `ZAP_PROMPTS`.
- `server/src/games/lorota/questions.ts` — +22 "fato com lacuna" entries (45 → 67), all real facts (or a labelled myth) so the truth-hunt still works.
- Guardrails: crude but no protected group as punchline, no real private people.
- No engine / schema / wire change. No test asserts bank length. **94 server tests green**, tsc + 5-ws build green.

## 2026-09-08 — Sabe-Tudo (game #5, multiple-choice trivia) — full slice (branch `feature/sabetudo`, off `main`)
- §47 name **"Sabe-Tudo"** (`gameId: "sabetudo"`). Loop: question + 4 options on TV → tap one on phone → base 500 + speed bonus (≤500, linear decay) + streak bonus (+100/consecutive, cap 5) → reveal → 8 questions → ranking. minPlayers 2.
- `shared/src/models/sabetudo.ts` + `shared/src/games/sabetudo/events.ts` (types-only). `shared/src/index.ts` +2 exports.
- `server/src/games/sabetudo/`: `constants`, `questions.ts` (59 original PT-BR incl. an 18-entry PACK PICANTE +18), `sabetudo-game.ts` (`implements PausableGame, TurnTimedGame`; options shuffled per question; self-advancing `question`→`reveal`), `action-schema` (zod), `plugin`. **+1 line in `GAMES`.**
- `host/src/games/sabetudo/` (`SabeTudoHostView` phase-driven, `SabeTudoCover` SVG, `describeEvent`, `sound-map`, `sabetudo-host.css` scoped) +2 imports +1 entry in `HOST_GAMES`.
- `mobile/src/games/sabetudo/` (`SabeTudoControllerView` A/B/C/D tap grid, `HowToPlay`, css) +1 line in `CONTROLLER_GAMES`.
- `sabetudo-game.test.ts` (11) + integration path (+1). **Server 94 → 106.** tsc + oxlint + 5-ws build green.
- Full live smoke: host + 2 controllers — question/reveal/pause/resume, speed bonus (+727 fast), streak 🔥2 (+858), +18 pack in rotation, END_GAME → lobby. 0 console errors.
- **§52 held** — nothing in `core/`, `ws-server`, shells, `shared/protocol`. **5 games in the catalog.**

## 2026-09-08 — FDP — Foi De Propósito (game #6, Cards-Against-Humanity-style, +18) — full slice (branch `feature/fdp`, off `main`)
- §47 name **"FDP — Foi De Propósito"** (`gameId: "fdp"`; in-game `BrandMark` = "FDP"). Loop: shared prompt with a blank → each player writes one answer → TV shows them shuffled + anonymous → vote the best (never own) → +100/vote + 150 sweep bonus → 5 rounds, round 5 "Final FDP" ×2. minPlayers 3.
- The game the user asked to be properly +18. Guardrails: no protected group as punchline, no real private people, nothing sexual involving minors.
- `shared/src/models/fdp.ts` + `shared/src/games/fdp/events.ts` (types-only). `shared/src/index.ts` +2 exports.
- `server/src/games/fdp/`: `constants`, `prompts.ts` (58 original PT-BR +18 prompts), `fdp-game.ts` (`implements PausableGame, TurnTimedGame`; answers anonymised; skips vote if nobody wrote; sweep bonus; round winner null on tie; self-advancing `writing`→`voting`→`roundResults`), `action-schema` (zod), `plugin`. **+1 line in `GAMES`.**
- `host/src/games/fdp/` (`FdpHostView` phase-driven, `FdpCover` SVG, `describeEvent`, `sound-map`, `fdp-host.css` scoped) +2 imports +1 entry in `HOST_GAMES`.
- `mobile/src/games/fdp/` (`FdpControllerView` reusing `@party/ui TextAnswerInput`, `HowToPlay`, css) +1 line in `CONTROLLER_GAMES`.
- `fdp-game.test.ts` (13) + integration path (+1). **Server 106 → 120.** tsc + oxlint + 5-ws build green.
- Full live smoke: host + 3 controllers — writing/voting/results/pause paths, anonymity, own-answer excluded from ballot, +100/vote + 150 sweep (Bia +350), 👑 round winner, scores carried to round 2, END_GAME → lobby. 0 console errors.
- **§52 held** — nothing in `core/`, `ws-server`, shells, `shared/protocol`. **6 games in the catalog (UNO/Coup/Zap!/Lorota!/Sabe-Tudo/FDP).**

## 2026-09-08 — Toggle "Leve / Pesado" + heavier +18 packs (branch `feature/modo-pesado`, off `main`)
- User asked to push the +18 content much harder for a perception POC, and for a way to dial it. Built a room-level content-intensity toggle.
- Platform: `ContentTier = 'leve'|'pesado'` in `shared/src/games/content-tier.ts`; `SET_CONTENT_TIER` client msg + `contentTier` on `GAME_CATALOG` (shared/protocol + server/protocol zod); `Room.contentTier` (default `pesado`) + `setContentTier` (lobby-only) → `GameContext.contentTier?`; `ws-server` owner-gated handler. Host `LobbyScreen` segmented toggle (tiered games only) + `useRoomConnection`/`App` wiring; mobile `WaitingScreen` "Modo leve/pesado" tag.
- Content: each text game's bank split into leve/pesado + a `<game>Prompts(tier)` / `<game>Questions(tier)` helper. Zap +34 heavier prompts, Lorota +16 heavier real facts (+tagged old pack), Sabe-Tudo +11 (+tagged), FDP restructured (38 leve / 62 pesado, ~40 new). Guardrails unchanged and now written into each content file's header: no protected-group punchline, no real private people, no minors, no graphic sex about named real people, no real specific atrocity with real victims, no defaming real named businesses.
- `content-tier.test.ts` (5) + `room.test.ts` +1 + integration +1. **Server 120 → 127.** tsc + oxlint + 5-ws build green. Live smoke: FDP in Leve served only leve prompts; toggle roundtrips + persists across game switch; 0 console errors on fresh loads.
- §52 note: this is a platform feature (like reactions/avatars) so it touches protocol + ws-server + Room + GameContext + both shells — but zero game *rules* changed; the engines only swap which array they shuffle.

## 2026-09-08 — É Você! (game #7, *That's You!*-inspired) — full slice (branch `feature/e-voce`, off `main`)
- User loved PlayStation's *That's You!* (removed from the store) and asked for something similar. Researched it (Wish Studios/Sony 2017 PlayLink) then built an adaptation.
- §47 name **"É Você!"** (`gameId: "evoce"`). A "how well do you know your friends" game. 6 fixed rounds: `enquete → legenda → rabisco → enquete → legenda → final` (final ×2).
- **No camera** (LAN http blocks getUserMedia): a player's face = their pixel `<Avatar>`; drawings = a light **stroke list** in a 0–1000 square, not a bitmap.
- New mechanics for the platform: **voting for a player** (enquete, consensus scoring: 250/other-agreer) + the **Curinga** wildcard (2 each, doubles enquete points if your vote matched the group) + **drawing**.
- `shared/src/models/evoce.ts` + `games/evoce/events.ts` (types-only). `shared/src/index.ts` +2.
- `server/src/games/evoce/`: `constants`, `prompts.ts` (4 PT-BR banks each split leve/pesado), `evoce-game.ts` (`implements PausableGame, TurnTimedGame`; self-advancing; per-kind decks; target rotation; consensus + Curinga + VOTE_POINTS/PICK_WINNER_BONUS scoring), `action-schema` (zod + bounded stroke schema), `plugin`. **+1 line in `GAMES`.**
- `@party/ui`: **`DrawingCanvas`** (pointer paint → stroke list) + **`DrawingView`** (read-only SVG) + CSS — reusable by future games.
- `host/src/games/evoce/` (`EvoceHostView` phase×kind, `EvoceCover` SVG, `describeEvent`, `sound-map`, css) +2 imports +1 entry in `HOST_GAMES`. `mobile/src/games/evoce/` (`EvoceControllerView`, `HowToPlay`, css) +1 line in `CONTROLLER_GAMES`. `evoce` added to both tiered-games sets (Leve/Pesado toggle).
- `evoce-game.test.ts` (11) + integration (+1) + content-tier (+1). **Server 127 → 140.** tsc server/shared/ui + oxlint + 5-ws build green + ui 7 tests.
- Full live smoke: complete 6-round match, host + 3 controllers — consensus scoring, Curinga doubling, `[NOME]` substitution, rabisco model-excluded + `DrawingCanvas`→`DrawingView` strokes over the wire, final ×2, gameover overlay. 0 console errors (fresh tabs).
- **§52 held** — nothing in `core/`, `ws-server`, either shell flow, `shared/protocol`. **7 games in the catalog.**

## 2026-09-08 — Catalog coverflow + per-game personality (branch `feature/catalog-coverflow`, off `main`)
- User asked for the game menu to show 3 cards at a time — centre one bigger/selected, siblings scrolling left/right — with a strong per-game personality and (acid, black) humour; animation welcome.
- `host/src/shell/CatalogScreen.tsx` rebuilt as a 3-up coverflow reel: offset-driven `transform`/`opacity`/`z-index` (`--off`/`--abs`), 3D `rotateY` on the flanks, circular wrap, ‹ ›/arrows/dots/side-click to rotate, Enter/centre-card/"▶ Iniciar" to start. Idle float on the centre frame.
- New `GamePersonality { accent, vibe, blurb }` (`host/src/games/types.ts`); one `host/src/games/<id>/personality.ts` per game (7); `HostGameEntry` gains `personality`; `registry.ts` + `App.tsx` wire a `personalities` record next to `covers`. Accent retints the ambient wash + focused frame + vibe tag + blurb + start button as you scroll.
- Vibes: UNO RAIVA / Coup TRAIÇÃO / Zap! EGO / Lorota! MENTIRA / Sabe-Tudo SOBERBA / FDP SAFADEZA / É Você! AMIZADE. Blurbs are acid PT-BR one-liners.
- Sound: catalog wired to the shared synth `@party/ui` sounds — `select()` per step, `special()` on pick. No audio files added (the §47 synth-only decision stands).
- `shell.css`: `.catalog-*` grid block replaced with `.cf-stage`/`.cf-reel`/`.cf-card`/`.cf-frame`/`.cf-vibe`/`.cf-hero`/`.cf-start`/`.cf-dots`/`.cf-arrow`; `color-mix()` tints; `prefers-reduced-motion` guard.
- **Deliberately not done:** vendoring SpriteCook / other open game art+audio packs — reverses §47 "own visual identity" + the synth-only sound call and adds binaries to an asset-free repo. Flagged to the user.
- Validation: host `tsc -b` + `vite build` green, `oxlint` host clean (established advisory only). No server/shared/mobile/ui changes — 140 server tests unaffected. Live: reel math + accent/blurb/dot tracking + pick→lobby verified, 0 console errors.
- §52: zero edits to `core/`, `ws-server`, `shared/`, mobile, or either shell flow.

## 2026-09-08 — "Gabsinto" easter-egg avatar presets (branch `feature/gabsinto`, off `feature/catalog-coverflow`)
- User supplied 8 AI portrait renders of himself (king / general / victorian lord / baroque noble / corporate headshot / cubist / JoJo stand / JJK sheet) and asked for them as a hidden avatar set + "glory moment" cameos. Trigger: typing the name **"Gabsinto"**.
- `AvatarSpec` (shared) gains optional `preset?: string` (types-only). When set + known, `<Avatar>` renders that portrait full-bleed (`<img class="ui-avatar-preset">`) and ignores the paperdoll fields. Unknown values dropped by `sanitizeAvatar`.
- `@party/ui`: `tools/build-gabsinto.py` (Pillow, dev-only) reads `tools/gabsinto-source/` → `ui/src/avatar-presets/` = 8× `<id>.webp` (320² face crop) + 8× `<id>-full.webp` (≤1000px, for the glory splash) + typed `index.ts` (`AVATAR_PRESETS`, `getAvatarPreset`) + `CREDITS.md`. ~810 KB, committed. `avatar.ts` re-exports the catalog, adds `isGabsintoName()` (NFD/case/space-insensitive) + `GABSINTO_NAME`; `sanitizeAvatar` preserves a known `preset`. `AvatarEditor` gains `presetsUnlocked` → a "🕵️ Lendas" thumbnail row; any normal attribute change clears the preset.
- `server/src/websocket/protocol.ts` — `avatarSchema` (`.strict()`) gains `preset: z.string().min(1).max(24).optional()`. Server stores it as-is (structural validation only); `@party/ui` clamps unknown ids at render.
- `mobile`: `App.tsx` owns `legendsUnlocked` (persisted `localStorage['party:legends']`), unlocked once `isGabsintoName(playerName)` matches; passed to `JoinScreen` + `WaitingScreen` → `AvatarEditor`. Join screen swaps the LPC credit line for "🕵️ Lendas desbloqueadas" when unlocked.
- `.gitignore` += `/gabriel-source/` (the drop folder; the real sources live in `tools/gabsinto-source/`).
- Validation: 140 server tests, 7 ui tests, 5-workspace build, tsc server/shared/ui clean, oxlint host/mobile clean (established `set-state-in-effect` advisory only). **Full live E2E**: type "Gabsinto" → Lendas row appears (8) → pick "O Rei" → preview + waiting-screen avatar become the portrait `<img>` → join → `UPDATE_AVATAR` over the wire → host lobby roster renders the portrait. Picking a normal attribute reverts to the paperdoll. 0 console errors.
- **Glory-moment cameos = next slice** (portrait fills the victory overlays); avatar part shipped first.
- §52: adding a game is unaffected. Platform-level change (like avatars/reactions): touches `shared` (1 optional field), `@party/ui`, `mobile` shell, and the protocol schema (1 optional field) — no engine, no `core/`, no `ws-server` logic, no host game view.

## 2026-09-08 — decision: drop §47 "own visual identity" + synth-only sound; allow curated public asset packs
- User: "eu removeria essas diretivas... podemos buscar em repositórios públicos". The §47 constraint (and the "Web Audio only, no audio files" sound rule) is **lifted** by the owner.
- Not editing `.copilot/spec-kit/master-prompt.md` (§47 text stays as historical spec) — the override is recorded here + in `CLAUDE.md` + memory `[[box-fiesta-project-state]]`.
- Constraints that remain: bundle everything (no runtime internet — LAN only), permissive licences only (CC0 / CC-BY / OGA-BY / MIT-like), keep a `CREDITS.md` per pack, keep the repo reasonably light, no heavy deps. Reference example the user gave: github.com/SpriteCook/spritecook-free-game-assets.
- **Next slice(s):** curate per-game art + a small sound pack per game (each game already has a `sound-map.ts` hook on the host); the coverflow covers + `@party/ui` synth sounds stay as the fallback / baseline.

## 2026-09-08 — real sound pack (CC0 Kenney) wired into every game (branch `feature/gabsinto`)
- First use of the §47 lift. Host sound was synth-only; added a bundled CC0 sample layer.
- `@party/ui` `sound.ts`: `Sounds.sample(id, opts?)` + `play(spec: SoundSpec)` where `SoundSpec = SoundName | { sample, gain?, rate? }`. Clips decode once to AudioBuffer, share the master gain + mute. Pack loaded via lazy `import('./sound-assets')` on first sample → mobile bundle ships no audio, host gets a ~1KB lazy chunk.
- `tools/build-sound-pack.py` (dev-only, Pillow-free) curates ~24 clips from 3 CC0 Kenney packs (Interface Sounds / Casino Audio / Music Jingles) → `ui/src/sound-assets/` (`<id>.ogg` + typed `index.ts` + `CREDITS.md`, ~260KB). Only the renamed output is committed; `tools/sound-source/` gitignored.
- All 7 `sound-map.ts` return `SoundSpec` now: casino card sounds for UNO/Coup, chip-lay/chips-collide for Coup coins & challenges, `ui-*` for confirm/error/reveal, Music-Jingles stingers for round-end/game-over/ZAP!/Curinga. Synth kept for turn ticks + the UNO call.
- **Coup got sound** (new `coup/sound-map.ts` + `CoupHostView` wiring + "🔊 Som" toggle) — closes the D6 sound half.
- 140 server tests / 8 ui tests (2 new) / tsc+oxlint / 5-ws build all green. Live: sample fetch+decode+play verified on the host, lazy chunk splits, 0 console errors.
- All clips Kenney CC0 1.0; `ui/src/sound-assets/CREDITS.md` maps each to its original.

## 2026-09-08 — crash fix + mobile leave/accessibility + catalog how-to (branch `feature/mais-diversao`, off `feature/gabsinto`)
User report: É Você! drawing → clicking undo/submit a big drawing → `RangeError: Max payload size exceeded` (WS 1009) **crashed the whole server process** (unhandled `'error'` on the ws socket).
- **Crash fix**: `ws-server.ts` `socket.on('error')` (log + terminate) + `wss.on('error')`; `maxPayload` 16KB→128KB. `DrawingCanvas`: int coords, `fitDrawing()` decimates strokes to <60KB before submit, `MAX_STROKES` 500→240. `evoce` `MAX_POINTS_PER_STROKE` 512→256 + `MAX_TOTAL_POINTS` 6000; `sanitizeDrawing` rounds+clamps+budgets. Test +1 (140→141). Live-verified: 400KB frame closes just that socket, server survives.
- **Leave room**: new `LEAVE_ROOM` msg (shared + server zod + handler → immediate kick + forget socket identity). `useRoomConnection.leaveRoom()` + "◀ Sair e trocar de sala" on `WaitingScreen` → back to JoinScreen.
- **Accessibility**: `TextScaleButton` (floating `A＋`, bottom-left) cycles root font-size 100/115/130/145% (rem-based), persists `localStorage['party:textscale']`. Avatars bigger: `PlayerRoster` 30/22→40/32, in-game pills 20→30 (evoce 28→36).
- **Catalog how-to**: `GamePersonality.how` (one plain mechanics sentence) rendered under the blurb in the coverflow; one line per `personality.ts` (×7).
- 141 server / 8 ui tests, tsc+oxlint, 5-ws build green.
- **Deferred (same user message, own slices)**: configurable round/question counts per game; transitional scoreboard scenes + player taunts (roast last, hype leader); Taylor Swift facts in trivia/Lorota banks; per-game background art.

## 2026-09-09 — §47 "own visual identity" clause removed (owner instruction, branch `feature/mais-diversao`)
- The owner said it three times, then "ignore totalmente o §47, remova-o". Overrode the CLAUDE.md "never edit master-prompt.md" rule on that explicit instruction.
- `.copilot/spec-kit/master-prompt.md` §47: struck the two lines ("não copiar identidade visual/assets/sons de terceiros" + "identidade visual própria") and added a dated retirement note. Section number + heading kept so every `§47` cross-ref still resolves. Trademark/logo caveat kept (don't ship a game literally called "UNO").
- Cleaned every `§47:` tag out of the source (plugin/model comments, BrandMark, ui/README, sound.ts docstring which still claimed "no audio files").
- CLAUDE.md: the "§47 LIFTED" note → "clause REMOVED"; hard-rules asset line reworded; the coverflow section's "§47 synth-only + own-identity decisions stand" line dropped.
- No behaviour change. 141 server tests / tsc / build green.

## 2026-09-09 — round taunts + Taylor Swift content (branch `feature/mais-diversao`)
- `@party/ui` `roundTaunt(standings, seed)` — deterministic PT-BR roast/hype one-liner (names leader + last place; 14 templates incl. a Taylor Swift re-recordings joke; flat-tie fallback). `.round-taunt` CSS in components.css. Wired into the results/reveal phase of Sabe-Tudo, Zap!, FDP, Lorota!, É Você! (seed = round #). `taunt.test.ts` (4) → ui tests 8→12.
- Taylor Swift content: Sabe-Tudo +12 questions (category "Taylor Swift", leve), Lorota! +7 "fato com lacuna" (leve).
- 141 server / 12 ui tests, tsc+oxlint, 5-ws build green.
- Sound polish handed to the owner (separate chat). Still deferred: configurable round/question counts; full transitional scoreboard scene; per-game background art.

## 2026-09-09 — configurable match length (branch `feature/rodadas-e-cenas`, off main @ 12a8341)
- `GameMeta.lengthOptions {label,values[],default}` + `GameContext.matchLength`. `SET_MATCH_LENGTH {gameId,length}` msg (owner+lobby-gated, value validated against `lengthOptions.values`); `GAME_CATALOG` gains `matchLengths`. `Room.setMatchLength`/`matchLengthFor`/`matchLengths` map.
- Sabe-Tudo 8/12/16/20 (def 12), Zap!/Lorota! 3/5/7 (def 3), FDP 3/5/7 (def 5): `TOTAL_ROUNDS` const → per-instance `this.totalRounds = ctx.matchLength ?? TOTAL_ROUNDS`. Evoce unchanged (fixed 6-round plan).
- Host `LobbyScreen` segmented picker (reuses `.lobby-tier*` styles). `useRoomConnection` exposes `matchLengths`; `App` sends `SET_MATCH_LENGTH`.
- sabetudo-game.test +2, room.test +1 → 144 server tests. tsc+oxlint+build green.

## 2026-09-09 — between-rounds scoreboard scene (branch `feature/rodadas-e-cenas`)
- `@party/ui` `<RoundScoreboard>` (+ `ScoreRow` type): big animated host leaderboard — ranked rows w/ medals, score bars scaled to leader, "+N" delta pop, streak flames, `roundTaunt` underneath, staggered entrance, reduced-motion guard. `.ui-scoreboard*` CSS.
- Wired into results/reveal of Sabe-Tudo, Zap!, FDP, Lorota!, É Você! (replaced the standalone taunt `<p>`). Title = "Rodada X de Y" / "Última Chance" / "Final FDP" / "Lorota Final".
- tsc+oxlint+build green. Needs a live smoke through a full round (component is JSX+CSS, unit path covered by roundTaunt tests).

## 2026-09-09 — per-game lobby backdrop (branch `feature/rodadas-e-cenas`)
- `LobbyScreen` renders the selected game's `Cover` SVG blown-up + blurred + faded behind a now-semi-transparent (`backdrop-filter`) lobby card, with a radial wash in the game's personality accent (`--game-accent`). `App` passes `covers` + `personalities`. Reduced-motion drops the scale. No new assets.
- In-game backdrops deferred (per-host-view layout care needed).
- Branch `feature/rodadas-e-cenas` = 3 commits: configurable match length, between-rounds scoreboard scene, per-game lobby backdrop. 144 server / 12 ui tests, tsc+oxlint+build green. Ready to merge.

## 2026-09-09 — local meme-sound layer + new attract screen (branch `feature/som-e-tela-inicial`, off main @ d576602)

### Sound: owner's local override layer
- `@party/ui` `SoundSpec` gains `{ cue: string; fallback?: SoundSpec }`; `registerCues(map)` fills a runtime `cue -> URL` registry. `play({cue})` uses the registered clip, else `fallback` (so an empty checkout is unchanged). `sound.ts` refactor: `loadUrl(key, resolver)` + `playBuffer()` shared by `sample()` and cues. `sound.test.ts` +1 (13 ui tests).
- Host `shell/localSounds.ts` fetches `/sound-local/manifest.json` once at boot (`main.tsx`) and registers it. `host/public/sound-local/` = gitignored drop folder (`.gitkeep` + `README.md` + `manifest.example.json` committed; clips + `manifest.json` ignored). `.gitignore` updated.
- 7 `host/src/games/<id>/sound-map.ts` now return `{ cue: 'meme.*', fallback: <old spec> }` at: round/question start (`meme.roundStart`), reveal (`meme.reveal`), match win (`meme.win` — UNO/Coup + Zap! sweep), game over (`meme.gameover`), Coup challenge (`meme.betrayal`), Coup elimination (`meme.elimination`). Reserved (listed, not wired): loser/correct/timeout/afk/fooled/deadLobby.

### Attract screen: owner art (cover) + self-contained CRT panel + parallax
- `tools/build-attract-bg.py` (Pillow) bakes `host/src/shell/attract-bg.webp` (~250KB) + CREDITS from a PNG in `gabriel-source/` (gitignored). Current art: a 16:9 game-night room.
- `AttractScreen.tsx`: `background-size: cover` fills the viewport; `onMouseMove` drifts a 6%-bleed `.attract-scene` (`--px/--py`, bounded, 240ms ease-out); a radial vignette pulls focus centre. The live bits (SALA / code / count / QR + url) live in `.attract-panel` — a **self-contained CRT card** (dark glass, bezel `box-shadow` ring, `.attract-screen-fx` scanlines + flicker, glow), plus the yellow CTA sticker below. **Nothing is measured against the art**, so any background image works. `prefers-reduced-motion` kills flicker + CTA pulse + parallax. `BrandMark`/tagline are in the art. `App` passes `joinUrl`/`joinQrDataUrl` (was lobby-only).
- Earlier tries (aspect-locked 16:9 stage, then object-fit-cover `GLASS` math) pinned the overlay to the baked TV and broke on every new image — dropped for the panel.
- No wire/protocol/core/engine changes. 144 server / 13 ui tests, tsc+oxlint, 5-ws build green. Live-verified portrait / 16:9 / wide.

### follow-ups (same branch)
- Attract screen finalised: `cover`-fill bg + mouse parallax + a self-contained CRT
  panel for the live bits (no measurement against the art → never breaks on an image
  swap). `fetch-local-sounds.mjs` also copies from `gabriel-source/sound-local/`.
- `tools/fetch-local-sounds.mjs` (Node, no deps) — owner convenience: scrapes the
  curated Myinstants pages for their real `/media/sounds/*.mp3`, downloads into the
  gitignored `host/public/sound-local/` and writes `manifest.json` (6 wired cues +
  15 unmapped extras). Run + verified: 21 clips, host serves `/sound-local/*`,
  `play({cue})` fetches the owner clip. Nothing downloaded is committed.

## 2026-09-09 — catalog + lobby screens over owner art (branch `feature/telas-com-arte`, off `develop`)

- Owner supplied two AI room renders + two target mockups. `gabriel-source/*` (gitignored)
  renamed to descriptive names (`bg-catalog-room.png`, `bg-lobby-lorota.png`, `mock-*`,
  `ref-whatsapp-*`); the two targets kept as `mock-catalog-target.png` /
  `mock-lobby-lorota-target.png`.
- `tools/build-screen-bg.py` (Pillow, dev-only) bakes `host/src/shell/catalog-bg.webp`
  (~280KB) + `host/src/games/lorota/lobby-bg.webp` (~215KB) + `*.CREDITS.md` from those
  sources. `build-attract-bg.py` left as-is for the attract backdrop.
- **Catalog** (`CatalogScreen.tsx`): the coverflow now sits over `catalog-bg.webp`
  (`cover` fit, vignette + accent wash — nothing measured against the art, like attract).
  `BrandMark` "Box Fiesta" + "Escolha um jogo" + acid subtitle on top. Cards gain a
  `vibe` tab, an optional torn sticky-note `badge`, a `tags` strip ("Menta · Cace a
  verdade") and a stats row (players · duration · chaos). Green brush `▶ Iniciar` pill,
  position dots + `n / total`, keyboard hint. `GamePersonality` gains `tags?`, `duration`,
  `chaos`, `badge?` — filled in all 7 `host/src/games/<id>/personality.ts`.
- **Lobby** (`LobbyScreen.tsx`): `HostGameEntry` gains optional `lobbyBg` (imported webp).
  When set → **art mode**: the image is letterboxed at 16:9 (`.lobby-stage`,
  `container-type: size`) and the live bits drop into fixed % slots tuned to the painted
  panel frames — QR + `Código da sala` + code + url (left panel), player tiles + empty
  "aguardando" slots (centre panel), and a real functional start button over the painted
  one. The "COMO JOGAR?" panel + stats strip + wordmark stay as painted art. Controls that
  don't fit (trocar de jogo, Rodadas, Conteúdo Leve/Pesado, online count) sit in a slim
  glass strip pinned to the bottom edge. `cq*` units scale every overlay with the stage.
  Only `lorota` ships a `lobbyBg`; the other 6 games keep the unchanged plain card lobby.
- **Mobile**: the "? Como jogar" button (already per-game) is now also shown on the
  `paused` screen of all 6 games that have a `HowToPlay` (coup/zap/lorota/sabetudo/fdp/
  evoce); UNO has none, unchanged.
- §52 held — no edits to `core/`, `ws-server.ts`, `shared/`, or either shell flow.
  144 server tests, tsc + oxlint clean, 5-workspace build green. Live-verified: catalog
  over the room art, Lorota lobby with 2 phones joined.

### follow-ups (same branch, after owner review)
- Owner: "reduce the green fog over the player info/photo" — `.lobby-slot-players li`
  background `rgba(10,20,18,.55)` → `rgba(6,9,12,.82)` (darker, neutral, more opaque so the
  painted teal panel shows through less), border accent 30% → 22%, `.lobby-slot` text
  `#eaf6f2` → `#eef2f6`, players `<h2>` gets a text-shadow.
- Owner: "once a game is chosen, let players read the instructions while waiting" —
  `mobile/src/games/registry.ts` adds `CONTROLLER_HOW_TO_PLAY` (id → the game's `HowToPlay`
  overlay `{ onClose }`; 6 games, UNO has none; the scoped CSS already ships with the
  statically-imported controller views). `App.tsx` passes it to `WaitingScreen` by
  `conn.selectedGameId`; `WaitingScreen` gains a "❓ Como jogar" button next to
  "✏️ Editar avatar" (`.waiting-actions` flex row) that opens the overlay.

## 2026-09-09 — Dilema nos Trilhos (game #8, branch `feature/dilema`, off `develop`, not merged)

- Trolley-problem debate game inspired by *Trial by Trolley* (clean-room; mechanic only,
  all PT-BR text original). §47 own name — `gameId: "dilema"`, `meta.name` "Dilema nos
  Trilhos", BrandMark "Dilema".
- Round (self-advancing, one server-ticked deadline): `assigning` (4s — Maquinista picked
  by join-order rotation; the rest re-split into left/right each round; one seed innocent
  per track) → `playing` (75s — 5-card hand, play freely: innocent→own track,
  guilty→enemy, modifier→stapled to a specific base card either side; "Pronto" to stop) →
  `verdict` (30s — Maquinista picks the track to run over; timeout = coin flip) →
  `roundResults` (8.5s).
- Scoreless: score = rounds your track was spared. `standings` carry `spared` +
  `roundDelta` so `RoundScoreboard` still works. `minPlayers 3`, `maxPlayers 10`, rounds
  3/5/7 (default 5), Leve/Pesado tiers.
- Files: `shared/src/models/dilema.ts` + `shared/src/games/dilema/events.ts` (+ 2 index
  lines); `server/src/games/dilema/{constants,cards,pairing,dilema-game,action-schema,
  plugin}.ts` + 1 line in `GAMES`; `host/src/games/dilema/{DilemaHostView,DilemaCover,
  describeEvent,sound-map,personality,dilema-host.css}` + registry entry;
  `mobile/src/games/dilema/{DilemaControllerView,HowToPlay,dilema-controller.css}` + 2
  registry entries; `dilema` added to `TIERED_GAMES` in `host/src/shell/LobbyScreen.tsx`
  + `mobile/src/App.tsx`.
- `dilema-game.test.ts` (19) + integration (1). Server tests 144 → 164. tsc + oxlint
  clean, 5-workspace build green. Live smoke (host + 3 phones): full round 1 with
  innocent/guilty/modifier plays, modifier target picker, pass, playing timeout →
  verdict → results (ATROPELADO/POUPADO stamps + scoreboard) → round 2 re-division +
  Maquinista rotation; 0 console errors.
- §52 held — no edits to `core/`, `ws-server.ts`, `shared/protocol`, or either shell flow.

## 2026-09-09 — attract screen = pure poster (branch `feature/dilema-melhorias`)
- Attract/start screen stripped to pure presentation: an owner poster (wordmark + tagline
  baked in) fills the viewport with `cover` + mouse parallax; only the yellow "toque para
  começar" sticker is live. Room code / QR / phone count removed from attract — lobby only.
- `tools/build-attract-bg.py` bakes two variants from `gabriel-source/mock-poster-{wide,
  portrait}.png` → `host/src/shell/attract-bg.webp` + `attract-bg-portrait.webp`; a
  `@media (orientation: portrait)` rule swaps posters.
- `AttractScreen` props → just `onStart`; `App.tsx` drops the join/room props + unused
  `onlineCount`. Removed `.attract-panel`/CRT-fx/`.attract-join*` CSS + `attract-flicker`.
- Shell-only (§52 untouched). 167 server tests, tsc + oxlint clean, 5-workspace build
  green; live-verified on the host in landscape + portrait, lobby still shows the QR + code.

## 2026-09-09 — lobby "art mode" for all 8 games (branch `feature/dilema-melhorias`)
- Every game gets `host/src/games/<id>/lobby-bg.webp` — one owner-generated painted room
  each (wordmark, "ENTRE PELO SEU CELULAR" panel + blank QR square, empty centre frame,
  "COMO JOGAR?" 3-step panel, painted "COMEÇAR X" pill, stats strip). All 8 from one
  prompt → pixel-identical panel geometry. Sources `gabriel-source/backgrounds/*.png`.
- `tools/build-screen-bg.py`: `lobby-lorota` key → `lobby-<id>` for all 8. New
  `tools/lobby-bg-prompts.md` (master prompt + per-game table + measured coords).
- `host/src/games/registry.ts`: `lobbyBg` on all 8 `HOST_GAMES` entries.
- `LobbyScreen` art-mode: QR slot split into `.lobby-slot-qr` (QR image) +
  `.lobby-slot-code` (code + url); avatars 40px. `shell.css` `.lobby-slot-*` retuned to
  the measured geometry, 5-col roster grid, pill start button, softer vignette.
- Shell + tooling only (§52 untouched). 167 server tests, tsc + oxlint, 5-ws build green.
  Live: the 4 live slots measured in the DOM land exactly on the painted panels; all 8
  `lobbyBg` imports resolve. Regen-only nits: dilema "TRIILHOS", fdp≈zap pink.
- Follow-ups in the same batch: the `.host-lobby::after` wash scoped to
  `:not(.lobby-art)` (it was fogging the painted room); **Esc in the lobby** →
  back to the catalog (mirrors `CatalogScreen`); `tools/cover-art-prompts.md` — the
  prompt + per-game table for regenerating the catalog coverflow thumbnails (not
  wired yet — waits on the renders).
