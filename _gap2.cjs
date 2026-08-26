require("dotenv").config({ path: ".env" });
const { PrismaClient } = require("@prisma/client");
const RESTORED = "mysql://2zDZJtYB7ZKs5Th.root:ElFcCFRj2EsPVRTm@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/fzmart?sslaccept=strict";
async function main(){
  const R = new PrismaClient({ datasources:{ db:{ url: RESTORED } } });
  const L = new PrismaClient();
  const q = async (c,s)=>JSON.parse(JSON.stringify(await c.$queryRawUnsafe(s),(k,v)=>typeof v==='bigint'?Number(v):v));
  const rm = (await q(R,"SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL")).map(r=>r.migration_name);
  const lm = (await q(L,"SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL")).map(r=>r.migration_name);
  console.log("restored:", rm.length, "live:", lm.length);
  console.log("only in LIVE :", lm.filter(m=>!rm.includes(m)));
  console.log("only in RESTORED:", rm.filter(m=>!lm.includes(m)));
  // column-level check on a few key tables
  for (const t of ['Product','Category','ProductImage','Order']) {
    const rc=(await q(R,`SELECT COLUMN_NAME c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='fzmart' AND TABLE_NAME='${t}'`)).map(x=>x.c);
    const lc=(await q(L,`SELECT COLUMN_NAME c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='fzmart' AND TABLE_NAME='${t}'`)).map(x=>x.c);
    const d1=rc.filter(c=>!lc.includes(c)), d2=lc.filter(c=>!rc.includes(c));
    console.log(`${t}: restored=${rc.length} live=${lc.length} onlyRestored=${JSON.stringify(d1)} onlyLive=${JSON.stringify(d2)}`);
  }
  await R.$disconnect(); await L.$disconnect();
}
main().catch(e=>{console.error("ERR:",e.message);process.exit(1);});
