# Changelog

## [Não publicado]

- Endereço com CEP: locais de trabalho e empresa ganham CEP, número, complemento e bairro; ao digitar o CEP, rua, bairro, cidade e UF são preenchidos automaticamente (ViaCEP), com preenchimento manual se o CEP não existir ou o serviço falhar. O endereço da empresa segue pela aprovação de alteração cadastral.
- Equipe SmartDocPlan: dossiê do colaborador no admin (/admin/colaboradores/:id; auditor só consulta), fila "Validação de documentos" no menu e liberação, conformidade e link ao dossiê na ficha da empresa.
- Alertas: aviso no sino para admin e RH da empresa e para a equipe SmartDocPlan quando um documento (de colaborador ou da empresa) vence em até 30 dias, em até 7 dias ou venceu, e quando um documento mensal passa do prazo; sem repetição e, para dados de saúde, só para quem pode vê-los.
- Documentos da Empresa: módulo próprio no menu (/empresa/documentos) com documentos legais, histórico de versões e documentos mensais da empresa; também na ficha da empresa no admin (auditor só consulta).
- Contadores de documentos da empresa (painel, módulo e BI) consideram só a versão atual de cada tipo e reconhecem o tipo pelo código ou pelo nome; limite de arquivo alinhado em 10 MB (PDF, PNG ou JPG).
- Documentos mensais: cada empresa cadastra os seus (por colaborador ou da empresa) com dia limite no mês seguinte; grade por competência no dossiê, envio direto pela grade e lista de quem não enviou em Pendências.
- Configurações da empresa: abas quebram linha no celular.
- Dossiê: checklist dos documentos exigidos pelo cargo (pendente, aguardando validação, aprovado, rejeitado, vencido), com envio direto pelo item e validação (aprovar ou rejeitar com motivo) pela equipe SmartDocPlan; a rejeição avisa o RH da empresa.
- Conformidade real (documentos obrigatórios aprovados e válidos ÷ exigidos); cargo sem requisitos mostra "Sem requisitos definidos" em vez de 100%.
- Liberação do colaborador automática (aguardando documentação, em análise, liberado), com indicadores e filtro na lista; recalculada ao mudar documentos, requisitos ou cargo e a cada hora.
- Datas de admissão e nascimento deixam de aparecer um dia antes por causa do fuso.
- Documentos: datas de emissão e validade validadas no servidor e nos formulários (a partir de 01/01/1950, emissão não futura, validade não anterior à emissão e até 50 anos); documento com validade passada aparece como vencido e o dossiê avisa quando vence em até 30 dias.
- Dossiê do colaborador: envio de arquivo (PDF, PNG ou JPG até 10 MB) no lugar do link, com visualizar, editar, substituir arquivo (nova versão) e excluir (exclusão lógica, registrada na auditoria).
- Solicitações: arrastar cards entre colunas do kanban, com validação do fluxo de status também no servidor e motivo obrigatório ao rejeitar.
- Auditoria: mostra nome, papel e empresa de quem fez a ação, a obra afetada e os detalhes da alteração, com filtros por empresa, ação e período e paginação.
- Janelas de diálogo: largura padrão maior, altura limitada à tela com rolagem interna e formulário de colaborador em uma coluna no celular.
- Perfil: item "Meu perfil" no menu do usuário, com dados da conta, tema e troca da própria senha (cria a rota /api/auth/change-password, que não existia e deixava a troca de senha das Configurações quebrada).
- Responsividade: abas da ficha da empresa e botões do topo de Solicitações quebram linha no celular em vez de ficarem cortados.
- Chamados: conversa entre a equipe SmartDocPlan e a empresa, com resposta ao mudar o status (obrigatória ao resolver ou fechar), resposta da empresa e notificações (migration 20261005_ticket_messages).
- Chamados: visão kanban com arrastar entre status (mantida a visão em lista); soltar em Resolvido ou Fechado abre o atendimento com resposta obrigatória.
- Janelas de diálogo: cada usuário escolhe o tamanho (Pequeno, Médio ou Grande, cerca de 65% da tela) em Meu perfil e nas Configurações.
- Kanban (Solicitações e Chamados): soltar um card abre o modal já com o novo status e o campo de observação ou mensagem no topo; a mudança só é gravada ao confirmar.
- Usuários: vínculo com obras/locais da empresa (menu "Obras / locais" em Usuários) e auditoria mostrando as obras do usuário que fez a ação (migration 20261005_user_worksites).
- Empresas: upload da logo (PNG/JPG até 2 MB) nas configurações da empresa e na ficha da empresa (admin), exibida no topo da área da empresa.
- BI (global e da empresa): filtros por semana, mês, ano, últimos 12 meses ou período personalizado (de/até), com gráfico de evolução, indicadores do período e ranking de empresas no global.
- BI: exportação em PDF (global e da empresa) com capa, logos da SmartDocPlan e da empresa, resumo executivo, pontos de atenção, tabelas com barras, evolução no período e notas sobre os dados.
- BI em PDF: corrigidos espaçamento dos títulos e cards, palavras quebradas com hífen, rodapé com número da página, títulos e itens soltos no fim da página; a evolução omite intervalos sem movimento.
- Login: em telas baixas (ex.: notebook 1366×768 com barras do navegador) o layout fica compacto e o botão Entrar aparece sem rolar.
- Configurações da empresa: aba Perfil aponta para Meu perfil (troca de senha, tema e tamanho das janelas) e deixa de dizer que a senha só muda pelo administrador.
