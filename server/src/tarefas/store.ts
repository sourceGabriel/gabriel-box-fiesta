import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/**
 * Tiny disk-backed key/value store for the "Tarefas da casa" helper page.
 * Not part of the game platform — a personal side utility served off the same
 * HTTP server. One JSON file, loaded once, rewritten on every change so the
 * list survives server restarts.
 */

const dataFile = process.env.TAREFAS_DATA_FILE
  ? resolve(process.env.TAREFAS_DATA_FILE)
  : resolve(process.cwd(), 'data/tarefas-casa.json');

type Store = Record<string, string>;

let cache: Store | null = null;

const load = async (): Promise<Store> => {
  if (cache) {
    return cache;
  }
  try {
    const raw = await readFile(dataFile, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    cache = parsed !== null && typeof parsed === 'object' ? (parsed as Store) : {};
  } catch {
    cache = {};
  }
  return cache;
};

export const getValue = async (key: string): Promise<string | null> => {
  const store = await load();
  return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
};

export const setValue = async (key: string, value: string): Promise<void> => {
  const store = await load();
  store[key] = value;
  await mkdir(dirname(dataFile), { recursive: true });
  await writeFile(dataFile, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
};

export const tarefasDataFile = dataFile;
