import type { AvatarSpec } from '@party/shared';
import {
  AVATAR_PRESETS,
  BG_COLORS,
  EYE_COLORS,
  GENDERS,
  HAIR_COLORS,
  HAIR_STYLES,
  HATS,
  SHIRTS,
  SKIN_TONES,
  randomAvatar,
  sanitizeAvatar,
  type AvatarColorOption,
  type AvatarOption,
} from '../avatar';
import { Avatar } from './Avatar';

/**
 * Full avatar customizer: a live preview plus one picker row per attribute.
 * Controlled — the caller owns the `AvatarSpec` and persists it.
 */
export function AvatarEditor({
  value,
  onChange,
  name,
  presetsUnlocked = false,
  previewSize = 128,
  collapsible = false,
  arrows = false,
}: {
  value: AvatarSpec;
  onChange: (next: AvatarSpec) => void;
  /** Optional name shown under the preview. */
  name?: string;
  /** Show the hidden "Lendas" portrait row (unlocked by the Gabsinto name). */
  presetsUnlocked?: boolean;
  /** Pixel size of the live preview (default 128). */
  previewSize?: number;
  /** Tuck the attribute pickers into a closed `<details>` ("Personalizar avatar"). */
  collapsible?: boolean;
  /** Flank the preview with ‹ › buttons that re-roll a random avatar. */
  arrows?: boolean;
}) {
  const spec = sanitizeAvatar(value);
  // Any normal attribute change drops the preset and returns to the paperdoll.
  const set = (patch: Partial<AvatarSpec>): void => {
    const next: AvatarSpec = { ...spec, ...patch };
    delete next.preset;
    onChange(next);
  };
  const pickPreset = (id: string): void =>
    onChange({ ...spec, preset: spec.preset === id ? undefined : id });

  const controls = (
    <>
      {presetsUnlocked ? (
        <div className="ui-ae-row ui-ae-legends">
          <span className="ui-ae-label">🕵️ Lendas</span>
          <div className="ui-ae-scroll" role="group" aria-label="Lendas">
            {AVATAR_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`ui-ae-legend ${spec.preset === p.id ? 'is-on' : ''}`}
                aria-label={p.label}
                aria-pressed={spec.preset === p.id}
                title={`${p.emoji} ${p.label}`}
                onClick={() => pickPreset(p.id)}
              >
                <img src={p.face} alt="" draggable={false} />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <ChipRow label="Corpo" options={GENDERS} value={spec.gender} onPick={(id) => set({ gender: id })} />
      <SwatchRow label="Cor de pele" options={SKIN_TONES} value={spec.skin} onPick={(id) => set({ skin: id })} />
      <ChipRow label="Cabelo" options={HAIR_STYLES} value={spec.hair} onPick={(id) => set({ hair: id })} />
      <SwatchRow label="Cor do cabelo" options={HAIR_COLORS} value={spec.hairColor} onPick={(id) => set({ hairColor: id })} />
      <SwatchRow label="Cor dos olhos" options={EYE_COLORS} value={spec.eyes} onPick={(id) => set({ eyes: id })} />
      <SwatchRow label="Camisa" options={SHIRTS} value={spec.shirt} onPick={(id) => set({ shirt: id })} />
      <ChipRow label="Chapéu" options={HATS} value={spec.hat} onPick={(id) => set({ hat: id })} />
      <SwatchRow label="Fundo" options={BG_COLORS} value={spec.bg} onPick={(id) => set({ bg: id })} />
    </>
  );

  return (
    <div className="ui-avatar-editor">
      <div className="ui-ae-preview">
        <div className="ui-ae-stage">
          {arrows ? (
            <button type="button" className="ui-ae-arrow" aria-label="Outro avatar" onClick={() => onChange(randomAvatar())}>
              <Chevron dir="left" />
            </button>
          ) : null}
          <Avatar spec={spec} size={previewSize} />
          {arrows ? (
            <button type="button" className="ui-ae-arrow" aria-label="Outro avatar" onClick={() => onChange(randomAvatar())}>
              <Chevron dir="right" />
            </button>
          ) : null}
        </div>
        {name ? <span className="ui-ae-name">{name}</span> : null}
        <button type="button" className="ui-ae-random" onClick={() => onChange(randomAvatar())}>
          🎲 Surpresa
        </button>
      </div>

      {collapsible ? (
        <details className="ui-ae-more">
          <summary>
            <span>Personalizar avatar</span>
            <Chevron dir="down" />
          </summary>
          <div className="ui-ae-more-body">{controls}</div>
        </details>
      ) : (
        controls
      )}
    </div>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' | 'down' }) {
  const d =
    dir === 'left' ? 'M15 6l-6 6 6 6' : dir === 'right' ? 'M9 6l6 6-6 6' : 'M6 9l6 6 6-6';
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function SwatchRow({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: AvatarColorOption[];
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="ui-ae-row">
      <span className="ui-ae-label">{label}</span>
      <div className="ui-ae-scroll" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`ui-ae-swatch ${value === o.id ? 'is-on' : ''}`}
            style={{ background: o.hex }}
            aria-label={o.label}
            aria-pressed={value === o.id}
            onClick={() => onPick(o.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ChipRow({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: AvatarOption[];
  value: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="ui-ae-row">
      <span className="ui-ae-label">{label}</span>
      <div className="ui-ae-scroll" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`ui-ae-chip ${value === o.id ? 'is-on' : ''}`}
            aria-pressed={value === o.id}
            onClick={() => onPick(o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
