/**
 * Normaliza os e-mails dos usuários já gravados (sem espaços nas pontas e em minúsculas).
 *
 * O cadastro novo já grava assim e o login não diferencia maiúsculas; este script só arruma o que foi gravado antes.
 *
 * Uso (o banco vem de DATABASE_URL):
 *   node scripts/normalizar-emails-usuarios.mjs            # só lê: mostra quantos mudariam e se há colisão
 *   node scripts/normalizar-emails-usuarios.mjs --aplicar  # altera
 *
 * Em homologação e produção: fazer backup antes, rodar primeiro sem --aplicar e conferir depois.
 * Dois e-mails que só diferem na maiúscula (colisão) NÃO são alterados: o script lista os ids para decisão manual.
 * Os e-mails aparecem mascarados na saída.
 */
import { Client } from "pg";

const aplicar = process.argv.includes("--aplicar");
const mascarar = (email) => {
  const [local, dominio] = String(email).split("@");
  return dominio ? `${local.slice(0, 2)}***@${dominio}` : "***";
};

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query("SET search_path TO smartdocplan");
  const { rows } = await client.query(`SELECT id, email FROM users WHERE email IS NOT NULL ORDER BY id`);
  const normalizado = (email) => email.trim().toLowerCase();

  const porEmail = new Map();
  for (const usuario of rows) {
    const chave = normalizado(usuario.email);
    porEmail.set(chave, [...(porEmail.get(chave) ?? []), usuario.id]);
  }
  const colisoes = [...porEmail.entries()].filter(([, ids]) => ids.length > 1);
  const idsEmColisao = new Set(colisoes.flatMap(([, ids]) => ids));
  const mudam = rows.filter((u) => u.email !== normalizado(u.email) && !idsEmColisao.has(u.id));

  console.log(`Usuários: ${rows.length}`);
  console.log(`Com e-mail fora do padrão (maiúscula ou espaço): ${rows.filter((u) => u.email !== normalizado(u.email)).length}`);
  console.log(`Colisões (mesmo e-mail com caixa diferente): ${colisoes.length}`);
  for (const [email, ids] of colisoes) console.log(`  - ${mascarar(email)}: usuários ${ids.join(", ")} (resolver à mão)`);
  console.log(`Seriam alterados: ${mudam.length}`);
  for (const u of mudam) console.log(`  - #${u.id} ${mascarar(u.email)} -> ${mascarar(normalizado(u.email))}`);

  if (!aplicar) {
    console.log("\nNada foi alterado. Para aplicar: --aplicar");
  } else if (mudam.length === 0) {
    console.log("\nNada a alterar.");
  } else {
    await client.query("BEGIN");
    for (const u of mudam) await client.query(`UPDATE users SET email = $1, "updatedAt" = now() WHERE id = $2`, [normalizado(u.email), u.id]);
    await client.query("COMMIT");
    console.log(`\nAlterados: ${mudam.length}`);
  }
} catch (erro) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("Falhou:", erro.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
