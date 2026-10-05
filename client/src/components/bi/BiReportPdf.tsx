import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import logoSmartDocPlan from "@/logos/logo_smartdocplan_completa.png";
import type { BiCompanyReport, BiGlobalReport, BiReport } from "./BiDashboard";
import {
  AGRUPAMENTO_LABELS, STATUS_CHAMADO, STATUS_SOLICITACAO, TIPO_CHAMADO, TIPO_SOLICITACAO,
  formatDataBr, formatDataHoraBr, formatDias, formatNumero, formatPercent, qtd, rotuloPeriodo,
} from "./biFormat";

// Sem hifenização automática (quebrava palavras em português, ex.: "cadastra-dos").
Font.registerHyphenationCallback((word) => [word]);

// Paleta do relatório (alinhada à identidade SmartDocPlan).
const C = {
  primary: "#0f8a80",
  primarySoft: "#e3f5f3",
  ink: "#16232b",
  muted: "#5d6b73",
  line: "#d9e3e6",
  amber: "#d98a0b",
  blue: "#2f6fd6",
  red: "#c2410c",
  violet: "#7c4dcc",
  zebra: "#f6f9fa",
};

const s = StyleSheet.create({
  page: { paddingTop: 42, paddingBottom: 56, paddingHorizontal: 40, fontFamily: "Helvetica", fontSize: 10, color: C.ink },
  // lineHeight vai em cada estilo de texto, não na página: herdado pelo texto dinâmico do rodapé, ele some no react-pdf.
  cover: { padding: 0, fontFamily: "Helvetica", color: C.ink },
  coverBand: { backgroundColor: C.primary, height: 10 },
  coverBody: { flexGrow: 1, paddingHorizontal: 56, paddingTop: 70, paddingBottom: 40 },
  coverLogos: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 90 },
  coverLogoSdp: { width: 96, height: 68, objectFit: "contain" },
  coverLogoEmp: { maxWidth: 170, maxHeight: 70, objectFit: "contain" },
  coverKicker: { fontSize: 10, letterSpacing: 2, color: C.primary, fontFamily: "Helvetica-Bold", marginBottom: 10 },
  coverTitle: { fontSize: 30, fontFamily: "Helvetica-Bold", lineHeight: 1.15, marginBottom: 14 },
  coverSubtitle: { fontSize: 15, color: C.muted, marginBottom: 40 },
  coverMetaRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 9 },
  coverMetaLabel: { width: 130, color: C.muted, fontSize: 10 },
  coverMetaValue: { flex: 1, fontSize: 10, fontFamily: "Helvetica-Bold" },
  coverIndex: { marginTop: 36 },
  coverIndexTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.muted, marginBottom: 6, letterSpacing: 1 },
  coverIndexItem: { fontSize: 10, color: C.ink, marginBottom: 3 },
  coverFooter: { paddingHorizontal: 56, paddingBottom: 28, fontSize: 8, color: C.muted },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 8, marginBottom: 18 },
  headerLogo: { width: 34, height: 24, objectFit: "contain" },
  headerText: { fontSize: 8, color: C.muted, textAlign: "right" },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6 },
  footerText: { fontSize: 8, color: C.muted },

  h1: { fontSize: 17, fontFamily: "Helvetica-Bold", color: C.ink, lineHeight: 1.3, paddingBottom: 4, marginBottom: 4 },
  h1Bar: { width: 34, height: 3, backgroundColor: C.primary, marginBottom: 10 },
  h2: { fontSize: 11.5, fontFamily: "Helvetica-Bold", color: C.ink, lineHeight: 1.3, marginTop: 12, marginBottom: 6 },
  p: { marginBottom: 7, textAlign: "justify", fontSize: 10, lineHeight: 1.45 },
  muted: { color: C.muted },
  section: { marginBottom: 18 },

  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  kpi: { flex: 1, borderWidth: 1, borderColor: C.line, borderRadius: 6, paddingHorizontal: 9, paddingVertical: 8 },
  kpiValue: { fontSize: 17, fontFamily: "Helvetica-Bold", lineHeight: 1.2, marginBottom: 3 },
  kpiLabel: { fontSize: 8.5, color: C.muted, lineHeight: 1.3 },
  kpiHint: { fontSize: 7.5, color: C.muted, lineHeight: 1.3, marginTop: 4 },

  callout: { backgroundColor: C.primarySoft, borderRadius: 6, padding: 10, marginBottom: 10 },
  calloutTitle: { fontFamily: "Helvetica-Bold", marginBottom: 4, color: C.primary, fontSize: 10, lineHeight: 1.45 },
  bullet: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 10, color: C.primary, fontSize: 10, lineHeight: 1.45 },
  bulletText: { flex: 1, fontSize: 10, lineHeight: 1.45 },

  table: { borderWidth: 1, borderColor: C.line, borderRadius: 4, marginBottom: 8 },
  tr: { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.line, alignItems: "center", minHeight: 20 },
  th: { flexDirection: "row", backgroundColor: C.zebra, minHeight: 20, alignItems: "center" },
  thCell: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.muted, paddingHorizontal: 6, paddingVertical: 4, lineHeight: 1.45 },
  td: { fontSize: 9, paddingHorizontal: 6, paddingVertical: 4, lineHeight: 1.45 },
  barTrack: { height: 7, backgroundColor: C.zebra, borderRadius: 3, flexGrow: 1 },
  bar: { height: 7, borderRadius: 3 },
});

function Bullets({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={s.bullet} wrap={false}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function Kpis({ items }: { items: { valor: string; rotulo: string; dica?: string; cor?: string }[] }) {
  return (
    <View style={s.kpiRow} wrap={false}>
      {items.map((k, i) => (
        <View key={i} style={s.kpi}>
          <Text style={[s.kpiValue, { color: k.cor ?? C.ink }]}>{k.valor}</Text>
          <Text style={s.kpiLabel}>{k.rotulo}</Text>
          {k.dica ? <Text style={s.kpiHint}>{k.dica}</Text> : null}
        </View>
      ))}
    </View>
  );
}

/** Tabela de distribuição com barra proporcional desenhada no próprio PDF. */
function Distribuicao({ titulo, data, labels, cor }: { titulo: string; data: { chave: string; total: number }[]; labels: Record<string, string>; cor: string }) {
  const total = data.reduce((acc, d) => acc + d.total, 0);
  const max = Math.max(1, ...data.map((d) => d.total));
  return (
    <View style={s.table} wrap={false}>
      <View style={s.th}>
        <Text style={[s.thCell, { width: "38%" }]}>{titulo}</Text>
        <Text style={[s.thCell, { width: "12%", textAlign: "right" }]}>Qtd.</Text>
        <Text style={[s.thCell, { width: "12%", textAlign: "right" }]}>%</Text>
        <Text style={[s.thCell, { width: "38%" }]}> </Text>
      </View>
      {data.length === 0 ? (
        <View style={s.tr}><Text style={[s.td, s.muted]}>Nenhum registro no período.</Text></View>
      ) : (
        data.map((d, i) => (
          <View key={d.chave} style={[s.tr, i % 2 === 1 ? { backgroundColor: C.zebra } : {}]}>
            <Text style={[s.td, { width: "38%" }]}>{labels[d.chave] ?? d.chave}</Text>
            <Text style={[s.td, { width: "12%", textAlign: "right" }]}>{formatNumero(d.total)}</Text>
            <Text style={[s.td, { width: "12%", textAlign: "right" }]}>{formatPercent(d.total, total)}</Text>
            <View style={{ width: "38%", paddingHorizontal: 6 }}>
              <View style={s.barTrack}>
                <View style={[s.bar, { width: `${(d.total / max) * 100}%`, backgroundColor: cor }]} />
              </View>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View wrap={false} minPresenceAhead={80}>
        <Text style={s.h1}>{titulo}</Text>
        <View style={s.h1Bar} />
      </View>
      {children}
    </View>
  );
}

function maiorItem(data: { chave: string; total: number }[], labels: Record<string, string>) {
  if (!data.length) return null;
  const top = [...data].sort((a, b) => b.total - a.total)[0];
  return `${labels[top.chave] ?? top.chave} (${formatNumero(top.total)})`;
}

// ─── Textos explicativos montados a partir dos números ──────────────────────

function resumoExecutivo(r: BiReport, escopo: string) {
  const sol = r.solicitacoes;
  const ch = r.chamados;
  const periodo = `de ${formatDataBr(r.periodo.inicio)} a ${formatDataBr(r.periodo.fim)}`;
  const itens: string[] = [];
  itens.push(
    sol.abertas > 0
      ? `No período ${periodo}, ${escopo} registrou ${qtd(sol.abertas, "solicitação de RH", "solicitações de RH")}; ${qtd(sol.concluidas, "foi concluída", "foram concluídas")} no mesmo intervalo (${formatPercent(sol.concluidas, sol.abertas)} em relação às abertas)${sol.tempoMedioConclusaoDias !== null ? `, com tempo médio de conclusão de ${formatDias(sol.tempoMedioConclusaoDias)}` : ""}.`
      : `No período ${periodo}, ${escopo} não registrou novas solicitações de RH.`
  );
  const tipoTop = maiorItem(sol.porTipo, TIPO_SOLICITACAO);
  if (tipoTop) itens.push(`O tipo de solicitação mais frequente foi ${tipoTop}.`);
  itens.push(
    ch.abertos > 0
      ? `Foram abertos ${qtd(ch.abertos, "chamado", "chamados")} de suporte e ${qtd(ch.resolvidos, "foi resolvido", "foram resolvidos")}${ch.tempoMedioResolucaoDias !== null ? `, em média em ${formatDias(ch.tempoMedioResolucaoDias)}` : ""}. Hoje há ${qtd(ch.pendentesHoje, "chamado pendente", "chamados pendentes")}.`
      : `Não houve abertura de chamados de suporte no período. Hoje há ${qtd(ch.pendentesHoje, "chamado pendente", "chamados pendentes")}.`
  );
  itens.push(
    `O quadro atual tem ${qtd(r.colaboradores.ativos, "colaborador ativo", "colaboradores ativos")}, ${qtd(r.colaboradores.afastados, "afastado", "afastados")} e ${qtd(r.colaboradores.desligados, "desligado", "desligados")}; ${qtd(r.colaboradores.admissoesNoPeriodo, "admissão ocorreu", "admissões ocorreram")} no período.`
  );
  const vencidos = r.documentos.empresa.vencidos + r.documentos.colaboradores.vencidos;
  const aVencer = r.documentos.empresa.aVencer30 + r.documentos.colaboradores.aVencer30;
  itens.push(
    vencidos > 0
      ? `Atenção: ${qtd(vencidos, "documento está vencido", "documentos estão vencidos")} hoje e ${qtd(aVencer, "vence", "vencem")} nos próximos 30 dias.`
      : `Não há documentos vencidos hoje; ${qtd(aVencer, "vence", "vencem")} nos próximos 30 dias.`
  );
  return itens;
}

function pontosDeAtencao(r: BiReport) {
  const itens: string[] = [];
  if (r.documentos.empresa.vencidos > 0) itens.push(`Regularizar ${qtd(r.documentos.empresa.vencidos, "documento da empresa vencido", "documentos da empresa vencidos")} (PCMSO, PGR, LTCAT e outros).`);
  if (r.documentos.colaboradores.vencidos > 0) itens.push(`Atualizar ${qtd(r.documentos.colaboradores.vencidos, "documento de colaborador vencido", "documentos de colaboradores vencidos")}.`);
  if (r.chamados.pendentesHoje > 0) itens.push(`Acompanhar ${qtd(r.chamados.pendentesHoje, "chamado em aberto", "chamados em aberto")} com a equipe SmartDocPlan.`);
  if (r.solicitacoes.emAndamentoHoje > 0) itens.push(`${qtd(r.solicitacoes.emAndamentoHoje, "solicitação segue", "solicitações seguem")} em andamento; verifique pendências de documentos.`);
  if (r.ferias.pendentesHoje > 0) itens.push(`${qtd(r.ferias.pendentesHoje, "programação de férias aguarda", "programações de férias aguardam")} aprovação.`);
  if (!itens.length) itens.push("Nenhum ponto crítico identificado com os dados do período.");
  return itens;
}

// ─── Documento ──────────────────────────────────────────────────────────────

export function BiReportPdf({
  report,
  global,
  companyLogo,
}: {
  report: BiReport;
  global: boolean;
  companyLogo: string | null;
}) {
  const geradoEm = formatDataHoraBr(new Date());
  const empresa = global ? null : (report as BiCompanyReport).empresa;
  const g = global ? (report as BiGlobalReport) : null;
  const escopoNome = empresa ? empresa.nome : "Plataforma SmartDocPlan (todas as empresas)";
  const escopoFrase = empresa ? `a empresa ${empresa.nome}` : "o conjunto das empresas da plataforma";
  const periodoTexto = `${formatDataBr(report.periodo.inicio)} a ${formatDataBr(report.periodo.fim)}`;
  const sol = report.solicitacoes;
  const ch = report.chamados;
  const col = report.colaboradores;
  const docs = report.documentos;
  const serie = report.serie;
  const maxSerie = Math.max(1, ...serie.map((p) => Math.max(p.solicitacoesAbertas, p.chamadosAbertos)));
  // Intervalos sem nenhum movimento são omitidos da tabela para não poluir o relatório.
  const serieComMovimento = serie.filter((p) => p.solicitacoesAbertas + p.solicitacoesConcluidas + p.chamadosAbertos + p.chamadosResolvidos > 0);

  const Cabecalho = () => (
    <View style={s.header} fixed>
      <Image src={logoSmartDocPlan} style={s.headerLogo} />
      <Text style={s.headerText}>
        {escopoNome}{"\n"}Relatório de indicadores · {periodoTexto}
      </Text>
    </View>
  );
  const Rodape = () => (
    <View style={s.footer} fixed>
      <Text style={s.footerText}>SmartDocPlan · Relatório de BI · gerado em {geradoEm}</Text>
      <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );

  return (
    <Document title={`Relatório de BI - ${escopoNome} - ${periodoTexto}`} author="SmartDocPlan" creator="SmartDocPlan" language="pt-BR">
      {/* Capa */}
      <Page size="A4" style={s.cover}>
        <View style={s.coverBand} />
        <View style={s.coverBody}>
          <View style={s.coverLogos}>
            <Image src={logoSmartDocPlan} style={s.coverLogoSdp} />
            {companyLogo ? <Image src={companyLogo} style={s.coverLogoEmp} /> : null}
          </View>
          <Text style={s.coverKicker}>RELATÓRIO DE INDICADORES</Text>
          <Text style={s.coverTitle}>{global ? "BI Global da Plataforma" : `BI de RH e SST\n${empresa?.nome ?? ""}`}</Text>
          <Text style={s.coverSubtitle}>
            Solicitações, chamados, colaboradores, documentos e férias no período selecionado.
          </Text>
          <View style={s.coverMetaRow}><Text style={s.coverMetaLabel}>Período analisado</Text><Text style={s.coverMetaValue}>{periodoTexto}</Text></View>
          {empresa ? (
            <View style={s.coverMetaRow}>
              <Text style={s.coverMetaLabel}>Empresa</Text>
              <Text style={s.coverMetaValue}>{empresa.razaoSocial}{empresa.cnpj ? ` · CNPJ ${empresa.cnpj}` : ""}</Text>
            </View>
          ) : (
            <View style={s.coverMetaRow}><Text style={s.coverMetaLabel}>Abrangência</Text><Text style={s.coverMetaValue}>{qtd(g?.empresas.total ?? 0, "empresa cadastrada", "empresas cadastradas")}</Text></View>
          )}
          <View style={s.coverMetaRow}><Text style={s.coverMetaLabel}>Agrupamento dos gráficos</Text><Text style={s.coverMetaValue}>{AGRUPAMENTO_LABELS[report.periodo.agrupamento]}</Text></View>
          <View style={[s.coverMetaRow, { borderBottomWidth: 1, borderBottomColor: C.line }]}><Text style={s.coverMetaLabel}>Gerado em</Text><Text style={s.coverMetaValue}>{geradoEm}</Text></View>
          <View style={s.coverIndex}>
            <Text style={s.coverIndexTitle}>CONTEÚDO</Text>
            {["1. Resumo executivo", "2. Solicitações de RH", "3. Chamados de suporte", "4. Colaboradores e documentos", "5. Férias", "6. Evolução no período", ...(g ? ["7. Empresas com mais movimento"] : []), `${g ? 8 : 7}. Notas sobre os dados`].map((item) => (
              <Text key={item} style={s.coverIndexItem}>{item}</Text>
            ))}
          </View>
        </View>
        <Text style={s.coverFooter}>Documento gerado automaticamente pela plataforma SmartDocPlan a partir dos dados registrados no sistema.</Text>
      </Page>

      {/* Conteúdo */}
      <Page size="A4" style={s.page}>
        <Cabecalho />

        <Secao titulo="1. Resumo executivo">
          <Kpis items={[
            { valor: formatNumero(sol.abertas), rotulo: "Solicitações abertas", dica: `${qtd(sol.concluidas, "concluída", "concluídas")} no período`, cor: C.amber },
            { valor: formatNumero(ch.abertos), rotulo: "Chamados abertos", dica: `${qtd(ch.resolvidos, "resolvido", "resolvidos")} no período`, cor: C.blue },
            { valor: formatNumero(col.ativos), rotulo: "Colaboradores ativos", dica: `${qtd(col.admissoesNoPeriodo, "admissão", "admissões")} no período`, cor: C.primary },
            { valor: formatNumero(docs.empresa.vencidos + docs.colaboradores.vencidos), rotulo: "Documentos vencidos hoje", dica: `${formatNumero(docs.empresa.aVencer30 + docs.colaboradores.aVencer30)} vencem em 30 dias`, cor: C.red },
          ]} />
          {resumoExecutivo(report, escopoFrase).map((t, i) => <Text key={i} style={s.p}>{t}</Text>)}
          <View style={s.callout} wrap={false}>
            <Text style={s.calloutTitle}>Pontos de atenção</Text>
            <Bullets items={pontosDeAtencao(report)} />
          </View>
        </Secao>

        <Secao titulo="2. Solicitações de RH">
          <Kpis items={[
            { valor: formatNumero(sol.abertas), rotulo: "Abertas no período" },
            { valor: formatNumero(sol.concluidas), rotulo: "Concluídas no período", dica: formatPercent(sol.concluidas, sol.abertas) + " das abertas" },
            { valor: formatNumero(sol.rejeitadas), rotulo: "Rejeitadas no período" },
            { valor: formatDias(sol.tempoMedioConclusaoDias), rotulo: "Tempo médio de conclusão" },
          ]} />
          <Text style={s.p}>
            As solicitações de RH concentram admissões, demissões, mudanças de função e afastamentos. A tabela a seguir mostra como as solicitações abertas no período se distribuem por tipo; a segunda mostra a situação atual dessas mesmas solicitações. Hoje, {qtd(sol.emAndamentoHoje, "solicitação continua", "solicitações continuam")} em andamento.
          </Text>
          <Distribuicao titulo="Tipo de solicitação" data={sol.porTipo} labels={TIPO_SOLICITACAO} cor={C.amber} />
          <Distribuicao titulo="Situação atual" data={sol.porStatus} labels={STATUS_SOLICITACAO} cor={C.primary} />
        </Secao>

        <Secao titulo="3. Chamados de suporte">
          <Kpis items={[
            { valor: formatNumero(ch.abertos), rotulo: "Abertos no período" },
            { valor: formatNumero(ch.resolvidos), rotulo: "Resolvidos no período" },
            { valor: formatDias(ch.tempoMedioResolucaoDias), rotulo: "Tempo médio de resolução" },
            { valor: formatNumero(ch.pendentesHoje), rotulo: "Pendentes hoje" },
          ]} />
          <Text style={s.p}>
            Os chamados registram pedidos de suporte à equipe SmartDocPlan, como criação ou bloqueio de usuários, alterações de acesso e dúvidas. {maiorItem(ch.porTipo, TIPO_CHAMADO) ? `O assunto mais frequente foi ${maiorItem(ch.porTipo, TIPO_CHAMADO)}.` : "Não houve chamados no período."}
          </Text>
          <Distribuicao titulo="Tipo de chamado" data={ch.porTipo} labels={TIPO_CHAMADO} cor={C.blue} />
          <Distribuicao titulo="Situação atual" data={ch.porStatus} labels={STATUS_CHAMADO} cor={C.violet} />
        </Secao>

        <Secao titulo="4. Colaboradores e documentos">
          <Kpis items={[
            { valor: formatNumero(col.total), rotulo: "Colaboradores cadastrados" },
            { valor: formatNumero(col.ativos), rotulo: "Ativos", cor: C.primary },
            { valor: formatNumero(col.afastados), rotulo: "Afastados", cor: C.amber },
            { valor: formatNumero(col.desligados), rotulo: "Desligados", cor: C.muted },
          ]} />
          <Text style={s.p}>
            {qtd(col.admissoesNoPeriodo, "admissão foi registrada", "admissões foram registradas")} no período (pela data de admissão informada no cadastro). Os números de colaboradores e de documentos refletem a situação na data de geração deste relatório.
          </Text>
          <View style={s.table} wrap={false}>
            <View style={s.th}>
              <Text style={[s.thCell, { width: "40%" }]}>Documentos</Text>
              <Text style={[s.thCell, { width: "20%", textAlign: "right" }]}>Cadastrados</Text>
              <Text style={[s.thCell, { width: "20%", textAlign: "right" }]}>Vencidos</Text>
              <Text style={[s.thCell, { width: "20%", textAlign: "right" }]}>Vencem em 30 dias</Text>
            </View>
            {[
              { nome: "Da empresa (PCMSO, PGR, LTCAT…)", d: docs.empresa },
              { nome: "Dos colaboradores", d: docs.colaboradores },
            ].map((linha, i) => (
              <View key={linha.nome} style={[s.tr, i % 2 === 1 ? { backgroundColor: C.zebra } : {}]}>
                <Text style={[s.td, { width: "40%" }]}>{linha.nome}</Text>
                <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{formatNumero(linha.d.total)}</Text>
                <Text style={[s.td, { width: "20%", textAlign: "right", color: linha.d.vencidos ? C.red : C.ink }]}>{formatNumero(linha.d.vencidos)}</Text>
                <Text style={[s.td, { width: "20%", textAlign: "right" }]}>{formatNumero(linha.d.aVencer30)}</Text>
              </View>
            ))}
          </View>
          <Text style={[s.p, s.muted]}>
            {qtd(docs.colaboradores.enviadosNoPeriodo, "documento de colaborador foi enviado", "documentos de colaboradores foram enviados")} no período.
          </Text>
        </Secao>

        <Secao titulo="5. Férias">
          <Kpis items={[
            { valor: formatNumero(report.ferias.aprovadasNoPeriodo), rotulo: "Férias aprovadas com início no período" },
            { valor: formatNumero(report.ferias.pendentesHoje), rotulo: "Aguardando aprovação hoje" },
          ]} />
          <Text style={s.p}>
            Considera as programações de férias registradas na plataforma. O controle de saldo legal de férias não faz parte deste relatório.
          </Text>
        </Secao>

        <Secao titulo="6. Evolução no período">
          <Text style={s.p}>
            Movimento {AGRUPAMENTO_LABELS[report.periodo.agrupamento].toLowerCase()}: solicitações e chamados abertos e encerrados em cada intervalo. As barras comparam o volume aberto entre os intervalos.
          </Text>
          <View style={s.table}>
            <View style={s.th} fixed minPresenceAhead={30}>
              <Text style={[s.thCell, { width: "14%" }]}>Intervalo</Text>
              <Text style={[s.thCell, { width: "17%", textAlign: "right" }]}>Solic. abertas</Text>
              <Text style={[s.thCell, { width: "17%", textAlign: "right" }]}>Solic. concluídas</Text>
              <Text style={[s.thCell, { width: "17%", textAlign: "right" }]}>Cham. abertos</Text>
              <Text style={[s.thCell, { width: "17%", textAlign: "right" }]}>Cham. resolvidos</Text>
              <Text style={[s.thCell, { width: "18%" }]}>Volume aberto</Text>
            </View>
            {serieComMovimento.length === 0 ? (
              <View style={s.tr}><Text style={[s.td, s.muted]}>Nenhum movimento no período.</Text></View>
            ) : serieComMovimento.map((p, i) => (
              <View key={p.periodo} style={[s.tr, i % 2 === 1 ? { backgroundColor: C.zebra } : {}]} wrap={false}>
                <Text style={[s.td, { width: "14%" }]}>{rotuloPeriodo(p.periodo, report.periodo.agrupamento)}</Text>
                <Text style={[s.td, { width: "17%", textAlign: "right" }]}>{formatNumero(p.solicitacoesAbertas)}</Text>
                <Text style={[s.td, { width: "17%", textAlign: "right" }]}>{formatNumero(p.solicitacoesConcluidas)}</Text>
                <Text style={[s.td, { width: "17%", textAlign: "right" }]}>{formatNumero(p.chamadosAbertos)}</Text>
                <Text style={[s.td, { width: "17%", textAlign: "right" }]}>{formatNumero(p.chamadosResolvidos)}</Text>
                <View style={{ width: "18%", paddingHorizontal: 6, gap: 2 }}>
                  <View style={[s.bar, { height: 4, width: `${(p.solicitacoesAbertas / maxSerie) * 100}%`, backgroundColor: C.amber }]} />
                  <View style={[s.bar, { height: 4, width: `${(p.chamadosAbertos / maxSerie) * 100}%`, backgroundColor: C.blue }]} />
                </View>
              </View>
            ))}
          </View>
          <Text style={[s.p, s.muted, { fontSize: 8 }]}>Barra laranja: solicitações abertas · barra azul: chamados abertos. Intervalos sem movimento foram omitidos.</Text>
        </Secao>

        {g ? (
          <Secao titulo="7. Empresas com mais movimento">
            <Text style={s.p}>
              {qtd(g.empresas.ativas, "empresa ativa", "empresas ativas")} de {formatNumero(g.empresas.total)} cadastradas; {qtd(g.empresas.novasNoPeriodo, "nova empresa entrou", "novas empresas entraram")} na plataforma no período. Ranking pelas solicitações abertas no período.
            </Text>
            <View style={s.table} wrap={false}>
              <View style={s.th}>
                <Text style={[s.thCell, { width: "40%" }]}>Empresa</Text>
                <Text style={[s.thCell, { width: "15%", textAlign: "right" }]}>Solicitações</Text>
                <Text style={[s.thCell, { width: "15%", textAlign: "right" }]}>Concluídas</Text>
                <Text style={[s.thCell, { width: "15%", textAlign: "right" }]}>Chamados</Text>
                <Text style={[s.thCell, { width: "15%", textAlign: "right" }]}>Colab. ativos</Text>
              </View>
              {g.ranking.map((r, i) => (
                <View key={r.companyId} style={[s.tr, i % 2 === 1 ? { backgroundColor: C.zebra } : {}]} wrap={false}>
                  <Text style={[s.td, { width: "40%" }]}>{r.nome}</Text>
                  <Text style={[s.td, { width: "15%", textAlign: "right" }]}>{formatNumero(r.solicitacoes)}</Text>
                  <Text style={[s.td, { width: "15%", textAlign: "right" }]}>{formatNumero(r.concluidas)}</Text>
                  <Text style={[s.td, { width: "15%", textAlign: "right" }]}>{formatNumero(r.chamados)}</Text>
                  <Text style={[s.td, { width: "15%", textAlign: "right" }]}>{formatNumero(r.colaboradoresAtivos)}</Text>
                </View>
              ))}
            </View>
          </Secao>
        ) : null}

        <Secao titulo={`${g ? 8 : 7}. Notas sobre os dados`}>
          <Bullets items={[
            "Solicitações e chamados abertos são contados pela data de abertura; concluídos e resolvidos, pela data de conclusão ou resolução.",
            "Tempo médio considera apenas os itens concluídos ou resolvidos dentro do período, do momento da abertura até o encerramento.",
            "Datas e horas seguem o horário de Brasília. Semanas começam na segunda-feira.",
            "Colaboradores, documentos vencidos e itens pendentes refletem a situação na data de geração do relatório.",
            "Registros antigos sem data de conclusão ou de admissão informada não entram nas contagens que dependem dessas datas.",
            "Dados de saúde (atestados, exames, afastamentos) não são detalhados neste relatório.",
          ]} />
        </Secao>
        <Rodape />
      </Page>
    </Document>
  );
}
