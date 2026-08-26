const { PrismaClient } = require("@prisma/client");
const url = "mysql://2zDZJtYB7ZKs5Th.root:ElFcCFRj2EsPVRTm@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/fzmart?sslaccept=strict";
async function main(){
  const p = new PrismaClient({ datasources: { db: { url } } });
  const q = async (l,s)=>{try{const r=await p.$queryRawUnsafe(s);console.log(l,JSON.stringify(r,(k,v)=>typeof v==='bigint'?Number(v):v));}catch(e){console.log(l,"ERR:",e.message.split("\n").pop().trim().slice(0,120));}};
  await q("COUNTS:", "SELECT (SELECT COUNT(*) FROM Product) products,(SELECT COUNT(*) FROM Category) cats,(SELECT COUNT(*) FROM ProductImage) imgs,(SELECT COUNT(*) FROM Banner) banners,(SELECT COUNT(*) FROM `Order`) orders,(SELECT COUNT(*) FROM OrderItem) items,(SELECT COUNT(*) FROM Customer) customers,(SELECT COUNT(*) FROM Setting) settings,(SELECT COUNT(*) FROM ProductVariant) variants");
  await q("schema era:", "SELECT COUNT(*) has_parentId FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='fzmart' AND TABLE_NAME='Category' AND COLUMN_NAME='parentId'");
  await q("migrations:", "SELECT COUNT(*) applied FROM _prisma_migrations WHERE finished_at IS NOT NULL");
  await q("newest product:", "SELECT id,name,createdAt FROM Product ORDER BY createdAt DESC LIMIT 3");
  await q("newest order:", "SELECT id,orderNo,createdAt FROM `Order` ORDER BY createdAt DESC LIMIT 3");
  await p.$disconnect();
}
main().catch(e=>{console.error("ERR:",e.message);process.exit(1);});
