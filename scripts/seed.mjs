// Seed script - usa os nomes exatos de coluna do schema drizzle (camelCase)
import { createConnection } from "mysql2/promise";
import bcrypt from "bcryptjs";

const conn = await createConnection(process.env.DATABASE_URL);
console.log("Conectado ao banco...");

// Dropar tabelas com schema errado (snake_case) se existirem
const snakeTables = ["legal_requirements","employee_documents","audit_logs","tickets","requests","worksites","positions","employees","company_documents","companies","users"];
for (const t of snakeTables) {
  try {
    // Verificar se tem coluna snake_case
    const [cols] = await conn.execute(`SHOW COLUMNS FROM \`${t}\` LIKE 'razao_social'`);
    if (cols.length > 0) {
      await conn.execute(`DROP TABLE \`${t}\``);
      console.log(`Tabela ${t} (schema antigo) removida`);
    }
  } catch {}
}

// Criar tabelas com schema correto (camelCase, igual ao drizzle/schema.ts)
await conn.execute(`CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) UNIQUE,
  name TEXT,
  email VARCHAR(320) UNIQUE,
  passwordHash VARCHAR(255),
  loginMethod VARCHAR(64) DEFAULT 'local',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  role ENUM('platform_admin','platform_analyst','platform_auditor','company_admin','company_hr','company_manager','company_viewer') NOT NULL DEFAULT 'company_viewer',
  companyId INT,
  lastSignedIn DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`);

await conn.execute(`CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  razaoSocial VARCHAR(255) NOT NULL,
  nomeFantasia VARCHAR(255),
  cnpj VARCHAR(18) UNIQUE,
  email VARCHAR(320),
  telefone VARCHAR(20),
  logoUrl TEXT,
  status ENUM('ativo','inativo','suspenso') NOT NULL DEFAULT 'ativo',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`);

await conn.execute(`CREATE TABLE IF NOT EXISTS worksites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  companyId INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cnos VARCHAR(30),
  endereco TEXT,
  cidade VARCHAR(100),
  estado VARCHAR(2),
  dataInicio DATE,
  dataFim DATE,
  status ENUM('ativo','concluido','cancelado') NOT NULL DEFAULT 'ativo',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);

await conn.execute(`CREATE TABLE IF NOT EXISTS positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  companyId INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  cbo VARCHAR(20),
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);

await conn.execute(`CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  companyId INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) NOT NULL,
  dataNascimento DATE,
  positionId INT,
  worksiteId INT,
  dataAdmissao DATE,
  salario DECIMAL(10,2),
  status ENUM('ativo','afastado','desligado') NOT NULL DEFAULT 'ativo',
  email VARCHAR(320),
  telefone VARCHAR(20),
  scoreConformidade INT DEFAULT 100,
  criadoPor INT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`);

await conn.execute(`CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  companyId INT NOT NULL,
  employeeId INT,
  tipo ENUM('admissao','demissao','mudanca_funcao','afastamento','atestado_medico','outros') NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  status ENUM('nova','em_analise','aguardando_correcao','aguardando_documentos','aprovado','concluido','rejeitado') NOT NULL DEFAULT 'nova',
  prioridade ENUM('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
  criadoPor INT,
  observacoes TEXT,
  concluidoAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`);

await conn.execute(`CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  companyId INT NOT NULL,
  tipo ENUM('criacao_usuario','bloqueio_usuario','alteracao_acesso','suporte_tecnico','duvida','outros') NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  status ENUM('aberto','em_atendimento','aguardando_cliente','resolvido','fechado') NOT NULL DEFAULT 'aberto',
  prioridade ENUM('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
  criadoPor INT,
  resolvidoAt DATETIME,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`);

await conn.execute(`CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  companyId INT,
  userId INT,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100),
  entityId INT,
  details JSON,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);

await conn.execute(`CREATE TABLE IF NOT EXISTS company_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  companyId INT NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  fileUrl TEXT,
  fileKey TEXT,
  validade DATE,
  observacao TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`);

await conn.execute(`CREATE TABLE IF NOT EXISTS employee_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employeeId INT NOT NULL,
  companyId INT NOT NULL,
  categoria ENUM('pessoal','contratual','exame_medico','treinamento','advertencia','afastamento','atestado','opcional') NOT NULL,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(100),
  fileUrl TEXT,
  fileKey TEXT,
  validade DATE,
  obrigatorio TINYINT(1) NOT NULL DEFAULT 1,
  observacao TEXT,
  uploadedBy INT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);

await conn.execute(`CREATE TABLE IF NOT EXISTS legal_requirements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  companyId INT NOT NULL,
  norma VARCHAR(100) NOT NULL,
  requisito VARCHAR(255) NOT NULL,
  documentoExigido VARCHAR(255) NOT NULL,
  validadeMeses INT,
  descricao TEXT,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`);

console.log("Todas as tabelas criadas!");

// Empresa de teste
const [rows] = await conn.execute("SELECT id FROM companies WHERE razaoSocial = 'Empresa Teste Ltda' LIMIT 1");
let companyId;
if (rows.length === 0) {
  const [r] = await conn.execute(
    "INSERT INTO companies (razaoSocial, nomeFantasia, cnpj, email) VALUES (?, ?, ?, ?)",
    ["Empresa Teste Ltda", "Empresa Teste", "00.000.000/0001-00", "contato@empresa.com"]
  );
  companyId = r.insertId;
  console.log("Empresa criada (id=" + companyId + ")");
} else {
  companyId = rows[0].id;
  console.log("Empresa ja existe (id=" + companyId + ")");
}

// Usuários de teste
const users = [
  { name: "Administrador",  email: "admin@smartdocplan.com",    pw: "Admin@2024!",  role: "platform_admin",   cid: null },
  { name: "Ana Analista",   email: "analista@smartdocplan.com", pw: "Teste@2024!",  role: "platform_analyst", cid: null },
  { name: "Carlos Auditor", email: "auditor@smartdocplan.com",  pw: "Teste@2024!",  role: "platform_auditor", cid: null },
  { name: "Roberto Admin",  email: "admin@empresa.com",         pw: "Teste@2024!",  role: "company_admin",    cid: companyId },
  { name: "Fernanda RH",    email: "rh@empresa.com",            pw: "Teste@2024!",  role: "company_hr",       cid: companyId },
  { name: "Marcos Gestor",  email: "gestor@empresa.com",        pw: "Teste@2024!",  role: "company_manager",  cid: companyId },
  { name: "Lucia Consulta", email: "consulta@empresa.com",      pw: "Teste@2024!",  role: "company_viewer",   cid: companyId },
];

for (const u of users) {
  const hash = await bcrypt.hash(u.pw, 12);
  const [ex] = await conn.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [u.email]);
  if (ex.length > 0) {
    await conn.execute(
      "UPDATE users SET passwordHash=?, role=?, companyId=?, name=? WHERE email=?",
      [hash, u.role, u.cid, u.name, u.email]
    );
    console.log("Atualizado: " + u.email);
  } else {
    await conn.execute(
      "INSERT INTO users (name, email, passwordHash, role, companyId, ativo, loginMethod) VALUES (?, ?, ?, ?, ?, 1, 'local')",
      [u.name, u.email, hash, u.role, u.cid]
    );
    console.log("Criado: " + u.email + " (" + u.role + ")");
  }
}

await conn.end();
console.log("\nSeed concluido! Login disponivel em https://srv1450720.hstgr.cloud");
