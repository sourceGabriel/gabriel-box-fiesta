import { customAlphabet } from 'nanoid';
import { Room } from './room';

const generateCode = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 4);

export class RoomManager {
  private room: Room;

  constructor() {
    this.room = new Room(generateCode(), 8);
  }

  getRoom(): Room {
    return this.room;
  }
}
