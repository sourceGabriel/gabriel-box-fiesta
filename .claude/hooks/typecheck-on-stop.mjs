#!/usr/bin/env node
// Stop hook: if there are uncommitted changes under server/ or shared/, run the
// server typecheck (tsc --noEmit). Silent on success. On type errors, exit 2 so
// Claude sees them and fixes before finishing the turn.
// Never blocks on infra problems (no git / no node_modules) — those exit 0.

import { execSync } from 'node:child_process';

const run = (cmd) =>
  execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 55_000 });

let changed = '';
try {
  changed = run('git status --porcelain -- server shared').trim();
} catch {
  process.exit(0); // not a git repo / git missing — nothing to do
}
if (!changed) process.exit(0);

try {
  run('npm run -w server lint --silent');
  process.exit(0); // typecheck clean
} catch (error) {
  const output = `${error.stdout ?? ''}${error.stderr ?? ''}`;
  const lines = output
    .split('\n')
    .filter((line) => /error TS\d+|: error\b/i.test(line))
    .slice(0, 20);
  if (lines.length === 0) process.exit(0); // tsc not runnable (deps missing etc.) — don't block
  console.error(
    'tsc found type errors in your uncommitted server/shared changes — fix before finishing:\n' +
      lines.join('\n'),
  );
  process.exit(2);
}
