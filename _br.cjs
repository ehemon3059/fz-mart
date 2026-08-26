require("dotenv").config({ path: ".env" });
const { S3Client, ListObjectsV2Command } = require("@aws-sdk/client-s3");
async function main(){
  const c = new S3Client({ region:"auto", endpoint:`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials:{ accessKeyId:process.env.R2_ACCESS_KEY_ID, secretAccessKey:process.env.R2_SECRET_ACCESS_KEY } });
  const all=[]; let t;
  do { const x=await c.send(new ListObjectsV2Command({Bucket:process.env.R2_BUCKET,Prefix:"branding/",ContinuationToken:t,MaxKeys:1000}));
    (x.Contents||[]).forEach(o=>all.push(o)); t=x.IsTruncated?x.NextContinuationToken:undefined; } while(t);
  all.sort((a,b)=>new Date(b.LastModified)-new Date(a.LastModified));
  console.log("  branding objects:", all.length);
  all.slice(0,8).forEach(o=>console.log("   ", new Date(o.LastModified).toISOString(), o.Key.replace("branding/",""), o.Size+"b"));
}
main().catch(e=>console.error(e.message));
