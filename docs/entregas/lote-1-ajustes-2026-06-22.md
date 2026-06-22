# Lote 1 de Ajustes SmartDocPlan

Data: 22/06/2026

## Escopo deste lote

Este lote consolidou os ajustes prioritários de base operacional e consistência de cadastro:

- validação de idade mínima de 12 anos nos campos de data de nascimento;
- máscaras e validações iniciais para CPF, CNPJ e telefone;
- melhoria de busca textual com normalização de acentos;
- opção de inativação e filtro de status na gestão de empresas;
- edição de requisitos na Matriz Legal;
- confirmação antes de exclusões importantes;
- melhoria dos campos de observação e descrição em formulários críticos;
- reforço de normalização de dados no back-end.

## Ajustes implementados

### 1. Validação de idade mínima

Foi criada validação compartilhada para garantir idade mínima de 12 anos completos.

Aplicado em:

- nova solicitação da empresa;
- cadastro de colaboradores;
- validação do back-end ao criar colaborador.

Também foi configurada data máxima nos campos de nascimento para impedir seleção acima do limite permitido.

### 2. CPF, CNPJ e telefone

Foi criado um helper compartilhado de formulário em `shared/formValidation.ts` com:

- máscara e validação de CPF;
- máscara e validação de CNPJ;
- máscara e validação de telefone;
- normalização de busca sem acentos;
- cálculo de idade mínima;
- data máxima para nascimento.

Uso aplicado em:

- cadastro e edição de empresas;
- cadastro de colaboradores;
- nova solicitação;
- validações do servidor para empresa e colaborador.

### 3. Gestão de empresas

Na tela administrativa de empresas foram adicionados:

- filtro por status;
- busca por razão social, fantasia, e-mail, CNPJ e telefone;
- modal único para criar e editar empresa;
- suporte operacional para empresa ativa, inativa e suspensa.

### 4. Matriz Legal

Na visão administrativa e na visão da empresa, a Matriz Legal passou a ter:

- edição de requisito;
- exclusão com confirmação;
- campo de descrição maior;
- busca mais robusta.

No back-end foi adicionada a mutation `legalRequirements.update`.

### 5. Solicitações da empresa

Na visão da empresa, a tela de solicitações passou a ter:

- busca por título, descrição, número e conteúdo textual;
- filtro por tipo;
- filtro por status;
- resumo por status respeitando os filtros aplicados.

### 6. Uploads e exclusões

Foi adicionada confirmação antes da exclusão de:

- arquivos anexados em solicitação;
- documentos do checklist administrativo;
- requisitos legais.

### 7. Campos maiores para texto

Foram ampliados campos de texto importantes para evitar truncamento visual e dar mais conforto ao usuário:

- observações na nova solicitação;
- motivo de reprovação de documentos;
- descrições em cadastros auxiliares e matriz legal.

### 8. Normalização no servidor

O back-end agora normaliza melhor os dados de entrada:

- empresas com CNPJ e telefone formatados;
- colaboradores com CPF e telefone formatados;
- nomes e descrições com `trim`;
- bloqueio de cadastro de colaborador com CPF inválido;
- bloqueio de cadastro de colaborador com menos de 12 anos.

## Validação executada

Foi executado com sucesso:

- `npm run check`
- `npm run build`

## Observações

Este documento registra apenas o lote 1 aprovado para execução incremental.

Itens maiores do backlog, como treinamentos por função, exames por fluxo, férias, exportações, banner rotativo, alertas avançados, psicosocial e melhorias estruturais adicionais, ficam para os próximos lotes.
