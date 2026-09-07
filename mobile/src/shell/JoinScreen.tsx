import type { AvatarSpec } from '@party/shared';
import { AvatarEditor, BrandMark, Button } from '@party/ui';
import { MobileHeader } from './MobileHeader';

interface JoinScreenProps {
  roomCode: string;
  onRoomCodeChange: (code: string) => void;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  avatar: AvatarSpec;
  onAvatarChange: (avatar: AvatarSpec) => void;
  connected: boolean;
  onJoin: () => void;
  brandName?: string;
}

export function JoinScreen({
  roomCode,
  onRoomCodeChange,
  playerName,
  onPlayerNameChange,
  avatar,
  onAvatarChange,
  connected,
  onJoin,
  brandName = 'UNO',
}: JoinScreenProps) {
  const canSubmit = connected && roomCode.trim().length > 0 && playerName.trim().length > 0;

  return (
    <>
      <MobileHeader roomCode={roomCode} connected={connected} />

      <section className="join-panel">
        <div className="join-hero">
          <BrandMark text={brandName} size="md" />
          <p>Entre na sala e pegue seu celular como controle.</p>
        </div>

        <label className="field">
          <span className="field-label">Código da sala</span>
          <input
            className="code-input"
            value={roomCode}
            onChange={(event) => onRoomCodeChange(event.target.value.toUpperCase())}
            placeholder="ABCD"
            autoCapitalize="characters"
            maxLength={6}
          />
        </label>

        <label className="field">
          <span className="field-label">Seu nome</span>
          <input
            value={playerName}
            onChange={(event) => onPlayerNameChange(event.target.value)}
            placeholder="Como querem te chamar?"
            maxLength={20}
          />
        </label>

        <div className="field">
          <span className="field-label">Seu avatar</span>
          <AvatarEditor value={avatar} onChange={onAvatarChange} name={playerName.trim() || undefined} />
          <span className="avatar-credit">
            Bonecos: arte LPC / OpenGameArt (CC-BY-SA · OGA-BY · CC0)
          </span>
        </div>

        <Button variant="success" className="join-submit" disabled={!canSubmit} onClick={onJoin}>
          {connected ? 'Entrar na sala' : 'Conectando…'}
        </Button>
      </section>
    </>
  );
}
