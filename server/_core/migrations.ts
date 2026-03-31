import { getDb } from "../db";

/**
 * Executa migrações automáticas no banco de dados.
 * Roda toda vez que o servidor inicia — idempotente.
 */
export async function runAutoMigrations() {
  const db = await getDb();
  if (!db) {
    console.warn("[Migration] Banco indisponível, pulando migrações.");
    return;
  }

  const conn = (db as any).session?.client ?? (db as any).$client;
  if (!conn) {
    console.warn("[Migration] Conexão direta indisponível.");
    return;
  }

  console.log("[Migration] Iniciando migrações automáticas...");

  // Helper: adiciona coluna apenas se não existir
  const addColumnIfMissing = async (table: string, column: string, definition: string) => {
    try {
      const [rows] = await conn.execute(
        `SELECT COUNT(*) as cnt FROM information_schema.columns 
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
        [table, column]
      );
      if (rows[0]?.cnt === 0) {
        await conn.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
        console.log(`[Migration] ${table}.${column} adicionada.`);
      }
    } catch (e: any) {
      console.warn(`[Migration] Erro ao adicionar ${table}.${column}: ${e.message}`);
    }
  };

  // Helper: cria tabela se não existir
  const createTableIfMissing = async (table: string, ddl: string) => {
    try {
      await conn.execute(`CREATE TABLE IF NOT EXISTS \`${table}\` ${ddl}`);
    } catch (e: any) {
      console.warn(`[Migration] Erro ao criar ${table}: ${e.message}`);
    }
  };

  // ── requests ──────────────────────────────────────────────────────────────
  await addColumnIfMissing("requests", "checklistCompleto", "TINYINT(1) NOT NULL DEFAULT 0");
  await addColumnIfMissing("requests", "responsavelId", "INT NULL");

  // ── tickets ───────────────────────────────────────────────────────────────
  await addColumnIfMissing("tickets", "responsavelId", "INT NULL");

  // ── document_type_templates ───────────────────────────────────────────────
  await createTableIfMissing("document_type_templates", `(
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

  // ── request_document_uploads ──────────────────────────────────────────────
  await createTableIfMissing("request_document_uploads", `(
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

  // ── Seed templates padrão ─────────────────────────────────────────────────
  try {
    const [rows] = await conn.execute("SELECT COUNT(*) as cnt FROM document_type_templates");
    if (rows[0]?.cnt === 0) {
      await conn.execute(`INSERT INTO document_type_templates
        (tipoSolicitacao, categoria, nome, descricao, obrigatorio, sexo, ordem) VALUES
        ('admissao','pessoal','RG (Identidade)','Cópia do documento de identidade',1,'todos',1),
        ('admissao','pessoal','CPF','Cópia do CPF',1,'todos',2),
        ('admissao','pessoal','Título de Eleitor','Cópia do título de eleitor',1,'todos',3),
        ('admissao','pessoal','Certificado de Reservista','Cópia do certificado militar',0,'masculino',4),
        ('admissao','pessoal','Comprovante de Residência','Conta de luz, água ou telefone recente',1,'todos',5),
        ('admissao','pessoal','Foto 3x4','Foto recente fundo branco',1,'todos',6),
        ('admissao','pessoal','Carteira de Trabalho (CTPS)','Cópia das páginas de identificação',1,'todos',7),
        ('admissao','pessoal','PIS/PASEP','Número do PIS ou PASEP',1,'todos',8),
        ('admissao','exame_medico','ASO - Admissional','Atestado de Saúde Ocupacional admissional',1,'todos',9),
        ('demissao','pessoal','Termo de Rescisão (TRCT)','TRCT assinado pelas partes',1,'todos',1),
        ('demissao','exame_medico','ASO - Demissional','Atestado de Saúde Ocupacional demissional',1,'todos',2),
        ('afastamento','exame_medico','Atestado Médico','Atestado ou laudo médico',1,'todos',1),
        ('afastamento','pessoal','Formulário de Afastamento','Formulário de afastamento preenchido',1,'todos',2),
        ('atestado_medico','exame_medico','Atestado Médico','Atestado médico com CRM e CID',1,'todos',1),
        ('mudanca_funcao','pessoal','Aditivo Contratual','Aditivo de mudança de função assinado',1,'todos',1),
        ('mudanca_funcao','treinamento','Certificado de Treinamento','Certificado para a nova função',0,'todos',2)
      `);
      console.log("[Migration] Templates padrão inseridos.");
    }
  } catch (e: any) {
    console.warn("[Migration] Erro no seed de templates:", e.message);
  }

  console.log("[Migration] Migrações concluídas.");
}
