import { createConnection } from "mysql2/promise";
import bcrypt from "bcryptjs";

const conn = await createConnection(process.env.DATABASE_URL);
console.log("Conectado ao banco...");

const tables = [
`CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'company_viewer',
  company_id INT,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  last_signed_in DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),
  cnpj VARCHAR(20),
  email VARCHAR(255),
  telefone VARCHAR(30),
  status ENUM('ativo','inativo','suspenso') NOT NULL DEFAULT 'ativo',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(14),
  data_nascimento DATE,
  position_id INT,
  worksite_id INT,
  data_admissao DATE,
  salario DECIMAL(10,2),
  email VARCHAR(255),
  telefone VARCHAR(30),
  status ENUM('ativo','afastado','desligado') NOT NULL DEFAULT 'ativo',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS positions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  cbo VARCHAR(20),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS worksites (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cnos VARCHAR(30),
  endereco VARCHAR(255),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  data_inicio DATE,
  data_fim DATE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  employee_id INT,
  tipo ENUM('admissao','demissao','mudanca_funcao','afastamento','atestado_medico','outros') NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  status ENUM('nova','em_analise','aguardando_correcao','aguardando_documentos','aprovado','concluido','rejeitado') NOT NULL DEFAULT 'nova',
  prioridade ENUM('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
  criado_por INT,
  observacoes TEXT,
  concluido_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  tipo ENUM('criacao_usuario','bloqueio_usuario','alteracao_acesso','suporte_tecnico','duvida','outros') NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  status ENUM('aberto','em_atendimento','aguardando_cliente','resolvido','fechado') NOT NULL DEFAULT 'aberto',
  prioridade ENUM('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
  criado_por INT,
  resolvido_at DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT,
  user_id INT,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100),
  entity_id INT,
  details JSON,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS employee_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  company_id INT NOT NULL,
  categoria ENUM('pessoal','contratual','exame_medico','treinamento','advertencia','afastamento','atestado','opcional') NOT NULL,
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(100),
  file_url VARCHAR(500),
  file_key VARCHAR(500),
  validade DATE,
  obrigatorio TINYINT(1) NOT NULL DEFAULT 1,
  observacao TEXT,
  uploaded_by INT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS legal_requirements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  norma VARCHAR(100) NOT NULL,
  requisito VARCHAR(255) NOT NULL,
  documento_exigido VARCHAR(255) NOT NULL,
  validade_meses INT,
  descricao TEXT,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)`
];

for (const sql of tables) {
  await conn.execute(sql);
}
console.log("Tabelas criadas!");

// Empresa de teste
const [rows] = await conn.execute("SELECT id FROM companies WHERE razao_social = 'Empresa Teste Ltda' LIMIT 1");
let companyId;
if (rows.length === 0) {
  const [r] = await conn.execute(
    "INSERT INTO companies (razao_social, nome_fantasia, cnpj, email) VALUES (?, ?, ?, ?)",
    ["Empresa Teste Ltda", "Empresa Teste", "00.000.000/0001-00", "contato@empresa.com"]
  );
  companyId = r.insertId;
} else {
  companyId = rows[0].id;
}
console.log("Empresa de teste ok (id=" + companyId + ")");

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
      "UPDATE users SET password_hash=?, role=?, company_id=?, name=? WHERE email=?",
      [hash, u.role, u.cid, u.name, u.email]
    );
    console.log("Atualizado: " + u.email);
  } else {
    await conn.execute(
      "INSERT INTO users (name, email, password_hash, role, company_id, ativo) VALUES (?, ?, ?, ?, ?, 1)",
      [u.name, u.email, hash, u.role, u.cid]
    );
    console.log("Criado: " + u.email + " (" + u.role + ")");
  }
}

await conn.end();
console.log("\nSeed concluido com sucesso!");
