# Changelog

## 2026-09-12 — Fase 10 + the games 6–10 review merged into `develop`

Both had been stranded on unmerged branches since 2026-09-10. Owner asked to
realign branches and put Fase 10 back in the game list. Landed as 2 `--no-ff`
merges (`feature/fase10`, `feature/games-6-10-review`) — see their entries
below for what each carries. **10 games in the catalog now.** One integration
assertion the recovered `fix(ws)` cherry-pick's simpler base branch didn't
have (added to `multiplayer.integration.test.ts` after that branch diverged)
was still on the old `payload.message` regex — fixed by hand during the merge
to match the other 9. 221 server tests, tsc + oxlint + 5-workspace build green.

## 2026-09-10 — Fase 10, game #10 (branch `feature/fase10`)

A clean-room reimplementation of Mattel's *Phase 10* (contract rummy — 10 numbered
phases of sets, runs and one colour phase). The catalog's tenth game and the
closest in shape to UNO: turn-based, draw one / discard one, hand management, a
"Pula" (skip) card. §52 held — zero edits to `core/`, `ws-server.ts`, either shell
or `shared/protocol`; adding it was one plugin + `server/src/games/fase10/` + one
line in each of the 3 registries + host/controller views. **Server tests 193 → 220**
(26 unit + 1 integration). `tsc --noEmit` clean, host/mobile oxlint clean, 5-workspace
build green. Live-smoked: catalog + art-mode lobby with the "Fases para vencer"
5/7/10 picker, host + 2 phones, both players drew (pile + discard), laid phase 1
through the real UI (solver + wilds), hit a wild onto a laid set, discarded a Pula
targeting an opponent (→ skipped), pause/resume on both surfaces, 0 console errors.

**Decisions (owner, 2026-09-09):** name kept literal **"Fase 10"** (`gameId: 'fase10'`,
`BrandMark` "Fase 10" — same posture as "UNO"; trademark note in `plugin.ts`).
Not a text game → no Leve/Pesado. Lobby lever `meta.lengthOptions` = **"Fases para
vencer" [5, 7, 10], default 7** (read generically by `LobbyScreen`, no registry list).
Phone UX = **auto-validation**: tap the cards, the server fits them to your phase and
says yes/no. Full classic rules — lay the phase, hits, Pula, Curinga, penalty scoring.

- **Contract** (`shared/`, types-only): `models/fase10.ts` (`Fase10Card`, `Fase10GroupReq`,
  `Fase10LaidGroup`, `Fase10PublicState`, `Fase10PrivatePlayerState`, `FASE10_PHASES` —
  the 10 specs as functional data, our own labels) + `games/fase10/events.ts` +
  2 re-exports in `shared/src/index.ts`.
- **Engine** `server/src/games/fase10/`: `constants` · `cards` (108-card deck: 96
  numbers 1–12 ×2/colour, 8 wilds, 4 skips) · `phases` folded into the shared const ·
  `solver.ts` (pure — `solvePhase` backtracks a card multiset into a phase's groups
  with wilds filling gaps/ends and ≥1 natural per group; `hitInto` extends a laid
  set/run/colour) · `fase10-game.ts` (`implements PausableGame, RoundedGame,
  TurnTimedGame`; one 45 s turn deadline the server ticks; `dealHand` → `openTurn`
  consumes skips → draw/lay/hit/discard → `settleHand` scores hands & advances
  layers → `handOver` or `gameOver` when a finisher clears the target phase, ties
  break on fewest points) · `action-schema.ts` (zod: `draw`/`layPhase`/`hit`/`discard`)
  · `plugin.ts` + 1 line in `GAMES`. Test seam: `new Fase10Game(ctx, { deck })`.
- **Host** `host/src/games/fase10/`: `Fase10HostView` (piles + turn banner + laid
  groups per player + roster with a phase badge / "montou" / "pulado" tag + hand
  count + score + event feed + pause/end + sound toggle; `handOver` and `gameOver`
  overlays, `<VictorySplash>` on game over) · `Fase10Cover` (owner key art) ·
  `describeEvent` · `sound-map` (meme cues + CC0 fallbacks) · `personality`
  (accent `#a855f7`, vibe "ESCADA") · scoped `fase10-host.css` · +1 `HOST_GAMES` entry.
- **Mobile** `mobile/src/games/fase10/`: `Fase10ControllerView` (draw buttons →
  selectable hand → "Baixar fase (n/N)" / "Encaixar" mode → group targets / "Descartar"
  with a skip-target picker; scoreboard, reactions, `handOver`/`gameOver` summaries)
  · `HowToPlay` · scoped `fase10-controller.css` · +1 line in `CONTROLLER_GAMES`
  **and** `CONTROLLER_HOW_TO_PLAY`.
- **Art**: `tools/build-screen-bg.py` `GAMES` gained `fase10`; `cover.webp` (3:2) +
  `lobby-bg.webp` (1672×941) baked from `gabriel-source/{thumbs,backgrounds}/fase10.png`.

**Follow-up polish (owner asked, same batch):**
- **"As 10 fases" viewer** — a phone button (`.f10c-myphase`, "ver as 10 ›") and a
  host side-panel button ("📋 Fases") open an overlay listing all 10 phases, the
  viewer's current one highlighted ("você está aqui"); the host overlay also shows
  which players sit on each phase. Reads `pub.phaseSpecs`, no wire change.
- **Board redesign** (`Fase10HostView` + `fase10-host.css`) — the cramped pile row
  became a felt board: a 3-card stacked deck with a count badge, a large discard
  card (`f10-card-lg`, gradient faces + a "10" card-back emblem), the turn banner +
  current player's phase between them.
- **Card animations** — a fly-card layer: `card_drawn` flies a card-back deck→player
  row, `card_discarded` flies the card face row→discard, `phase_laid` glows the row;
  single-in-flight queue, `prefers-reduced-motion`-guarded.
- **Host UI-scale button** — a floating ⤢ control cycles 100 / 115 / 130 / 150 %
  via CSS `zoom` on the view root (persists in `localStorage`); at ≥130 % the body
  grid stacks the side panel below the board so nothing clips off-screen.

## 2026-09-10 — Spec revision pass (owner-approved, docs only)

The owner asked which `master-prompt.md` sections still push the project the wrong
way. Six got an inline **"Revisado pelo dono em 2026-09-10"** note (same mechanism
as the §47 retirement — original text kept, note added below it). No code changed.

- **§9 — player count.** "2–8" was the UNO MVP range; every game now declares its
  own `minPlayers`/`maxPlayers` (Coup and Dilema go to 10). 8 is not a platform cap.
- **§30 — turn timer.** No longer mandatory — it's a per-game choice. Dilema runs
  its pick steps and the verdict with no deadline on purpose (couch play). When a
  game has a timer the server stays its sole authority; a timerless game only has
  to never hard-block on someone who left.
- **§36 — animation ↔ state ordering.** The "host finishes the animation, *then*
  asks for the next state" handshake was never implemented and should not be — it
  couples the server tick loop to client animation state and breaks reconnect /
  multiple clients. Documented the real model: server pushes authoritative state
  on its own cadence, host animates non-blockingly over it. Only the last line of
  §36 ("animation never controls the logic") still holds.
- **§41 — no database.** Still no DB / Redis / SQLite / separate process — but a
  single-file JSON snapshot (rewritten per state transition, reloaded on boot) is
  explicitly allowed as cheap crash-recovery insurance. Today a mid-party server
  restart loses the match and every session.
- **§53 — MVP success criteria.** Marked delivered (all 19 items pass, Fases 1–12
  done, 9 games) so the "not in the MVP" lists (§1, §54) read as "current platform
  constraint", not "not yet".
- **§54 — do-not-do.** **Spectators / late-join** moved from "descoped" back to
  "open question" — with 9+ people in the room and games that eliminate early
  (Coup) or leave players out of a round, non-players have no screen at all.
  **Bots stay permanently descoped** (owner decision 2026-09-07).

Also reverted a stray one-line corruption in `CLAUDE.md` (a mangled §47 sentence:
"a lot if heavy deps", "can stay copying a commercial trademark/logo") back to the
committed text.

## 2026-09-10 — Playability review: games 6–10 (branch `feature/ticketabc-abc-map`, recovered onto `feature/games-6-10-review`)

A bug/UX sweep of FDP (#6), É Você! (#7), Dilema (#8), Sintonia (#9) and Fase 10
(#10) — engines, the Fase 10 solver, both surfaces. FDP / É Você! / Dilema came
up clean (Dilema's timerless pick/verdict phases can wait on an AFK player, but
that's the owner-approved design from the spec §30 revision, and every disconnect
path resolves). Two fixes landed:

- **`fix(ws)`** — the `GAME_ACTION` handler passed a thrown engine rejection
  (`CODE:friendly message`) to the phone verbatim, so a rejected move showed as
  `PHASE_INCOMPLETE:Essas cartas não fecham a fase` / `NOT_YOUR_TURN:…` with the
  code prefix. It now splits the code off like the avatar / content-tier /
  match-length handlers already do, so the mobile error line reads clean. 10
  integration assertions moved from a `payload.message` regex to `payload.code`
  (9 from the recovery cherry-pick + 1 more found on `develop` during the merge).
- **`fix(sintonia)`** — the mid-phase médium-disconnect handler already
  short-circuits a round, but a médium who was *already* offline when their round
  began still made the whole room sit through the ~45s cluing backstop.
  `beginRound` now skips straight to a short reveal in that case. +1 test.

Recovered by cherry-pick from the since-abandoned `feature/ticketabc-abc-map`
stack — these two fixes weren't about Ticket to ABC and don't deserve to be
stuck on a dead branch. Now merged into `develop` together with Fase 10 (see
the entry above).

## 2026-09-12 — Ticket to ABC abandoned; Phase 1.5 (`performanceMode` toggle, `<ContestantStrip>`, a Broadcast/strip fix) + a Coup regression test (branch `feature/host-stage-spike`)

Owner: abandon Ticket to ABC (game #11), refocus on polishing/fixing the 9
shipped games. The `feature/fase10`→…→`feature/ticketabc-abc-map` stack was
parked untouched at the time (Fase 10 has since been recovered and merged —
see the entry above).

- **Coup "assassin-challenge surrender" bug, investigated.** Owner reported: a
  challenge on an Assassin claim that fails (the actor genuinely holds it)
  seemed to let the original target's Contessa block get skipped. Wrote a
  regression test reproducing the exact scenario
  (`server/src/tests/coup-game.test.ts`) — it **passes**: `action-resolver.ts`
  correctly routes the challenger through `chooseInfluenceLoss` first, then
  opens `AwaitingBlock` for the original target. Root cause not confirmed;
  not a resolver bug on this evidence.
- **`performanceMode` is now a live, owner-controlled room setting** (Phase 1.5
  of the host-stage plan) instead of a host-local `localStorage` value nothing
  ever changed. New `shared/src/games/performance-mode.ts` (`@party/ui`
  `HostStage.tsx` re-exports it instead of declaring its own copy);
  `SET_PERFORMANCE_MODE` message + `Room.performanceMode` (settable any time,
  including mid-game — no `contentTier`-style lobby-only gate) +
  `ROOM_STATE.performanceMode`; host reads it live into
  `<PerformanceModeProvider>` (`App.tsx` simplified — one component, provider
  wraps the computed `content`); mobile `<HostControlsBar>` gained a
  "🖥️ TV: Alta/Padrão/Leve" toggle. Live-verified (host + 2 phones): the
  owner's phone toggle changes the TV's `<HostStage data-perf>` instantly, no
  reload, and the setting survives switching games (room-level, not
  per-game).
- **`<ContestantStrip>`** (`ui/src/components/ContestantStrip.tsx`) replaces
  Zap!'s inline `.zap-strip` — a game hands it `{id,name,avatar?,score?,tag?,
  highlighted?,dimmed?}[]`, ready for Phase 2 games. Score colour follows the
  theme's `accentSecondary` instead of a bespoke var, so Zap!'s gold came free.
- **Fixed a `<Broadcast>` lower-third overlapping the strip**, found live while
  verifying the above. Root cause: `<Broadcast>`/`<Moment>` were rendered as
  siblings of `<HostStage>` (outside `.ui-stage`), so their `position: fixed`
  offset had no idea a strip existed underneath. `HostStageProps` gained
  `moment`/`broadcast` (now rendered inside `.ui-stage`) plus a `data-has-strip`
  attribute so `.ui-bcast` only lifts clear when a strip is actually showing
  (Coup, which has none, is unaffected). `ZapHostView`/`CoupHostView` updated.
- 194 server tests (was 193), tsc + oxlint + 5-workspace build green.
  Live-verified host + 3 phones on Zap!.

## 2026-09-10 — Host-TV "show" layer, Phase 0 + 1 MVP (branch `feature/host-stage-spike`, off `develop`)

The host TV stops being a 70/30 dashboard and becomes a *stage* that interprets
`state + ordered events` into scenes, moments and broadcast graphics. Direction
validated with GPT + Copilot; full plan + prompt in
`~/.claude/plans/host-ui-evolution.md`. §52 held — the "show" is opt-in per game
and adding a game still gets it for free with defaults.

- **Spike (`d204f6f`)** — `<HostStage>` + `<Moment reveal/callout>` +
  `useMomentQueue` + the Anton display face (OFL, ~19 KB latin woff2) + a TV type
  scale (`--tv-body`…`--tv-climax`), wired into Zap!'s answering/voting/results.
  Live-smoked → go.
- **Framework (`3813fe3`)** — `@party/ui`:
  - `<HostStage theme scene intensity>` — full-bleed themed container, a HUD that
    recedes at `high` / hides at `climax`, scene cross-fade. `HostTheme` =
    accent + secondary, display font, background (midnight/ember/noir/table),
    texture, `MotionStyle` (punchy/tense/playful/tactile/ceremonial → `MOTION`
    easings).
  - `PerformanceModeProvider` / `usePerformanceMode` (`high|balanced|safe`) — the
    ambient drift, backdrop blur and every `<Moment>` choreography have a `safe`
    tier; `prefers-reduced-motion` collapses to fade + hold.
  - `<Moment>` gains `victory` (wraps `VictorySplash`) beside `reveal` / `callout`.
  - `<Broadcast>` + `useStageDirector` — one hook owns the moment queue AND the
    lower-third stream, with the interruption table: `ambient` dropped while a
    moment is up or in a dramatic scene, `critical` replaces, `important` queues.
    Per game, `describeEvent` → `broadcastFor(event) → { tier, graphic, eyebrow,
    title, playerId }`.
  - host `App` wraps everything in `<PerformanceModeProvider>` (persisted
    `party:perfmode`, default balanced).
- **Zap! migrated (`3813fe3`)** — `theme.ts` (pink / punchy), scenes
  `thinking → reaction → reveal → victory`, the 30% sidebar + text feed gone
  (bottom contestant strip instead), gameover is a full-bleed victory scene.
  Live-smoked on the TV: the reveal moment (headline wipe + accent rule), the
  "ZAP!" callout, the "PLACAR" broadcast lower-third and the victory scene.
- **Coup migrated (`0c14994`)** — `theme.ts` (noir / tense), the poker table as a
  custom `table` scene, moments on `challenge_made` ("DESAFIO!"),
  `challenge_resolved` ("A carta era…"), `player_eliminated`; `game_over` → a
  victory scene.
- **Owner controls → the owner's phone (`360a802`)** — mobile `useRoomConnection`
  tracks `ownerPlayerId` (`ROOM_JOINED` / `ROOM_STATE` / `OWNER_CHANGED` — the
  host-lease + auto-transfer already existed server-side). `<HostControlsBar>` —
  a sticky strip shown only to the owner mid-game: Pausar / Retomar (paused read
  generically from `publicState.phase === 'paused'`) + Encerrar (confirm step).
  Zap! + Coup drop their mid-game TV buttons; the corner cluster keeps only the
  end-of-game "Nova partida" / "Encerrar" + the sound toggle.
- Build + tsc + oxlint green; **193 server tests** (host-only work). Next:
  Phase 1.5 (`<ContestantStrip>`, Spotlight/Countdown moments, perf toggle UI),
  then the Texto/Festa + Blefe archetypes, then the board games.

## 2026-09-10 — Sintonia UX + Dilema trolley crash (branch `feature/sintonia-gauge-and-trolley`, off `a626757`)

Follow-ups the owner asked for after seeing the Sintonia gameover screens.
193 server tests, `tsc --noEmit` clean, host/mobile oxlint clean, 5-workspace
build green. Live-smoked on a real phone tab. §52 held.

- **Phone "termômetro"** — `mobile/src/games/sintonia/SintoniaGauge.tsx`: a
  touch-draggable pure-SVG semicircular gauge that mirrors the host TV dial. It
  replaces the plain range slider for the guesser; it also renders read-only for
  the médium (needle sits on the target) and at reveal (your locked needle + a
  dashed target marker). `role="slider"` + arrow-key support, − / + nudge
  buttons for precision, `touch-action: none` so a drag never scrolls. The old
  `.sint-target-bar` and `.sint-slider` are removed.
- **Mobile gameover** now shows `<VictorySplash>` (the winner's face, accent
  glow, CSS confetti) instead of a one-liner — in Sintonia and Dilema. A tie
  still shows "🤝 Empate!". No component change; `VictorySplash`'s CSS was
  already responsive (`width: min(46vw, 240px)`).
- **spectrums.ts** grew 66 → **125 pairs** (+18 LEVE, +34 PESADO). +18 framing
  stays inside the documented guardrails (no protected group, no real private
  person, no minors, no real atrocity). LEVE remains a strict prefix of the full
  list (the content-tier test relies on that).
- **`meme.crash`** local-sound cue — Dilema's `verdict_cast` (the trolley
  squashing a track) fires `{ cue: 'meme.crash', fallback: { sample: 'chip-clash' } }`.
  Wired into `tools/fetch-local-sounds.mjs` (`pum-impacto` page),
  `manifest.example.json` and the drop-folder README; the owner's local `.mp3`
  and `manifest.json` stay gitignored (already in place on this machine, verified
  fetched + played on the verdict).
- **Dilema trolley crash animation** — `roundResults` plays a ~1.45s CSS-only
  sequence: the trolley winds up, accelerates into the killed track column,
  recoils on impact (radial flash + a 💥 burst positioned at the impact point),
  the whole tracks grid jolts, and the ATROPELADO / POUPADO stamps pop in
  (scale 2.4→1) after it lands. `prefers-reduced-motion` parks the trolley on the
  doomed side with no motion. Closes one of the parked Dilema follow-up ideas.

## 2026-09-09 — Dilema + Sintonia reworked to the owner's spec (branch `feature/dilema-sintonia-rework`, merged → `a626757`)

Owner brief (given mid-session, left before it landed): make Dilema faithful to
*Trial by Trolley*'s card flow with **team consensus** and **no debate timers**,
and turn Sintonia into an **individual proximity** game where **everyone guesses
their own dial**. Researched the official Trial by Trolley rules first.

### Dilema nos Trilhos
- **Card flow** — `playing` (play cards freely) replaced by three ordered
  consensus steps: `pickInnocent` → `pickGuilty` → `pickModifier`. Each team is
  dealt 3 candidates per type and agrees on ONE: a member `propose`s, every
  connected team member `confirm`s (a new proposal clears confirmations), the step
  locks; both teams locked → next step. Faithful to the tabletop order (innocents,
  then guilty, then modifiers). Modifiers still staple onto any base card on
  either track (cross-track allowed).
- **No timers on decisions** — the three pick steps and the `verdict` carry no
  server deadline (`getTimer()` returns `null`). Couch play: the table argues out
  loud and locks / pulls the lever when ready. Only `assigning` (4s) and
  `roundResults` (8.5s) still auto-advance. The verdict no longer coin-flips on a
  timer — the Maquinista must choose; the only safety is a disconnected Maquinista
  (auto coin-flip, `verdictWasAuto`).
- Wire: `DilemaPhase` swaps `playing` → `pickInnocent`/`pickGuilty`/`pickModifier`;
  `DilemaAction` swaps `playCard`/`pass` → `propose`/`confirm`/`unconfirm`;
  public `tracks[side].pick` (`DilemaPickState`) + `step`; private `candidates` /
  `modifierTargets` / `teamProposalCardId` / `iConfirmed` / `team*Count`;
  `DilemaTrackCard.authorId/authorName` → `authorTrack`. Events: `playing_started`
  /`card_played`/`player_passed`/`all_cards_in` → `pick_step_started`/
  `team_proposed`/`team_locked`/`both_locked`.
- `dilema-game.test.ts` rewritten (20). `cards.ts`, `pairing.ts`, `plugin.ts`
  untouched. Dilema integration test untouched (still asserts `assigning`).

### Sintonia
- **No teams, no side-bets.** A rotating **médium** gives the clue; **every other
  player** drags **their own** 0–100 dial (hidden from other phones) and locks it.
  All locked (or the 45s backstop) → reveal.
- **Proximity scoring** — `|guess − target|` on a banded curve (`≤2→10, ≤6→7,
  ≤12→5, ≤20→3, ≤30→2, ≤42→1, else 0`). The médium scores the **rounded-down
  average** of the guessers' points (rewards a good clue; fixes the "médium sat
  out" unfairness when rounds < players). Score is **individual + cumulative**;
  highest total wins, exact tie → no winner.
- Wire: `SintoniaPublicState` loses `teams`/`activeTeamId`/`sideBet`/`winnerTeamId`,
  gains `players` / `guesses` / `results` / `guessers*Count` / `mediumPoints` /
  `winnerId`. `SintoniaRole` → `medium`/`guesser`/`idle`. `SintoniaAction`:
  `moveDial`/`betSide` → `setGuess`/`lockGuess`/`unlockGuess`. `SintoniaDial` now
  renders every guesser's needle + a 6-tier proximity band. `pairing.ts` reduced
  to médium rotation.
- `sintonia-game.test.ts` rewritten (20). `multiplayer.integration.test.ts`
  Sintonia block updated (no more `teams`). `spectrums.ts` untouched.

### Validation
Server 193 tests green, `tsc --noEmit` clean, host/mobile oxlint clean, 5-workspace
build green. Live smoke (host + 3 phones): Dilema full round — 3 consensus steps
(incl. a cross-track modifier), Maquinista verdict with no clock, scoring, round 2
with re-split + rotation. Sintonia round — médium clue (target 93), two guessers
lock 84/96 → +5/+7, médium +6, multi-needle reveal, cumulative scoreboard, round 2
médium rotation. Scripted wire smoke ran **both games to gameover** (Dilema ×5
rounds, Sintonia ×6 rounds — proximity bands, floor-average médium points, médium
rotation 4/4, monotonic standings, no timer at gameover). 0 console errors.
§52 held — no edits to `core/`, `ws-server.ts`, `shared/protocol`, or either shell
flow.

### Review-pass fixes (commits `1ace939`..`cee8122`)
- **Bug — Dilema round could hang.** If a team's *last* connected member
  disconnected mid pick-step, `maybeLockTeam` bailed on the null proposal before
  the empty-team check, so the step never locked. Now an emptied team auto-locks
  (standing proposal or a random candidate). Regression test added.
- Sintonia: `setGuess` after a lock / after the phase flips is a silent no-op
  (the slider drips ~8×/s and races); reveal no longer scores a guesser who left
  without ever locking (no phantom 50 in the médium's average); the guesser's
  dial snaps back to centre on a new round; `guessers*Count` counts connected
  guessers.
- Dilema: a locked team no longer shows a dead "reabrir" button; the modifier's
  target shows in the team proposal; picking non-Maquinistas now see the board;
  clearer pick-phase banners; the Maquinista reports `pendingDecision: 'wait'`
  during picks.
- Sintonia dial: taller viewBox so initials / "alvo N" never clip; per-needle
  "+N" dropped (points are in the scoreboard below).
- Integration tests now drive `propose` (Dilema) and `setGuess`/`lockGuess`
  (Sintonia) over the wire.

## 2026-09-04
### Added
- Creation of repo-level Copilot guidance at `.github/copilot-instructions.md`.
- Creation of the `spec-kit` folder with:
  - `.copilot/spec-kit/master-prompt.md`
  - `.copilot/spec-kit/copilot-operating-standards.md`
  - `.copilot/spec-kit/README.md`
- Creation of `docs/repository-gap-review.md` to record project gaps versus the master prompt.
- Creation of this changelog with reasons for each addition.

### Fixed
- Backend CORS issue for local host origin.
- Host authorization flow for `START_GAME` when the host acts as room owner.

### Why
- The project requires a strong architecture guide and phase-gated execution to avoid drifting away from the intended local multiplayer party-game platform.
- The host permission bug was preventing the room owner from starting the match even though the owner role exists.
- The host UI still does not render the game board, so a dedicated gap review was needed to document the missing phase and guide the next implementation step.

## 2026-09-05 — Fases 5–10 + hardening (branch `feature/testa-claudin`, PR #2)
### Added
- Host game board: real table (draw/discard piles with card art, active colour, direction, pending +N, current-turn highlight, per-player hand counts, timer) — Fase 5.
- Multi-round scoring: cumulative scores across rounds, end-of-game at `targetScore` (default 500), `NEXT_ROUND` owner/host message, round/game result overlay with scoreboard.
- UNO challenge (denúncia) in the UI: `unoChallengeable` in public state, "Denunciar <name>" buttons on mobile, "🔥 em UNO" / "⚠️ esqueceu o UNO" banners on host.
- Owner pause / resume: engine freezes the turn timer and restores remaining time; `PAUSE_GAME`/`RESUME_GAME` wired through `Room` and ws-server.
- Post-play colour picker (§25/26): wild is played first, server enters `awaiting_color_choice`, mobile opens a confirm-to-pick modal; timeout auto-picks the most common colour.
- Live event feed on the host from the `GAME_EVENT` stream.
- Fase 10 — event-driven table animations on the host: serial queue drives fly-cards (played→discard, drawn from monte), colour flash, sentido spin, skip flash, "UNO!" burst, "+N" penalty rise, victory burst; result overlay held ~900ms so the winning play lands first. Respects `prefers-reduced-motion`.
- Mobile player screen party visual overhaul: gradient wordmark join screen with labelled fields + avatar grid + live preview; waiting/paused screens with roster; in-game "SUA VEZ" banner + table strip (discard card + colour + pending + sentido); playable cards ringed / non-playable dimmed / selected lifts; "Jogar" shows a mini of the selected card.
- 30s disconnect grace window before owner transfer (identity + hand kept; ownership only moves if the player doesn't reconnect in time).
- Integration tests: 8-player lobby, sustained-play (no errors/desync/deck loss), duplicate-`messageId` idempotency. Server suite now 25 green.
- WebSocket auto-reconnect + exponential backoff on both clients; mobile resumes its session on reload.
- `.claude/launch.json` for local dev servers.

### Changed
- Host and mobile dev ports split (5173 / 5174); QR join URL points to the mobile app.
- `Room.disconnectPlayer` split into `markDisconnected()` + `finalizeDisconnect()`.
- `--passWithNoTests` on shared/host/mobile so root `npm test` is green.
- Replaced the leftover Vite-template `mobile/src/index.css` with a mobile-first themed base.

### Fixed
- Flaky +4/+2 stacking engine tests made deterministic.
- Transient WebSocket error banner that stayed stuck even while the game ran fine.

### Why
- The MVP success criteria (§53) require a full observable match on the host, multi-round scoring, UNO denúncia and reconnection — all delivered here.
- Phones drop Wi-Fi; auto-reconnect + a disconnect grace window keep games stable through blips.

## 2026-09-06 — Multi-game platform plan (no code yet)
### Added
- `C:\Users\gabri\.claude\plans\antes-dos-proximos-passos-elegant-clover.md` — phased plan (Fase A→D) to make the core game-agnostic so a second game plugs in without touching `core/`, `ws-server` or the frontend shell (master prompt §52).
- Comparative analysis of 5 reference repos (rodwilco/rumpus, AndriGitDev/bodbjanar, christabella/freewee, inosaint/amoebas, 8tp/Coup).

### Decisions
- Do **Fase A (game-agnostic core) before finishing Fase 11** — deliberate deviation from the master prompt's linear phase order, because a second complete game is ready and blocked on the abstraction. Polishing UNO visuals now would be reworked once the multi-game shell exists.
- One React shell per role + games as in-bundle modules in a static registry (not per-game apps).
- Keep the "UNO" name for now; §47 own-identity is deferred to Fase C.
- `handleAction(playerId, action)`; server keeps orchestrating state push (optional `tick(now)` capability); core reads a `getStatus()` projection and never parses game events; `GameContext.random` fixes the non-deterministic shuffle.

### Why
- The reference repos confirm our infra already exceeds theirs; the only borrowed idea is rumpus's plugin registry. 8tp/Coup is a rules reference only (its runtime has no TV screen and uses an incompatible stack). Extracting the abstraction first, proven with the existing UNO game, avoids refactoring twice.

## 2026-09-06 — Fase A, PR A1: generic game contract in `shared/` (non-breaking)
### Added
- `shared/src/games/{meta,status,lifecycle}.ts` + `index.ts` barrel, re-exported from `shared/src/index.ts`:
  - `GameMeta` — static per-plugin description (id, name, tagline, min/max players, `capabilities: { rounds, turnTimer, pause }`).
  - `GameStatus` — `'setup' | 'active' | 'intermission' | 'complete'`; the room-facing projection that will replace UNO's `Phase` at the core boundary.
  - `LifecycleEvent` — shell-level events the server emits (`game_selected`, `game_started`, `round_advanced`, `game_completed`, `returned_to_lobby`).
- Wire protocol (`shared/src/protocol/messages.ts`), additive only:
  - `ClientMessage`: `SELECT_GAME { gameId }`, `GAME_ACTION { action: unknown }`; `START_GAME` payload `{}` → `{ gameId?: string }`.
  - `ServerMessage`: `GAME_CATALOG { games: GameMeta[]; selectedGameId }`, `LIFECYCLE_EVENT { event: LifecycleEvent; stateVersion }`.

### Why
- First step of making the core game-agnostic (§52). Pure type additions — no server/host/mobile logic touched, no runtime in `shared/`. All 25 server tests, all 4 builds and both lints stay green. `protocolVersion` stays `1`; nothing emits the new messages yet.

## 2026-09-06 — Fase A, PR A2: server registry + opaque `GameInstance` + game-agnostic `Room`
### Added
- `server/src/core/game-plugin.ts` — `GameContext` (injected `now` + `random`), `GameInstance` (opaque state/events, `getStatus()`), capability interfaces `TurnTimedGame` / `RoundedGame` / `PausableGame` / `TickingGame` + `isX()` guards, `GamePlugin`.
- `server/src/games/registry.ts` — `GAMES` map (rumpus pattern), `DEFAULT_GAME_ID`, `gameCatalog()`. Adding a game = one import + one entry.
- `server/src/games/uno/plugin.ts` (`unoPlugin`) + `server/src/games/uno/action-schema.ts` (`parseUnoAction`, small zod).

### Changed
- `Room` — no UNO imports; `game: GameInstance | null`, `selectedGameId`. `selectGame(gameId)`; `startGame(requestedBy, gameId?)` looks up the plugin and validates against `meta.min/maxPlayers`; `applyGameAction(playerId, action)`; `startNextRound` / `pause` / `resume` / `applyTimeout` capability-guarded. Removed the dead `startTurnTimer()`.
- `UnoGame` — constructor takes `GameContext`; `nowProvider = ctx.now`, shuffle now uses injected `ctx.random` (fixes the determinism gap). Public `handleAction(playerId, action: unknown)` (validates + injects playerId); the switch is now `private dispatch()`. Added `getStatus()` and `getTimer()`. `onTurnTimeout()` returns void. Implements `PausableGame`/`RoundedGame`/`TurnTimedGame`; the old `Game<>` interface (`server/src/core/game.ts`) is deleted (unused).
- `ws-server` — new `SELECT_GAME` and generic `GAME_ACTION` handlers; the 5 UNO verbs kept (rewritten to `room.applyGameAction(playerId, action)`) for a dual protocol during the frontend migration. `GAME_CATALOG` sent on every join. `tickTimers` is capability-gated. `ROOM_STATE.players[].handCount` sent as `0` (redundant; removed in A5). `GAME_STATE_PUBLIC` / `PLAYER_STATE_PRIVATE` / `GAME_EVENT` payload shapes unchanged (server casts `unknown` → UNO types at the boundary — `TODO(A5)`).
- `protocol.ts` — zod for `SELECT_GAME`, `GAME_ACTION`, `START_GAME { gameId? }`.

### Tests
- `uno-game.test.ts` migrated (`mkGame()` helper, `handleAction(playerId, action)`, `getStatus()` assertions, +1 malformed-action test).
- `multiplayer.integration.test.ts` +1 test: catalog on join, `SELECT_GAME` accept/reject, generic `GAME_ACTION` drive, malformed action rejected. **27 server tests green** (stable ×4).

### Why
- The core no longer references any specific game (§52). The old wire is fully backward-compatible for current clients (only `ROOM_STATE.handCount` semantics change, and it has no consumer). Nothing in the frontend changed yet.

## 2026-09-06 — Fase A, PR A3: host split into game-agnostic shell + `games/uno/` module (no wire change)
### Added
- `host/src/shell/` — the game-agnostic host:
  - `messages.ts` — `serverOrigin` / `wsOrigin` / `SAFE_QR_PREFIX`, `makeMessage`, `createMessageId`, `Send` type.
  - `useRoomConnection.ts` — owns the `/room` fetch (with retry), the WebSocket (auto-reconnect + exponential backoff), and message handling. Exposes `{ roomCode, players, joinUrl, joinQrDataUrl, connected, lastError, catalog, selectedGameId, activeGameId, publicState (opaque), events (ordered, capped 24), send }`. `publicState` / `events` are `unknown` here — the game view casts them.
  - `LobbyScreen.tsx` — QR / code / player list / start button; renders the `GAME_CATALOG` grid only when more than one game is registered; `brandName` is a prop (default `"UNO"`, §47).
  - `shell.css` — shell container + lobby styles (was the shell half of `App.css`).
- `host/src/games/{types,registry}.ts` — `HostGameViewProps` (`{ publicState, events, players, connected, send }`), `HOST_GAMES = { uno: UnoHostView }`. Adding a game = one import + one entry.
- `host/src/games/uno/` — the UNO host module:
  - `UnoHostView.tsx` — the whole board render + UNO-derived values + the animation queue (re-driven from the `events` prop) + `renderAnim()` + result/paused overlays. Owner commands go through `props.send(...)`.
  - `describeEvent.ts`, `animations.ts` (`ANIMATION_MS`, `flyStyle`, `isAnimated`, `centre`, `REDUCED_MOTION`), `cardArt.ts` (moved from `host/src/cardArt.ts`), `uno-host.css` (board + Fase 10 animations).

### Changed
- `host/src/App.tsx` → ~55 lines: `useRoomConnection()`, `<LobbyScreen>` until `activeGameId && publicState`, then `HOST_GAMES[activeGameId]`. Knows nothing about UNO.
- `host/src/index.css` — replaced the dead Vite-template block (`--accent:#aa3bff`, `#social`, `h1{56px}`, `body{overflow:hidden}` that fought `App.css`) with a minimal reset + the design tokens (`--bg`/`--panel`/`--line`/`--text`/`--muted`/`--accent`).
- Removed `host/src/App.css` and the leftover template `host/src/assets/` (`hero.png`, `react.svg`, `vite.svg`).

### Tests
- `host` has no unit tests; `tsc -b && vite build`, root `npm run build`, `npm run -w host lint` (oxlint) and the 27 server tests all green. No wire change — the server and mobile are untouched.

### Why
- Proves the host shell carries zero game knowledge: a second game is one `HOST_GAMES` entry + one view module. The connection/lobby/reconnect chrome is now reusable as-is.

## 2026-09-06 — Claude Code config for efficiency + token reduction (branch `feature/claude-config`)
### Added
- `.claude/settings.json` — `permissions.deny` on Read of `package-lock.json`, the card `*.png` files and `*.min.*` (stops token-heavy reads); `permissions.allow` for safe read-only Bash (`npm test`/`build`/`lint`, `npx tsc`/`vitest`/`tsx`, read-only `git`, read-only `gh pr/run/issue`) so those stop prompting.
- `.claude/hooks/typecheck-on-stop.mjs` + a `Stop` hook — if `server/`/`shared/` have uncommitted changes, runs `tsc --noEmit` when Claude finishes; silent on success, surfaces type errors (exit 2) so they're fixed in the same turn.
- `.claude/commands/{validate,run,checkpoint,phase}.md` — slash commands for the repeated rituals.
- `.claude/launch.json` — committed (was gitignored) so `/run` works in every worktree; ports are fixed so it's not worktree-specific.

### Changed
- `CLAUDE.md` — added a "Working efficiently" section (terse-by-default, `Explore`-subagent-first, deny list, commands); validation block references `/validate` and no longer hardcodes a test count.
- `.gitignore` — un-ignore `.claude/launch.json`; ignore `.claude/settings.local.json` (personal grants).

### Why
- Every permission prompt is a round-trip and every accidental read of `package-lock.json` (~25k tokens) or a card PNG is wasted context. The deny/allow lists and the terse/subagent defaults cut token use per session; the `Stop` typecheck catches errors in one turn instead of a fix-up pass; the commands collapse multi-turn rituals into one.

## 2026-09-06 — Fase A, PR A4: mobile split into shell (+ session subsystem) + `games/uno/` (no wire change)
### Added
- `mobile/src/shell/` — the game-agnostic phone controller:
  - `session.ts` — the reconnect subsystem, extracted verbatim: `activeSessionStorageKey` / `sessionKeyFor` / `readStoredSessionKey` / `readToken` / `writeToken` / `rememberActiveSession` / `clearStoredSession`. Same two localStorage entries per room (`activeSession:<ROOM>` → key, `session:<ROOM>:<name>` → signed token), same key formats.
  - `useRoomConnection.ts` — owns the WebSocket (auto-reconnect + backoff), `RECONNECT_SESSION` on open when a token is held, token persistence on `ROOM_JOINED`, `INVALID_SESSION`/`PLAYER_NOT_FOUND` recovery, and `joinOrReconnect({ playerName, avatar })`. Exposes `{ roomCode, setRoomCode, playerId, connected, error, roomPlayers, catalog, selectedGameId, activeGameId, publicState, privateState, send, joinOrReconnect }`. `publicState`/`privateState` opaque.
  - `messages.ts` (`makeMessage`, `getRoomCodeFromPath`, `Send`), `MobileHeader.tsx` (room + reconnecting pill, `children` slot for the game's timer), `JoinScreen.tsx`, `WaitingScreen.tsx` (shows the selected game's name from the catalog), `shell.css`.
- `mobile/src/games/{types,registry}.ts` — `ControllerGameViewProps` (`{ publicState, privateState, playerId, connected, roomCode, send }`), `CONTROLLER_GAMES = { uno: UnoControllerView }`.
- `mobile/src/games/uno/` — `UnoControllerView.tsx` (table strip + hand + actions + UNO/challenge + result + colour modal + paused; still emits the legacy verbs `PLAY_CARD`/`DRAW_CARD`/`CHOOSE_COLOR`/`UNO_CALL`/`UNO_CHALLENGE`), `cardArt.ts` (moved), `uno-controller.css`.

### Changed
- `mobile/src/App.tsx` → ~70-line dispatcher: `JoinScreen` until `playerId`, `WaitingScreen` until `privateState && publicState && a registered game`, else the game's controller view. Renders the shared error toast. No UNO knowledge.
- Removed the leftover template `mobile/src/assets/`. `mobile/src/index.css` (already a proper mobile-first base since 2026-09-05) unchanged.
- New (existing server messages the flat app ignored): the shell handles `GAME_CATALOG` (catalog + selected game) and `GAME_STARTED` (sets the active game); on a mid-game reconnect it infers the active game from the selection when the first state arrives.

### Tests
- `mobile` has no unit tests. Builds (mobile, root), oxlint (host + mobile), server `tsc --noEmit`, and the 27 server tests all green. Browser smoke: join → waiting (with game name) → host starts → controller board → play a card (state propagates to both phones + host) → reload a phone mid-game (session resumes, board restored) → reload while waiting (silently resumes as the same player). No wire change.

### Why
- The phone controller's connection + session/reconnect chrome is now a reusable shell; a second game is one `CONTROLLER_GAMES` entry + one view module. The reconnect subsystem — the client's most delicate part — was moved without changing any key format, message, or recovery path.

## 2026-09-06 — Fase A, PR A5: protocol cleanup — generic wire, no UNO in the core (BREAKING wire)
### Changed — `shared`
- `ClientMessage`: removed `PLAY_CARD` / `DRAW_CARD` / `CHOOSE_COLOR` / `UNO_CALL` / `UNO_CHALLENGE`. `GAME_ACTION { action: unknown }` is the only per-game verb.
- `ServerMessage`: `GAME_STARTED` → `{ gameId }`; `GAME_STATE_PUBLIC` / `PLAYER_STATE_PRIVATE` → `{ gameId; state: unknown; stateVersion }`; `GAME_EVENT` → `{ gameId; event: unknown; stateVersion }`; `ROOM_STATE.players[]` dropped `handCount` (no consumer — live counts come from the game's public state).
- `shared/src/events/game-events.ts` **deleted** → `shared/src/games/uno/events.ts` as `UnoGameEvent`. The 4 dead variants (`player_joined`, `player_reconnected`, `player_disconnected`, `owner_changed` — the server sends those as their own envelopes) removed.
- `Direction` and `Phase` moved out of `models/common.ts` (now generics-only: `PlayerId`/`RoomId`/`SessionId`/`TurnTimer`) into `models/uno.ts` as `Direction` + `UnoPhase` (`ready | round_active | awaiting_color_choice | round_finished | game_finished`). `UnoPublicState.phase` is `UnoPhase | 'paused'` (Room projector overlay); `UnoFullState.phase` is `UnoPhase`.

### Changed — `server`
- `ws-server`: the 5 legacy UNO verb handlers deleted (only `GAME_ACTION` routes to `room.applyGameAction`). The 3 broadcasts (`GAME_STATE_PUBLIC` / `PLAYER_STATE_PRIVATE` / `GAME_EVENT`) and `GAME_STARTED` now carry `gameId: room.selectedGameId`; no more `as UnoPublicState` casts. `ROOM_STATE` no longer sends `handCount`.
- `protocol.ts`: the 5 UNO zod schemas and the now-unused `color` enum removed.
- `uno-game.ts` + the UNO plugin: `GameEvent` → `UnoGameEvent`.

### Changed — `host` / `mobile`
- Both `useRoomConnection` hooks resolve `activeGameId` straight from `message.payload.gameId` (`GAME_STARTED`, and `GAME_STATE_PUBLIC`/`PLAYER_STATE_PRIVATE` on a mid-game reconnect); the `selectedGameIdRef` inference is gone.
- Host UNO module: `GameEvent` → `UnoGameEvent`.
- `mobile/src/games/uno/UnoControllerView.tsx`: the 5 action senders now emit `send('GAME_ACTION', { action: { type: 'play_card' | 'draw_card' | 'choose_color' | 'uno_call' | 'uno_challenge', … } })`.

### Tests
- `multiplayer.integration.test.ts`: added a `gameAction()` helper + `pubState()`/`privState()` casts (payloads are `unknown` now); bot rewritten to `GAME_ACTION`; asserts `GAME_STARTED`/`GAME_STATE_PUBLIC` payload `gameId === 'uno'`. `uno-game.test.ts` / `room.test.ts` unchanged. **27 server tests green.**
- Builds (4 workspaces), oxlint (host + mobile), server `tsc --noEmit` green. Browser smoke: start → `GAME_STARTED {gameId}` → controller board → play a card via `GAME_ACTION` (propagates to both phones + host feed) → mid-game reload (board restored from `payload.gameId`, no crash).

### Compat
- **Breaking:** `GAME_ACTION` replaces 5 verbs; 3 state/event payloads gain `gameId` and become `unknown`; `GAME_STARTED` gains `gameId`; `ROOM_STATE` loses `handCount`. Unchanged: `JOIN_ROOM`, `RECONNECT_SESSION`, `PING`, `KICK_PLAYER`, `PAUSE`/`RESUME`, `END_GAME`, `NEXT_ROUND`, `SELECT_GAME`, the envelope shape, `protocolVersion: 1` (no third-party clients), the whole session/reconnect subsystem.

## 2026-09-06 — Fase B design elaborated with the user (no code yet)
### Decisions
- **The TV (host) is the control point for game selection.** The host screen renders and navigates the catalog and picks the game; the phones never show a catalog. `assertOwner` already lets `role === 'host'` through, so no server auth change is needed.
- **Host gets a 3-screen pre-match flow:** `attract` (platform wordmark "Box Fiesta" + room code + connected count) → `catalog` (game grid from `GAME_CATALOG`, cover art from the host game module, keyboard + click/touch nav) → `lobby` (large QR + code + player list + "Iniciar {game}"). The catalog grid moves out of `LobbyScreen` (today it is embedded there).
- **Post-match returns to the `lobby` of the same game** — "Jogar de novo" re-sends `START_GAME`, "Trocar de jogo" goes back to `catalog`. It does not return to attract.
- **No new wire messages.** "Back to lobby" reuses `END_GAME`; "play again" reuses `START_GAME`. `SELECT_GAME` / `GAME_CATALOG` / `LIFECYCLE_EVENT` already exist (A1).
- MVP host input: click/touch + keyboard (arrows + Enter, covers a smart-TV D-pad). Gamepad/remote mapping is out of scope.

### Planned changes (Fase B, after A5)
- **server:** `Room.endGame()` will set `state = 'accepting_players'` and keep `selectedGameId` (today it sets `'ended'`, which blocks `selectGame`); `ws-server` re-broadcasts `GAME_CATALOG` after `END_GAME`.
- **host:** new `shell/AttractScreen.tsx`, `shell/CatalogScreen.tsx`, a `phase` state machine (`attract | catalog | lobby | in-game`); `LobbyScreen` loses the catalog grid; `HOST_GAMES[id]` gains `cover`.
- **mobile:** `WaitingScreen` shows the selected game's name/tagline; `GAME_ENDED` / `returned_to_lobby` returns to waiting with the session kept.

### Open points
- QR on the attract/catalog screens (proposal: code always visible, big QR only on the lobby); attract auto-advance after idle vs manual only; a UNO cover image is needed for the catalog card.

### Why
- The master-prompt platform vision (§52) needs a game picker, not a single fused lobby. Recorded now so Fase B (after A5) starts from a settled flow instead of re-deciding it. Full detail: `C:\Users\gabri\.claude\plans\antes-dos-proximos-passos-elegant-clover.md` (FASE B).

## 2026-09-06 — Fase B: 3-screen host flow (attract → catalog → lobby) + return-to-lobby
### Added — `host`
- `shell/AttractScreen.tsx` — the platform screen: "Box Fiesta" wordmark, room code, connected-phone count. Advances **manually only** (any key / click / tap) — no idle auto-advance. No QR here.
- `shell/CatalogScreen.tsx` — game grid from `GAME_CATALOG` (`GameMeta` name / tagline / player range) + cover art from the game module. Keyboard (←/→/↑/↓ move, Enter/Space pick, Esc/Backspace back) and click/tap. Covers are passed down from the app, not fetched from the wire (`shared` stays types-only). No QR here.
- `games/uno/UnoCover.tsx` — UNO catalog cover as an inline SVG (tilted card back + four-colour oval + "UNO" wordmark), no external asset.
- `HostGameEntry` (`{ View, Cover }`); `HOST_GAMES` entries are now objects, `App.tsx` reads `HOST_GAMES[id].View`.

### Changed — `host`
- `App.tsx` — a `flow` state machine (`attract | catalog | lobby`); a game in progress (incl. mid-game host reload) always wins. When a game ends, `flow` returns to `lobby` (not attract). `SELECT_GAME` is sent when a game is picked in the catalog.
- `LobbyScreen.tsx` — the catalog grid is gone (moved to `CatalogScreen`); the title now shows the selected game's name + tagline; added a "Trocar de jogo" button (→ catalog). QR stays here (large), and is the only screen with a QR.

### Changed — `server`
- `Room.endGame()` — now sets `state = 'accepting_players'` (was `'ended'`, which blocked `selectGame`) and keeps `selectedGameId`, so the host lands on that game's lobby and can "play again" (`START_GAME`) or "switch game" (`SELECT_GAME`). `'ended'` removed from `RoomState`.
- `ws-server` `END_GAME` handler re-broadcasts `GAME_CATALOG` (fresh, same `selectedGameId`) alongside `GAME_ENDED` / `ROOM_STATE`.

### Changed — `mobile`
- `useRoomConnection` handles `GAME_ENDED` — clears the game state so the player returns to `WaitingScreen`, session kept.
- `WaitingScreen` shows the selected game's name (accent) + tagline.

### Tests
- `room.test.ts` +1: `endGame()` → `accepting_players`, keeps `selectedGameId`, `selectGame` / `startGame` work again (play again + switch). **28 server tests green.**
- Builds (4 workspaces), oxlint (host + mobile), server `tsc` green. Browser smoke: attract → (key/click) → catalog (UNO cover, nav) → pick → lobby (QR, code, players) → "Trocar de jogo" → catalog → lobby → 2 phones join (waiting shows "UNO" + tagline) → start → play → "Encerrar" → **host back to the lobby, phones back to waiting with session** → "Iniciar UNO" again (play again) works.

### Why
- The platform vision (§52) needs a game picker and a place to land after a match, not a single fused lobby. No new wire messages — reuses `END_GAME` / `START_GAME` / `SELECT_GAME` / `GAME_CATALOG`.

## 2026-09-06 — Fase C / PR C1: `@party/ui` workspace + unified design tokens
### Added
- New workspace **`ui/` (`@party/ui`)** — the home for cross-app React/CSS/audio (`shared/` stays types-only). `main: src/index.ts`, consumed **as source** by Vite (no build step; `build`/`lint` = `tsc --noEmit`). Added to root `workspaces` (after `shared`); `host` + `mobile` get `"@party/ui": "file:../ui"`.
- **`ui/src/tokens.css`** — single source of design tokens: `--bg`, `--panel`, `--panel-2`, `--line`, `--line-soft`, `--text`, `--muted`, `--accent`, `--good`, `--danger`, `--radius*`, `--shadow-lg`, `--font` (+ `color-scheme: dark` and font smoothing on `:root`). Imported once per app in `main.tsx` before its `index.css`.

### Changed
- Resolved the token divergence between the two apps — canonical values: `--panel #161d29` (was host `#141a24`), `--panel-2 #1d2634` (was host `#1b2330`), `--line #2b3646` (was host `#2a3444`), `--muted #94a3b8` (was mobile `#93a1b5`); `--bg` / `--text` / `--accent` were already equal.
- `host/src/index.css` and `mobile/src/index.css` no longer define shared tokens — just the reset (+ mobile keeps its body gradient and the UNO card colours `--uno-*`, plus a `--bg-0: var(--bg)` alias for existing rules).

### Tests
- Builds (5 workspaces incl. `ui`), oxlint (host + mobile), server `tsc`, 28 server tests green. Browser smoke: host attract / catalog / lobby and mobile join render unchanged; tokens resolve from `@party/ui`.

### Why
- First Fase C step: one place for tokens, so C2 (shared components) and C3 (sounds) have a foundation and the two apps stop drifting apart visually.

## 2026-09-06 — Fase C / PR C2: `@party/ui` components + retrofit
### Added
- **`ui/src/components/`** + `ui/src/components.css` (`@party/ui/components.css`, imported per app in `main.tsx`):
  - `BrandMark` — the wordmark; `variant="game"` (amber→red, e.g. "UNO") / `variant="platform"` ("Box Fiesta" multicolour), `size` sm/md/lg/xl. §47: the game text is a prop.
  - `Button` — `variant` primary / success / ghost / danger.
  - `Panel` — surface treatment (bg + hairline border + radius), `className` passthrough.
  - `Overlay` — full-screen dimmed modal shell + centred card.
  - `Timer` — labelled countdown chip; red at ≤ `warnAt`s, `active` glow ("your turn"), `null` → "—".
  - `QrPanel` — QR image (or skeleton) + room code + join URL, with the safe-data-URI guard.
  - `PlayerRoster` — simple `{name, connected}` list; `layout` list (host lobby) / pills (mobile waiting).

### Changed
- **host**: `AttractScreen` / `CatalogScreen` use `BrandMark` (platform); `LobbyScreen` uses `BrandMark` + `QrPanel` + `PlayerRoster` + `Button`; `UnoHostView` topbar uses `BrandMark` + `Timer`, the paused / result overlays use `Overlay` + `Button`, side-actions use `Button`.
- **mobile**: `JoinScreen` uses `BrandMark` + `Button`; `WaitingScreen` roster uses `PlayerRoster` (pills); `UnoControllerView` header uses `Timer` (`active={myTurn}`), colour-modal confirm uses `Button`.
- Removed the now-duplicated CSS: host `shell.css` lost `.brand-mark` / `.platform-mark` / `.start-button` / `.ghost-button` / `.lobby-qr*` / `.lobby-code` / `.lobby-url` / `.qr-skeleton` / `.lobby-players*`; host `uno-host.css` lost `.turn-timer*` / `.result-overlay` / `.result-card*` (kept `.result-scoreboard*` / `.eyebrow` as overlay *content*); mobile `shell.css` lost `.wordmark` / `.primary-button*`; mobile `uno-controller.css` lost `.header-timer*`. Net −116 CSS lines.
- Both `vite.config.ts` got `optimizeDeps.exclude: ['@party/ui']` so Vite transforms the linked source instead of pre-bundling it.

### Tests
- Builds (5 workspaces), oxlint (host + mobile), server `tsc`, 28 server tests green. Browser smoke: attract / catalog / lobby / mobile join / in-game (host board + Timer, mobile controller + Timer glow) / paused Overlay — all render unchanged.

### Why
- One implementation of each recurring widget; the two apps now share the wordmark, buttons, timer, QR panel and roster instead of four near-copies. The `BrandMark` `text` prop is the single §47 rename point.

## 2026-09-06 — Fase C / PR C3: synthesized Web Audio sounds
### Added
- **`ui/src/sound.ts`** — `@party/ui` sound engine. Every sound is oscillators + a gain envelope, no audio files (§47): `cardPlay`, `draw`, `turn`, `special`, `uno`, `win`, `error`, `select`.
  - `createSounds(ctx?)` — pure factory (a stub `AudioContext` can be injected for tests); returns `{ …sounds, play(name), unlock(), isEnabled(), setEnabled(on), toggle() }`.
  - `getSounds()` — the app-wide lazy singleton. Installs a one-time `pointerdown`/`keydown` listener that resumes the (initially suspended) context; `unlock()` forces it.
  - Mute persists in `localStorage['party:sound']`; SSR / no-Web-Audio → a silent no-op instance.
- **`host/src/games/uno/sound-map.ts`** — `soundForEvent(UnoGameEvent) → SoundName | null` (card_played→cardPlay, card_drawn→draw, turn_started→turn, color/direction/skip→special, uno_called→uno, uno_penalty_applied→error, round/game_finished→win). Lives in the UNO module.

### Changed
- `UnoHostView` plays a sound per fresh game event (in the same effect that feeds the animation queue, *before* the reduced-motion guard — sound ≠ motion). New "🔊 Som ligado / 🔇 Som desligado" ghost button in the side actions.
- `ui/src/index.ts` re-exports `createSounds` / `getSounds`.

### Tests
- `ui/src/sound.test.ts` (3, with a fake `AudioContext`): every sound plays without throwing and builds oscillators; muted → no audio nodes; `toggle()` flips and reports state. **`ui` now has a real test suite.**
- Builds (5 workspaces), oxlint (host + mobile), server `tsc`, 28 server tests green. Browser smoke: game start → `turn` sound (2 osc); card played → `cardPlay` + next `turn` (+3 osc); mute button → label flips, `localStorage` set, no further audio nodes.

### Why
- The TV is the party's shared speaker; the board now has audio feedback, synthesized so there are no asset files to license or ship. Mobile stays silent for now (4 phones chirping = noise) — can get light haptics/ticks later.

## 2026-09-06 — Fase C / PR C4: consolidate `cardArt.ts` → `@party/ui` (Fase C complete)
### Changed
- `host/src/games/uno/cardArt.ts` and `mobile/src/games/uno/cardArt.ts` (near-identical — 55 card-image imports + `getCardArt` / `getCardBackArt`) collapsed into **`ui/src/uno-cards.ts`**, exposed as `@party/ui/uno-cards`. The one behaviour difference (`getCardBackArt` → `wildColor` on host vs the unused mobile export) resolved to `wildColor` (host's — the colourful "change colour" face is the deck back).
- `ui/src/assets.d.ts` — ambient `*.png` module declaration so `@party/ui` typechecks the image imports (`ui` tsconfig has no `vite/client`).
- Card images live at the repo root `uno_card_sheet_crops/` still; `ui/src/uno-cards.ts` imports them at `../../uno_card_sheet_crops/*.png`. `UnoHostView` / `UnoControllerView` import from `@party/ui/uno-cards`.

### Tests
- Builds (5 workspaces), oxlint (host + mobile), server `tsc`, `ui` (3) + server (28) tests green. Browser smoke: the host board and the mobile hand render real card art (`Wild_Card_Change_Colour.png`, `Red_2.png`, … all `naturalWidth > 0`); Vite emits all 55 PNGs into each app's `dist/assets/`.

### Fase C — complete
`@party/ui` now holds: design tokens (`tokens.css`), components (`BrandMark`/`Button`/`Panel`/`Overlay`/`Timer`/`QrPanel`/`PlayerRoster` + `components.css`), synthesized sounds (`sound.ts`), and the UNO card-art map (`uno-cards`). No duplicated frontend code between the two apps. §47: the "UNO" name is kept — `BrandMark.text` is the single rename point.

## 2026-09-06 — Fase D / PR D1: `shared` contract for Coup (types-only)
### Added
- `shared/src/models/coup.ts` — `CoupCharacter` (5 classic), `CoupActionType` (7 classic), `CoupPhase`, `CoupInfluence`, `CoupPublicPlayer`, `CoupPendingAction`, `CoupPendingBlock`, `CoupChallengeWindow`, `CoupRevealOutcome`, `CoupPublicState`, `CoupDecision`, `CoupPrivateState`. String values match the server engine's internal enums verbatim.
- `shared/src/games/coup/events.ts` — `CoupGameEvent` union (mirrors `UnoGameEvent`). `shared/src/index.ts` +2 exports.

## 2026-09-06 — Fase D / PR D2: Coup engine + plugin (classic ruleset)
### Added
- `server/src/games/coup/` — classic Coup ported from the standalone repo's `src/engine/` (no Reformation): `deck`/`player`/`game` (RNG/clock injected), `action-resolver` (`ResolverResult` + `SideEffect`), `coup-game.ts` (`CoupGame implements PausableGame, TurnTimedGame` — absorbs the standalone `GameEngine`; no `setTimeout`, one deadline via `getTimer()`/`onTurnTimeout()`; per-player projection + single `pendingDecision`; emits `CoupGameEvent`s; single-influence forced losses auto-resolve), `action-schema.ts` (zod, 9 intents), `plugin.ts` (`coupPlugin`, 2–6p, `{ rounds:false, turnTimer:true, pause:true }`).
- `server/src/games/registry.ts` — 1 import + 1 entry. `DEFAULT_GAME_ID` stays `uno`.
- `server/src/tests/coup-game.test.ts` (27) + a Coup path in `multiplayer.integration.test.ts`. **Server tests: 56 green (was 28).**
- No changes to `core/`, `ws-server.ts`, `shared/protocol`, or either frontend shell (§52). Coup timers reuse `TurnTimedGame` — every phase (action / challenge / block / block-challenge / influence-loss / exchange) exposes its deadline; `onTurnTimeout()` auto-resolves.

## 2026-09-06 — Fase D / PR D3: Coup host (TV) view
### Added
- `host/src/games/coup/` — `CoupHostView` (seat table with coins + face-down/revealed influence cards, phase banner, challenge-reveal strip, event feed, game-over/pause `Overlay`, owner pause/kick/end), `CoupCover` (inline SVG), `describeEvent.ts` (PT-BR feed), `coupCards.ts` (character emoji/colour + action labels — no image assets, §47 deferred, name kept "Coup"), `coup-host.css`.
- `host/src/games/registry.ts` — 1 import + 1 entry.

## 2026-09-06 — Fase D / PR D4: Coup mobile controller
### Added
- `mobile/src/games/coup/` — `CoupControllerView` (one prompt at a time from `pendingDecision`: action grid → target sub-screen, challenge/pass, block/pass, block-challenge/pass, influence-loss picker, exchange keep-picker; forced-Coup + cost disables with reasons), `HowToPlay` overlay (static rules), `coupCards.ts`, `coup-controller.css`.
- `mobile/src/games/registry.ts` — 1 import + 1 entry.

## 2026-09-06 — Fase D / PR D5: generic emoji reactions (platform)
### Added
- `shared/src/protocol/messages.ts` — `SEND_REACTION { reaction }` (client→server) + `REACTION { playerId; reaction; at }` (server→client). Game-agnostic.
- `server/src/websocket/protocol.ts` — `SEND_REACTION` zod (`reaction` 1–16 chars). `ws-server.ts` — handler: 1.2s per-socket cooldown, rebroadcast `REACTION` to the whole room.
- `host` + `mobile` `useRoomConnection` — `reactions: LiveReaction[]` (auto-expire 4s); passed to game views via `HostGameViewProps` / `ControllerGameViewProps`. Coup UI: emoji bar on the controller, floating bubbles on TV + controller.
- `server/src/tests/multiplayer.integration.test.ts` — reaction rebroadcast + oversized-payload rejection. **Server tests: 57 green.**
- D5 is a small platform addition (touches `shared/protocol` + `ws-server` + both shells) — deliberately generic so UNO can adopt it later.
- Live smoke (host + 2 phones): catalog shows both games → Coup lobby → bluffed Tax → challenge → reveal overlay + feed → influence loss → turn advance → pause/resume → 2-player endgame → game-over overlay → "Nova partida" → reaction bubble on TV. No console/server errors.

## 2026-09-06 — Fase D / D6a: Coup real card art
### Added
- `coup_card_art/` (repo root) — 6 `.webp` character portraits copied from `C:\Users\gabri\Documents\workspace\Jogos\Coup\public\assets\cards\focus\` (duke, assassin, captain, ambassador, contessa) + `cards/back-v2.webp` (card back). ~380 KB total.
- `ui/src/coup-cards.ts` → `@party/ui/coup-cards` (mirrors `@party/ui/uno-cards`): `CHARACTER_META` now carries `art`, plus `getCoupCardArt(character)` / `getCoupCardBackArt()`. `ui/package.json` exports `./coup-cards`. `ui/src/assets.d.ts` gained a `*.webp` module declaration.
### Changed
- `host/src/games/coup/coupCards.ts` + `mobile/src/games/coup/coupCards.ts` — re-export `CHARACTER_META` from `@party/ui/coup-cards` instead of each defining its own copy (de-dup); app-specific `ACTION_LABEL` / `ACTIONS` / `REACTION_EMOJIS` stay local.
- `CoupHostView` `InfluenceCard` — renders `<img class="coup-card-art">` (portrait for revealed, art-deco back for hidden) with the name in a bottom gradient; emoji crest dropped. `coup-host.css` `.coup-card` reworked to a positioned image container.
- `CoupControllerView` — `coup-mini` (my influences) and exchange-prompt cards render the portrait `<img>`; `coup-controller.css` updated (`.coup-mini` / `.coup-ex-card` now `aspect-ratio` image tiles, `.coup-mini-tag` repositioned as an overlay badge). Lose-influence buttons keep the emoji + label (text buttons).
- `CoupCover` — now fans three real portraits (Contessa / Duke / Captain) behind the "COUP" wordmark instead of plain SVG rects.
### Why
- Fulfils the plan's assumed "Arte das cartas: reusar os `.webp`" decision (§11) that D1–D5 had deferred behind emoji placeholders. §47 still deferred — the art is swappable via the one `@party/ui/coup-cards` module.
### Validation
- 57 server tests green · host + mobile lint clean · 5-workspace build green (all 6 `.webp` bundled in both apps).
- Live smoke (host + 2 phones): catalog cover shows portraits → Coup game → controller shows own influences as portraits, host shows card backs → bluffed Tax → challenge → Ana loses Ambassador → **revealed portrait renders face-up on the TV**. No console/server errors.

## 2026-09-07 — Customizable pixel avatars (branch `feature/avatar`)
Replaces the single-emoji "avatar" (which was just prepended to the display name) with a per-player customizable **LPC pixel-art "3x4 photo"** chosen on the join screen: body (female/male), skin, hair style + colour, eye colour, shirt, funny hat, background. Platform feature — game-agnostic, zero engine changes.
### Added — asset pipeline
- `tools/build-avatars.py` — dev-only extractor. `--lpc <path>` vendors the exact south-facing idle frames + body/hair/eye/cloth palettes + credits from an [Universal LPC Spritesheet Character Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator) checkout into `tools/lpc-source/` (self-contained — the checkout is then unneeded). Default run reads `tools/lpc-source/` and generates `ui/src/avatar-assets/`.
- `tools/lpc-source/` — vendored subset (56 frames + 4 palette sets + `credits-raw.json`), committed. **Nothing lives outside the repo.**
- `ui/src/avatar-assets/` (generated, committed) — 69 PNGs (**~35 KB total**): `body-{gender}-{skin}` (12), `eyes-{colour}` (6), `shirt-{style}-{gender}` (16, baked colour), `hat-{style}` (9), `hair-{style}` + `hair-{style}-back` (26, shipped in the LPC base ramp for **runtime recolour**). Plus `palettes.ts` (hair ramps), `index.ts` (typed url maps — explicit imports, no `import.meta.glob`), `CREDITS.md` (attribution for the exact subset).
### Added — code
- `shared/src/models/avatar.ts` — `AvatarSpec` type (`{ gender, skin, hair, hairColor, eyes, shirt, hat, bg }`, all catalog-id strings). Types-only.
- `ui/src/avatar.ts` (`@party/ui`) — catalogs (`GENDERS` ×2, `SKIN_TONES` ×6, `HAIR_STYLES` ×25 incl. `bald`, `HAIR_COLORS` ×12, `EYE_COLORS` ×6, `SHIRTS` ×8, `HATS` ×10 incl. `none`/crown/tophat/tiara/wizard/tricorne/bandana/ninja-band/santa/bicorne, `BG_COLORS` ×8), `DEFAULT_AVATAR`, `sanitizeAvatar()` (clamps any unknown id — the wire only needs structural validation), `randomAvatar(rng?)`, `bgHex()`.
- `ui/src/components/Avatar.tsx` — **hybrid** layered renderer: composes background → hair-back → body+head → eyes → shirt → hair-front → hat onto a 46×46 `<canvas>` (`image-rendering: pixelated`); hair is palette-swapped at runtime from the LPC base ramp. Module-wide caches for loaded images and recoloured-hair canvases → effectively synchronous past the first render; paints the bg immediately so there is never a blank frame.
- `ui/src/components/AvatarEditor.tsx` — controlled editor: live preview + "🎲 Surpresa" + one picker row per attribute. `ui/src/components.css` `.ui-avatar` gets pixelated rendering.
- `ui/src/avatar.test.ts` — `sanitizeAvatar` clamping, `randomAvatar` validity, `DEFAULT_AVATAR` validity (ui suite 7 green).
- `server/src/tests/room.test.ts` — avatar stored + default fallback. `server/src/tests/multiplayer.integration.test.ts` — avatar flows through `PLAYER_JOINED` + `ROOM_STATE`; malformed avatar → `BAD_REQUEST`. **Server tests: 60 green (was 57).**
### Changed
- **Wire (breaking, in-memory only):** `JOIN_ROOM` payload gained optional `avatar?: AvatarSpec`; `ROOM_STATE.players[]` and `PLAYER_JOINED` now carry `avatar: AvatarSpec`. `server/src/websocket/protocol.ts` validates avatar shape (8 string fields, ≤24 chars, `.strict()`).
- `server/src/core/room.ts` — `joinPlayer(name, avatar, now)`; `Player.avatar` stored (falls back to a local `FALLBACK_AVATAR` mirroring `@party/ui`'s `DEFAULT_AVATAR` when absent, e.g. the host). `shared/src/models/room.ts` — `Player` gained `avatar`.
- `mobile` — `App.tsx` holds `AvatarSpec` state persisted to `localStorage['party:avatar']` (survives reloads; server-held avatar wins once joined). `JoinScreen` renders `<AvatarEditor>` (old 8-emoji grid removed) + a small "arte LPC / OpenGameArt" credit line; `WaitingScreen` renders `<Avatar>`; `joinOrReconnect` sends the structured avatar and the **clean name** (no more `"🙂 Alice"` emoji prefix). `shell.css` dropped `.avatar-picker`/`.avatar-option`/`.join-preview`.
- `mobile` — `ControllerGameViewProps` gained `roomPlayers` (game-agnostic roster from `ROOM_STATE`); UNO + Coup controller rosters render opponent mini-avatars.
- `host` — `ShellPlayer` gained `avatar`; `@party/ui` `PlayerRoster` renders a mini `<Avatar>` when a player carries one (host lobby). `UnoHostView` + `CoupHostView` seat rows resolve `avatarOf(id)` from the `players` prop and render a `<Avatar size={26–28}>`.
### Why
- Party identity: the emoji-in-the-name hack was fragile (name string carried presentation) and limited. A structured, sanitized `AvatarSpec` + a curated LPC paperdoll gives real customization with a **cohesive pixel-art look** and a tiny footprint (35 KB). Hybrid (bake finite parts, runtime-recolour only hair) keeps the asset count flat as the catalog grows.
- §52 held: no edits to `core/` game orchestration, `ws-server` routing, either shell's flow, or any game engine — host/controller views resolve avatars by `playerId` from the existing `ROOM_STATE` roster.
- Local single-machine game — the LPC art (CC-BY-SA / OGA-BY / CC0) is used with the bundled `CREDITS.md` + a visible credit line; never distributed.
### Validation
- 60 server tests green · ui 7 green · host + mobile lint clean · 5-workspace build green (69 PNGs bundled per app).
- Live smoke (host + 2 phones): edit avatar on join (gender, skin, hair + runtime recolour, eyes, shirt, hat, bg, Surpresa) → join → pixel avatar on waiting screen + roster pill → host lobby roster → start UNO → canvas avatars on TV seat rows + phone player pills. No console/server errors.

## 2026-09-07 — Stack merged + next-games direction (branch `feature/quiplaxi`)
No code change — planning + docs sync.
### Changed
- `main`/`develop` fast-forwarded to `0079344` — the entire Fases A–D + pixel-avatars stack is now on `main`. The unmerged `feature/*` branch stack is resolved.
- New working branch **`feature/quiplaxi`** (off `main`, empty) for **game #3, a Quiplash-inspired party game**. Implementation to be planned + built in a fresh chat from `~/.claude/plans/quiplax-e-proximos-jogos.md`.
### Decisions (with the user)
- **NO BOTS.** Bots / AI opponents / virtual players are **descoped** for every game — not "deferred". Do not propose a virtual-player phase; do not port 8tp/Coup's `BotBrain`. Solo testing = multiple browser tabs.
- Coup **Reformation** expansion stays *deferred* (not descoped) — a cheap win any time.
- **§47** (own visual identity / game names) still open — a Quiplash-like game needs its own name; `BrandMark.text` is the single rename point. Decide before/with game #3.
### Reference repos — re-validated (read the code, not just READMEs)
- The 5 cloned repos under `C:\Users\gabri\Documents\workspace\Jogos\` (`rumpus`, `bodbjanar`, `freewee`, `amoebas`, `Coup`) are **read-only references**. Our platform layer (session tokens + grace, typed `ws` protocol + zod, `@party/ui`, 60 tests, 3-screen host flow) already exceeds all of them — nothing to import architecturally.
- **`rumpus/games/quiplash.js` + `rumpus/games/fibbage.js`** (~300 lines each) are the **mechanics** reference for games #3/#4 (self-vote block, per-phase timers with `endsAt`, lie==truth collision, identical-lie collapse crediting all authors, mid-round dropout recount). rumpus is **AGPLv3** → reimplement clean-room, never copy into this ISC repo.
- `bodbjanar` (MIT): canvas-on-phone → bitmap-to-TV → auction — only if a drawing game is added. `freewee` (2015): sensor-input ideas only, code obsolete. `amoebas`: real-time `.io` arcade, marginal.
- The real effort for text party games is original **PT-BR prompt/question banks** — rumpus ships only tiny samples; CAH text is non-commercial-licensed and not shipped.
### Games roadmap
1. **#3 Quiplash-inspired** (`feature/quiplaxi`) — `prompt → 2 free-text answers per player → 1v1 matchups → vote → score → N rounds`. Needs a new **free-text mobile input** component. §52 checklist (UNO/Coup are the mould). ~40–60 original PT-BR prompts.
2. **#4 Fibbage-inspired** — reuses the text-input UI; `fact-with-blank → invent a lie → shuffle lies + truth → hunt the truth → points for finding + for fooling`.
3. **#5 Trivia** — simplest engine; the cost is the PT-BR question bank.
- Also pending: Coup D6 polish (`sound-map.ts`, card-flip on reveal).

## 2026-09-07 — Zap! (game #3, Quiplash-inspired) / PR Z1 — shared contract (branch `feature/quiplaxi`)
### Decided (with the user)
- **Name: "Zap!"** (`gameId: "zap"`) — §47 own name, distinct from the Quiplash mark; `BrandMark.text` will carry it. Locale PT-BR.
- **Real Quiplash mechanic** (head-to-head duels), not the rumpus single-prompt simplification. The "everyone answers one shared prompt" format the user flagged as more CAH-like is parked for a future Cards-Against-Humanity-style game #N.
- **3 rounds**; rounds 1–2 are duels, round 3 is **"Última Chance"** — one shared prompt everyone answers, **3× points**.
- Round pairing: players on a circle, `prompt_i → player_i + player_{i+1}` ⇒ N players = N prompts = N duels/round; each player owes 2 answers on a normal round, 1 on the final.
- **minPlayers 3** (a duel needs a voter who is not a contestant) — supersedes the plan's `minPlayers: 2` assumption.
- Scoring: 100 per vote (×3 on the final round) + a **"ZAP!"** sweep bonus when a duel winner takes 100% of the votes.
- Voting is **one duel at a time** on the TV (`currentDuelIndex`); the phone shows a 2-option ballot (or nothing, if you are a contestant in that duel).
### Added — code (types-only, `shared/` stays runtime-free)
- `shared/src/models/zap.ts` — `ZapPhase` (`answering|voting|roundResults|gameover|paused`), `ZapRoundKind`, `ZapDuelAnswer`, `ZapDuelResult`, `ZapPointsAward`, `ZapDuel`, `ZapPublicPlayer`, `ZapStanding`, `ZapPublicState`, `ZapDecision`, `ZapAssignment`, `ZapBallot`, `ZapPrivateState`, `ZapAction` (`submitAnswer` / `castVote`). Authors of answers are `null` in the public state during `voting`, filled on reveal — privacy lives in the projection, not the events.
- `shared/src/games/zap/events.ts` — `ZapGameEvent` discriminated union (mirrors `CoupGameEvent`): `game_started` / `round_started` / `answering_started` / `answer_submitted` / `all_answers_in` / `duel_started` / `vote_cast` / `duel_revealed` / `round_finished` / `game_finished` (+ pause/resume). Events never carry answer/vote text.
- `shared/src/index.ts` — `export *` for the two new modules.
### Why
- A game's wire contract should exist and typecheck before its engine and views are written, so Z2/Z3/Z4 build against a fixed shape. Keeping answer authorship and vote text out of both the public state (during `voting`) and the event stream puts Zap!'s only privacy rule in one place — the private-state projection.
### Validation
- `npm run -w shared build` green. 60 server tests untouched/green; 5-workspace build green (Z1 adds no runtime).
### Out of scope (Z2+)
- Engine `server/src/games/zap/` (pairing, phase timers via `TurnTimedGame`, scoring), zod `action-schema.ts`, `GAMES` entry, PT-BR `prompts.ts`, host view + `Cover`, mobile controller + free-text input component, engine tests + integration path.

## 2026-09-07 — Zap! / PR Z2 — server engine + plugin (branch `feature/quiplaxi`)
### Added — code
- `server/src/games/zap/constants.ts` — `MIN_PLAYERS 3` / `MAX_PLAYERS 8`, `TOTAL_ROUNDS 3`, phase windows (`ANSWER_MS 60s`, `VOTE_MS 20s`, `ROUND_RESULTS_MS 8s`), `POINTS_PER_VOTE 100`, `FINAL_ROUND_MULTIPLIER 3`, `SWEEP_BONUS 50`, `MAX_ANSWER_LEN 80`, `BLANK_ANSWER`.
- `server/src/games/zap/prompts.ts` — `ZAP_PROMPTS`, 54 original PT-BR fill-in prompts (written for this repo, not lifted from any deck). Shuffled per match, reshuffled on exhaustion.
- `server/src/games/zap/pairing.ts` — pure round planner. `planNormalRound(seatIds, prompts)`: circle pairing, `prompt_k` answered by seat `k` + seat `k+1` (mod N) ⇒ N prompts = N duels, 2 answers/player. `planFinalRound(seatIds, prompt)`: one shared prompt, one N-way duel.
- `server/src/games/zap/zap-game.ts` — `ZapGame implements PausableGame, TurnTimedGame`. **Self-advancing**: one stored deadline ticked by the platform server; `onTurnTimeout()` closes each phase (`answering` → `voting` one duel at a time → `roundResults` → next round / `gameover`). Fills blanks for un-submitted assignments; drops all-blank duels. Scoring: `votes × 100`, `× 3` on the final round, `+ 50` sweep bonus when a 2-way duel is unanimous. Injected RNG (`ctx.random`) for prompt + answer-order shuffles. `getStatus()` = `active` until `gameover` → `complete` (no rounds/intermission — the owner never nudges it).
- `server/src/games/zap/action-schema.ts` — zod discriminated union (`submitAnswer` / `castVote`), `parseZapAction`. Text is a coarse `≤2000` guard; the engine trims + clamps.
- `server/src/games/zap/plugin.ts` — `zapPlugin` (`id: 'zap'`, name **"Zap!"**, 3–8p, `{ rounds: false, turnTimer: true, pause: true }`).
- `server/src/games/registry.ts` — **+1 import, +1 entry** (`GAMES.zap`).
- `server/src/tests/zap-game.test.ts` — 16 tests (setup, answer validation + clamp, auto-advance to voting, ballot eligibility, vote rejections, 100/vote + sweep bonus, tie split, answering/voting timeouts, round progression, final round = one N-way duel ×3, gameover winner, pause). `multiplayer.integration.test.ts` +1 (Zap! catalog + SELECT_GAME + START_GAME + per-player prompt isolation + generic `GAME_ACTION` + malformed rejection). **Server tests: 77 green (was 60).**
### Changed
- `shared/src/models/zap.ts` + `shared/src/games/zap/events.ts` (Z1, not yet committed) — generalised duel slots from `0 | 1` to `number` and `votes` from `[number, number]` to `number[]`, so the final round is modelled as a single N-way duel. `ZapBallot.options`/`votedSlot` and `ZapAction.castVote.slot` follow.
### Why
- A Quiplash-style loop is a sequence of timed simultaneous-submit phases, which is exactly what `TurnTimedGame` already expresses (Coup uses it for challenge windows) — so the game needs **no new platform plumbing**, and the "free-text mobile input" the roadmap flagged is purely a Z4 UI concern. Self-advancing (vs `RoundedGame` + an owner button) matches the party-game feel: the TV drives the pace.
### Validation
- 77 server tests green · `tsc` server + shared clean · host/mobile lint clean · 5-workspace build green.
- **§52 held:** zero edits to `core/`, `ws-server.ts`, either shell, or `shared/protocol` — only `shared/models`+`games/zap` (the contract), `server/src/games/zap/`, and one line in `registry.ts`.
### Out of scope (Z3+)
- Host view + `Cover` + `HOST_GAMES` entry (Z3); mobile controller + free-text input component + `CONTROLLER_GAMES` entry (Z4); reveal animation, "ZAP!" burst, `HowToPlay`, `sound-map.ts` (Z5).

## 2026-09-07 — Zap! / PR Z3 — host / TV view (branch `feature/quiplaxi`)
### Added — code
- `host/src/games/zap/ZapHostView.tsx` — the TV view. Renders per `pub.phase`: `answering` (prompt / "Última Chance" prompt + progress bar + `answersInCount/expected` + per-player ✍️/✅ roster derived from the `answer_submitted` event stream), `voting` (one `DuelBoard` for `currentDuelIndex` — the 2 answers big, authors hidden, tone-coloured; `votesInCount/expected`), `roundResults` (grid of every duel with vote counts, winner ring, `⚡ ZAP!` burst / `🤝 Empate`), `gameover` (`Overlay` with 🏆 winner + final standings). Side panel: live standings (`roundPoints` delta chips), event feed via `describeEvent`, pause / end buttons. Emoji reactions reused from `HostGameViewProps`.
- `host/src/games/zap/ZapCover.tsx` — inline-SVG catalog cover (lightning bolt between two speech bubbles, "ZAP!" wordmark). No external assets.
- `host/src/games/zap/describeEvent.ts` — `ZapGameEvent` → one feed line (or `null`).
- `host/src/games/zap/zap-host.css` — all rules scoped under `.zap-host` (no collision with `uno-host.css` / `coup-host.css`); 2-column grid collapsing to 1 under 900px; `prefers-reduced-motion` guard on the ZAP burst / progress transition.
- `host/src/games/registry.ts` — **+2 imports, +1 entry** (`HOST_GAMES.zap`).
### Why
- The host is game-agnostic: `App.tsx` hands `publicState`/`events`/`players`/`reactions`/`send` to the registered view and knows nothing about Zap!. Scoping the CSS under `.zap-host` keeps the three games' stylesheets independent even though Vite bundles all of them.
### Validation
- `oxlint` host clean (only the repo's pre-existing `set-state-in-effect` advisories, none in `zap/`); 5-workspace build green; 77 server tests still green.
- **Live smoke** (host + 3 phones, real server): catalog shows the Zap! cover → "Iniciar Zap!" → host renders `answering` (timer 60→0, progress bar, ✍️ roster, standings, feed) → the self-advancing loop ran all 3 rounds (round 3 = "Última Chance" with the shared prompt + triple-points styling) → `gameover` Overlay ("🏆 Ana venceu!" + final standings + Nova partida / Encerrar). **Zero console errors** throughout. Mobile waiting screen shows the "Zap!" name + tagline. Only gap: `voting` / `roundResults` with *non-dropped* duels (the `DuelBoard` component) — no answers were submitted (no Z4 controller yet), so every duel collapsed as all-blank; that path renders from the same `pub` shape the 77 server tests cover and gets its end-to-end smoke at Z4.
### Out of scope (Z4+)
- Mobile controller + free-text input component + `CONTROLLER_GAMES` entry (Z4); reveal animation polish, `HowToPlay`, `sound-map.ts` (Z5).

## 2026-09-07 — Zap! / PR Z4 — phone controller + free-text input (branch `feature/quiplaxi`)
### Added — code
- `@party/ui` `TextAnswerInput` (`ui/src/components/TextAnswerInput.tsx` + `.ui-answer*` in `components.css`) — a prompt + `<textarea>` + char counter + submit button. Self-contained draft seeded once from `submittedText`; shows "✓ enviado" and reads "Atualizar" while the draft matches what the server has. **Reusable by Fibbage (#4).**
- `mobile/src/games/zap/ZapControllerView.tsx` — phase-driven controller: `answering` renders one `TextAnswerInput` per `priv.assignments` slot (keyed `round-slot` so drafts reset each round); `voting` renders `priv.ballot` as tap-to-vote option buttons that lock after the vote; `roundResults` shows this player's round + total points; `gameover` shows win / final rank; `paused` card. Standings list (own row highlighted), 6-emoji reaction bar + reaction feed, "? Como jogar" overlay.
- `mobile/src/games/zap/HowToPlay.tsx` — 5-step static rules overlay.
- `mobile/src/games/zap/zap-controller.css` — all rules under `.zap-*`.
- `mobile/src/games/registry.ts` — **+1 import, +1 entry** (`CONTROLLER_GAMES.zap`).
### Why
- The controller only ever shows the ONE thing the player must do now (`priv.pendingDecision` + `pub.phase`), same principle as the Coup controller. The text-input box is a `@party/ui` component, not a Zap!-local one, because Fibbage's "invent a lie" screen is the same control.
### Validation
- `@party/ui` `tsc` clean + 7 ui tests green; `oxlint` mobile clean; 5-workspace build green; 77 server tests green.
- **Full live smoke** (host TV + 3 phone controllers, real server, complete 3-round match): lobby correctly gated "Aguardando 3+ jogadores" until the 3rd phone joined → each phone got its own 2 prompts and submitted via `TextAnswerInput` → host `answering` progress filled → auto-advanced to `voting` → phones showed the 2-option ballot, contestants saw "você está neste duelo" → host `DuelBoard` one duel at a time → votes closed each duel, host `roundResults` grid revealed authors + vote counts + winner ring + **⚡ ZAP! sweep bonus (+50)** → rounds auto-advanced 1→2→3 → round 3 "Última Chance" showed the single shared prompt on every phone and the **N-way duel** on the TV, scored **×3** (Caio +600 for 2 votes) → `gameover` overlay on TV ("🏆 Caio venceu!" 1050/600/150) and per-phone win/rank. **Zero console errors in any controller.** (The host tab logged WebSocket-reconnect noise during the server-startup window / forced test reloads — the shell's own backoff, not touched by this slice; the match played through with live state on every screen.)
### Out of scope (Z5)
- Reveal / vote-count animation, a "ZAP!" burst effect on the phone, `host/src/games/zap/sound-map.ts`.

## 2026-09-07 — Zap! / PR Z5 — polish: sound + reveal animation (branch `feature/quiplaxi`)
### Added — code
- `host/src/games/zap/sound-map.ts` — `soundForEvent(ZapGameEvent): SoundName | null` (mirrors `uno/sound-map.ts`): `round_started`→`turn`, `all_answers_in`→`select`, `duel_started`→`cardPlay`, `duel_revealed`→`uno` on a ZAP! else `special`, `round_finished`/`game_finished`→`win`. **First non-UNO game with sound** (Coup's is still deferred).
- `ZapHostView` — `getSounds()` + `soundForEvent` played off the raw event stream in the feed effect (restructured so `freshRaw` is computed before the `describeEvent` filter); a "🔊 Som ligado / 🔇 Som desligado" toggle under the side actions (mute persists in `localStorage['party:sound']` via `@party/ui`).
- `zap-host.css` — `zap-winner-pop` one-shot on `.zap-answer.is-winner` (scale + glow), `zap-foot-in` fade-up on the revealed `.zap-answer-foot`, `.zap-sound-toggle` style; all added to the `prefers-reduced-motion` off-switch.
- `ZapControllerView` — a `⚡ +N ⚡` cheer (`.zap-cheer`, `zap-cheer-pop`) on `roundResults` when the player scored that round; `zap-chosen-pop` on the picked vote button. Both `prefers-reduced-motion`-guarded in `zap-controller.css`.
### Validation
- 77 server tests · 7 ui tests · `tsc` server/shared/ui clean · `oxlint` host/mobile clean · 5-workspace build green.
- Live smoke: full 3-round match driven end-to-end (host TV + 3 scripted players) → `gameover` overlay correct (Bia 900 / Ana 600 / Caio 300), the winning answer carries the `is-winner` pop, the "🔊 Som ligado" toggle renders, **zero game/render console errors** (host tab shows only the shell's WebSocket reconnect-backoff noise from cold-starting the dev servers — `useRoomConnection` is not touched by any Zap! slice).
### Status
- **Zap! (game #3) is complete** — Z1 contract · Z2 engine (77 tests) · Z3 host view · Z4 controller + `@party/ui TextAnswerInput` · Z5 sound + animation. §52 held throughout: the whole game added `shared/models`+`games/zap`, `server/src/games/zap/`, `host/src/games/zap/`, `mobile/src/games/zap/`, one `@party/ui` component, and **one line in each of the 3 registries** — zero edits to `core/`, `ws-server.ts`, either shell, or `shared/protocol`.

## 2026-09-08 — UX: re-edit avatar in the lobby + cancelable UNO colour picker (branch `feature/quiplaxi`)
### Added — code
- **`UPDATE_AVATAR { avatar }`** client→server message (`shared/src/protocol/messages.ts` + `server/src/websocket/protocol.ts`, reuses the existing `avatarSchema`). `server/src/core/room.ts` `setAvatar(playerId, avatar)` — throws `GAME_IN_PROGRESS` unless `state === 'accepting_players'`, `PLAYER_NOT_FOUND` for an unknown id. `ws-server.ts` handler: player-role only, then `room.setAvatar` + `broadcastRoomState()`.
- `mobile/src/shell/WaitingScreen.tsx` — an "✏️ Editar avatar" button that opens the `@party/ui` `<AvatarEditor>` inline with Cancelar / Salvar; Salvar calls back into `App.tsx` (`changeAvatar` → local state + `localStorage['party:avatar']` + `send('UPDATE_AVATAR')`). Works on the waiting screen and after a game returns to the lobby.
- `mobile/src/games/uno/UnoControllerView.tsx` — a **wild card now picks its colour before it is played**: tapping "Jogar" with a `wild` / `wild_draw_four` selected opens a local colour popup with an **✕ close button**; ✕ cancels (card stays selected, nothing sent — pick another card or the same again), a colour sends `play_card { cardId, chosenColor }` in one shot. The server-driven `awaiting_color_choice` modal stays as the timeout/reconnect fallback. `.color-modal-close` in `uno-controller.css`.
### Why
- Players want to fix an avatar they rushed through on the join screen; the game hasn't started so there's no reason to lock it. `UPDATE_AVATAR` is a platform message like `SEND_REACTION`, not a game concern.
- The old flow played the wild first and *then* asked for a colour with no way back. Choosing the colour up front (the engine already accepts `play_card.chosenColor`) makes it fully cancelable with zero engine change.
### Validation
- `server/src/tests/room.test.ts` +1 (`setAvatar` gated by phase), `multiplayer.integration.test.ts` +1 (`UPDATE_AVATAR` applied in the lobby, malformed → `BAD_REQUEST`, refused after `START_GAME`). **Server tests: 77 → 79 green.** `tsc` server/shared + 7 ui tests + `oxlint` host/mobile + 5-workspace build all green.
- Live smoke: join → waiting screen → "Editar avatar" → change gender → Salvar → editor closes, `localStorage` + roster updated, no errors. UNO: select a +4 → "Jogar" → colour popup with ✕ → ✕ keeps the card selected and the turn unchanged → re-tap "Jogar" → pick Verde → the +4 lands on the discard with green active in one action (no separate colour phase).

## 2026-09-08 — Lorota! — game #4 (Fibbage-inspired), full slice (branch `feature/fibbage`)
A shared-TV bluffing-trivia game: each player invents a fake answer to a fact
with a blank, the server shuffles the lies in with the real answer, everyone
hunts for the truth. Points for finding the truth (+1000) and for every player
your lie fools (+500 each). 3 rounds; the last ("Lorota Final") pays double.

**§47:** the game's own name is **"Lorota!"** (PT-BR for a fib / tall tale),
`gameId: "lorota"`. Rename point: `lorotaPlugin.meta.name` + the `BrandMark text`.

### Added — code
- `shared/src/models/lorota.ts` + `shared/src/games/lorota/events.ts` (types-only): `LorotaPublicState` / `LorotaPrivateState` / `LorotaPhase` (`lying|guessing|reveal|gameover|paused`) / `LorotaOption` / `LorotaAction` (`submitLie` / `submitGuess`) / `LorotaGameEvent`. Option authorship + who-picked-what are `null` in the public state until `reveal`; events carry no lie/guess text. `shared/src/index.ts` re-exports both.
- `server/src/games/lorota/`: `constants.ts` (3 rounds; 50s/30s/10s windows; TRUTH 1000, FOOL 500, final ×2; `MAX_LIE_LEN 90`), `questions.ts` (`LOROTA_QUESTIONS` — 45 original PT-BR "fact with a blank" trivia, each with an `answer` + optional `alt` spellings), `lorota-game.ts` (`LorotaGame implements PausableGame, TurnTimedGame` — self-advancing off one server-ticked deadline; `normalize()` is casing/space/trailing-punctuation/**accent**-insensitive so a lie that's really the truth is bounced (no error toast — the player is flagged via `lieWasTheTruth`) and identical lies collapse into one option crediting every author; `getStatus()` = `active` → `complete`), `action-schema.ts` (zod), `plugin.ts` (`lorotaPlugin`, 3–8p). **+1 line in `GAMES`.**
- `host/src/games/lorota/`: `LorotaHostView` (phase-driven — `lying` progress + ✍️/✅ roster from the event stream, `guessing` numbered option list, `reveal` option list with a ✅ VERDADE badge + author names + who-picked-what + `lorota-truth-pop`, `gameover` Overlay + final standings; side panel = live standings + `describeEvent` feed + pause/end + `sound-map.ts` "🔊 Som" toggle), `LorotaCover` (inline SVG), `describeEvent.ts`, `lorota-host.css` (all scoped under `.lorota-host`; `prefers-reduced-motion`-guarded). **+2 imports + 1 entry in `HOST_GAMES`.**
- `mobile/src/games/lorota/`: `LorotaControllerView` (phase-driven — `lying` = a `@party/ui TextAnswerInput` for the fake answer + an inline "😅 essa é a verdade" nudge; `guessing` = tap-to-pick option buttons (own lie excluded) that lock; `reveal` = "✅ você achou a verdade" cheer + this round's points; `gameover` = win/rank), `HowToPlay.tsx` (6-step), `lorota-controller.css`. **+1 line in `CONTROLLER_GAMES`.**
### Tests
- `server/src/tests/lorota-game.test.ts` — 14 tests (setup, truth-collision bounce, long-lie clamp, auto-advance to guessing, own-lie hidden from ballot, **identical-lie collapse crediting both authors**, guess rejections, TRUTH + FOOL scoring, final round ×2, lying/guessing timeouts, 3-round progression to a clear winner, pause). `multiplayer.integration.test.ts` +1 (Lorota! catalog + SELECT_GAME + START_GAME + per-player prompt + `submitLie` via `GAME_ACTION` advancing to guessing + malformed rejection). **Server tests: 79 → 94.**
### Validation
- 94 server tests · 7 ui tests · `tsc` server/shared/ui clean · `oxlint` host/mobile clean (only the codebase's established `set-state-in-effect` advisory in the feed effect, same as the other 3 host views) · 5-workspace build green.
- **Full live smoke** (host TV + 4 controllers, real server): catalog cover → lobby gated "AGUARDANDO 3+ JOGADORES" → start → `lying` renders (prompt, progress, roster; phone `TextAnswerInput` + the truth-collision nudge fired on a real "44" attempt) → auto-advanced to `guessing` (host numbered list, phone tap ballot with the player's own lie excluded) → `reveal` (host: ✅ VERDADE on "Q", "mentira de Ana" → "Bia, Caio", Ana +2000 = 1000 truth + 500×2 fooled; phone: "✅ você achou a verdade! +1000") → 3 rounds → `gameover` overlay ("🏆 Ana venceu!" 4000/2000/1000). Identical-lie collapse verified via script (`"Gobi"` + `"gobi."` → one option, both authors credited). **Zero game/render console errors** (host tab shows only the shell's WebSocket reconnect-backoff noise from cold-starting the dev servers — `useRoomConnection` untouched).
### §52
- The whole game = `shared/{models,games}/lorota` + `server/src/games/lorota/` + `host/src/games/lorota/` + `mobile/src/games/lorota/` (reusing `@party/ui TextAnswerInput` from Zap!) + **one line in each of the 3 registries**. Zero edits to `core/`, `ws-server.ts`, either shell, or `shared/protocol`. **4 games in the catalog.**

## 2026-09-08 — Pack adulto (+18) para Zap! e Lorota! (branch `feature/pack-adulto`)
The user asked for the party games to carry dark / crude / +18 humour. Content-only change — no engine, no schema, no wire.
### Added — content
- `server/src/games/zap/prompts.ts` — a `PACK ADULTO (+18)` section, +32 original PT-BR prompts (sexo, palavrão, morte, escatologia, corno, chifre, pronto-socorro). Merged into the same `ZAP_PROMPTS` list the engine shuffles per match (64 → 96 prompts).
- `server/src/games/lorota/questions.ts` — a `PACK ADULTO (+18)` section, +22 "fato com lacuna" entries — all genuinely verifiable facts (or a clearly-labelled myth): etimologia de "orquídea"/"vagina", pênis de pato/equidna/craca, anticoncepcional egípcio, esponja compartilhada romana, teste de gravidez na rã, manobra de Valsalva, cadaverina, sulfeto de hidrogênio, etc. (45 → 67 questions).
### Guardrails
- Crude, never using a protected group as the punchline; nothing about real private people; the Lorota! facts stay real so the "hunt the truth" loop still works.
### Validation
- No test asserts either bank's length; **94 server tests green**, `tsc` server/shared clean, 5-workspace build green. No frontend change.

## 2026-09-08 — Sabe-Tudo — game #5 (multiple-choice trivia), full slice (branch `feature/sabetudo`)
A shared-TV trivia race: the TV shows a question with four options, each player taps one on the phone, and whoever is right scores a flat base + a speed bonus (faster = more) + a streak bonus. A match is 8 questions; the top score wins.

**§47:** the game's own name is **"Sabe-Tudo"**, `gameId: "sabetudo"`. Rename point: `sabeTudoPlugin.meta.name` + the `BrandMark text`.

### Added — code
- `shared/src/models/sabetudo.ts` + `shared/src/games/sabetudo/events.ts` (types-only): `SabeTudoPublicState` / `SabeTudoPrivateState` / `SabeTudoPhase` (`question|reveal|gameover|paused`) / `SabeTudoOptionResult` / `SabeTudoAction` (`submitAnswer`) / `SabeTudoGameEvent`. `correctIndex` + per-option `optionResults` (tally + who-picked) are `null` until `reveal`; events never carry the option a player picked. `shared/src/index.ts` re-exports both.
- `server/src/games/sabetudo/`: `constants.ts` (2–8 players; 8 questions; 22s/7s windows; `CORRECT_POINTS 500`, `SPEED_BONUS_MAX 500` decaying linearly, `STREAK_STEP 100` up to 5), `questions.ts` (`SABETUDO_QUESTIONS` — 59 original PT-BR 4-option questions incl. a **PACK PICANTE (+18)** of 18 real-but-morbid/crude facts), `sabetudo-game.ts` (`SabeTudoGame implements PausableGame, TurnTimedGame` — self-advancing off one server-ticked deadline; options shuffled per question per match; `getStatus()` = `active` → `complete`), `action-schema.ts` (zod), `plugin.ts` (`sabeTudoPlugin`). **+1 line in `GAMES`.**
- `host/src/games/sabetudo/`: `SabeTudoHostView` (phase-driven — `question` shows the 2×2 option grid + a progress bar + a ✅/⏳ roster from the event stream; `reveal` glows the correct card green, marks wrong-picked red, dims the rest, and lists who picked each; side panel = live standings with 🔥streak + `+N` deltas + `describeEvent` feed + pause/end + `sound-map.ts` "🔊 Som" toggle; `gameover` Overlay), `SabeTudoCover` (inline SVG — a lit bulb over A/B/C/D chips), `describeEvent.ts`, `sabetudo-host.css` (scoped under `.sabetudo-host`, `prefers-reduced-motion`-guarded). **+2 imports + 1 entry in `HOST_GAMES`.**
- `mobile/src/games/sabetudo/`: `SabeTudoControllerView` (phase-driven — `question` = a 2×2 A/B/C/D tap grid that locks on pick; `reveal` = "✅ Acertou! +N" / "❌ Errou — era a B" + 🔥streak tag + running total; standings + reactions), `HowToPlay.tsx`, `sabetudo-controller.css`. **+1 line in `CONTROLLER_GAMES`.**
### Tests
- `server/src/tests/sabetudo-game.test.ts` — 11 tests (setup, answer-lock, min-players, auto-advance to reveal + option tally, wrong = 0 + streak reset, faster-correct-scores-more, streak bonus over consecutive rounds, question timeout, full 8-question match to a winner, pause). `multiplayer.integration.test.ts` +1 (Sabe-Tudo catalog + SELECT_GAME + START_GAME + four options + `submitAnswer` via `GAME_ACTION` advancing to reveal + malformed rejection). **Server tests: 94 → 106.**
### Validation
- 106 server tests · `tsc` server/shared clean · `oxlint` host/mobile clean (only the codebase's established `set-state-in-effect` advisory in the feed effect, same as the other 4 host views) · 5-workspace build green.
- **Full live smoke** (host TV + 2 controllers, real server): catalog cover → lobby gated "AGUARDANDO 2+ JOGADORES" → start → `question` renders (category, 4 shuffled options, timer, progress, roster) → phone tap locks the answer → auto-advanced to `reveal` (correct card green + picker names, wrong dimmed with picker, `+727` speed-weighted delta) → question 2 from the +18 pack → `reveal` shows 🔥2 streak + `+858` → pause/resume both surfaces → `END_GAME` → back to the Sabe-Tudo lobby, phones to waiting. **Zero console errors** on host or controllers.
### §52
- The whole game = `shared/{models,games}/sabetudo` + `server/src/games/sabetudo/` + `host/src/games/sabetudo/` + `mobile/src/games/sabetudo/` + **one line in each of the 3 registries**. Zero edits to `core/`, `ws-server.ts`, either shell, or `shared/protocol`. **5 games in the catalog.**

## 2026-09-08 — FDP — Foi De Propósito — game #6 (Cards-Against-Humanity-style, +18), full slice (branch `feature/fdp`)
A shared-TV fill-in-the-blank party game for a grown-up crowd: one prompt (usually a sentence with a blank), every player writes one answer on the phone, the TV shows them shuffled and anonymous, everyone votes for the best (never their own), +100 per vote plus a sweep bonus. 5 rounds; the last ("Final FDP") pays double. This is the game the user asked to be properly +18 — dark, crude, sexual, morbid; guardrails stay: no protected group as the punchline, no real private people, nothing sexual involving minors.

**§47:** the game's own name is **"FDP — Foi De Propósito"**, `gameId: "fdp"`. The in-game `BrandMark` shows the short **"FDP"**. Rename point: `fdpPlugin.meta.name` + the `BrandMark text`.

### Added — code
- `shared/src/models/fdp.ts` + `shared/src/games/fdp/events.ts` (types-only): `FdpPublicState` / `FdpPrivateState` / `FdpPhase` (`writing|voting|roundResults|gameover|paused`) / `FdpAnswer` / `FdpAction` (`submitAnswer` / `castVote`) / `FdpGameEvent`. Answer authorship + vote counts are `null` in the public state until `roundResults`; events carry no answer/vote text. `shared/src/index.ts` re-exports both.
- `server/src/games/fdp/`: `constants.ts` (3–8 players; 5 rounds; 60s/25s/9s windows; `VOTE_POINTS 100`, `SWEEP_BONUS 150`, final ×2; `MAX_ANSWER_LEN 100`), `prompts.ts` (`FDP_PROMPTS` — 58 original PT-BR +18 prompts), `fdp-game.ts` (`FdpGame implements PausableGame, TurnTimedGame` — self-advancing off one server-ticked deadline; answers shuffled + anonymised; skips the vote when nobody wrote anything; sweep bonus when an answer takes every eligible vote; round winner = most votes, `null` on a tie; `getStatus()` = `active` → `complete`), `action-schema.ts` (zod), `plugin.ts` (`fdpPlugin`). **+1 line in `GAMES`.**
- `host/src/games/fdp/`: `FdpHostView` (phase-driven — `writing` progress + ✍️/✅ roster from the event stream; `voting` numbered anonymous answer list + vote count; `roundResults` answers sorted by votes with author, 👑 winner + "FDP!" sweep badges, and voter names; side panel = live standings + `describeEvent` feed + pause/end + `sound-map.ts` "🔊 Som" toggle; `gameover` Overlay), `FdpCover` (inline SVG — a censored speech bubble + an "18" stamp), `describeEvent.ts`, `fdp-host.css` (scoped under `.fdp-host`, `prefers-reduced-motion`-guarded). **+2 imports + 1 entry in `HOST_GAMES`.**
- `mobile/src/games/fdp/`: `FdpControllerView` (phase-driven — `writing` = a `@party/ui TextAnswerInput`; `voting` = tap-to-vote list, own answer excluded, locks on pick; `roundResults` = "👑 Sua resposta ganhou a rodada!" + this round's votes/points; standings + reactions incl. 🍆), `HowToPlay.tsx`, `fdp-controller.css`. **+1 line in `CONTROLLER_GAMES`.**
### Tests
- `server/src/tests/fdp-game.test.ts` — 13 tests (setup, min-players, answer clamp/empty-reject, auto-advance to voting + anonymity, own-answer hidden from the ballot, vote rejections, VOTE_POINTS + sweep + round-winner, final round ×2, writing timeout, skip-vote-when-empty, full 5-round match to a winner, pause). `multiplayer.integration.test.ts` +1 (FDP catalog + SELECT_GAME + START_GAME + shared prompt + `submitAnswer` via `GAME_ACTION` advancing to voting + malformed rejection). **Server tests: 106 → 120.**
### Validation
- 120 server tests · `tsc` server/shared clean · `oxlint` host/mobile clean (only the codebase's established `set-state-in-effect` advisory in the feed effect) · 5-workspace build green.
- **Full live smoke** (host TV + 3 controllers, real server): catalog cover → lobby gated "AGUARDANDO 3+ JOGADORES" → start → `writing` renders (prompt, progress, roster) → phones submit via `TextAnswerInput` → auto-advanced to `voting` (host numbered anonymous list, phone ballot with own answer excluded) → all votes in → `roundResults` (host: winner-row glow + "👑 Bia · FDP!" + "2 votos · Ana, Caio"; Bia +350 = 200 votes + 150 sweep; phone: "👑 Sua resposta ganhou a rodada! · +350") → round 2 auto-advances with scores carried. **Zero console errors** on host or controllers. `END_GAME` → back to the FDP lobby, phones to waiting.
### §52
- The whole game = `shared/{models,games}/fdp` + `server/src/games/fdp/` + `host/src/games/fdp/` + `mobile/src/games/fdp/` (reusing `@party/ui TextAnswerInput`) + **one line in each of the 3 registries**. Zero edits to `core/`, `ws-server.ts`, either shell, or `shared/protocol`. **6 games in the catalog (UNO / Coup / Zap! / Lorota! / Sabe-Tudo / FDP).**


## 2026-09-08 — Toggle "Leve / Pesado" (content intensity) + heavier +18 packs (branch `feature/modo-pesado`)
A room-level content-intensity setting the host flips in the lobby, so a table of test users can dial the humour up or down. Platform feature (like reactions / avatars) — it touches `shared/protocol`, `ws-server`, `Room`, `GameContext` and both shells, but no game engine's rules.

### Added — platform
- `shared/src/games/content-tier.ts`: `ContentTier = 'leve' | 'pesado'`, `CONTENT_TIERS`, `DEFAULT_CONTENT_TIER = 'pesado'` (everything on — matches pre-toggle behaviour).
- `shared/src/protocol/messages.ts`: new client message `SET_CONTENT_TIER { tier }`; `GAME_CATALOG` payload gains `contentTier`.
- `server/src/websocket/protocol.ts`: zod for `SET_CONTENT_TIER`.
- `server/src/core/room.ts`: `Room.contentTier` (default `pesado`) + `setContentTier(tier)` (throws `GAME_IN_PROGRESS` outside `accepting_players`); passed into `plugin.create(ctx)`.
- `server/src/core/game-plugin.ts`: `GameContext.contentTier?: ContentTier` (optional → engines default to `pesado`).
- `server/src/websocket/ws-server.ts`: `SET_CONTENT_TIER` handler (owner-gated, lobby-only) → re-broadcast `GAME_CATALOG`; both catalog sends carry `room.contentTier`.
- `host/src/shell/LobbyScreen.tsx`: a "Conteúdo · 😇 Leve / 🔞 Pesado" segmented toggle, shown only for the tiered games (zap / lorota / sabetudo / fdp), owner-only, with a one-line hint. `host/src/shell/useRoomConnection.ts` + `App.tsx` thread `contentTier` + `onSetContentTier`.
- `mobile/src/shell/WaitingScreen.tsx`: a "😇 Modo leve" / "🔞 Modo pesado (+18)" tag on the waiting screen for the tiered games. `mobile/src/shell/useRoomConnection.ts` + `App.tsx` thread `contentTier`.

### Added — content
Each text game's bank is now split. `leve` = the tamer subset; `pesado` = everything.
- `server/src/games/zap/prompts.ts` — `ZAP_PROMPTS_LEVE` (54) + `ZAP_PROMPTS_PESADO` (65: the old +18 pack + ~34 heavier — explicit sex, escatologia, gore, humor de forca, drogas, sátira de político/popstar como arquétipo, bares fictícios) + `zapPrompts(tier)`.
- `server/src/games/lorota/questions.ts` — `tier: 'pesado'` on every +18 entry + ~16 more heavier real facts (Coca-Cola/cocaína, zangão que explode ao acasalar, sangue azul do caranguejo-ferradura, lobotomia transorbital, rádio como creme vitoriano, gonorreia = "esquentamento", etc.) + `lorotaQuestions(tier)`.
- `server/src/games/sabetudo/questions.ts` — `tier: 'pesado'` on the picante pack + ~11 more (Coca-Cola/cocaína, clitóris ~10 mil terminações, zangão, placebo da pílula, etc.) + `sabeTudoQuestions(tier)`.
- `server/src/games/fdp/prompts.ts` — `FDP_PROMPTS_LEVE` (38 awkward/suggestive) + `FDP_PROMPTS_PESADO` (62: the explicit half of the old deck + ~40 new — the flagship, hardest within the guardrails) + `fdpPrompts(tier)`.

### Guardrails — unchanged, documented in each content file
Even in `pesado`: never a protected group (raça, religião — inclui crente, orientação, deficiência) as the punchline; never a real private person; nothing sexual involving minors; no graphic sex about a named real person; no real specific atrocity with real victims (Mariana/Brumadinho, 9/11, real named killers); nothing written to defame a real named business (Hot Pub, Beco Torto). Inside jokes about real venues are for the group to add by hand.

### Tests
- `server/src/tests/content-tier.test.ts` (5) — every game's `leve` bank is a strict subset with no pesado-tagged entries; undefined tier deals everything.
- `room.test.ts` +1 — tier defaults to `pesado`, is set only in the lobby, and a `leve` FDP engine only holds a `leve` deck.
- `multiplayer.integration.test.ts` +1 — owner flips `SET_CONTENT_TIER`, catalog reflects it; a non-owner player is denied.
- **Server tests: 120 → 127.**

### Validation
- 127 server tests · `tsc` server/shared clean · `oxlint` host/mobile clean · 5-workspace build green.
- **Live smoke** (host + 3 controllers): FDP lobby shows the toggle → flip to Leve (hint text changes, roundtrips via `GAME_CATALOG`) → phones' waiting screens show "😇 Modo leve" → start → every prompt across rounds 1–2 came from `FDP_PROMPTS_LEVE`. Toggle also renders on the Sabe-Tudo lobby and the setting persists across a game switch. Fresh page loads: zero console errors.

## 2026-09-08 — É Você! — game #7 (inspired by PlayStation's *That's You!*), full slice (branch `feature/e-voce`)
A "how well do you know your friends" game: every question is about the players in the room. Introduces two new mechanics for the platform — **voting for a player** (not a text answer) and **drawing** — plus the **Curinga** (wildcard) bet.

**§47:** the game's own name is **"É Você!"**, `gameId: "evoce"`. Rename point: `evocePlugin.meta.name` + the `BrandMark text`.

**No camera** (LAN http blocks `getUserMedia`): a player's "face" is their pixel `<Avatar>`, and drawings are captured as a light **stroke list** in a 0–1000 square (`{ strokes: [{ color, width, points }] }`) — not a bitmap — so they travel tiny over the wire and render crisp SVG at any size.

### 6 fixed rounds
`enquete → legenda → rabisco → enquete → legenda → final` (the last, "A Obra-Prima", is worth double).
- **enquete** — "Quem de vocês…?" → tap a player. Points **by consensus**: `CONSENSUS_POINTS (250)` per other player who voted the same as you. A **Curinga** (2 per player) doubles your enquete points if your vote matched the group's pick; spent either way.
- **legenda** — complete a sentence about the round's target player (`[NOME]` substituted) → vote the best. `VOTE_POINTS (300)` per vote received + `PICK_WINNER_BONUS (100)` for voting the winner.
- **rabisco** — draw over the target ("Desenhe [NOME] como…"); the target ("modelo") does not draw → vote the best.
- **final** — everyone draws themselves from a prompt → vote the best → ×2.

### Added — code
- `shared/src/models/evoce.ts` + `shared/src/games/evoce/events.ts` (types-only): `EvocePublicState` / `EvocePrivateState` / `EvocePhase` (`answering|voting|roundResults|gameover|paused`) / `EvoceRoundKind` / `EvoceStroke` / `EvoceDrawing` / `EvoceSubmission` / `EvocePollBar` / `EvoceAction` (`votePlayer|playJoker|submitCaption|submitDrawing|castVote`) / `EvoceGameEvent`. Authors + votes are `null` in the public state until `roundResults`; events carry no caption/drawing/vote content. `shared/src/index.ts` re-exports both.
- `server/src/games/evoce/`: `constants.ts` (3–8 players; `ROUND_PLAN`; 25/50/75s answering by kind, 25s voting, 9s results; scoring + `JOKER_COUNT 2`; drawing payload guards `MAX_STROKES 500` / `MAX_POINTS_PER_STROKE 512`), `prompts.ts` (four PT-BR banks — enquete / legenda / rabisco / final — each split `leve`/`pesado` with `enquetePrompts(tier)` etc.), `evoce-game.ts` (`EvoceGame implements PausableGame, TurnTimedGame` — self-advancing; per-kind decks; target rotation; consensus + Curinga scoring; `sanitizeDrawing`), `action-schema.ts` (zod incl. a bounded stroke/drawing schema), `plugin.ts`. **+1 line in `GAMES`.**
- `@party/ui`: **`DrawingCanvas`** (pointer-events finger paint, colour/width/undo/clear, exports a stroke list; give it a fresh `key` per round) + **`DrawingView`** (read-only SVG render of a stroke list) + `.ui-draw*` CSS. Exported from `@party/ui`.
- `host/src/games/evoce/`: `EvoceHostView` (phase-driven for all 4 round kinds — answering progress + roster with 🃏 pips, legenda/rabisco/final voting (caption list or `DrawingView` grid), enquete `roundResults` poll bars, creative `roundResults` sorted by votes with 👑, `gameover` Overlay; side panel = standings + `describeEvent` feed + pause/end + `sound-map.ts` "🔊 Som" toggle), `EvoceCover` (inline SVG — a ring of faces + a pointing hand), `describeEvent.ts`, `evoce-host.css` (scoped `.evoce-host`). **+2 imports + 1 entry in `HOST_GAMES`.** Added `evoce` to the lobby's tiered-games set.
- `mobile/src/games/evoce/`: `EvoceControllerView` (enquete player ballot + Curinga button; legenda `@party/ui TextAnswerInput`; rabisco/final `@party/ui DrawingCanvas`, or a "você é o modelo" panel; voting = caption buttons or `DrawingView` grid; standings + reactions), `HowToPlay.tsx`, `evoce-controller.css`. **+1 line in `CONTROLLER_GAMES`.** Added `evoce` to the mobile tiered-games set.

### Tests
- `server/src/tests/evoce-game.test.ts` — 11 tests (setup, min-players, malformed payload, enquete consensus scoring + `matchedGroup`, Curinga double + waste + reject-twice, legenda caption→vote→VOTE_POINTS+PICK_WINNER_BONUS+winner, rabisco model excluded from drawing + not expected, empty-drawing + oversized-stroke rejection, full 6-round match to a winner, final ×2, answering timeout, pause).
- `multiplayer.integration.test.ts` +1 (É Você! catalog + SELECT_GAME + START_GAME + enquete + `votePlayer` via `GAME_ACTION` → `roundResults` with `pollWinnerId` + `pollBars` + malformed rejection).
- `content-tier.test.ts` +1 (all four É Você! banks have a strict `leve` prefix of `pesado`).
- **Server tests: 140 (was 127).**

### Validation
- 140 server tests · `tsc` server/shared/ui clean · `oxlint` mobile clean, host only the established `set-state-in-effect` advisory · 5-workspace build green · `@party/ui` 7 tests green.
- **Full live smoke** (host TV + 3 controllers, real server, a complete 6-round match): enquete consensus scoring + a Curinga doubling Ana's points; legenda `[NOME]` substitution + caption vote + `PICK_WINNER_BONUS`; rabisco "0/2" (model excluded) + "você é o modelo" screen + `DrawingCanvas` strokes → `DrawingView` rendering the 3 polylines on the host + the mobile ballot + vote + score; round plan sequence; final "A Obra-Prima" with the ×2 multiplier on votes *and* the pick bonus; `gameover` overlay ("🏆 Bia venceu!" 2600/1950/1700). Toggle shows on the É Você! lobby ("🔞 Modo pesado" on the phones). **Zero console errors** on the host tab and the fresh controller tab.

### §52
- The whole game = `shared/{models,games}/evoce` + `server/src/games/evoce/` + `host/src/games/evoce/` + `mobile/src/games/evoce/` + `@party/ui` `DrawingCanvas`/`DrawingView` (reusable) + **one line in each of the 3 registries** (+ 2 lines adding `evoce` to the frontend tiered-games sets). Zero edits to `core/`, `ws-server.ts`, either shell's flow, or `shared/protocol`. **7 games in the catalog.**

## 2026-09-08 — Catalog coverflow + per-game personality (branch `feature/catalog-coverflow`)
The game picker (`host/src/shell/CatalogScreen.tsx`) was a flat 7-card grid. Redesigned it as a **3-up coverflow reel**: the focused game sits big and centre with its own accent glow, the two neighbours flank it small and tilted (3D `rotateY`), everything else parks off-stage. ← → / on-screen ‹ › arrows / clicking a side card / the position dots all rotate the reel; Enter or the centre card or the "▶ Iniciar" button starts it. Circular wrap-around.

### Per-game "personality" (host, game-scoped — §52 spirit)
- New `GamePersonality { accent, vibe, blurb }` in `host/src/games/types.ts`; each game ships one at `host/src/games/<id>/personality.ts` (7 files) and the registry wires it into `HostGameEntry` (now `{ View, Cover, personality }`).
- `accent` retints the ambient wash, the focused frame's ring/shadow, the vibe tag, the blurb and the "Iniciar" button as you scroll. `vibe` is a one-word mood stamped on the centre card (RAIVA / TRAIÇÃO / EGO / MENTIRA / SOBERBA / SAFADEZA / AMIZADE). `blurb` is an acid PT-BR one-liner shown under the reel.
- `App.tsx` passes a `personalities` record alongside `covers`; a `FALLBACK_PERSONALITY` covers an unknown id.

### Sound
- The catalog now plays the shared synth `@party/ui` sounds: `select()` on each reel step, `special()` on pick. (No audio files — the §47 synth-only decision stands; see "notes" below.)

### CSS — `host/src/shell/shell.css`
- Replaced the whole `.catalog-*` grid block with `.cf-stage` / `.cf-reel` / `.cf-card` (offset-driven `transform`/`opacity`/`z-index` via `--off`/`--abs` custom props) / `.cf-frame` (idle float on centre) / `.cf-vibe` / `.cf-hero` / `.cf-start` / `.cf-dots` / `.cf-arrow`. `color-mix()` for the accent tints. `prefers-reduced-motion` drops the float, the reel transition and the retint.

### Notes / not done
- **External sprite/sound packs (SpriteCook etc.):** left out on purpose — the project has a standing "own visual identity" (§47) rule and a synth-only sound decision. Vendoring third-party game art/audio would reverse both and add binary assets to a repo that deliberately has none. Flagged to the user to decide.

### Validation
- Host `tsc -b` + `vite build` green; `oxlint` host clean (only the established `set-state-in-effect` advisory, matching the rest of the shell). Server/shared/mobile/ui untouched — 140 server tests still the baseline.
- Live check (host tab, real server): reel math verified for all 7 games (centre `--off:0` opacity 1, ±1 at 0.66 tilted, ±2 at 0.32, ±3 parked, circular wrap); accent/blurb/start-label/active-dot all track focus; "▶ Iniciar" → lobby with the right game selected; zero console errors.

### §52
- Zero edits to `core/`, `ws-server.ts`, `shared/`, the mobile app, or either shell's flow machine. Adding a game now also wants a `personality.ts` in its host folder (registry entry gains one field) — still a one-folder job.

## 2026-09-08 — "Gabsinto" easter-egg avatar presets (branch `feature/gabsinto`)
A hidden portrait avatar set unlocked by typing the name **"Gabsinto"** on the join screen.

- **`AvatarSpec.preset?`** (shared, types-only) — when set to a known id, `<Avatar>` renders that portrait full-bleed (`<img class="ui-avatar-preset">`) and ignores every paperdoll field. `sanitizeAvatar` drops unknown values.
- **`tools/build-gabsinto.py`** (Pillow, dev-only) — 8 owner-supplied AI portraits in `tools/gabsinto-source/` → `ui/src/avatar-presets/`: `<id>.webp` (320² face crop) + `<id>-full.webp` (≤1000px, reserved for the glory-moment splash) + typed `index.ts` (`AVATAR_PRESETS`, `getAvatarPreset`) + `CREDITS.md`. ~810 KB, committed. Presets: rei / general / lorde / nobre / executivo / enigma / stand / feiticeiro.
- **`@party/ui`** — `avatar.ts` adds `isGabsintoName()` + `GABSINTO_NAME` and re-exports the preset catalog; `AvatarEditor` gains `presetsUnlocked` → a "🕵️ Lendas" thumbnail row (picking a normal attribute clears the preset). `.ui-avatar-preset` / `.ui-ae-legend*` CSS. New exports on `@party/ui`.
- **server** — `avatarSchema` (`.strict()`) gains `preset` (optional, ≤24 chars). Structural validation only; the renderer clamps unknown ids.
- **mobile** — `App.tsx` owns `legendsUnlocked`, persisted in `localStorage['party:legends']`, flipped once `isGabsintoName(name)` matches; threaded to `JoinScreen` + `WaitingScreen`.
- `.gitignore` += `/gabriel-source/`.

### Validation
- 140 server tests · 7 `@party/ui` tests · `tsc` server/shared/ui clean · `oxlint` host/mobile clean (established `set-state-in-effect` advisory only) · 5-workspace build green.
- **Live E2E**: type "Gabsinto" → Lendas row (8) appears → pick "O Rei" → editor preview + waiting-screen avatar become the portrait `<img>` → join a real room → `UPDATE_AVATAR` over the wire → host lobby roster renders the portrait. Picking any normal attribute reverts to the pixel paperdoll. Zero console errors.

### Notes
- The **glory-moment cameos** (a preset portrait filling the per-game victory overlays) are the next slice — the avatar itself shipped first.
- Same batch: the owner **lifted the §47 "own visual identity" rule and the synth-only sound rule** — curated permissively-licensed public asset packs (art + per-game sound) are now allowed, bundled, with per-pack credits. `master-prompt.md` is left untouched; the override is recorded in CLAUDE.md + the change log.

### §52
- Platform-level change (like avatars / reactions): `shared` (1 optional field) + `@party/ui` + `mobile` shell + the protocol schema (1 optional field). No engine, no `core/`, no `ws-server` logic, no host game view. Adding a game is unaffected.

## 2026-09-08 — Real sound: CC0 Kenney sample pack (branch `feature/gabsinto`)
The host sound was synth-only (8 Web-Audio blips). Added a **bundled CC0 clip pack** on top, wired into every game.

- **`@party/ui` sound engine** — `Sounds` gains `sample(id, opts?)` and `play()` now accepts `SoundSpec` (`SoundName | { sample, gain?, rate? }`). Clips decode once into `AudioBuffer`s, play through the same master gain + mute state as the synth. The pack (`ui/src/sound-assets/`) is loaded via a lazy `import()` the first time a sample plays, so the **mobile controller ships zero audio** (stays silent by design) — host gets a ~1 KB lazy chunk.
- **`tools/build-sound-pack.py`** (dev-only) curates ~24 clips from three CC0 Kenney packs (Interface Sounds, Casino Audio, Music Jingles) into `ui/src/sound-assets/` (`<id>.ogg` + typed `index.ts` + `CREDITS.md`). ~260 KB. Only the renamed output is committed; `tools/sound-source/` is gitignored (re-fill with `--import`).
- **Every game's `sound-map.ts` upgraded** to return `SoundSpec`: card sounds for UNO/Coup deals, chip/clash for Coup coins & challenges, `ui-*` clips for confirm/error/toggle/reveal, and **Kenney "Music Jingles" stingers** for round-end / game-over / the Zap! "ZAP!" sweep & É Você! Curinga. Synth stays for the fast, frequent events (turn ticks) and the iconic UNO call.
- **Coup finally has sound** — new `host/src/games/coup/sound-map.ts` + wiring + a "🔊 Som" toggle in `CoupHostView` (closes the long-deferred D6 sound half).

### Validation
- 140 server tests · 8 `@party/ui` tests (2 new: `sample()` / `play({sample})`) · `tsc` + `oxlint` clean · 5-workspace build green.
- Live check (host, real dev server): `getSounds().sample()` and `play({sample})` fetch + `decodeAudioData` + start `AudioBufferSourceNode` with no errors; the lazy `sound-assets` chunk splits out of the main bundle; fresh host tab has zero console errors.

### License
- All 24 clips are **Kenney.nl, CC0 1.0** (public domain). `ui/src/sound-assets/CREDITS.md` lists every clip → original. First use of the §47 lift.

## 2026-09-08 — crash fix + mobile leave/accessibility + catalog how-to (branch `feature/mais-diversao`)

### Fix: server no longer crashes on an oversized WebSocket frame
An elaborate É Você! drawing serialised past the 16 KB `maxPayload` cap; `ws` then emitted an unhandled `'error'` on the socket and **took down the whole server process** (`WS_ERR_UNSUPPORTED_MESSAGE_LENGTH`).
- `ws-server.ts` — `socket.on('error', …)` per connection (log + `terminate()`) and `wss.on('error', …)`; `maxPayload` raised 16 KB → 128 KB (a full drawing / a voting-phase public state carrying several).
- `DrawingCanvas` — points are now integers (`Math.round`), `MIN_STEP` a touch larger, `MAX_STROKES` 500 → 240, and `fitDrawing()` decimates the stroke list (keeping endpoints) until it serialises under 60 KB before submit.
- `server/src/games/evoce` — `MAX_POINTS_PER_STROKE` 512 → 256, new `MAX_TOTAL_POINTS` (6000 pairs) budget; `sanitizeDrawing` rounds + clamps + enforces the budget instead of trusting the schema. New test: a big-but-valid drawing is clamped, not rejected. **Server tests 140 → 141.**

### Mobile: leave the room / go back to the start
- New `LEAVE_ROOM` client message (`shared` + server zod + `ws-server` handler — removes the player immediately, forgets the socket identity, broadcasts `PLAYER_LEFT`).
- `useRoomConnection.leaveRoom()` clears the stored session + local state (socket stays up). `WaitingScreen` gains a "◀ Sair e trocar de sala" button, so after a game ends / a disconnect you can drop back to the code-entry screen and join a different room.

### Accessibility
- **Text scale** — a floating `A＋` button (bottom-left, `mobile/src/shell/TextScaleButton.tsx`) cycles the whole UI's text 100 % → 115 % → 130 % → 145 % by bumping the root font-size (every mobile size is in rem). Persists per device (`localStorage['party:textscale']`).
- **Bigger avatars** — `PlayerRoster` mini-avatars 30/22 → 40/32 px; every in-game roster pill avatar 20 → 30 px (28 → 36 in É Você!).

### Catalog: how each game actually works
- `GamePersonality` gains a `how` field — one plain sentence of real mechanics — shown under the acid blurb on the focused coverflow card. One line added to each of the 7 `personality.ts`.

### Deferred to their own slices (asked in the same message)
- Configurable round / question counts per game (a lobby control).
- Transitional scoreboard scenes between rounds + dynamic player taunts (roast the last place, hype the leader).
- Taylor Swift facts in the trivia / Lorota! banks.
- Per-game background art (CC0 packs).

### Validation
- 141 server tests · 8 `@party/ui` tests · `tsc` + `oxlint` clean · 5-workspace build green.
- Live: a 400 KB frame now closes just that socket (server stays up, logs a warn); a 30 KB frame is accepted; the mobile leave button returns to Join; the text-scale button steps + persists the root font-size; the catalog shows the `how` line.

## 2026-09-09 — §47 "own visual identity" clause retired (owner instruction)
`.copilot/spec-kit/master-prompt.md` §47 kept its heading and number but the two lines forbidding third-party visual identity / assets / sounds are struck, with a dated retirement note in their place. Permissively-licensed asset packs (CC0/CC-BY/OGA-BY/MIT-like), bundled with a `CREDITS.md`, are now unrestricted. Reproducing a real product's trademark/logo is still out. Every `§47:` code comment was cleaned up; no behaviour change.

## 2026-09-09 — round taunts + Taylor Swift content (branch `feature/mais-diversao`)

### The "atiçada" — a roast/hype line between rounds
- `@party/ui` `roundTaunt(standings, seed)` — a deterministic PT-BR one-liner that names the current leader and the current last place (14 templates + a flat-tie line; one references Taylor Swift's re-recordings, per request). `.round-taunt` style in `components.css` (accent, italic, slides in, reduced-motion aware).
- Wired into the results/reveal phase of **all five multi-round games** — Sabe-Tudo, Zap!, FDP, Lorota!, É Você! (seed = round number so it doesn't reshuffle on re-render).
- `ui/src/taunt.test.ts` (4). **`@party/ui` tests 8 → 12.**

### Taylor Swift facts
- Sabe-Tudo: 12 new questions, category "Taylor Swift" (leve) — 1989 / re-recordings / Folklore+Evermore / Eras Tour / the cats / lucky number 13 / Grammy AOTY record / Travis Kelce / debut album / the 10-minute "All Too Well".
- Lorota!: 7 new "fato com lacuna" (leve) on the same facts.

### Still deferred (same original message)
- Configurable round / question counts per game (a lobby control).
- A full transitional scoreboard *scene* (this ships the taunt line; the animated full-screen scene is separate).
- Per-game background art.
- **Sound polish is now the owner's — being done in a separate chat.**

### Validation
- 141 server tests · 12 `@party/ui` tests · `tsc` + `oxlint` clean · 5-workspace build green.

## 2026-09-09 — configurable match length (branch `feature/rodadas-e-cenas`)
The host can now dial how many rounds / questions a game runs, in the lobby.

- `GameMeta.lengthOptions` (`{ label, values[], default }`) — a game opts in by declaring it. `GameContext.matchLength` carries the chosen value to the engine.
- New `SET_MATCH_LENGTH { gameId, length }` client message (owner-gated, lobby only, value must be in `lengthOptions.values`); `GAME_CATALOG` now carries `matchLengths: Record<gameId, number>`. `Room.matchLengths` + `setMatchLength` + `matchLengthFor`.
- Engines: Sabe-Tudo (8/12/16/20, default 12), Zap! (3/5/7, default 3), Lorota! (3/5/7, default 3), FDP (3/5/7, default 5) — each replaces the `TOTAL_ROUNDS` constant with a per-instance `this.totalRounds` (`ctx.matchLength ?? TOTAL_ROUNDS`). É Você! keeps its fixed 6-round plan.
- Host `LobbyScreen`: a segmented picker next to the content-tier toggle, using the selected game's `lengthOptions`.
- `sabetudo-game.test.ts` +2, `room.test.ts` +1. **Server tests 141 → 144.**
- `tsc` + `oxlint` clean, 5-workspace build green.

## 2026-09-09 — the between-rounds scoreboard scene (branch `feature/rodadas-e-cenas`)
- `@party/ui` `<RoundScoreboard>` — a big animated leaderboard for the host TV: ranked rows (medals for the top 3), score bars that scale to the leader, a "+N this round" chip that pops in, streak flames, and the `roundTaunt` line underneath. Staggered row entrance, `prefers-reduced-motion` aware. `.ui-scoreboard*` styles in `components.css`.
- Wired into the results/reveal phase of Sabe-Tudo, Zap!, FDP, Lorota!, É Você! (replaces the plain taunt line added earlier). Title reads "Rodada X de Y" (or "Última Chance" / "Final FDP" / "Lorota Final" on the last round).
- `tsc` + `oxlint` + build green; 144 server / 12 ui tests.

## 2026-09-09 — per-game lobby backdrop (branch `feature/rodadas-e-cenas`)
The lobby (the screen players stare at while waiting) now wears the selected game's art:
- The game's cover SVG is blown up, blurred and faded behind the lobby card; a radial wash in the game's personality accent sits over it; the card goes semi-transparent with a `backdrop-filter` blur so the art reads through the edges.
- `LobbyScreen` gets `covers` + `personalities` from `App`; `--game-accent` drives the tint. `prefers-reduced-motion` drops the scale.
- No new assets — reuses the coverflow `Cover` components, tying the lobby to the catalog look.
- **In-game backdrops are a follow-up** (each host view would need per-layout care); this ships the lobby, which is the highest-dwell screen.

### Validation for the whole `feature/rodadas-e-cenas` branch
- 144 server tests · 12 `@party/ui` tests · `tsc` + `oxlint` clean · 5-workspace build green.
- Live: the match-length picker (8/12/16/20 for Sabe-Tudo) round-trips through `SET_MATCH_LENGTH` → `GAME_CATALOG`; the engine reads the chosen count; the lobby backdrop + accent render per game.

## 2026-09-09 — local meme-sound layer + new attract screen (branch `feature/som-e-tela-inicial`)

### Sound — the owner's local override layer
- `@party/ui`: `SoundSpec` gains a `{ cue, fallback? }` variant and a `registerCues(map)`
  function that fills a runtime `cue name → clip URL` registry. `play({ cue })` plays the
  registered clip if there is one, otherwise the `fallback` — so a fresh checkout sounds
  exactly as before. `sound.ts` internals refactored so sampled clips and cue clips share
  one decode/cache/gain path. `sound.test.ts` +1 (13 `@party/ui` tests).
- Host: `shell/localSounds.ts` fetches `/sound-local/manifest.json` once at startup and
  registers it. `host/public/sound-local/` is a **gitignored drop folder** — the owner drops
  their own clips there and maps them to cues in `manifest.json`. Only the scaffolding
  (`README.md`, `manifest.example.json`, `.gitkeep`) is committed.
- The 7 per-game `sound-map.ts` files now emit `{ cue: 'meme.*', fallback: <previous sound> }`
  at the high-value moments: round / question start, answer & vote reveals, match win
  (incl. a Zap! sweep), the game-over screen, a Coup challenge, a Coup elimination. Cues
  `meme.loser / correct / timeout / afk / fooled / deadLobby` are listed in the example
  manifest but not triggered yet.
- Why: the §47 asset rule is fully lifted, but rather than commit third-party rips this keeps
  the repo clean and lets the owner attach whatever clips they want per machine.

### Attract screen — owner illustration + self-contained CRT panel
- `tools/build-attract-bg.py` (Pillow, dev-only) bakes the committed
  `host/src/shell/attract-bg.webp` (~250 KB) + a `CREDITS.md` from the owner's render in
  `gabriel-source/` (gitignored). Current art: a 16:9 game-night room.
- `AttractScreen.tsx`: the art fills the viewport with `background-size: cover` and drifts
  with the mouse (a bounded translate on a 6%-bleed layer). The live bits — room code,
  connected-phone count, QR + join URL, and the yellow "pressione qualquer tecla" banner —
  sit in a **self-contained CRT-styled panel** floated over the scene (dark glass, bezel,
  scanlines + flicker, glow). Nothing is measured against the art, so swapping the background
  image can't break the layout. A radial vignette pulls focus to the panel. CRT flicker +
  CTA pulse + parallax all off under `prefers-reduced-motion`. Wordmark + tagline are part of
  the art, so `BrandMark` is no longer used here. Room code + QR now appear on the attract
  screen (were lobby-only), so phones can join before the host picks a game.
- No protocol / core / engine / shell-flow changes. 144 server tests, 13 `@party/ui` tests,
  `tsc` + `oxlint` clean, 5-workspace build green. Verified live at portrait, 16:9 and wide.

### Follow-ups (same branch)
- `tools/fetch-local-sounds.mjs` — dev convenience for the owner: copies `*.mp3/ogg/wav` +
  `manifest.json` from `gabriel-source/sound-local/` (the owner's editable stash) into the
  gitignored `host/public/sound-local/`, then tops up any gaps by scraping a curated set of
  Myinstants pages. Nothing here is committed.
- Attract screen iterated to its final form: `cover`-fill background + mouse parallax + a
  self-contained CRT panel for the live bits (see above). Earlier attempts pinned the overlay
  to the baked TV (aspect-locked stage, then cover-fit math) and broke whenever the art
  changed — the panel approach doesn't.

## 2026-09-09 — Catalog + lobby over owner art (branch `feature/telas-com-arte`)
### Added
- `tools/build-screen-bg.py` (Pillow, dev-only) — bakes `host/src/shell/catalog-bg.webp`
  and `host/src/games/lorota/lobby-bg.webp` (+ `*.CREDITS.md`) from owner renders in the
  gitignored `gabriel-source/` (renamed there to `bg-catalog-room.png` /
  `bg-lobby-lorota.png`; the two target mockups kept as `mock-*-target.png`).
- Catalog screen reskin: the 3-up coverflow now floats over `catalog-bg.webp` (`cover`
  fit, vignette + accent wash, nothing measured against the art). Cards gain a vibe tab,
  an optional torn sticky-note badge, a "tags" strip and a players · duration · chaos
  stat row; green brush `▶ Iniciar` pill; position dots + `n / total`.
- `GamePersonality` (host, `host/src/games/types.ts`) gains `tags?: string[]`,
  `duration: string`, `chaos: string`, `badge?: string`; filled in all 7 personality files.
- `HostGameEntry` gains optional `lobbyBg` (imported webp URL). When present the lobby
  renders in **art mode**: the image is letterboxed at 16:9 and the live bits (QR + room
  code, player tiles + empty "aguardando" slots, a functional start button) drop into
  fixed `%` slots that line up with the panel frames painted into the art. The
  "COMO JOGAR?" panel, the stats strip and the wordmark stay as painted art. Off-layout
  controls (trocar de jogo, Rodadas, Conteúdo Leve/Pesado, online count) sit in a slim
  glass strip pinned to the bottom edge. Container-query units scale every overlay with
  the stage. Only `lorota` ships a `lobbyBg` for now.
- Mobile: the per-game "? Como jogar" button is now also shown on the `paused` screen of
  the 6 games with a `HowToPlay` (coup / zap / lorota / sabetudo / fdp / evoce), and — via
  a new `CONTROLLER_HOW_TO_PLAY` registry map — on the **waiting screen** once the host has
  picked a game, so players can read the rules before it starts.

### Changed (after owner review)
- Lobby art mode: player tiles darkened to a near-opaque neutral (`rgba(6,9,12,.82)`) so the
  painted teal panel no longer casts a green haze over the avatars/names.

### Unchanged
- The other 6 games keep the plain card lobby (the art-mode branch is only taken when a
  `lobbyBg` exists). No protocol / core / `ws-server` / shell-flow / engine changes (§52).
- 144 server tests, `tsc` + `oxlint` clean, 5-workspace build green.

### Why
- The owner wants each screen to carry the game-night illustration style, with per-game
  lobby art (Lorota first). The catalog uses the robust `cover`+overlay approach from the
  attract screen; the lobby needs rough alignment to painted panels, so it letterboxes at
  16:9 and positions in `%` — new per-game lobby art must keep that panel geometry.

## 2026-09-09 — Dilema nos Trilhos — game #8 (branch `feature/dilema`, off `develop`)
### Added
- **Game #8 "Dilema nos Trilhos"** (`gameId: "dilema"`) — a trolley-problem debate game
  inspired by *Trial by Trolley* (clean-room; the mechanic is the trolley problem, all
  text is original PT-BR). §47 own name.
- Loop of a round (self-advancing off one server-ticked deadline, like FDP/Lorota):
  `assigning` (4s — a Maquinista is picked, rotating by join order; the rest are
  **re-split** into Trilho Esquerdo / Direito each round; one seed innocent per track) →
  `playing` (75s — every non-Maquinista holds a 5-card hand and plays freely: `innocent`
  on their OWN track, `guilty` on the ENEMY track, `modifier` stapled onto a specific
  base card on either track; "✅ Pronto" to stop early) → `verdict` (30s — the Maquinista
  picks which track the trolley runs over; timeout = coin flip) → `roundResults` (8.5s).
- **No points economy** — the score *is* the number of rounds a player's track was
  spared. The game crowns whoever was spared most. `standings` carry `spared` + a
  per-round `roundDelta` so the shell's between-rounds scoreboard scene still works.
- `minPlayers 3`, `maxPlayers 10`, lobby-configurable rounds (`lengthOptions` 3/5/7,
  default 5), Leve/Pesado content tiers.
- Whole game = `shared/{models,games}/dilema` + `server/src/games/dilema/`
  (`constants`, `cards.ts` — original PT-BR innocent/guilty/modifier banks split
  leve/pesado with the standard guardrail header, `pairing.ts` pure round planner,
  `dilema-game.ts` `implements PausableGame, TurnTimedGame`, `action-schema.ts`,
  `plugin.ts`) + `host/src/games/dilema/` (`DilemaHostView`, `DilemaCover`,
  `describeEvent`, `sound-map.ts`, `personality.ts`, `dilema-host.css`) +
  `mobile/src/games/dilema/` (`DilemaControllerView` — hand + track/target picker,
  Maquinista lever, mini read-only tracks; `HowToPlay`; `dilema-controller.css`) +
  **one line in each of the 3 registries** + `dilema` added to the `TIERED_GAMES` set in
  `host/src/shell/LobbyScreen.tsx` and `mobile/src/App.tsx` (same as every tiered game).
- `dilema-game.test.ts` (19) + a multiplayer integration path (1). **Server tests
  144 → 164.**

### Unchanged (§52)
- Zero edits to `core/`, `ws-server.ts`, `shared/protocol`, or either shell **flow**.
- `tsc` + `oxlint` clean, 5-workspace build green. Live smoke: host TV + 3 phones, full
  round 1 (assign → play innocent/guilty/modifier → pass → timeout → verdict → results
  with ATROPELADO/POUPADO stamps + scoreboard) into round 2 (re-division + Maquinista
  rotation); 0 console errors.

### Why
- Next game on the roadmap after É Você!. Same §52 mould as the 7 prior games; the one
  new idea (teams) lives entirely inside the game module.

## 2026-09-09 — polish + repo presentation (branch `feature/dilema-melhorias`, off `feature/dilema`)
### Added
- **`README.md` rewritten** for GitHub — badge row, centred header, the 8-game catalogue
  table, quick start, an ASCII component diagram, the "add a game = a folder per layer +
  one registry line" story, a stack table, quality commands. A top-of-file comment points
  at the knobs to personalise (badges, accent colour, per-game emoji). No third-party
  product names.
- **`LICENSE`** — the ISC text `package.json` already declared.
- **`CONTRIBUTING.md`** — environment, the pre-PR check list, the project principles, the
  "add a game" pointer.
### Changed
- **Dilema nos Trilhos**: the trolley slides into the doomed track on `roundResults`
  (`dil-crash-left` / `dil-crash-right`, `prefers-reduced-motion`-guarded). +3
  engine tests (disconnect closes the round, idempotent pass, Maquinista can't
  pass) → `dilema-game.test.ts` 19 → 22, **server suite 164 → 167**.
- **Hidden "Lendas" avatar row** — the unlock now lives in `sessionStorage`, not
  `localStorage`, and any old permanent unlock is cleared on load. The easter-egg row no
  longer stays visible to whoever next picks up that phone; it still survives reloads and
  reconnects within one session. (`mobile/src/App.tsx`.)
### Unchanged
- 167 server tests, `tsc` + `oxlint` clean, 5-workspace build green.

## 2026-09-09 — attract screen = pure poster (branch `feature/dilema-melhorias`)
### Changed
- **Attract/start screen is now pure presentation.** The owner-supplied posters
  (`gabriel-source/mock-poster-{wide,portrait}.png`, wordmark + tagline already
  painted in) fill the viewport with `background-size: cover` + mouse parallax;
  the only live element is the yellow "toque para começar" sticker. The room
  code, QR code and connected-phone count were **removed** from the attract
  screen — they live in the lobby only (`LobbyScreen`'s `QrPanel`, unchanged).
- `tools/build-attract-bg.py` now bakes two variants —
  `host/src/shell/attract-bg.webp` (landscape, 1672×941, 246 KB) and
  `attract-bg-portrait.webp` (portrait, 1086×1448, 295 KB); a
  `@media (orientation: portrait)` rule swaps to the portrait poster
  (`background-position: left center` to keep the wordmark).
- `AttractScreen` props collapsed to just `onStart` — `App.tsx` no longer passes
  `roomCode`/`connected`/`onlineCount`/`joinUrl`/`joinQrDataUrl` (and its now-unused
  `onlineCount` local was dropped). Removed the `.attract-panel` / CRT-`fx` /
  `.attract-code` / `.attract-join*` CSS + the `attract-flicker` keyframes.
### Unchanged
- §52 untouched (shell-only). 167 server tests, `tsc` + `oxlint` clean, 5-workspace build green; live-verified on the host (landscape + portrait) — poster fills the screen, tap/key advances to the catalog, lobby still shows the QR + code.

## 2026-09-09 — lobby "art mode" for all 8 games (branch `feature/dilema-melhorias`)
### Added
- **Every game now ships `host/src/games/<id>/lobby-bg.webp`** — one owner-generated
  painted room per game (wordmark + tagline, `ENTRE PELO SEU CELULAR` panel with a
  blank QR square, an empty centre frame, a `COMO JOGAR?` panel with 3 steps, a
  painted `COMEÇAR X` pill, a stats strip). All 8 were made from one prompt so they
  share pixel-identical panel geometry. Sources: `gabriel-source/backgrounds/*.png`
  (gitignored). The whole catalogue lands in "art mode" — the plain-card lobby is
  now only the fallback when a game has no `lobbyBg`.
- **`tools/lobby-bg-prompts.md`** — the master image prompt + per-game fill-in table
  + the measured live-zone coordinates, so a render can be regenerated to match.
### Changed
- `tools/build-screen-bg.py` — the single `lobby-lorota` key became
  `lobby-<id>` for all 8 games (`gabriel-source/backgrounds/<file>.png` →
  `host/src/games/<id>/lobby-bg.webp` + `.CREDITS.md`). Lorota's old backdrop
  (from `bg-lobby-lorota.png`) was replaced by the new consistent-geometry render.
- `host/src/games/registry.ts` — all 8 `HOST_GAMES` entries now carry `lobbyBg`.
- `host/src/shell/LobbyScreen.tsx` (art-mode branch) — the QR slot split into
  `.lobby-slot-qr` (the real QR image only, over the painted white square) +
  `.lobby-slot-code` (room code + url, over the painted dark box); roster avatars
  40px.
- `host/src/shell/shell.css` — `.lobby-slot-*` retuned to the **measured**
  geometry (QR 14.4%/36.8%/11.5%×20.6%, code 12%/58.5%, players 30%/28.5%/41%×42%
  with a 5-col grid, start 37.5%/74%/25%×13% as a pill). Softer stage vignette.
- The full-bleed `.host-lobby::after` wash (built to sink the blurred cover-art
  behind the *plain card*) was fogging the painted room in art mode — scoped it to
  `.host-lobby:not(.lobby-art)::after`. `--game-accent` now has a base value on
  `.host-lobby` so it's never undefined.
- **Esc in the lobby** now goes back to the catalog (same as "Trocar de jogo") —
  a `keydown` effect in `LobbyScreen`, mirroring `CatalogScreen`'s Esc→attract.
### Unchanged
- §52 untouched (shell + tooling only — no `core/`, `ws-server`, `shared/`, engines).
  167 server tests, `tsc` + `oxlint` clean, 5-workspace build green. Live-verified
  on the host: the 4 live slots render exactly on the painted panels (measured in
  the DOM), all 8 `lobbyBg` imports resolve.
### Notes / follow-ups
- `dilema.png` wordmark reads "TRIILHOS" (double i); `fdp.png` accent came out
  near-identical pink to `zap.png`. Both are regen-only fixes (owner's call).
- Design canvas (Box Fiesta Lobby artifact) matches what shipped.

## 2026-09-09 — real catalog covers (branch `feature/thumbs-catalogo`)
### Changed
- The 8 coverflow thumbnails are now **owner-generated key art**
  (`host/src/games/<id>/cover.webp`, 3:2, ~170 KB) instead of inline SVG — all
  from one prompt (`tools/cover-art-prompts.md`) for a consistent set. Each
  `<Id>Cover.tsx` is now a 3-line `<img className="game-cover-svg">`; the CSS
  class gained `object-fit: cover`. `HOST_GAMES` / `CatalogScreen` unchanged
  (`Cover` is still an FC).
- `tools/build-screen-bg.py` gained `cover-<id>` keys (`gabriel-source/thumbs/*.png`
  → `cover.webp`, capped at 1000 px).
### Unchanged
- Shell + tooling only. 167 server tests, `tsc` + `oxlint` clean, 5-workspace
  build green; live-verified — coverflow shows the real art, vibe chip + badge
  overlay correctly, 0 console errors.

## 2026-09-09 — mobile art + join-screen redesign (branch `feature/mobile-arte`)
### Added
- **`mobile/src/shell/mobile-bg.webp`** — owner "phone as controller" illustration
  as the `body` background (full-bleed, fading to near-solid dark), 720 px / ~107 KB.
  `tools/build-screen-bg.py` gained a `mobile-bg` key; `tools/mobile-art-prompts.md`.
- `@party/ui` `AvatarEditor` gained `previewSize` / `collapsible` / `arrows` props
  (backward-compatible — `WaitingScreen`'s usage is unchanged).
### Changed
- **`JoinScreen` redesigned** (owner direction): name + avatar up top, the avatar
  is the protagonist (168 px preview, ‹ › re-roll, 🎲 Surpresa, the attribute
  pickers tucked into a closed **"Personalizar avatar"** accordion); the room-code
  field + **🎮 Entrar na sala** sit together in a **sticky footer**. No card
  wrapper — the illustration breathes through; labels over it get a chip. The
  "Seu celular é o controle" tagline and the on-screen avatar credit line were
  removed (the LPC/OGA-BY credit stays in `ui/src/avatar-assets/CREDITS.md`).
- `mobile/src/shell/shell.css` — `.join` open layout + `.join-cta-bar` sticky
  footer; `.waiting-panel` / `.players-panel` frosted so the bg reads behind them;
  removed the now-dead `.avatar-credit`.
- `mobile/src/App.tsx` / `JoinScreen` dropped the unused `brandName` prop.
### Unchanged
- Shell + `@party/ui` only (§52 untouched). 167 server tests, `tsc` + `oxlint`
  clean, 5-workspace build green; live-verified on a phone viewport (default,
  accordion open, and the sticky footer holding while scrolling).

## 2026-09-09 — game #9 "Sintonia" (branch `feature/sintonia`)
### Added
- **Sintonia** — game #9, *Wavelength*-inspired (clean-room; the hidden-dial
  mechanic only, all PT-BR text original). `gameId: "sintonia"`, BrandMark
  "Sintonia", accent teal `#2dd4bf`, vibe `TELEPATIA`. **Team game**, scored by
  team; `minPlayers 3`, `maxPlayers 8`, **tiered** (leve/pesado spectrum bank),
  rounds `[4, 6, 8]` default `6`.
- Loop (self-advancing off one deadline, like Dilema/FDP): `cluing` (45s — teams
  re-split, a **médium** rotates by join order, sees a hidden `target` ∈ [4,96]
  and types ONE clue ≤ 60 chars, digits rejected) → `guessing` (40s — the médium's
  team drags a 0–100 dial; the other team bets `left`/`right` of where it lands)
  → `reveal` (9s — bands ±6/±14/±22 → 4/3/2 pts for the active team, +1 for the
  other team's right side-call; a médium who never clued = round skipped, nobody
  scores) → next round → `gameover`.
- Whole game = `shared/{models,games}/sintonia` + `server/src/games/sintonia/`
  (`constants`, `spectrums.ts` ~66 PT-BR pairs leve/pesado, `pairing.ts` pure
  round planner, `sintonia-game.ts` `implements PausableGame, TurnTimedGame`,
  `action-schema.ts`, `plugin.ts`) + `host/src/games/sintonia/` (`SintoniaHostView`,
  `SintoniaDial` — pure-SVG semicircular gauge sampled as polylines, `SintoniaCover`
  inline SVG, `describeEvent`, `sound-map`, `personality`, css) +
  `mobile/src/games/sintonia/` (`SintoniaControllerView` role-driven —
  medium / dial-slider / side-bet / idle, `HowToPlay`, css) + **1 line in each of
  the 3 registries** + `sintonia` in `TIERED_GAMES` (host `LobbyScreen` +
  `mobile/App.tsx`). `sintonia-game.test.ts` (18) + 1 integration case →
  **167 → 186 server tests**.
- **Owner key art landed** — `tools/build-screen-bg.py` `GAMES` dict gained
  `sintonia`; `cover-sintonia` → `host/src/games/sintonia/cover.webp` (3:2, q70,
  ~105 KB) and `lobby-sintonia` → `lobby-bg.webp` (1672×941, ~287 KB) baked from
  `gabriel-source/{thumbs,backgrounds}/sintonia.png`. `SintoniaCover` is now a
  3-line `<img class="game-cover">`; `HOST_GAMES.sintonia` gained `lobbyBg` → the
  lobby renders in **art mode** like the other 8. Prompt lines are in
  `tools/{cover-art,lobby-bg}-prompts.md`.
### Unchanged
- §52 held — zero edits to `core/`, `ws-server.ts`, `shared/protocol`, either
  shell flow, or existing engines. `tsc` + `oxlint` clean, 5-workspace build green.
- Live smoke: host + 3 phones, full 4-round match — all phases, all roles, team
  re-split + médium rotation, the skip path, band + side-bet scoring, gameover +
  VictorySplash, 0 console errors.

## 2026-09-09 — glory-moment cameo `<VictorySplash>` (branch `feature/glory-cameo`)
### Added
- **`@party/ui` `<VictorySplash>`** — the winner's face, big, for a `gameover`
  overlay. A "Gabsinto" preset winner gets their full portrait
  (`ui/src/avatar-presets/<id>-full.webp`) full-bleed in an accent-glow frame with
  CSS confetti; otherwise their pixel `<Avatar>` blown up to 220 px. Props
  `{ winner: { name, avatar? }, subtitle?, accent? }`. `prefers-reduced-motion`
  kills the confetti + glow pulse. Styles appended to `ui/src/components.css`.
- Wired into all **9** host `gameover` overlays (uno, coup, zap, lorota, sabetudo,
  fdp, evoce, dilema, sintonia) — each passes its winner + accent; the round-over
  (non-gameover) headings in UNO stay as-is, and tie states (Sintonia empate) keep
  the plain `<h2>`.
### Unchanged
- Platform-level, like reactions/avatars — no wire/server change (the winner is
  already in each game's public state). `tsc` + `oxlint` clean, build green;
  186 server tests unaffected. Live-verified in Sintonia's gameover.

## 2026-09-09 — lobby / covers finishing touches (branch `feature/lobby-acabamento`)
### Changed
- `.lobby-slot-start:disabled` is now **opaque** (`#0b0e12` + hairline border)
  instead of translucent `rgba(10,13,17,.78)` — the painted "COMEÇAR X" no longer
  bleeds through in art mode.
- `.lobby-slot-code` raised to `top: 57.3%` (was 58.5) and `.lobby-qr-url`
  shrunk to `1.3cqh` (was 1.5) — the `192.168.x.x:5174/join/CODE` line now sits
  inside the painted dark box.
- `.lobby-slot-start` gets `justify-content: center` — the parent `.lobby-slot`
  pins content to the top, which left the button label floating above the pill
  (obvious once the disabled bg went opaque).
- `tools/build-screen-bg.py` gained `COVER_QUALITY = 70` for the `cover-<id>`
  branch (was the global 82) — ~40 % off the 8 cover webps. **Rebuild pending**
  (needs the gitignored `gabriel-source/thumbs/*`; owner reruns
  `build-screen-bg.py cover-<id>` ×8).
- CSS class `.game-cover-svg` → `.game-cover` (the 8 real covers are `<img>` now,
  not SVG) across the 9 `<Id>Cover.tsx` + `shell.css` (2 rules).
- `mobile/src/shell/shell.css` — `.join` gets `margin-block: auto` and the sticky
  `.join-cta-bar` drops its `margin: auto` top, so the name+avatar block is
  centred in the free space instead of leaving a dark gap above the footer.
### Notes
- The `LobbyScreen` plain-card branch is **kept as the documented fallback**
  (owner's call) — the comment now says so. All 9 games ship a `lobbyBg`, so it
  only renders when `selected` is undefined (empty catalog).
- Still owner-only: regen `dilema.png` ("TRIILHOS" typo), `fdp.png`/`evoce.png`
  accents; re-render the 8 pre-existing covers at q70 (the `sintonia` cover was
  already baked at q70 in the game #9 batch).
