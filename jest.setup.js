// jest.setup.js
const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");

let mongoServer;

module.exports = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  // Override the MONGO_URI so that the app (and config/mongo.js) uses this in-memory database.
  process.env.MONGO_URI = uri;

  // Connect Mongoose manually (if not already connected)
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  // Save mongoServer globally for teardown
  global.__MONGO_SERVER__ = mongoServer;
};
