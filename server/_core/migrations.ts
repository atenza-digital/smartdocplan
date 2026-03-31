import mysql from "mysql2/promise";
import { ENV } from "./env";

export async function runAutoMigrations() {
  if (!ENV.databaseUrl) {
    console.warn("[Migration] DATABASE_URL não definida, pulando.");
    return;
  }

  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection(ENV.databaseUrl);
    console.log("[Migration] Iniciando migrações automáticas...");

    const addColIfMissing = async (table: string, col: string, def: string) => {
      const [rows] = await conn!.execute(
        `SELECT COUNT(*) AS cnt FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
        [table, col]
      );
      if ((rows as any)[0].cnt === 0) {
        await conn!.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
        console.log(`[Migration] ${table}.${col} adicionada.`);
      }
    };

    // requests
    await addColIfMissing("requests", "checklistCompleto", "TINYINT(1) NOT NULL DEFAULT 0");
    await addColIfMissing("requests", "responsavelId", "INT NULL");

    // tickets
    await addColIfMissing("tickets", "responsavelId", "INT NULL");

    // document_type_templates
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

    // request_document_uploads
    await conn.execute(`CREATE TABLE IF NOT EXISTS request_document_uploads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      requestId INT NOT NULL,
      templateId INT,
      nome VARCHAR(255) NOT NULL,
      categoria ENUM('pessoal','treinamento','exame_medico','outros') NOT NULL DEFAULT 'pessoal',
      fileUrl TEXT, fileKey TEXT, fileNome VARCHAR(255),
      fileTamanho INT, fileMime VARCHAR(100),
      obrigatorio TINYINT(1) NOT NULL DEFAULT 1,
      status ENUM('pendente','aprovado','reprovado') NOT NULL DEFAULT 'pendente',
      motivoReprovacao TEXT, analisadoPor INT, analisadoAt DATETIME, uploadedBy INT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);

    // Seed templates padrão
    const [cnt] = await conn.execute("SELECT COUNT(*) AS cnt FROM document_type_templates");
    if ((cnt as any)[0].cnt === 0) {
      await conn.execute(`INSERT INTO document_type_templates
        (tipoSolicitacao,categoria,nome,descricao,obrigatorio,sexo,ordem) VALUES
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

    console.log("[Migration] Concluídas com sucesso.");
  } catch (e: any) {
    console.error("[Migration] Erro:", e.message);
  } finally {
    await conn?.end();
  }
}
