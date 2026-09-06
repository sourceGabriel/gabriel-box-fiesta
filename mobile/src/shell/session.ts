/**
 * Session persistence for the phone controller — the crown jewel of the mobile
 * client. A player who reloads the tab (or drops Wi-Fi) keeps their identity,
 * hand and place in the game as long as their signed session token is still
 * valid on the server. Nothing here is game-specific.
 *
 * Two localStorage entries per room:
 *  - `activeSession:<ROOM>`  → the storage key of the token to try on connect.
 *  - `session:<ROOM>:<name>` → the actual session token (written on ROOM_JOINED).
 */

/** Where we remember which session key to reuse for a given room. */
export const activeSessionStorageKey = (roomCode: string): string => `activeSession:${roomCode.toUpperCase()}`;

/** The storage key for one player's token in one room. */
export const sessionKeyFor = (roomCode: string, baseName: string): string =>
  `session:${roomCode.toUpperCase()}:${baseName.toLowerCase()}`;

/** The token storage key last used for this room, if any. */
export const readStoredSessionKey = (roomCode: string): string | null => {
  if (!roomCode) {
    return null;
  }
  try {
    return localStorage.getItem(activeSessionStorageKey(roomCode));
  } catch {
    return null;
  }
};

export const readToken = (storageKey: string | null): string | null => {
  if (!storageKey) {
    return null;
  }
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
};

export const writeToken = (storageKey: string, token: string): void => {
  try {
    localStorage.setItem(storageKey, token);
  } catch {
    // ignore storage errors (private mode, quota, disabled)
  }
};

export const rememberActiveSession = (roomCode: string, storageKey: string): void => {
  try {
    localStorage.setItem(activeSessionStorageKey(roomCode), storageKey);
  } catch {
    // ignore storage errors
  }
};

/** Drop the token + the active-session pointer after the server rejects them. */
export const clearStoredSession = (storageKey: string | null, roomCode: string): void => {
  try {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    if (roomCode) {
      localStorage.removeItem(activeSessionStorageKey(roomCode));
    }
  } catch {
    // ignore storage errors
  }
};
