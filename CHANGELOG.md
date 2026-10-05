# Changelog

## [Não publicado]

- Dossiê do colaborador: envio de arquivo (PDF, PNG ou JPG até 10 MB) no lugar do link, com visualizar, editar, substituir arquivo (nova versão) e excluir (exclusão lógica, registrada na auditoria).
- Solicitações: arrastar cards entre colunas do kanban, com validação do fluxo de status também no servidor e motivo obrigatório ao rejeitar.
- Auditoria: mostra nome, papel e empresa de quem fez a ação, a obra afetada e os detalhes da alteração, com filtros por empresa, ação e período e paginação.
- Janelas de diálogo: largura padrão maior, altura limitada à tela com rolagem interna e formulário de colaborador em uma coluna no celular.
- Perfil: item "Meu perfil" no menu do usuário, com dados da conta, tema e troca da própria senha (cria a rota /api/auth/change-password, que não existia e deixava a troca de senha das Configurações quebrada).
- Responsividade: abas da ficha da empresa e botões do topo de Solicitações quebram linha no celular em vez de ficarem cortados.
