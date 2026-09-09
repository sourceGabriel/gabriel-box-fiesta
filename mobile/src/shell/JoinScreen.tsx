import type { AvatarSpec } from '@party/shared';
import { AvatarEditor, Button } from '@party/ui';
import { MobileHeader } from './MobileHeader';

interface JoinScreenProps {
  roomCode: string;
  onRoomCodeChange: (code: string) => void;
  playerName: string;
  onPlayerNameChange: (name: string) => void;
  avatar: AvatarSpec;
  onAvatarChange: (avatar: AvatarSpec) => void;
  /** Whether the hidden "Lendas" portrait row is unlocked. */
  legendsUnlocked?: boolean;
  connected: boolean;
  onJoin: () => void;
}

export function JoinScreen({
  roomCode,
  onRoomCodeChange,
  playerName,
  onPlayerNameChange,
  avatar,
  onAvatarChange,
  legendsUnlocked,
  connected,
  onJoin,
}: JoinScreenProps) {
  // A QR deep-link (`/join/ABCD`) prefills the code; typed-URL players enter it.
  const canSubmit = connected && roomCode.trim().length > 0 && playerName.trim().length > 0;
  const name = playerName.trim();

  return (
    <>
      <MobileHeader roomCode={roomCode} connected={connected} />

      <div className="join">
        <label className="field">
          <span className="field-label">Seu nome</span>
          <input
            value={playerName}
            onChange={(event) => onPlayerNameChange(event.target.value)}
            placeholder="Como a galera vai te chamar?"
            maxLength={20}
          />
        </label>

        <div className="field join-avatar">
          <span className="field-label">Seu avatar</span>
          <AvatarEditor
            value={avatar}
            onChange={onAvatarChange}
            name={name || undefined}
            presetsUnlocked={legendsUnlocked}
            previewSize={168}
            collapsible
            arrows
          />
        </div>
      </div>

      <div className="join-cta-bar">
        <label className="field join-code">
          <span className="field-label">Código da sala</span>
          <input
            className="code-input"
            value={roomCode}
            onChange={(event) => onRoomCodeChange(event.target.value.toUpperCase())}
            placeholder="ABCD"
            autoCapitalize="characters"
            autoCorrect="off"
            maxLength={6}
          />
        </label>
        <Button variant="success" className="join-cta" disabled={!canSubmit} onClick={onJoin}>
          🎮 {connected ? 'Entrar na sala' : 'Conectando…'}
        </Button>
      </div>
    </>
  );
}
