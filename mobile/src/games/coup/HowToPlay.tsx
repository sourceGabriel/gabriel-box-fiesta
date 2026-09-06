import { CHARACTER_META } from './coupCards';

const RULES: { char: keyof typeof CHARACTER_META; text: string }[] = [
  { char: 'Duke', text: 'Taxar: +3 moedas. Bloqueia Ajuda Externa.' },
  { char: 'Assassin', text: 'Assassinar: paga 3, o alvo perde uma influência.' },
  { char: 'Captain', text: 'Extorquir: rouba 2 moedas do alvo. Bloqueia Extorsão.' },
  { char: 'Ambassador', text: 'Trocar: compra 2 do baralho, devolve 2. Bloqueia Extorsão.' },
  { char: 'Contessa', text: 'Bloqueia Assassinato.' },
];

/** Static "how to play" overlay for the Coup controller. */
export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="coup-howto" role="dialog" aria-modal="true" aria-label="Como jogar Coup">
      <div className="coup-howto-card">
        <h2>Como jogar</h2>
        <p className="coup-howto-lead">
          Você tem 2 influências (cartas viradas). Perdeu as duas, está fora. Último de pé vence.
        </p>
        <ul className="coup-howto-list">
          {RULES.map(({ char, text }) => (
            <li key={char}>
              <span className="coup-howto-emoji" style={{ color: CHARACTER_META[char].color }}>
                {CHARACTER_META[char].emoji}
              </span>
              <span>
                <strong>{CHARACTER_META[char].label}</strong> — {text}
              </span>
            </li>
          ))}
        </ul>
        <p className="coup-howto-note">
          <strong>Renda</strong> (+1) e <strong>Golpe</strong> (−7, força o alvo a perder influência) não podem
          ser contestados. Ações com alegação podem ser <strong>desafiadas</strong>: se você blefou, perde uma
          influência; se o desafiante errou, ele perde. Com 10+ moedas, só dá para dar Golpe.
        </p>
        <button type="button" className="coup-howto-close" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}
