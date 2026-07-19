module.exports = {
  apps: [
    {
      name: "cartoonlk-api",
      script: "server.js",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
        MONGO_URI: "mongodb://sithijakalhara22:FlexyCode5521@cluster0-shard-00-00.9wn40ci.mongodb.net:27017,cluster0-shard-00-01.9wn40ci.mongodb.net:27017,cluster0-shard-00-02.9wn40ci.mongodb.net:27017/cartoonlk?ssl=true&replicaSet=atlas-9wn40ci-shard-0&authSource=admin&retryWrites=true&w=majority",
        R2_ACCESS_KEY_ID: "486fd77544e43e09054a459b7f4ee50b",
        R2_SECRET_ACCESS_KEY: "323b5759fdb87a224691309ba2930fe9599417996e1847279c2815b81b40a548",
        R2_BUCKET: "cartoonlk-videos",
        R2_ENDPOINT: "https://2ad4c5283918167131d2aa3372d9a9ff.r2.cloudflarestorage.com",
        PUBLIC_CDN: "https://media.cartoonlk.com",
        JWT_SECRET: "CartoonLKSecretKey",
        ADMIN_USERNAME: "Flexyadmin",
        ADMIN_PASSWORD: "Flexy&Code@5521",
      },
    },
  ],
};