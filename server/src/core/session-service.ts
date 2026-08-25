import { createHash, randomBytes } from 'node:crypto';
import { nanoid } from 'nanoid';
import type { Session } from '@party/shared';

const SESSION_TTL_MS = 1000 * 60 * 60 * 6;

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

export class SessionService {
  private readonly sessionsById = new Map<string, Session>();
  private readonly sessionHashToId = new Map<string, string>();

  issue(playerId: string, now: number): { session: Session; token: string } {
    const token = randomBytes(24).toString('base64url');
    const id = nanoid(16);
    const session: Session = {
      id,
      playerId,
      token: hashToken(token),
      issuedAt: now,
      lastSeenAt: now,
    };
    this.sessionsById.set(id, session);
    this.sessionHashToId.set(session.token, id);
    return { session, token };
  }

  validate(rawToken: string, now: number): Session | null {
    const hashed = hashToken(rawToken);
    const sessionId = this.sessionHashToId.get(hashed);
    if (!sessionId) {
      return null;
    }
    const session = this.sessionsById.get(sessionId);
    if (!session) {
      return null;
    }
    if (now - session.lastSeenAt > SESSION_TTL_MS) {
      this.sessionsById.delete(sessionId);
      this.sessionHashToId.delete(hashed);
      return null;
    }
    session.lastSeenAt = now;
    return session;
  }
}
