/** Static "how to play" overlay for the Sintonia controller. */
export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="sint-howto" role="dialog" aria-modal="true" aria-label="Como jogar Sintonia">
      <div className="sint-howto-card">
        <h2>Como jogar</h2>
        <ol className="sint-howto-list">
          <li>A cada rodada, uma pessoa é o <strong>médium</strong> (isso gira). Só ela vê um <strong>alvo escondido</strong> num espectro (ex.: <em>Chato ↔ Divertido</em>) e escreve <strong>uma dica curta</strong> — sem números.</li>
          <li><strong>Todo mundo</strong> que não é o médium puxa <strong>o próprio ponteiro</strong> de 0 a 100 tentando parar em cima do alvo. Ninguém vê o palpite dos outros até o fim.</li>
          <li>Quando todos travam (ou o tempo acaba), o alvo aparece. Quanto <strong>mais perto</strong> você chegou, <strong>mais pontos</strong> (10 / 7 / 5 / 3 / 2 / 1).</li>
          <li>O médium ganha a <strong>média</strong> dos pontos do grupo — dica boa, todo mundo lucra.</li>
          <li>Discutam <strong>em voz alta</strong> — o jogo não tem chat. Ganha quem tiver <strong>mais pontos no total</strong> ao fim das rodadas.</li>
        </ol>
        <button type="button" className="sint-howto-close" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}
