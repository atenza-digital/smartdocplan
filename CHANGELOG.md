# Changelog

## [Não publicado]

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
