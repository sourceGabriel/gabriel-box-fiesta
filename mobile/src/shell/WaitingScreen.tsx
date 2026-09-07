import type { AvatarSpec } from '@party/shared';
import { Avatar, PlayerRoster } from '@party/ui';
import { MobileHeader } from './MobileHeader';
import type { ShellPlayer } from './useRoomConnection';

interface WaitingScreenProps {
  roomCode: string;
  connected: boolean;
  avatar: AvatarSpec;
  myName: string;
  players: ShellPlayer[];
  playerId: string | null;
  /** Name + tagline of the game the host has selected, shown so players know what's starting. */
  gameName?: string;
  gameTagline?: string;
}

export function WaitingScreen({
  roomCode,
  connected,
  avatar,
  myName,
  players,
  playerId,
  gameName,
  gameTagline,
}: WaitingScreenProps) {
  return (
    <>
      <MobileHeader roomCode={roomCode} connected={connected} />

      <section className="waiting-panel">
        <Avatar spec={avatar} size={72} className="waiting-avatar" title={myName} />
        <h2>Tudo pronto!</h2>
        <p className="you-are">Você entrou como <strong>{myName}</strong></p>
        {gameName ? <p className="waiting-game">{gameName}</p> : null}
        {gameTagline ? <p className="hint">{gameTagline}</p> : null}
        <p className="hint dots">
          Aguardando o anfitrião iniciar<span>.</span><span>.</span><span>.</span>
        </p>
      </section>

      {players.length > 0 ? (
        <PlayerRoster
          layout="pills"
          title={`Jogadores · ${players.length}`}
          players={players}
          meId={playerId ?? undefined}
        />
      ) : null}
    </>
  );
}
