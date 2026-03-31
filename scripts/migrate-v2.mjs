import { createConnection } from "mysql2/promise";
const conn = await createConnection(process.env.DATABASE_URL);

console.log("Iniciando migração v2...");

// 1. Corrigir tabela requests — adicionar colunas faltando
const reqCols = await conn.execute("SHOW COLUMNS FROM requests");
const reqColNames = reqCols[0].map(c => c.Field);

if (!reqColNames.includes('checklistCompleto')) {
  await conn.execute("ALTER TABLE requests ADD COLUMN checklistCompleto TINYINT(1) NOT NULL DEFAULT 0 AFTER prioridade");
  console.log("requests: coluna checklistCompleto adicionada");
}
if (!reqColNames.includes('responsavelId')) {
  await conn.execute("ALTER TABLE requests ADD COLUMN responsavelId INT AFTER criadoPor");
  console.log("requests: coluna responsavelId adicionada");
}

// 2. Corrigir tickets — coluna criadoPor pode estar faltando (seed criou sem NOT NULL)
const tkCols = await conn.execute("SHOW COLUMNS FROM tickets");
const tkColNames = tkCols[0].map(c => c.Field);
if (!tkColNames.includes('responsavelId')) {
  await conn.execute("ALTER TABLE tickets ADD COLUMN responsavelId INT AFTER criadoPor");
  console.log("tickets: coluna responsavelId adicionada");
}

// 3. Criar tabela request_documents (documentos anexados a solicitações)
await conn.execute(`CREATE TABLE IF NOT EXISTS request_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requestId INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(100),
  fileUrl TEXT,
  fileKey TEXT,
  obrigatorio TINYINT(1) NOT NULL DEFAULT 0,
  uploadedBy INT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);
console.log("request_documents: criada");

// 4. Criar tabela document_type_templates — templates de documentos por tipo de solicitação
await conn.execute(`CREATE TABLE IF NOT EXISTS document_type_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipoSolicitacao ENUM('admissao','demissao','mudanca_funcao','afastamento','atestado_medico','outros') NOT NULL,
  categoria ENUM('pessoal','treinamento','exame_medico','outros') NOT NULL DEFAULT 'pessoal',
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  obrigatorio TINYINT(1) NOT NULL DEFAULT 1,
  sexo ENUM('todos','masculino','feminino') NOT NULL DEFAULT 'todos',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  ordem INT NOT NULL DEFAULT 0,
  criadoPor INT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`);
console.log("document_type_templates: criada");

// 5. Criar tabela request_document_uploads — uploads de documentos por solicitação
await conn.execute(`CREATE TABLE IF NOT EXISTS request_document_uploads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  requestId INT NOT NULL,
  templateId INT,
  nome VARCHAR(255) NOT NULL,
  categoria ENUM('pessoal','treinamento','exame_medico','outros') NOT NULL DEFAULT 'pessoal',
  fileUrl TEXT,
  fileKey TEXT,
  fileNome VARCHAR(255),
  fileTamanho INT,
  fileMime VARCHAR(100),
  obrigatorio TINYINT(1) NOT NULL DEFAULT 1,
  status ENUM('pendente','aprovado','reprovado') NOT NULL DEFAULT 'pendente',
  motivoReprovacao TEXT,
  analisadoPor INT,
  analisadoAt DATETIME,
  uploadedBy INT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`);
console.log("request_document_uploads: criada");

// 6. Inserir templates padrão para admissão
const [tplExist] = await conn.execute("SELECT COUNT(*) as cnt FROM document_type_templates WHERE tipoSolicitacao = 'admissao'");
if (tplExist[0].cnt === 0) {
  await conn.execute(`INSERT INTO document_type_templates 
    (tipoSolicitacao, categoria, nome, descricao, obrigatorio, sexo, ordem) VALUES
    ('admissao', 'pessoal', 'RG (Identidade)', 'Cópia do documento de identidade', 1, 'todos', 1),
    ('admissao', 'pessoal', 'CPF', 'Cópia do CPF', 1, 'todos', 2),
    ('admissao', 'pessoal', 'Título de Eleitor', 'Cópia do título de eleitor', 1, 'todos', 3),
    ('admissao', 'pessoal', 'Certificado de Reservista', 'Cópia do certificado militar', 0, 'masculino', 4),
    ('admissao', 'pessoal', 'Comprovante de Residência', 'Conta de luz, água ou telefone recente', 1, 'todos', 5),
    ('admissao', 'pessoal', 'Foto 3x4', 'Foto recente fundo branco', 1, 'todos', 6),
    ('admissao', 'pessoal', 'Carteira de Trabalho (CTPS)', 'Cópia das páginas de identificação', 1, 'todos', 7),
    ('admissao', 'pessoal', 'PIS/PASEP', 'Número do PIS ou PASEP', 1, 'todos', 8),
    ('admissao', 'exame_medico', 'ASO - Admissional', 'Atestado de Saúde Ocupacional', 1, 'todos', 9),
    ('demissao', 'pessoal', 'Termo de Rescisão', 'TRCT assinado', 1, 'todos', 1),
    ('demissao', 'exame_medico', 'ASO - Demissional', 'Atestado de Saúde Ocupacional demissional', 1, 'todos', 2),
    ('afastamento', 'exame_medico', 'Atestado Médico', 'Atestado ou laudo médico', 1, 'todos', 1),
    ('afastamento', 'pessoal', 'Formulário de Afastamento', 'Formulário preenchido de afastamento', 1, 'todos', 2),
    ('atestado_medico', 'exame_medico', 'Atestado Médico', 'Atestado médico com CRM e CID', 1, 'todos', 1),
    ('mudanca_funcao', 'pessoal', 'Aditivo Contratual', 'Aditivo de mudança de função assinado', 1, 'todos', 1),
    ('mudanca_funcao', 'treinamento', 'Certificado de Treinamento', 'Certificado para a nova função', 0, 'todos', 2)
  `);
  console.log("Templates padrão de documentos inseridos");
}

await conn.end();
console.log("\nMigração v2 concluída com sucesso!");
