/**
 * O botão do VLibras é criado pelo plugin do gov.br dentro de um shadow DOM (#vlibras-access-wrapper), então o CSS
 * da página não o alcança. No celular ele ficava no meio da tela, na altura dos botões das listas, e cobria
 * conteúdo. Aqui injetamos, dentro do shadow DOM, uma regra que o leva para o canto de baixo (só em telas pequenas).
 */
const ESTILO_ID = "sdp-vlibras-ajuste";
const REGRA_CELULAR = "@media (max-width: 640px) { div { top: auto !important; bottom: 72px !important; right: 8px !important; } }";

function aplicar() {
  const raiz = document.getElementById("vlibras-access-wrapper")?.shadowRoot;
  if (!raiz) return false;
  if (!raiz.getElementById(ESTILO_ID)) {
    const estilo = document.createElement("style");
    estilo.id = ESTILO_ID;
    estilo.textContent = REGRA_CELULAR;
    raiz.appendChild(estilo);
  }
  return true;
}

/** O plugin carrega depois da página: tenta de meio em meio segundo, por até 30 segundos. */
export function ajustarBotaoVLibras() {
  if (typeof document === "undefined" || aplicar()) return;
  let tentativas = 0;
  const timer = setInterval(() => {
    if (aplicar() || ++tentativas >= 60) clearInterval(timer);
  }, 500);
}
