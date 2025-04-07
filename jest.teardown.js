// jest.teardown.js
const mongoose = require("mongoose");

module.exports = async () => {
  await mongoose.disconnect();
  if (global.__MONGO_SERVER__ && typeof global.__MONGO_SERVER__.stop === "function") {
    await global.__MONGO_SERVER__.stop();
  }
};
