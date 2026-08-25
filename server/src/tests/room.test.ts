import { describe, expect, it } from 'vitest';
import { Room } from '../core/room';

describe('Room', () => {
  it('assigns first player as owner and transfers owner on disconnect', () => {
    const room = new Room('ABCD');
    const p1 = room.joinPlayer('Alice', Date.now()).player;
    const p2 = room.joinPlayer('Bob', Date.now()).player;

    expect(room.ownerPlayerId).toBe(p1.id);
    room.disconnectPlayer(p1.id, Date.now());
    expect(room.ownerPlayerId).toBe(p2.id);
  });

  it('reconnects using session token preserving identity', () => {
    const room = new Room('ABCD');
    const joined = room.joinPlayer('Alice', Date.now());
    room.disconnectPlayer(joined.player.id, Date.now());

    const reconnected = room.reconnect(joined.sessionToken, Date.now());
    expect(reconnected.id).toBe(joined.player.id);
    expect(reconnected.connected).toBe(true);
  });
});
