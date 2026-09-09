/** Static "how to play" overlay for the Sintonia controller. */
export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="sint-howto" role="dialog" aria-modal="true" aria-label="Como jogar Sintonia">
      <div className="sint-howto-card">
        <h2>Como jogar</h2>
        <ol className="sint-howto-list">
          <li>A sala é dividida em <strong>dois times</strong> (re-sorteados a cada rodada). Um time está de vez.</li>
          <li>Um <strong>médium</strong> do time da vez vê um <strong>alvo escondido</strong> num espectro (ex.: <em>Chato ↔ Divertido</em>) e escreve <strong>uma dica curta</strong> — sem números.</li>
          <li>O time do médium <strong>gira o dial</strong> de 0 a 100 pra tentar parar em cima do alvo. Quanto mais perto, mais pontos (4 / 3 / 2).</li>
          <li>O <strong>outro time</strong> aposta se o alvo está pra <strong>◀ esquerda</strong> ou <strong>▶ direita</strong> de onde o dial parou. Acertou o lado, +1.</li>
          <li>Discutam <strong>em voz alta</strong> — o jogo não tem chat. Ganha o time com mais pontos ao fim das rodadas.</li>
        </ol>
        <button type="button" className="sint-howto-close" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}
