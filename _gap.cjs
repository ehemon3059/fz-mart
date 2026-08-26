require("dotenv").config({ path: ".env" });
const { PrismaClient } = require("@prisma/client");
const RESTORED = "mysql://2zDZJtYB7ZKs5Th.root:ElFcCFRj2EsPVRTm@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/fzmart?sslaccept=strict";
async function main(){
  const R = new PrismaClient({ datasources:{ db:{ url: RESTORED } } });
  const L = new PrismaClient();
  const q = async (c,s)=>JSON.parse(JSON.stringify(await c.$queryRawUnsafe(s),(k,v)=>typeof v==='bigint'?Number(v):v));
  const rm = (await q(R,"SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL")).map(r=>r.migration_name);
  const lm = (await q(L,"SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL")).map(r=>r.migration_name);
  console.log("restored migrations:", rm.length, "| live migrations:", lm.length);
  console.log("in LIVE but not RESTORED (newer):", lm.filter(m=>!rm.includes(m)));
  console.log("in RESTORED but not LIVE:", rm.filter(m=>!lm.includes(m)));
  // per-table row counts on restored, for every table that has rows
  const tabs = (await q(R,"SELECT TABLE_NAME t FROM information_schema.TABLES WHERE TABLE_SCHEMA='fzmart' AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME")).map(r=>r.t);
  console.log("\n=== restored tables WITH data ===");
  for (const t of tabs) {
    const n = (await q(R,"SELECT COUNT(*) c FROM `"+t+"`"))[0].c;
    if (n) console.log(`  ${t.padEnd(28)} ${n}`);
  }
  await R.$disconnect(); await L.$disconnect();
}
main().catch(e=>{console.error("ERR:",e.message);process.exit(1);});
