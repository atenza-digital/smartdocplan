/** Resumo legível do navegador a partir do user-agent (ex.: "Chrome 141 · Windows"). */
export function summarizeUserAgent(ua?: string | null) {
  if (!ua) return null;
  const pick = (re: RegExp) => ua.match(re)?.[1]?.split(".")[0];
  let navegador = "Navegador desconhecido";
  const edge = pick(/Edg(?:e|A|iOS)?\/([\d.]+)/);
  const opera = pick(/OPR\/([\d.]+)/);
  const firefox = pick(/(?:Firefox|FxiOS)\/([\d.]+)/);
  const chrome = pick(/(?:Chrome|CriOS)\/([\d.]+)/);
  const safari = /Safari\//.test(ua) ? pick(/Version\/([\d.]+)/) : undefined;
  if (edge) navegador = `Edge ${edge}`;
  else if (opera) navegador = `Opera ${opera}`;
  else if (firefox) navegador = `Firefox ${firefox}`;
  else if (chrome) navegador = `Chrome ${chrome}`;
  else if (safari) navegador = `Safari ${safari}`;
  let sistema = "";
  if (/Windows/.test(ua)) sistema = "Windows";
  else if (/Android/.test(ua)) sistema = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) sistema = "iOS";
  else if (/Mac OS X|Macintosh/.test(ua)) sistema = "macOS";
  else if (/Linux/.test(ua)) sistema = "Linux";
  return sistema ? `${navegador} · ${sistema}` : navegador;
}
