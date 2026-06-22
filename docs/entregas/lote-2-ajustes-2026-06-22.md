# Lote 2 - Ajustes entregues em 2026-06-22

## Escopo aplicado

- Cadastro de requisitos por função com foco em:
  - treinamentos
  - exames médicos
  - itens psicossociais
- Vínculo desses requisitos aos processos:
  - admissão
  - demissão
  - mudança de função
  - todos os processos
- Reaproveitamento da matriz legal como referência opcional em cada requisito da função.
- Reflexo desses requisitos na abertura da solicitação.
- Semeadura dos requisitos na própria solicitação para que apareçam também na etapa de avaliação, mesmo sem upload inicial.

## Ajustes técnicos

- `position_requirements` foi expandida com categoria, tipo de solicitação, descrição, ordem, ativo e `updatedAt`.
- `document_type_templates` e `request_document_uploads` passaram a aceitar a categoria `psicossocial`.
- Novo router `positionRequirements` com operações de:
  - listagem por função
  - listagem por contexto de solicitação
  - criação
  - edição
  - inativação
- `requests.create` agora pode receber `positionId` e semeia requisitos da função na solicitação.
- `requestDocUploads.upload` reaproveita placeholder sem arquivo quando o documento já foi previsto para a solicitação.

## Ajustes de interface

- Configurações da empresa:
  - seleção de função
  - painel de requisitos por função
  - inclusão, edição e inativação de requisitos
- Nova solicitação:
  - seção específica para requisitos da função selecionada
  - destaque de obrigatórios e opcionais
  - preparação de upload por item
- Avaliação de documentos:
  - placeholder sem arquivo não pode ser aprovado
  - placeholder pode receber anexo posteriormente pelo avaliador

## Observações

- O repositório local foi validado com `npm run check` e `npm run build`.
- O arquivo `README.MD` local segue fora do commit por conter material fora do escopo.
