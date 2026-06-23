const { S3Client } = require("@aws-sdk/client-s3");

const r2 = new S3Client({
  region: "us-east-1", // ✅ better than "auto" for R2
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true, // ✅ required for R2
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

console.log("🔑 DEBUG R2_ACCESS_KEY_ID:", process.env.R2_ACCESS_KEY_ID);
console.log("🔑 DEBUG R2_SECRET length:", process.env.R2_SECRET_ACCESS_KEY?.length);
console.log("🔑 DEBUG R2_ENDPOINT:", process.env.R2_ENDPOINT);

module.exports = r2;
