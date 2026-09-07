import type { IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getValue, setValue } from './store';

/**
 * Serves the "Tarefas da casa" page and its persistence endpoints:
 *   GET  /tarefas                 -> the HTML page
 *   GET  /tarefas/state/:key      -> { value: string | null }
 *   PUT  /tarefas/state/:key      -> persists { value: string } to disk
 *
 * Returns true when the request path belongs to this feature (response sent).
 */

// Alongside this module in dev (tsx); fall back to the source tree for a built run.
const pageCandidates = [
  fileURLToPath(new URL('./page.html', import.meta.url)),
  resolve(process.cwd(), 'src/tarefas/page.html'),
];
const MAX_BODY_BYTES = 512 * 1024;

const readPage = async (): Promise<string> => {
  for (const candidate of pageCandidates) {
    try {
      return await readFile(candidate, 'utf8');
    } catch {
      // try the next candidate
    }
  }
  throw new Error('page.html not found');
};

const readBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolveBody, rejectBody) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString('utf8');
      if (data.length > MAX_BODY_BYTES) {
        rejectBody(new Error('body too large'));
      }
    });
    req.on('end', () => resolveBody(data));
    req.on('error', rejectBody);
  });

const json = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
};

export const handleTarefasRequest = async (
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): Promise<boolean> => {
  if (pathname !== '/tarefas' && !pathname.startsWith('/tarefas/')) {
    return false;
  }

  if (pathname === '/tarefas' || pathname === '/tarefas/') {
    try {
      const html = await readPage();
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(html);
    } catch {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Página de tarefas não encontrada.');
    }
    return true;
  }

  const stateMatch = /^\/tarefas\/state\/(.+)$/.exec(pathname);
  if (stateMatch) {
    const key = decodeURIComponent(stateMatch[1]);

    if (req.method === 'GET') {
      // Always 200 — an absent key is a valid "nothing saved yet", not an error.
      json(res, 200, { value: await getValue(key) });
      return true;
    }

    if (req.method === 'PUT' || req.method === 'POST') {
      try {
        const parsed: unknown = JSON.parse(await readBody(req));
        const value = (parsed as { value?: unknown } | null)?.value;
        if (typeof value !== 'string') {
          json(res, 400, { error: 'value must be a string' });
          return true;
        }
        await setValue(key, value);
        json(res, 200, { ok: true });
      } catch {
        json(res, 400, { error: 'invalid body' });
      }
      return true;
    }

    json(res, 405, { error: 'method not allowed' });
    return true;
  }

  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('not found');
  return true;
};
