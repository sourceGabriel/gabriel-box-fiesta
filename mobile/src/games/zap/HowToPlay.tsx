/** Static "how to play" overlay for the Zap! controller. */
export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="zap-howto" role="dialog" aria-modal="true" aria-label="Como jogar Zap!">
      <div className="zap-howto-card">
        <h2>Como jogar</h2>
        <ol className="zap-howto-list">
          <li>A TV mostra um tema. Você escreve <strong>2 respostas</strong> engraçadas no celular (uma por tema).</li>
          <li>Cada tema vira um <strong>duelo</strong>: duas respostas lado a lado na TV.</li>
          <li>Quem não está no duelo <strong>vota</strong> na resposta mais engraçada.</li>
          <li>Cada voto vale <strong>100 pontos</strong>. Levar todos os votos de um duelo é um <strong>ZAP!</strong> (+50).</li>
          <li>São 3 rodadas. Na última, todos respondem o mesmo tema e os pontos <strong>valem o triplo</strong>.</li>
        </ol>
        <p className="zap-howto-note">Não dá para votar na sua própria resposta nem no duelo em que você está.</p>
        <button type="button" className="zap-howto-close" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}
