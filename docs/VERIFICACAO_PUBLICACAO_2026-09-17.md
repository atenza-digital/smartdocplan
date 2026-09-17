# SmartDocPlan - verificação da publicação

## Resultado

- Ambiente: homologação na VPS, em http://89.116.214.65:8080.
- Versão publicada: `d1b0a4df6b1a24bb4098151dd2eb76cc6d5da291`.
- CI/CD: https://github.com/atenza-digital/smartdocplan/actions/runs/35243343097.
- Checagem de tipos, 59 testes, build da aplicação, publicação da imagem e deploy concluídos com sucesso.
- Endpoint público respondeu HTTP 200 com a versão esperada. Página de login conferida também no navegador.
- Não se declara conclusão de todas as melhorias da minuta: permanecem definições funcionais e a recuperação de anexos antigos.

## Verificações executadas

1. Testes locais e no CI com PostgreSQL dedicado, inclusive inicialização de banco vazio pela estrutura-base versionada e aplicação repetida das migrações.
2. Férias: criação, sobreposição e concorrência, revisão desatualizada, envio sem aviso, upload válido/inválido, devolução, edição, nova documentação, aprovação, cancelamento, histórico e isolamento por empresa/perfil.
3. Solicitações: identificador PostgreSQL, transação de abertura, vínculos por empresa, preservação das regras históricas e manutenção do requisito após retirada do arquivo.
4. Dados de saúde e arquivos: acesso restrito por perfil/empresa, bloqueio anônimo, revogação da URL quando retirada do vínculo e resposta sem cache público.
5. Na VPS: login, consultas de empresas/cadastros/solicitações/férias e download de documento antigo cujo arquivo permanece disponível.
6. Na VPS, empresa fictícia de QA nº 5: criação de colaborador com nascimento/admissão, função, contrato e edição, solicitação com cópia histórica, documento empresarial com emissão/validade e alteração das datas, programação de férias com anexo, envio, devolução, reenvio, aprovação, histórico e download.
7. Ao encerrar: férias fictícias canceladas com motivo, solicitação fictícia rejeitada com observação de QA, colaborador fictício desligado e empresa nº 5 inativada. Registros de teste/auditoria foram preservados, sem alterar cadastros reais para executar o cenário.
8. Interface local: formulário, calendário, histórico e rolagem em desktop e largura de 390 pixels. Datas do cenário foram preenchidas por instrumentação do navegador; a automação nativa desses campos não funcionou, portanto não se afirma cobertura completa de digitação manual.

## Preservação e acesso

Os 11 arquivos existentes no contêiner antes da primeira publicação foram copiados e preservados. Novos uploads ficam no volume `/docker/smartdocplan/uploads`, fora do diretório de build.

Backup final anterior ao deploy: `/docker/smartdocplan/backups/20260917T155751Z-d1b0a4df6b1a24bb4098151dd2eb76cc6d5da291`, com dump PostgreSQL, arquivos, ambiente e referência da imagem anterior. O dump teve seu índice validado; isso não equivale a ensaio completo de restauração. O retorno automático da imagem está configurado, mas não foi provocado deliberadamente nesta homologação.

Havia bloqueio geral de portas Docker no servidor. Foi acrescentada somente a exceção para a publicação do SmartDocPlan (porta pública 8080 para porta interna 5000). A regra geral de bloqueio foi mantida. Serviço dedicado reaplica a exceção após inicialização do Docker; não houve reinício da VPS para testar esse cenário.

O endereço solicitado continua HTTP, sem criptografia de transporte. Os testes autenticados da VPS foram feitos por conexão SSH cifrada; o acesso público foi verificado sem enviar credenciais. Usar dados fictícios na homologação e configurar HTTPS antes de operação com dados reais/sensíveis. Proteção de arquivos na aplicação não substitui HTTPS, política de retenção ou inspeção antimalware.

## Anexos antigos ausentes

O banco já possuía seis referências sem arquivo correspondente antes desta publicação. Esses arquivos não foram encontrados nos diretórios e backups históricos consultados. Não foram apagados registros nem criados arquivos substitutos.

| Solicitação | Documento | Identificador do anexo |
| --- | --- | --- |
| 1 | RG (Identidade) | 1 |
| 1 | Comprovante de Residência | 2 |
| 1 | Foto 3x4 | 3 |
| 2 | RG (Identidade) | 7 |
| 3 | RG (Identidade) | 5 |
| 4 | ASO - Admissional | 6 |

Providência: recuperar os originais em outra fonte ou solicitar reenvio pela própria plataforma. Não encaminhar documentos pessoais ou de saúde no grupo de WhatsApp. A validação dos novos fluxos passou, mas a integridade documental histórica permanece com essa pendência.

## Respostas necessárias da SmartDocPlan

- Tabela de conformidade prometida na minuta: pesos, percentual mínimo, documentos críticos e tratamento de pendências, vencimentos, rejeições e itens opcionais.
- Relacionamentos entre contrato, unidade, obra e frente: quais vínculos são obrigatórios, se admitem múltiplos vínculos e exemplos de estrutura real sem dados pessoais. As entidades separadas já foram implementadas.
- Matriz por local, na segunda fase: requisitos locais complementam ou substituem os da função? Como resolver duplicidades e regras diferentes para o mesmo documento?
- Saldo legal de férias: dados históricos disponíveis, saldos de entrada, fracionamentos, abono e ocorrências a considerar, com validação das regras pelo responsável de RH. O fluxo documental já funciona; não existe cálculo automático de saldo legal neste lote.
- Atestados/afastamentos: identificar quais perfis correspondem ao RH autorizado e detalhar quem cadastra, avalia, solicita correção e registra retorno. Não se ampliou automaticamente o acesso de analistas aos dados de saúde.
- Recuperação/reenvio dos seis anexos antigos indicados acima, em canal apropriado.
