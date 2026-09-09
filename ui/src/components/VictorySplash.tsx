import type { AvatarSpec } from '@party/shared';
import { getAvatarPreset } from '../avatar';
import { Avatar } from './Avatar';

/**
 * The winner's face, big, for a game's `gameover` overlay. When the winner picked
 * a "Gabsinto" portrait preset, their full portrait fills the frame; otherwise
 * their pixel avatar is blown up. Confetti + the glow pulse are CSS-only and
 * `prefers-reduced-motion` kills them.
 *
 * Platform-level (like reactions / avatars) — not a game, and it touches nothing
 * on the wire: every game already carries the winner in its public state.
 */
export function VictorySplash({
  winner,
  subtitle = 'venceu!',
  accent,
}: {
  winner: { name: string; avatar?: AvatarSpec };
  subtitle?: string;
  /** Optional hex to tint the frame glow + confetti (defaults to the gold trophy tone). */
  accent?: string;
}) {
  const preset = getAvatarPreset(winner.avatar?.preset);
  const style = accent ? ({ ['--vs-accent' as string]: accent } as React.CSSProperties) : undefined;

  return (
    <div className="ui-victory" style={style}>
      <div className="ui-victory-confetti" aria-hidden="true">
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} style={{ ['--n' as string]: i } as React.CSSProperties} />
        ))}
      </div>
      <div className={`ui-victory-frame ${preset ? 'is-portrait' : ''}`}>
        {preset ? (
          <img src={preset.full} alt={winner.name} className="ui-victory-portrait" draggable={false} />
        ) : winner.avatar ? (
          <Avatar spec={winner.avatar} size={220} className="ui-victory-avatar" title={winner.name} />
        ) : (
          <div className="ui-victory-trophy" aria-hidden="true">🏆</div>
        )}
      </div>
      <p className="ui-victory-name">
        <span className="ui-victory-crown" aria-hidden="true">🏆</span>
        {winner.name}
      </p>
      <p className="ui-victory-sub">{subtitle}</p>
    </div>
  );
}
