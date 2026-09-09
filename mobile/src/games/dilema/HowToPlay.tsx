/** Static "how to play" overlay for the Dilema nos Trilhos controller. */
export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="dil-howto" role="dialog" aria-modal="true" aria-label="Como jogar Dilema nos Trilhos">
      <div className="dil-howto-card">
        <h2>Como jogar</h2>
        <ol className="dil-howto-list">
          <li>Um trólebus desgovernado vai atropelar um dos dois trilhos. A cada rodada uma pessoa é o <strong>Maquinista</strong> (isso gira) e o resto é dividido em dois times, um por trilho.</li>
          <li>Cada trilho começa com um <strong>inocente</strong>. Aí os times montam os trilhos <strong>em três passos, nessa ordem</strong>: <strong>1)</strong> um inocente pro <strong>seu</strong> trilho, <strong>2)</strong> um culpado pro trilho <strong>inimigo</strong>, <strong>3)</strong> um modificador grudado numa carta.</li>
          <li>O time recebe 3 opções por passo. Alguém <strong>propõe</strong> uma carta e <strong>todo o time tem que concordar</strong> pra travar. Discutam <strong>em voz alta</strong> — não tem chat nem relógio.</li>
          <li>Com os dois trilhos montados, o <strong>Maquinista</strong> puxa a alavanca e escolhe qual trilho o trólebus atropela — sem pressa de tempo.</li>
          <li>Quem estava no trilho <strong>poupado</strong> marca <strong>+1</strong>. Ganha quem for poupado mais vezes ao fim das rodadas.</li>
        </ol>
        <button type="button" className="dil-howto-close" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}
