const dotenv = require("dotenv");

const app = require("./app");
const { connectMongo } = require("./db/mongo");

dotenv.config();

const PORT = Number(process.env.PORT || 5000);

const startServer = async () => {
  await connectMongo();

  app.listen(PORT, () => {
    console.log(`Web backend running at http://127.0.0.1:${PORT}`);
  });
};

startServer();

