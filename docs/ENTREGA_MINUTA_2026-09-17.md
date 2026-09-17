# SmartDocPlan - execução da minuta de retorno

Data: 17/09/2026. Referência: MINUTA DE RESPOSTA, de 26/08/2026.

## Situação desta entrega

Entrega ampliada com gestão documental de férias, implementada, testada e publicada em homologação pelo Git/CI/CD. Não representa a conclusão de todos os ajustes da minuta. Os testes usaram PostgreSQL 17 dedicado e cenários fictícios na VPS. O resultado efetivo, a versão e as pendências estão em [Verificação da publicação](VERIFICACAO_PUBLICACAO_2026-09-17.md), incluindo seis referências antigas a arquivos ausentes que precisam de recuperação ou reenvio.

## Ajustes implementados

- Menu **Estrutura da empresa**, nas visões de plataforma e empresa, com cadastros separados de contratos, unidades e obras. As frentes continuam no cadastro existente, sem conversão automática dos dados antigos.
- Criação, edição, inativação, reativação, busca por nome/código e filtro de inativos. Campos com limites de tamanho e validação no servidor. Auditoria de criação/edição na mesma transação do cadastro.
- Contrato, unidade, obra e frente podem ser informados separadamente na solicitação. Os novos vínculos são opcionais: não foi inventada uma hierarquia obrigatória entre eles.
- Validação da empresa e dos vínculos na abertura: cadastros de outra empresa ou inativos são rejeitados antes da gravação. Colaborador e função também são conferidos no servidor.
- Correção da obtenção do identificador da solicitação no PostgreSQL. A solicitação, os documentos previstos e o evento de auditoria são gravados na mesma transação.
- Aplicação do checklist por processo e dos requisitos ativos da função, incluindo os requisitos configurados para todos os processos. Essa matriz já existia; a persistência na abertura foi corrigida.
- Preservação dos nomes dos vínculos e das regras aplicadas no momento da abertura. A avaliação consulta os modelos preservados, em vez de reconstruir o checklist usando a configuração atual. Solicitações antigas sem cópia preservada continuam usando o comportamento anterior; não foi fabricado histórico retroativo.
- Uploads preservam a obrigatoriedade do requisito configurado; apagar o anexo não apaga o requisito. Correção do envio de datas como datas do PostgreSQL. Falhas após a criação orientam a completar os anexos na solicitação já criada, em vez de criar outra.
- Processos e documentos classificados como saúde são restritos a `platform_admin` e `company_hr`, com isolamento por empresa. O perfil `platform_analyst` não foi equiparado automaticamente a RH. A autorização de avaliação continua a do fluxo existente: esta entrega não define novos aprovadores de atestados.
- URLs locais `/uploads` passaram a exigir sessão e autorização por empresa/categoria, com auditoria de acesso e sem cache público. Exclusão do anexo revoga o acesso por essa URL. Detalhes brutos dos eventos de documentos/solicitações são ocultados dos perfis de plataforma sem acesso a saúde, para reduzir exposição de registros antigos.
- Bloqueio de novos links externos para documentos de saúde no cadastro do dossiê. Links externos anteriores continuam dependendo das permissões do provedor onde estão armazenados; não se afirma proteção integral desses arquivos.
- Upload de solicitações limitado no servidor a PDF, PNG e JPEG, com verificação de tamanho real até 10 MB. Isso não substitui inspeção antimalware ou validação de conteúdo, ainda pendentes.
- Migração PostgreSQL aditiva, transacional e executada uma vez, com trava contra execução concorrente. Falha na migração impede iniciar a nova versão.
- CI/CD executa testes com PostgreSQL dedicado antes de build/publicação. Antes da substituição do aplicativo, preserva uploads anteriores, faz backup do PostgreSQL e dos arquivos, valida o dump e verifica a versão exata publicada. Há retorno à imagem anterior em caso de falha, sem restauração destrutiva automática do banco.
- Arquivos novos são gravados fora do diretório de build, em volume persistente. URLs existentes são preservadas. Sessões de usuários inativos são recusadas.
- Gestão de férias nas visões de plataforma e empresa: programação, edição de rascunhos/devoluções, aviso anexado, envio para análise, aprovação documental pela equipe SmartDocPlan, devolução com motivo e cancelamento com motivo. Cancelamento de período aprovado fica restrito à plataforma.
- Calendário mensal, busca por nome/CPF, filtros por colaborador/situação/período, cartões de situação, detalhes e histórico. O dossiê possui acesso às férias do colaborador. Períodos aprovados são apresentados como em férias ou encerrados conforme as datas, sem alterar retroativamente a aprovação.
- Servidor bloqueia períodos sobrepostos, inclusive em operações concorrentes, e rejeita edições baseadas em versão desatualizada. Alterar programação exige anexar novamente o aviso. Arquivos de férias são PDF, PNG ou JPEG, até 10 MB, com verificação de assinatura do conteúdo.
- Notificações por mudança de etapa e alertas de prazo de concessão informado: até 30 dias, até 7 dias e prazo ultrapassado, sem duplicar o mesmo alerta para a mesma revisão/faixa. Verificação na inicialização e a cada hora. Não há envio por e-mail/WhatsApp neste lote.

## Verificação

- 59 testes aprovados: 36 existentes, 19 de integração com PostgreSQL/HTTP e 4 de calendário/arquivos. A integração também grava nascimento/admissão e cria/edita/limpa datas de documentos da empresa.
- Corrigidas as conversões de datas nesses cadastros, incluídas colunas de emissão ausentes na instalação-base e validado o conteúdo/tamanho dos novos arquivos da empresa. Falhas na gravação removem o arquivo recém-criado, evitando sobras desse caminho de erro.
- Integração cobre migração repetida, separação dos cadastros, isolamento entre empresas, inativação, abertura com ID válido, cópia histórica das regras, permissões de saúde, upload com datas, acesso por URL e preservação do requisito após exclusão do anexo.
- Checagem TypeScript sem erros; builds de frontend e backend concluídos. O frontend ainda emite aviso de pacote JavaScript grande, não bloqueante.
- Validação no navegador: autenticação no banco fictício, seleção de empresa, cadastro de contrato, programação de férias, anexo, envio, aprovação e histórico. Calendário e rolagem conferidos em largura de 390 pixels. Campos de data do cenário foram preenchidos pela instrumentação do navegador, pois a automação de entrada nativa não os preencheu; isso não valida todas as formas de digitação manual.
- Esta validação não equivale a uma homologação completa dos fluxos existentes nem a uma revisão de conformidade legal.

## Pendências e ordem recomendada

1. Confirmar os relacionamentos entre contrato, unidade, obra e frente. Os cadastros separados já permitem avançar, mas não há herança de vínculos entre eles.
2. Implementar a segunda fase da matriz específica por frente/local/obra, depois de definir combinação, prioridade e duplicidade das exigências. Nesta entrega, selecionar esses vínculos não altera os requisitos por função.
3. Receber a tabela SmartDocPlan de pesos, percentual mínimo e tratamento de pendentes/vencidos; implementar o score apenas após a definição. O indicador atual não foi validado nem substituído.
4. Detalhar cálculo automático do saldo legal de férias, dados históricos, fracionamentos, abono e eventos que afetam o direito. A gestão documental já foi implementada; dias corridos programados não são saldo legal.
5. Detalhar e implementar o módulo de atestados/afastamentos, seus aprovadores, estados, correções e retornos. A proteção de acesso deste lote não substitui esse módulo.
6. Ampliar os indicadores, filtros e notificações dos módulos acima depois que seus registros e regras estiverem definidos.
7. Revisar tratamento de arquivos externos antigos, antimalware, retenção/descarte e controles de infraestrutura antes de afirmar proteção documental completa. O armazenamento local privado/persistente foi incluído neste lote.

## Publicação e cuidados

- Publicar pelo Git/CI/CD após revisar as alterações e validar a janela de homologação; não copiar arquivos manualmente para a VPS.
- Fazer backup do PostgreSQL e dos uploads antes de publicar. Confirmar que o proxy não serve `/uploads` diretamente, contornando a autorização da aplicação.
- A migração deste lote está em `drizzle/migrations/20260917_minuta.sql`, controlada por `smartdocplan.app_migrations` no início da aplicação. É incremental sobre o esquema PostgreSQL existente; não inicializa sozinha um banco vazio.
- Antes de usar `db:push`/geração automática para futuras versões, reconciliar os metadados históricos do Drizzle com as migrações incrementais. Não rodar geração automática diretamente em homologação.
- Confirmar login, criação de cadastro, abertura de solicitação, checklist histórico e acesso autorizado/negado a documentos após o deploy. Falha nesses testes impede liberar o lote aos usuários.
- O prazo de 16 semanas da proposta anterior não foi tratado como aceite contratual ou data de início nesta entrega.
