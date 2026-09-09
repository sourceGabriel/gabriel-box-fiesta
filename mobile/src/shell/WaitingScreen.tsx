import { useState, type FC } from 'react';
import type { AvatarSpec, ContentTier } from '@party/shared';
import { Avatar, AvatarEditor, Button, PlayerRoster } from '@party/ui';
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
  /** Room content intensity — shown as a tag when the selected game has a leve/pesado split. */
  contentTier?: ContentTier;
  showContentTier?: boolean;
  /** Whether the hidden "Lendas" portrait row is unlocked. */
  legendsUnlocked?: boolean;
  /** The selected game's "how to play" overlay, so players can read the rules while waiting. */
  howToPlay?: FC<{ onClose: () => void }>;
  /** Persist the new avatar locally and push it to the server (UPDATE_AVATAR). */
  onAvatarChange?: (avatar: AvatarSpec) => void;
  /** Leave the room and go back to the code-entry screen. */
  onLeave?: () => void;
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
  contentTier,
  showContentTier,
  legendsUnlocked,
  howToPlay: HowToPlay,
  onAvatarChange,
  onLeave,
}: WaitingScreenProps) {
  const [editing, setEditing] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [draft, setDraft] = useState<AvatarSpec>(avatar);

  const openEditor = () => {
    setDraft(avatar);
    setEditing(true);
  };
  const save = () => {
    onAvatarChange?.(draft);
    setEditing(false);
  };

  return (
    <>
      <MobileHeader roomCode={roomCode} connected={connected} />

      {showHowTo && HowToPlay ? <HowToPlay onClose={() => setShowHowTo(false)} /> : null}

      <section className="waiting-panel">
        <Avatar spec={avatar} size={72} className="waiting-avatar" title={myName} />
        <h2>Tudo pronto!</h2>
        <p className="you-are">Você entrou como <strong>{myName}</strong></p>
        {gameName ? <p className="waiting-game">{gameName}</p> : null}
        {gameTagline ? <p className="hint">{gameTagline}</p> : null}
        {showContentTier ? (
          <p className={`waiting-tier ${contentTier === 'pesado' ? 'is-pesado' : ''}`}>
            {contentTier === 'pesado' ? '🔞 Modo pesado (+18)' : '😇 Modo leve'}
          </p>
        ) : null}
        <div className="waiting-actions">
          {onAvatarChange && !editing ? (
            <button type="button" className="waiting-edit-avatar" onClick={openEditor}>
              ✏️ Editar avatar
            </button>
          ) : null}
          {HowToPlay && !editing ? (
            <button type="button" className="waiting-edit-avatar" onClick={() => setShowHowTo(true)}>
              ❓ Como jogar
            </button>
          ) : null}
        </div>
        <p className="hint dots">
          Aguardando o anfitrião iniciar<span>.</span><span>.</span><span>.</span>
        </p>
        {onLeave && !editing ? (
          <button type="button" className="waiting-leave" onClick={onLeave}>
            ◀ Sair e trocar de sala
          </button>
        ) : null}
      </section>

      {editing ? (
        <section className="waiting-panel waiting-avatar-editor">
          <AvatarEditor value={draft} onChange={setDraft} presetsUnlocked={legendsUnlocked} />
          <div className="waiting-editor-actions">
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
            <Button variant="success" onClick={save}>Salvar</Button>
          </div>
        </section>
      ) : null}

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
