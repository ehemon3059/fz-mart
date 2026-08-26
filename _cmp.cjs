require("dotenv").config({ path: ".env" });
const { PrismaClient } = require("@prisma/client");
const RESTORED = "mysql://2zDZJtYB7ZKs5Th.root:ElFcCFRj2EsPVRTm@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/fzmart?sslaccept=strict";
async function main(){
  const R = new PrismaClient({ datasources:{ db:{ url: RESTORED } } });
  const q = async (c,s)=>{ const r = await c.$queryRawUnsafe(s); return JSON.parse(JSON.stringify(r,(k,v)=>typeof v==='bigint'?Number(v):v)); };
  console.log("=== RESTORED product list ===");
  for (const p of await q(R,"SELECT id,name,price,status FROM Product ORDER BY id")) console.log(`  ${String(p.id).padStart(7)} ${p.status.padEnd(8)} ${String(p.price).padStart(8)}  ${p.name.slice(0,58)}`);
  console.log("\n=== RESTORED image url styles ===");
  console.log(await q(R,"SELECT CASE WHEN url LIKE 'https://%r2.dev%' THEN 'R2' WHEN url LIKE '/uploads/%' THEN 'local' WHEN url LIKE '%placehold%' THEN 'placeholder' ELSE 'other' END kind, COUNT(*) n FROM ProductImage GROUP BY kind"));
  console.log("\n=== RESTORED migrations tail ===");
  console.log(await q(R,"SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 3"));
  await R.$disconnect();
}
main().catch(e=>{console.error("ERR:",e.message);process.exit(1);});
