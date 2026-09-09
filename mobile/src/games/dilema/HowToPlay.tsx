/** Static "how to play" overlay for the Dilema nos Trilhos controller. */
export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="dil-howto" role="dialog" aria-modal="true" aria-label="Como jogar Dilema nos Trilhos">
      <div className="dil-howto-card">
        <h2>Como jogar</h2>
        <ol className="dil-howto-list">
          <li>Um trólebus desgovernado vai atropelar um dos dois trilhos. A cada rodada uma pessoa é o <strong>Maquinista</strong> (isso gira) e o resto é dividido em dois times, um por trilho.</li>
          <li>Cada trilho começa com um <strong>inocente</strong>. Você joga cartas da mão: <strong>inocente</strong> no <strong>seu</strong> trilho (pra dar dó), <strong>culpado</strong> no trilho <strong>inimigo</strong> (pra merecer), <strong>modificador</strong> grudado numa carta específica pra virar o jogo.</li>
          <li>Discutam <strong>em voz alta</strong> — o jogo não tem chat. Convençam o Maquinista.</li>
          <li>O Maquinista puxa a alavanca e escolhe qual trilho o trólebus atropela.</li>
          <li>Quem estava no trilho <strong>poupado</strong> marca <strong>+1</strong>. Ganha quem for poupado mais vezes ao fim das rodadas.</li>
        </ol>
        <button type="button" className="dil-howto-close" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}
