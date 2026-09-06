import { describe, expect, it } from 'vitest';
import { Room } from '../core/room';

describe('Room', () => {
  it('assigns first player as owner and transfers it only after the grace window', () => {
    const room = new Room('ABCD');
    const p1 = room.joinPlayer('Alice', Date.now()).player;
    const p2 = room.joinPlayer('Bob', Date.now()).player;

    expect(room.ownerPlayerId).toBe(p1.id);

    room.markDisconnected(p1.id, Date.now());
    expect(room.ownerPlayerId).toBe(p1.id); // still owner during the grace window

    expect(room.finalizeDisconnect(p1.id)).toBe(true);
    expect(room.ownerPlayerId).toBe(p2.id);
  });

  it('does not transfer ownership if the owner reconnected during the grace window', () => {
    const room = new Room('ABCD');
    const owner = room.joinPlayer('Alice', Date.now());
    room.joinPlayer('Bob', Date.now());

    room.markDisconnected(owner.player.id, Date.now());
    room.reconnect(owner.sessionToken, Date.now());

    expect(room.finalizeDisconnect(owner.player.id)).toBe(false);
    expect(room.ownerPlayerId).toBe(owner.player.id);
  });

  it('reconnects using session token preserving identity', () => {
    const room = new Room('ABCD');
    const joined = room.joinPlayer('Alice', Date.now());
    room.markDisconnected(joined.player.id, Date.now());

    const reconnected = room.reconnect(joined.sessionToken, Date.now());
    expect(reconnected.id).toBe(joined.player.id);
    expect(reconnected.connected).toBe(true);
  });
});
