const { PrismaClient } = require("@prisma/client");
const R = "mysql://2zDZJtYB7ZKs5Th.root:ElFcCFRj2EsPVRTm@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/fzmart?sslaccept=strict";
async function main(){
  const p = new PrismaClient({ datasources:{ db:{ url: R } } });
  const q = async (l,s)=>{const r=await p.$queryRawUnsafe(s);console.log(l);console.log(JSON.stringify(r,(k,v)=>typeof v==='bigint'?Number(v):v,1));};
  await q("=== SNAPSHOT settings mentioning logo/brand/icon/favicon ===",
    "SELECT `group`,`key`,LEFT(`value`,110) v, updatedAt FROM Setting WHERE `key` LIKE '%logo%' OR `key` LIKE '%brand%' OR `key` LIKE '%icon%' OR `key` LIKE '%favicon%' OR `value` LIKE '%branding%' ORDER BY `group`,`key`");
  await q("=== SNAPSHOT any setting pointing at R2 ===",
    "SELECT `group`,`key`,LEFT(`value`,110) v, updatedAt FROM Setting WHERE `value` LIKE '%r2.dev%' ORDER BY updatedAt DESC");
  await p.$disconnect();
}
main().catch(e=>{console.error("ERR:",e.message);process.exit(1);});
