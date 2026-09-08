import { describe, expect, it } from 'vitest';
import type { AvatarSpec } from '@party/shared';
import { Room } from '../core/room';

const AVATAR: AvatarSpec = { gender: 'male', skin: 'brown', hair: 'afro', hairColor: 'pink', eyes: 'purple', shirt: 'polo', hat: 'crown', bg: 'teal' };

describe('Room', () => {
  it('assigns first player as owner and transfers it only after the grace window', () => {
    const room = new Room('ABCD');
    const p1 = room.joinPlayer('Alice', undefined, Date.now()).player;
    const p2 = room.joinPlayer('Bob', undefined, Date.now()).player;

    expect(room.ownerPlayerId).toBe(p1.id);

    room.markDisconnected(p1.id, Date.now());
    expect(room.ownerPlayerId).toBe(p1.id); // still owner during the grace window

    expect(room.finalizeDisconnect(p1.id)).toBe(true);
    expect(room.ownerPlayerId).toBe(p2.id);
  });

  it('does not transfer ownership if the owner reconnected during the grace window', () => {
    const room = new Room('ABCD');
    const owner = room.joinPlayer('Alice', undefined, Date.now());
    room.joinPlayer('Bob', undefined, Date.now());

    room.markDisconnected(owner.player.id, Date.now());
    room.reconnect(owner.sessionToken, Date.now());

    expect(room.finalizeDisconnect(owner.player.id)).toBe(false);
    expect(room.ownerPlayerId).toBe(owner.player.id);
  });

  it('reconnects using session token preserving identity', () => {
    const room = new Room('ABCD');
    const joined = room.joinPlayer('Alice', undefined, Date.now());
    room.markDisconnected(joined.player.id, Date.now());

    const reconnected = room.reconnect(joined.sessionToken, Date.now());
    expect(reconnected.id).toBe(joined.player.id);
    expect(reconnected.connected).toBe(true);
  });

  it('endGame returns to the lobby keeping the selected game so the host can play again or switch', () => {
    const room = new Room('ABCD');
    const owner = room.joinPlayer('Alice', undefined, Date.now()).player;
    room.joinPlayer('Bob', undefined, Date.now());

    room.startGame(owner.id, 'uno');
    expect(room.state).toBe('in_game');
    expect(room.game).not.toBeNull();

    room.endGame();
    expect(room.state).toBe('accepting_players');
    expect(room.game).toBeNull();
    expect(room.selectedGameId).toBe('uno');

    // selectGame works again after a game, and a fresh game can start (play again).
    expect(() => room.selectGame('uno')).not.toThrow();
    expect(() => room.startGame(owner.id, 'uno')).not.toThrow();
  });

  it('stores a per-player avatar and falls back to a default when none is given', () => {
    const room = new Room('ABCD');
    const withAvatar = room.joinPlayer('Alice', AVATAR, Date.now()).player;
    const without = room.joinPlayer('Bob', undefined, Date.now()).player;

    expect(withAvatar.avatar).toEqual(AVATAR);
    expect(without.avatar).toMatchObject({ skin: expect.any(String), hair: expect.any(String), hat: expect.any(String) });
  });

  it('setAvatar updates a player in the lobby but is rejected once the game started', () => {
    const room = new Room('ABCD');
    const owner = room.joinPlayer('Alice', undefined, Date.now()).player;
    room.joinPlayer('Bob', undefined, Date.now());

    room.setAvatar(owner.id, AVATAR);
    expect(room.getPlayers().find((p) => p.id === owner.id)?.avatar).toEqual(AVATAR);
    expect(() => room.setAvatar('nope', AVATAR)).toThrow(/PLAYER_NOT_FOUND/);

    room.startGame(owner.id, 'uno');
    expect(() => room.setAvatar(owner.id, AVATAR)).toThrow(/GAME_IN_PROGRESS/);
  });
});
