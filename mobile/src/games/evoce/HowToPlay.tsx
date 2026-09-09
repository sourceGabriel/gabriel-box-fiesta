/** Static "how to play" overlay for the É Você! controller. */
export function HowToPlay({ onClose }: { onClose: () => void }) {
  return (
    <div className="evoce-howto" role="dialog" aria-modal="true" aria-label="Como jogar É Você!">
      <div className="evoce-howto-card">
        <h2>Como jogar</h2>
        <ol className="evoce-howto-list">
          <li>Todas as perguntas são sobre <strong>vocês mesmos</strong>. 6 rodadas que alternam:</li>
          <li><strong>Enquete</strong> — "Quem de vocês…?" → toque num jogador. Pontos por <strong>consenso</strong>: quanto mais gente votou igual a você, mais todo mundo ganha.</li>
          <li><strong>Curinga</strong> 🃏 — você tem 2. Jogue um numa enquete: se seu voto bater com o da galera, seus pontos da rodada <strong>dobram</strong>.</li>
          <li><strong>Legenda</strong> — complete uma frase sobre um jogador → votem a melhor.</li>
          <li><strong>Rabisco</strong> — desenhe por cima de um jogador ("transforme em…") → votem o melhor. Quem é o modelo não desenha.</li>
          <li><strong>A Obra-Prima</strong> (final) — se desenhe do jeito do prompt → votem a melhor. Vale o <strong>dobro</strong>.</li>
        </ol>
        <button type="button" className="evoce-howto-close" onClick={onClose}>Entendi</button>
      </div>
    </div>
  );
}
