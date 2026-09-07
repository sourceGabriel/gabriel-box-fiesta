import type { AvatarSpec } from '@party/shared';
import {
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
}: {
  value: AvatarSpec;
  onChange: (next: AvatarSpec) => void;
  /** Optional name shown under the preview. */
  name?: string;
}) {
  const spec = sanitizeAvatar(value);
  const set = (patch: Partial<AvatarSpec>): void => onChange({ ...spec, ...patch });

  return (
    <div className="ui-avatar-editor">
      <div className="ui-ae-preview">
        <Avatar spec={spec} size={128} />
        {name ? <span className="ui-ae-name">{name}</span> : null}
        <button type="button" className="ui-ae-random" onClick={() => onChange(randomAvatar())}>
          🎲 Surpresa
        </button>
      </div>

      <ChipRow label="Corpo" options={GENDERS} value={spec.gender} onPick={(id) => set({ gender: id })} />
      <SwatchRow label="Cor de pele" options={SKIN_TONES} value={spec.skin} onPick={(id) => set({ skin: id })} />
      <ChipRow label="Cabelo" options={HAIR_STYLES} value={spec.hair} onPick={(id) => set({ hair: id })} />
      <SwatchRow label="Cor do cabelo" options={HAIR_COLORS} value={spec.hairColor} onPick={(id) => set({ hairColor: id })} />
      <SwatchRow label="Cor dos olhos" options={EYE_COLORS} value={spec.eyes} onPick={(id) => set({ eyes: id })} />
      <SwatchRow label="Camisa" options={SHIRTS} value={spec.shirt} onPick={(id) => set({ shirt: id })} />
      <ChipRow label="Chapéu" options={HATS} value={spec.hat} onPick={(id) => set({ hat: id })} />
      <SwatchRow label="Fundo" options={BG_COLORS} value={spec.bg} onPick={(id) => set({ bg: id })} />
    </div>
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
