/** Static "how to play" overlay for the Fase 10 controller. */
export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="f10c-howto" role="dialog" aria-modal="true" aria-label="Como jogar Fase 10">
      <div className="f10c-howto-card">
        <h2>Como jogar</h2>
        <ol className="f10c-howto-list">
          <li>Cada mão você recebe <strong>10 cartas</strong> e tenta montar a <strong>sua fase atual</strong> (ex.: “2 grupos de 3”, “1 sequência de 7”, “7 cartas da mesma cor”).</li>
          <li>Na sua vez: <strong>compre 1</strong> (do monte ou do descarte), depois <strong>baixe a fase</strong> se conseguir, <strong>encaixe</strong> cartas em fases já baixadas, e <strong>descarte 1</strong> pra encerrar a vez.</li>
          <li><strong>Grupo</strong> = mesmo número. <strong>Sequência</strong> = números seguidos. O <strong>Curinga (★)</strong> vale qualquer carta; a <strong>Pula (⊘)</strong> faz um oponente perder a vez.</li>
          <li>Quem <strong>zera a mão</strong> primeiro encerra a rodada. Quem baixou a fase <strong>sobe</strong> pra próxima; quem não baixou <strong>repete</strong>.</li>
          <li>Cartas que sobraram na mão viram <strong>pontos contra você</strong> (menos é melhor). Ganha quem <strong>completa a última fase</strong>; empate no total desempata por pontos.</li>
        </ol>
        <button type="button" className="f10c-howto-close" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}
