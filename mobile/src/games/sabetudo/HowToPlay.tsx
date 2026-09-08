/** Static "how to play" overlay for the Sabe-Tudo controller. */
export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="sabetudo-howto" role="dialog" aria-modal="true" aria-label="Como jogar Sabe-Tudo">
      <div className="sabetudo-howto-card">
        <h2>Como jogar</h2>
        <ol className="sabetudo-howto-list">
          <li>A TV mostra uma pergunta com <strong>4 alternativas</strong> (A, B, C, D).</li>
          <li>Toque na alternativa que você acha certa. Não dá pra trocar depois.</li>
          <li>Acertou: <strong>+500</strong>. Quanto mais rápido responder, maior o <strong>bônus de velocidade</strong> (até +500).</li>
          <li>Acertos seguidos viram uma <strong>sequência</strong> 🔥 que vale pontos extras.</li>
          <li>Errou ou não respondeu a tempo: 0 ponto e a sequência zera.</li>
          <li>São 8 perguntas. Quem tiver mais pontos no fim ganha.</li>
        </ol>
        <button type="button" className="sabetudo-howto-close" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}
