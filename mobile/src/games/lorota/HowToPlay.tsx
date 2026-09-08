/** Static "how to play" overlay for the Lorota! controller. */
export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="lorota-howto" role="dialog" aria-modal="true" aria-label="Como jogar Lorota!">
      <div className="lorota-howto-card">
        <h2>Como jogar</h2>
        <ol className="lorota-howto-list">
          <li>A TV mostra um fato com uma <strong>lacuna</strong>. Você inventa uma resposta falsa (uma lorota) no celular.</li>
          <li>Se você escrever a resposta certa sem querer, o jogo devolve — invente outra.</li>
          <li>O servidor embaralha todas as mentiras com a <strong>verdade</strong> e mostra a lista.</li>
          <li>Todo mundo tenta <strong>achar a verdade</strong> (você não pode escolher a sua própria mentira).</li>
          <li>Achou a verdade: <strong>+1000</strong>. Sua mentira enganou alguém: <strong>+500</strong> por pessoa enganada.</li>
          <li>São 3 rodadas. A última é a <strong>Lorota Final</strong> e vale o dobro.</li>
        </ol>
        <button type="button" className="lorota-howto-close" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}
