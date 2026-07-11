import { Client } from "pg";
import bcrypt from "bcryptjs";

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query("SET search_path TO smartdocplan");

  const companyResult = await client.query(
    `INSERT INTO companies ("razaoSocial", "nomeFantasia", cnpj, email)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (cnpj) DO UPDATE SET
       "razaoSocial" = EXCLUDED."razaoSocial",
       "nomeFantasia" = EXCLUDED."nomeFantasia",
       email = EXCLUDED.email
     RETURNING id`,
    ["Empresa Teste Ltda", "Empresa Teste", "00.000.000/0001-00", "contato@empresa.com"],
  );

  const companyId = companyResult.rows[0].id;
  const users = [
    { name: "Administrador", email: "admin@smartdocplan.com", password: "Admin@2024!", role: "platform_admin", companyId: null },
    { name: "Ana Analista", email: "analista@smartdocplan.com", password: "Teste@2024!", role: "platform_analyst", companyId: null },
    { name: "Carlos Auditor", email: "auditor@smartdocplan.com", password: "Teste@2024!", role: "platform_auditor", companyId: null },
    { name: "Roberto Admin", email: "admin@empresa.com", password: "Teste@2024!", role: "company_admin", companyId },
    { name: "Fernanda RH", email: "rh@empresa.com", password: "Teste@2024!", role: "company_hr", companyId },
    { name: "Marcos Gestor", email: "gestor@empresa.com", password: "Teste@2024!", role: "company_manager", companyId },
    { name: "Lucia Consulta", email: "consulta@empresa.com", password: "Teste@2024!", role: "company_viewer", companyId },
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    await client.query(
      `INSERT INTO users (name, email, "passwordHash", role, "companyId", ativo, "loginMethod")
       VALUES ($1, $2, $3, $4, $5, TRUE, 'local')
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         "passwordHash" = EXCLUDED."passwordHash",
         role = EXCLUDED.role,
         "companyId" = EXCLUDED."companyId",
         ativo = TRUE,
         "loginMethod" = 'local'`,
      [user.name, user.email, passwordHash, user.role, user.companyId],
    );
  }

  console.log(`Seed local concluido: ${users.length} usuarios e 1 empresa.`);
} finally {
  await client.end();
}
