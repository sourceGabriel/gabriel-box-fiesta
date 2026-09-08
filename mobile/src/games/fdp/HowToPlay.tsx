/** Static "how to play" overlay for the FDP controller. */
export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="fdp-howto" role="dialog" aria-modal="true" aria-label="Como jogar FDP">
      <div className="fdp-howto-card">
        <h2>Como jogar</h2>
        <ol className="fdp-howto-list">
          <li>A TV mostra uma frase pra completar (geralmente com uma <strong>lacuna</strong>). Escreva a resposta mais engraçada / mais safada no celular.</li>
          <li>Todas as respostas aparecem na TV, <strong>embaralhadas e anônimas</strong>.</li>
          <li>Todo mundo <strong>vota na melhor</strong> — menos na própria.</li>
          <li>Cada voto vale <strong>+100</strong>. Se levar todos os votos da rodada, ganha um bônus <strong>FDP!</strong>.</li>
          <li>São 5 rodadas. A última é a <strong>Final FDP</strong> e vale o dobro.</li>
          <li>É +18. Se ofende fácil, esse jogo não é pra você.</li>
        </ol>
        <button type="button" className="fdp-howto-close" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}
