/**
 * Ajuda de cada tela (botão "Ajuda" no cabeçalho): para que serve, passo a passo, dicas e quem pode fazer o quê.
 * Uma entrada por rota de `App.tsx`; `/empresa/parametros` varia pela aba (`?aba=`).
 * Ao mudar o nome de um botão ou de um campo numa tela, atualize o texto da ajuda dela.
 */
export type PageHelpContent = {
  titulo: string;
  paraQueServe: string;
  passos: string[];
  dicas?: string[];
  quemPode?: string;
};

const EQUIPE = "Equipe SmartDocPlan (Administrador Geral e Analista). O Auditor só consulta.";
const EMPRESA_EDITA = "Admin e RH da empresa. Gestor e Consulta só visualizam.";

const BI = (escopo: "global" | "empresa"): PageHelpContent => ({
  titulo: escopo === "global" ? "BI Global" : "BI / Relatórios",
  paraQueServe:
    escopo === "global"
      ? "Mostra os números de todas as empresas juntas num período, com gráfico, tabelas e relatório em PDF."
      : "Mostra os números de RH da sua empresa num período, com gráfico, tabelas e relatório em PDF.",
  passos: [
    "Em “Período”, escolha Esta semana, Este mês, Este ano, Últimos 12 meses ou Personalizado. Em Personalizado, preencha “De” e “Até”.",
    "Em “Agrupar gráfico”, escolha Por dia, Por semana ou Por mês.",
    "Leia os indicadores no topo e o gráfico “Evolução no período”; as tabelas abaixo detalham por tipo e por situação.",
    "Para guardar ou enviar, clique em “Exportar PDF”. O relatório sai com capa, resumo e as tabelas.",
  ],
  dicas: [
    "O relatório nunca passa da data de hoje: datas futuras não são aceitas.",
    escopo === "empresa" ? "A logo da sua empresa vai na capa do PDF (troque em Parâmetros da empresa)." : "Para ver uma empresa só, abra a ficha dela em Empresas.",
  ],
  quemPode: escopo === "global" ? "Equipe SmartDocPlan." : "Todos os perfis da empresa.",
});

const PERFIL: PageHelpContent = {
  titulo: "Meu perfil",
  paraQueServe: "Seus dados de acesso, a aparência da plataforma e a troca de senha.",
  passos: [
    "Em “Dados da conta”, confira nome, e-mail e perfil de acesso. Para mudar nome ou e-mail, fale com o administrador.",
    "Em “Aparência”, escolha o tema claro ou escuro.",
    "Em “Tamanho das janelas”, escolha Pequeno, Médio ou Grande. Vale só para você, neste navegador.",
    "Para trocar a senha, preencha “Senha atual”, “Nova senha” e “Confirmar nova senha” e clique em “Alterar Senha”.",
  ],
  dicas: [
    "Use pelo menos 8 caracteres, com letras, números e símbolos.",
    "Ao trocar a senha, os outros navegadores em que você estava conectado são desconectados.",
    "Errar a senha atual várias vezes seguidas bloqueia a troca por 15 minutos.",
  ],
  quemPode: "Todos os perfis.",
};

const ESTRUTURA = (equipe: boolean): PageHelpContent => ({
  titulo: "Estrutura da empresa",
  paraQueServe: "Cadastros de contratos, unidades e obras, usados para classificar as solicitações de RH.",
  passos: [
    ...(equipe ? ["Escolha a empresa no seletor “Empresa”."] : []),
    "Escolha a aba Contratos, Unidades ou Obras.",
    "Clique em “Adicionar”, preencha e salve.",
    "Use “Editar” para corrigir um item. Marque “Mostrar também inativos” para ver os desativados.",
    "Ao abrir uma solicitação, escolha o contrato, a unidade e a obra nesses cadastros.",
  ],
  dicas: [
    "As obras daqui não são as “Frentes / Locais” de Parâmetros da empresa. Os locais de lá é que aparecem no cadastro do colaborador.",
  ],
  quemPode: equipe ? EQUIPE : "Admin e RH da empresa.",
});

const FERIAS = (equipe: boolean): PageHelpContent => ({
  titulo: "Gestão de férias",
  paraQueServe: "Programar as férias dos colaboradores, acompanhar a aprovação e consultar o histórico.",
  passos: [
    ...(equipe ? ["Escolha a empresa para começar."] : []),
    "Clique em “Programar férias”, escolha o colaborador: o período aquisitivo e o prazo vêm sugeridos a partir da admissão.",
    "Preencha “Início das férias” e “Último dia das férias” e clique em “Salvar programação”.",
    "No calendário, use os seletores de mês e de ano, as setas e o botão “Hoje” para navegar. A lista abaixo tem filtros por colaborador, situação e período.",
    "Acompanhe a situação: Rascunho, Em análise, Aprovado ou Correção solicitada. O sino avisa quando algo muda ou o prazo se aproxima.",
  ],
  dicas: [
    "Os prazos sugeridos vêm de Parâmetros da empresa (aba Férias) e são regras da empresa para organizar a programação; não substituem a CLT.",
    "O sistema não calcula saldo legal de férias: confira cada caso.",
  ],
  quemPode: equipe ? "Equipe SmartDocPlan e RH da empresa." : "Admin e RH da empresa programam; os demais perfis consultam.",
});

const NOVA_SOLICITACAO = (equipe: boolean): PageHelpContent => ({
  titulo: "Nova solicitação de RH",
  paraQueServe: "Pedir à SmartDocPlan um processo de RH: admissão, demissão, mudança de função, afastamento, atestado ou outros.",
  passos: [
    ...(equipe ? ["Escolha a empresa em nome da qual você abre a solicitação."] : []),
    "Etapa Processo: clique no processo desejado e em “Próxima etapa”.",
    "Etapa Pessoa: na admissão, digite o CPF e o nome. Nos outros processos, escolha o colaborador na lista (CPF, nome, função e local são preenchidos sozinhos). Escolha a função e o local.",
    "Etapa Contratação: informe o formato e o prazo do contrato, quando houver.",
    "Etapa Requisitos: confira os documentos exigidos e a Matriz Legal e anexe os arquivos (PDF, PNG ou JPG até 10 MB). Dá para anexar depois.",
    "Etapa Revisão: confira o resumo à direita e abra a solicitação. Use “Voltar etapa” para corrigir.",
  ],
  dicas: [
    "Função e local vêm dos cadastros de Parâmetros da empresa. Os atalhos “Cadastrar função” e “Cadastrar frente / local” criam na hora.",
    "Documentos de saúde só aparecem para quem pode vê-los.",
  ],
  quemPode: equipe ? EQUIPE : "Admin e RH da empresa.",
});

const SOLICITACOES = (equipe: boolean): PageHelpContent => ({
  titulo: equipe ? "Solicitações de RH" : "Solicitações de RH",
  paraQueServe: equipe
    ? "Acompanhar e avaliar as solicitações de RH de todas as empresas, em quadro (kanban) ou em lista."
    : "Acompanhar as solicitações que você abriu e ver o que a SmartDocPlan respondeu.",
  passos: equipe
    ? [
        "Escolha “Kanban” ou “Lista” e filtre por empresa e por tipo.",
        "Clique num cartão para abrir a avaliação: dados, documentos e parecer técnico.",
        "Para mudar a situação, arraste o cartão para outra coluna. Abre a avaliação com o novo status.",
        "Escreva a observação e confirme. Para rejeitar, o motivo é obrigatório.",
        "A empresa vê a nova situação e a observação, e recebe aviso no sino.",
      ]
    : [
        "Use a busca e os filtros de tipo e status. Escolha “Kanban” ou “Lista”.",
        "Clique numa solicitação para ver os detalhes, os documentos e as observações da equipe.",
        "Se ela estiver em “Aguard. correção” ou “Aguard. documentos”, envie o que foi pedido.",
        "Para pedir algo novo, clique em “Nova solicitação”.",
      ],
  dicas: equipe
    ? ["Se você cancelar a janela de avaliação, o cartão volta para a coluna de origem.", "Mudanças que não fazem sentido no fluxo são recusadas pelo sistema."]
    : ["Os números por situação no topo mostram quantas solicitações estão em cada etapa."],
  quemPode: equipe ? EQUIPE : "Admin e RH da empresa abrem. Gestor e Consulta só visualizam.",
});

const CHAMADOS = (equipe: boolean): PageHelpContent => ({
  titulo: equipe ? "Gestão de Chamados" : "Chamados de Suporte",
  paraQueServe: equipe
    ? "Atender os chamados de suporte abertos pelas empresas."
    : "Pedir ajuda ou registrar um problema para a equipe SmartDocPlan e acompanhar a conversa.",
  passos: equipe
    ? [
        "Veja o quadro (Aberto, Em Atendimento, Aguardando Retorno e Resolvido) ou a lista.",
        "Clique num chamado para abrir a conversa e ler o histórico.",
        "Para mudar o status, arraste o cartão ou use a lista: abre a conversa para escrever a mensagem (obrigatória ao Resolver ou Fechar).",
        "A empresa recebe aviso no sino a cada resposta. Quando ela responde, o cartão mostra “Empresa respondeu”.",
      ]
    : [
        "Clique em “Abrir Chamado”.",
        "Escolha o “Tipo de Chamado”, escreva o “Título”, escolha a “Prioridade” e descreva o problema em “Descrição Detalhada”.",
        "Clique em “Abrir Chamado”: ele aparece na lista como Aberto.",
        "Clique em “Ver conversa” para ler as respostas e escreva em “Responder” (botão “Enviar resposta”).",
        "O sino avisa a cada resposta da equipe.",
      ],
  dicas: equipe
    ? ["O aviso do chamado novo vai para toda a equipe."]
    : ["Conte o que você estava fazendo, em qual tela e o que apareceu: assim a resposta é mais rápida."],
  quemPode: equipe ? EQUIPE : "Admin, RH e Gestor abrem chamados. Consulta só visualiza.",
});

const PARAMETROS: Record<string, PageHelpContent> = {
  empresa: {
    titulo: "Parâmetros da empresa · Empresa",
    paraQueServe: "Dados e endereço da empresa e a logo que aparece no topo da plataforma e nos relatórios em PDF.",
    passos: [
      "Para trocar a logo, clique em “Trocar logo” e escolha um PNG ou JPG de até 2 MB (de preferência com fundo transparente). “Remover” tira a logo.",
      "Para mudar dados, telefone ou endereço, edite os campos. Ao digitar o CEP, rua, bairro, cidade e UF são preenchidos sozinhos.",
      "Clique em “Enviar para aprovação”. A alteração não muda o cadastro na hora: a SmartDocPlan confere e aprova.",
      "Acompanhe o pedido em “Atualizações cadastrais”: pendente, aprovada ou devolvida. O sino avisa o resultado, e o pedido também aparece em Chamados (tipo “Alteração cadastral”) com o que muda.",
    ],
    dicas: ["As outras abas (Funções, Locais, Matriz Legal, Documentos recorrentes e Férias) têm as regras da sua empresa."],
    quemPode: "Admin e RH da empresa editam. Os demais perfis não veem esta tela.",
  },
  cargos: {
    titulo: "Parâmetros da empresa · Funções",
    paraQueServe: "Cadastra as funções (cargos) da empresa e os documentos exigidos de cada uma. Esses documentos formam o checklist do dossiê do colaborador.",
    passos: [
      "Clique em “Nova Função”, escreva o nome (e o CBO, se quiser) e clique em “Salvar função”.",
      "Clique no cartão da função para selecioná-la: aparece a etiqueta “Selecionada” e, embaixo, os requisitos dela.",
      "Clique em “Novo requisito” e preencha: Categoria (treinamento, exame médico...), Processo (todos, admissão, demissão, mudança de função ou outros), Nome do requisito (o documento exigido, por exemplo “ASO” ou “Certificado NR-35”), Validade em meses e se é obrigatório.",
      "A “Norma da Matriz Legal” é opcional: só liga o item à norma que o fundamenta, para referência.",
      "Clique em “Adicionar requisito”. Os colaboradores dessa função passam a ter esse documento no dossiê.",
    ],
    dicas: ["Deixe a validade vazia se o documento não vence.", "Item obrigatório pesa na liberação do colaborador."],
    quemPode: "Admin e RH da empresa.",
  },
  locais: {
    titulo: "Parâmetros da empresa · Locais",
    paraQueServe: "Cadastra as obras, frentes e locais de trabalho da empresa. Eles aparecem ao cadastrar colaboradores e nas solicitações.",
    passos: [
      "Clique em “Novo Local”.",
      "Escreva o Nome (o CNOS é opcional). Ao digitar o CEP, o endereço é preenchido sozinho; complete o número.",
      "Clique em “Criar local”.",
      "Para corrigir, clique no lápis ao lado do local. Para desativar, use a opção de status.",
    ],
    dicas: ["Contratos, unidades e obras da “Estrutura da empresa” são outro cadastro, usado só nas solicitações."],
    quemPode: "Admin e RH da empresa.",
  },
  matriz: {
    titulo: "Parâmetros da empresa · Matriz Legal",
    paraQueServe: "Lista as NRs e os requisitos legais que se aplicam à empresa, com o documento exigido e a validade.",
    passos: [
      "Clique em “Adicionar Requisito”.",
      "Preencha a Norma (por exemplo, NR-35), o Documento Exigido e a Validade em meses. O Requisito é opcional.",
      "Clique em “Adicionar”. O item aparece na lista e é mostrado ao abrir solicitações.",
      "Para corrigir ou remover, use os botões do item.",
    ],
    quemPode: "Admin e RH da empresa.",
  },
  mensais: {
    titulo: "Parâmetros da empresa · Documentos recorrentes",
    paraQueServe: "Cadastra documentos que precisam ser enviados de tempos em tempos, como folha de ponto, ficha de EPI e guia do FGTS.",
    passos: [
      "Clique em “Novo documento recorrente” e escreva o Nome.",
      "Em “Enviado”, escolha “Por colaborador (no dossiê)” ou “Da empresa”.",
      "Escolha a Periodicidade (semanal, quinzenal, mensal, bimestral, trimestral, semestral ou anual).",
      "Informe o “Prazo após o fim do período (dias)”. O exemplo logo abaixo mostra a data limite de um período.",
      "Clique em “Salvar”. Use “Editar” para ajustar e “Desativar” para parar de cobrar.",
    ],
    dicas: [
      "Os períodos seguem o calendário (semana de segunda a domingo, mês cheio...). A data do primeiro envio não define o período.",
      "O prazo conta a partir do fim do período: mensal com 10 dias, o documento de setembro vence em 10/10.",
      "Só são cobrados os períodos desde a admissão do colaborador e a partir do período anterior ao cadastro do documento.",
    ],
    quemPode: "Admin e RH da empresa.",
  },
  ferias: {
    titulo: "Parâmetros da empresa · Férias",
    paraQueServe: "Define em quantos meses o colaborador adquire férias e quanto tempo a empresa tem para solicitá-las. Os prazos contam a partir da admissão.",
    passos: [
      "Em “Meses até adquirir férias”, informe de 1 a 24 (padrão: 12).",
      "Em “Meses para solicitar depois de adquirir”, informe de 1 a 12 (padrão: 1).",
      "Confira o “Exemplo” logo abaixo: ele mostra as datas para uma admissão de hoje.",
      "Clique em “Salvar parâmetros”.",
    ],
    dicas: ["Os prazos são regras da empresa para organizar a programação e não substituem a CLT.", "Eles alimentam a sugestão de férias e os avisos do sino."],
    quemPode: "Admin e RH da empresa.",
  },
};

type Entry = { rota: string; conteudo: PageHelpContent };

const ENTRADAS: Entry[] = [
  // ─── Equipe SmartDocPlan ───────────────────────────────────────────────
  {
    rota: "/admin",
    conteudo: {
      titulo: "Dashboard Global",
      paraQueServe: "Mostra, num só lugar, como estão todas as empresas clientes: quantas estão ativas, quantos colaboradores e quantas solicitações e chamados aguardam a equipe.",
      passos: [
        "Olhe os quatro quadros do topo: Empresas Ativas, Colaboradores Ativos, Solicitações Abertas e Chamados Abertos.",
        "Em “Status das Solicitações”, veja quantas estão Novas, Concluídas e Rejeitadas.",
        "Use o “Acesso Rápido” (Cadastrar Empresa, Ver Solicitações, Ver Chamados, Auditoria) para ir direto ao que precisa.",
        "O sino, no canto de cima, avisa de documentos enviados, chamados e pedidos das empresas. Clique no aviso para abrir a tela certa.",
        "Para ver a plataforma como uma empresa, use “Operar como empresa”.",
      ],
      dicas: ["Os números somam todas as empresas. Para ver uma só, abra Empresas e clique em “Ver detalhes”.", "No sino, vermelho é urgente (vencido, rejeitado ou atrasado) e amarelo é a vencer."],
      quemPode: "Equipe SmartDocPlan (Administrador Geral, Analista e Auditor; o Auditor só consulta).",
    },
  },
  {
    rota: "/admin/empresas",
    conteudo: {
      titulo: "Gestão de Empresas",
      paraQueServe: "Cadastro das empresas clientes. Daqui você cria uma empresa nova e abre a ficha completa dela.",
      passos: [
        "Use a busca e o filtro de situação para achar a empresa.",
        "Para cadastrar, clique em “Nova Empresa”, preencha Razão Social, CNPJ, e-mail e o CEP (o endereço é preenchido sozinho), envie a logo se já tiver e clique em “Cadastrar”.",
        "Para acompanhar uma empresa, clique em “Ver detalhes” no cartão dela.",
      ],
      dicas: ["O CNPJ é conferido: use um CNPJ válido.", "Empresa inativa não pode abrir novas solicitações."],
      quemPode: EQUIPE,
    },
  },
  {
    rota: "/admin/empresas/:id",
    conteudo: {
      titulo: "Ficha da empresa",
      paraQueServe: "Visão completa de uma empresa: números, dados cadastrais e abas de colaboradores, solicitações, usuários, documentos e atualizações cadastrais.",
      passos: [
        "No alto, confira os números: colaboradores ativos, solicitações e chamados abertos e usuários.",
        "Em “Dados Cadastrais”, veja CNPJ, e-mail e endereço.",
        "Na aba Colaboradores, clique em “Dossiê” para abrir os documentos de um colaborador.",
        "Na aba Atualizações, confira os pedidos de alteração de dados feitos pela empresa e aprove ou devolva.",
        "Na aba Documentos, veja os documentos legais e a logo da empresa (“Trocar logo”).",
      ],
      dicas: ["A alteração pedida pela empresa só muda o cadastro depois que você aprova."],
      quemPode: EQUIPE,
    },
  },
  { rota: "/admin/estrutura", conteudo: ESTRUTURA(true) },
  { rota: "/admin/ferias", conteudo: FERIAS(true) },
  {
    rota: "/admin/colaboradores/:id",
    conteudo: {
      titulo: "Dossiê do colaborador",
      paraQueServe: "Documentos de um colaborador: a lista exigida pela função, a conformidade e a liberação.",
      passos: [
        "No alto, veja a Conformidade (porcentagem de documentos exigidos aprovados e válidos) e a situação: Liberado, Em análise ou Aguardando documentação.",
        "Em “Documentos exigidos para liberação”, veja cada item: pendente, aguardando validação, aprovado, rejeitado ou vencido.",
        "Documento aguardando validação: confira o arquivo e clique em “Aprovar” ou “Rejeitar”. Ao rejeitar, escreva o motivo; a empresa é avisada.",
        "Nova versão de um documento já aprovado aparece num quadro azul dentro do card: “Visualizar nova versão”, depois “Aprovar nova versão” ou “Rejeitar”.",
        "Mais abaixo, veja os documentos recorrentes por período e as próximas férias.",
      ],
      dicas: [
        "O colaborador só fica Liberado quando todos os documentos obrigatórios estão aprovados e dentro da validade.",
        "Enquanto a nova versão não é aprovada, a anterior continua valendo. Ao aprovar, a anterior vai para “Versões anteriores”; ao rejeitar, ela continua valendo.",
        "Documentos de saúde só podem ser abertos pelo Administrador Geral e pelo RH da empresa.",
      ],
      quemPode: "Equipe SmartDocPlan. Aprovar e rejeitar: Administrador Geral e Analista.",
    },
  },
  {
    rota: "/admin/campanhas",
    conteudo: {
      titulo: "Calendário da saúde",
      paraQueServe: "Campanhas mensais de saúde (Janeiro Branco, Setembro Amarelo, Outubro Rosa...) que mudam a cor da plataforma e mostram um banner para as empresas.",
      passos: [
        "As 12 campanhas do ano já estão cadastradas como rascunho. Clique em “Editar” para revisar título, mensagem do banner, link, cor e quem vê.",
        "Clique em “Ver tema na plataforma” para enxergar o resultado só para você. Para sair, clique em “Encerrar prévia” na faixa do topo.",
        "Quando estiver pronta, ligue a chave “Ativar” do cartão: a campanha passa a valer no mês escolhido.",
        "Para criar uma campanha própria, use “Nova campanha”.",
      ],
      dicas: ["Com o alto contraste ligado, a cor da campanha não é aplicada.", "Cada usuário pode fechar o banner no X."],
      quemPode: "Administrador Geral.",
    },
  },
  {
    rota: "/admin/validacao-documentos",
    conteudo: {
      titulo: "Validação de documentos",
      paraQueServe: "Fila dos documentos enviados pelas empresas que aguardam a sua conferência.",
      passos: [
        "Veja a lista: empresa, colaborador e documento.",
        "Clique em “Ver arquivo” para abrir e conferir. O selo “Nova versão” indica que a versão anterior continua valendo até a sua aprovação.",
        "Estando certo, clique em “Aprovar”. O documento sai da fila.",
        "Havendo problema, clique em “Rejeitar” e escreva o motivo (obrigatório). A empresa é avisada no sino.",
        "Quando todos os documentos obrigatórios do colaborador estiverem aprovados, ele passa para Liberado sozinho.",
      ],
      dicas: ["Documentos de saúde só aparecem na fila para quem pode vê-los."],
      quemPode: "Administrador Geral e Analista.",
    },
  },
  { rota: "/admin/solicitacoes", conteudo: SOLICITACOES(true) },
  { rota: "/admin/solicitacoes/nova", conteudo: NOVA_SOLICITACAO(true) },
  { rota: "/admin/chamados", conteudo: CHAMADOS(true) },
  {
    rota: "/admin/auditoria",
    conteudo: {
      titulo: "Log de Auditoria",
      paraQueServe: "Registro de tudo o que acontece na plataforma: quem fez, em qual empresa e quando.",
      passos: [
        "Filtre por Empresa, Ação e período (“De” e “Até”).",
        "Clique num registro para abrir o detalhe: e-mail, o que mudou e as obras do usuário.",
        "O Administrador Geral também vê o IP e o navegador usados na ação.",
        "Use os botões de página no fim da lista.",
      ],
      dicas: ["Entradas e tentativas de entrada com senha errada também ficam registradas.", "Os registros não podem ser alterados."],
      quemPode: "Equipe SmartDocPlan. IP e navegador: só o Administrador Geral.",
    },
  },
  { rota: "/admin/bi", conteudo: BI("global") },
  {
    rota: "/admin/usuarios",
    conteudo: {
      titulo: "Gestão de Usuários",
      paraQueServe: "Cadastrar e gerenciar quem acessa a plataforma: a equipe interna e os usuários das empresas.",
      passos: [
        "Busque por nome ou e-mail e, se quiser, filtre por empresa.",
        "Clique em “Novo Usuário”: nome, e-mail, senha inicial (o olho mostra o que você digitou), papel e empresa. Clique em “Criar Usuário”.",
        "No menu de três pontos de cada usuário: Editar dados, Alterar Papel, Redefinir Senha, Obras / locais e Ativar ou Desativar.",
        "Entregue a senha inicial por um canal seguro. No primeiro acesso o sistema pede que a pessoa crie a própria senha; o mesmo acontece depois de “Redefinir Senha”.",
      ],
      dicas: ["O e-mail é o login e é gravado em minúsculas; dois usuários não podem ter o mesmo e-mail.", "Desativar impede o acesso sem apagar o histórico."],
      quemPode: "Administrador Geral.",
    },
  },
  {
    rota: "/admin/configuracoes",
    conteudo: {
      titulo: "Configurações da Plataforma",
      paraQueServe: "Seus dados de acesso, o tamanho das janelas, a troca de senha e informações da plataforma.",
      passos: [
        "Em “Meu Perfil”, confira nome, e-mail e perfil de acesso.",
        "Em “Tamanho das janelas”, escolha Pequeno, Médio ou Grande. Vale só para você, neste navegador.",
        "Para trocar a senha, preencha “Senha atual”, “Nova senha” e “Confirmar nova senha” e clique em “Alterar Senha”.",
        "Em “Sobre a Plataforma”, veja versão, ambiente e a conexão com o banco de dados.",
        "“Permissões por Perfil” resume o que cada perfil pode fazer.",
      ],
      quemPode: "Administrador Geral.",
    },
  },
  { rota: "/admin/perfil", conteudo: PERFIL },
  {
    rota: "/admin/documentos",
    conteudo: {
      titulo: "Checklist de Documentos",
      paraQueServe: "Define quais documentos são pedidos em cada tipo de solicitação (admissão, demissão etc.). Eles aparecem para a empresa ao abrir a solicitação.",
      passos: [
        "Veja os contadores por tipo de solicitação e a lista de documentos configurados.",
        "Clique em “Novo Documento” e preencha Nome, Categoria, Tipo de Solicitação, “Aplica-se a” e a Descrição / instruções.",
        "Use “Ordem” para definir a posição do documento na lista.",
        "Edite ou remova pelos botões do item.",
      ],
      dicas: ["Vale para todas as empresas. Os documentos exigidos por função são de cada empresa, em Parâmetros da empresa."],
      quemPode: "Administrador Geral.",
    },
  },
  {
    rota: "/admin/matriz-legal",
    conteudo: {
      titulo: "Matriz de Requisitos Legais",
      paraQueServe: "NRs e requisitos legais de cada empresa, com o documento exigido e a validade.",
      passos: [
        "Selecione a empresa no alto da tela.",
        "Clique para adicionar e preencha Norma Regulamentadora, Documento Exigido e Validade (meses). O Requisito é opcional.",
        "Salve. O item aparece na lista e é mostrado ao abrir solicitações dessa empresa.",
        "Para corrigir ou remover, use os botões do item.",
      ],
      quemPode: "Administrador Geral.",
    },
  },

  // ─── Área da empresa ──────────────────────────────────────────────────
  {
    rota: "/empresa",
    conteudo: {
      titulo: "Painel de RH",
      paraQueServe: "Resumo da sua empresa: colaboradores, solicitações, chamados e alertas de documentos.",
      passos: [
        "Veja os quadros do topo: Colaboradores ativos, Afastados, Solicitações novas e Chamados abertos.",
        "Em “Alertas documentais da empresa”, confira os Obrigatórios pendentes, os Vencidos e os que vencem em 30 dias. “Ver documentos da empresa” leva à tela deles.",
        "Em “Solicitações por status”, veja em que etapa estão os seus pedidos.",
        "Use “Nova solicitação” (canto de cima) ou o “Acesso rápido” para ir direto ao que precisa.",
      ],
      dicas: ["O sino avisa quando algo é aprovado, rejeitado ou está para vencer. Vermelho é urgente e amarelo é a vencer."],
      quemPode: "Todos os perfis da empresa.",
    },
  },
  { rota: "/empresa/solicitacoes/nova", conteudo: NOVA_SOLICITACAO(false) },
  { rota: "/empresa/solicitacoes", conteudo: SOLICITACOES(false) },
  {
    rota: "/empresa/colaboradores",
    conteudo: {
      titulo: "Colaboradores",
      paraQueServe: "Lista dos colaboradores da empresa e o andamento da documentação de cada um.",
      passos: [
        "No topo, os quadros mostram quantos estão Liberados, Em análise, Aguardando documentação e Sem requisitos definidos.",
        "Use as abas: Ativos (liberados, inclusive afastados), Em efetivação (documentação pendente ou em análise) e Desligados.",
        "Busque por nome, CPF, e-mail ou telefone e filtre por situação, função e local.",
        "Para cadastrar, clique em “Novo Colaborador”: nome completo, CPF, nascimento (mínimo 13 anos), admissão, cargo e obra / local. Clique em “Cadastrar”.",
        "Clique em “Dossiê” para abrir os documentos do colaborador.",
      ],
      dicas: ["Cadastrar um colaborador avisa a equipe SmartDocPlan.", "A aba escolhida fica no endereço da página: dá para voltar a ela."],
      quemPode: EMPRESA_EDITA,
    },
  },
  {
    rota: "/empresa/colaboradores/:id",
    conteudo: {
      titulo: "Dossiê do colaborador",
      paraQueServe: "Documentos de um colaborador, o que falta para liberá-lo, os documentos recorrentes e as férias.",
      passos: [
        "No alto, veja a Conformidade e a situação (Liberado, Em análise ou Aguardando documentação).",
        "Em “Documentos exigidos para liberação”, clique em “Enviar” no item pendente, escolha o arquivo, preencha as datas e clique em “Salvar”.",
        "Aguarde a validação da SmartDocPlan. O sino avisa quando for aprovado, ou rejeitado com o motivo (envie de novo, corrigido).",
        "Para um documento que não está na lista, clique em “Enviar outro documento” e escolha o “Documento exigido” ou “Outro documento”.",
        "Para atualizar um documento, clique em “Editar” e troque o arquivo ou as datas: vira uma nova versão, que aguarda validação. A versão atual continua valendo até a aprovação; as antigas ficam em “Versões anteriores”.",
        "Em “Documentos recorrentes”, clique no período (semana, mês...) para enviar o documento daquele período.",
        "Em “Próximas férias”, veja o período aquisitivo; “Consultar férias do colaborador” abre a tela de férias.",
      ],
      dicas: [
        "Aceitamos PDF, PNG ou JPG de até 10 MB.",
        "A data de emissão não pode ser futura e a validade não pode ser anterior à emissão.",
        "Documentos de saúde só podem ser abertos pelo RH da empresa e pelo Administrador Geral. O Admin da empresa envia e acompanha a situação e a validade, sem abrir o arquivo.",
      ],
      quemPode: "Admin e RH da empresa enviam (inclusive documentos de saúde). Gestor e Consulta só visualizam.",
    },
  },
  {
    rota: "/empresa/parametros",
    conteudo: PARAMETROS.empresa, // substituído pela aba em getPageHelp
  },
  {
    rota: "/empresa/documentos",
    conteudo: {
      titulo: "Documentos da Empresa",
      paraQueServe: "Documentos legais da empresa (Cartão CNPJ, Contrato Social, PCMSO, PGR, LTCAT, CNO) e os documentos recorrentes da empresa.",
      passos: [
        "No topo, os quadros mostram quantos documentos foram enviados, quantos obrigatórios faltam, quantos estão vencidos e quantos vencem em 30 dias.",
        "Em cada documento pendente, envie o arquivo e preencha as datas.",
        "Para atualizar um documento, use “Nova versão”. A versão anterior fica guardada no histórico.",
        "Em “Documentos recorrentes da empresa”, clique no período (por exemplo, um mês) para enviar o documento dele.",
      ],
      dicas: ["O sino avisa quando um documento vence em 30 dias, em 7 dias ou venceu.", "Aceitamos PDF, PNG ou JPG de até 10 MB."],
      quemPode: EMPRESA_EDITA,
    },
  },
  {
    rota: "/empresa/pendencias",
    conteudo: {
      titulo: "Pendências de Conformidade",
      paraQueServe: "Mostra quem está com documentação pendente ou vencida e quem não enviou os documentos recorrentes do último período.",
      passos: [
        "Veja os quadros: Críticos (abaixo de 50%), Atenção (50% a 79%) e Em conformidade.",
        "Em “Colaboradores com Pendências”, clique em “Dossiê” para resolver o que falta.",
        "Mais abaixo, confira os documentos recorrentes atrasados e envie pelo dossiê de cada colaborador.",
      ],
      dicas: ["A porcentagem é de documentos exigidos aprovados e válidos."],
      quemPode: "Todos veem. Quem envia documentos: Admin e RH da empresa.",
    },
  },
  { rota: "/empresa/chamados", conteudo: CHAMADOS(false) },
  { rota: "/empresa/bi", conteudo: BI("empresa") },
  { rota: "/empresa/perfil", conteudo: PERFIL },
  {
    rota: "/empresa/configuracoes",
    conteudo: {
      titulo: "Configurações",
      paraQueServe: "Suas preferências de uso neste navegador: tema, acessibilidade e tamanho das janelas.",
      passos: [
        "Em “Aparência”, clique em “Usar tema escuro” (ou volte ao claro).",
        "Em “Acessibilidade”, use A−, Padrão e A+ para o tamanho do texto e “Ligar” no alto contraste.",
        "Em “Tamanho das janelas”, escolha Pequeno, Médio ou Grande. As janelas de cadastro passam a abrir nesse tamanho.",
        "“Abrir Meu perfil” leva à troca de senha. “Abrir Parâmetros” leva aos dados e regras da empresa.",
      ],
      dicas: ["As escolhas valem para o seu usuário, neste navegador."],
      quemPode: "Todos os perfis da empresa.",
    },
  },
  { rota: "/empresa/ferias", conteudo: FERIAS(false) },
  { rota: "/empresa/estrutura", conteudo: ESTRUTURA(false) },
];

const regexDaRota = (rota: string) => new RegExp(`^${rota.replace(/:[^/]+/g, "[^/]+")}$`);

/** Rotas que têm ajuda (usado no teste que compara com as rotas de App.tsx). */
export const ROTAS_COM_AJUDA = ENTRADAS.map((entrada) => entrada.rota);

/** Ajuda da tela atual; `search` é a query string (ex.: "?aba=locais"). Null se a tela não tiver ajuda. */
export function getPageHelp(path: string, search = ""): PageHelpContent | null {
  const limpo = path.length > 1 ? path.replace(/\/+$/, "") : path;
  const entrada = ENTRADAS.find((item) => regexDaRota(item.rota).test(limpo));
  if (!entrada) return null;
  if (entrada.rota === "/empresa/parametros") {
    const aba = new URLSearchParams(search).get("aba") ?? "empresa";
    return PARAMETROS[aba] ?? PARAMETROS.empresa;
  }
  return entrada.conteudo;
}
