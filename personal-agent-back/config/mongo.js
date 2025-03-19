// config/mongo.js
// 1. Import mongoose
const mongoose = require('mongoose');
// 2. Load environment variables from .env (make sure MONGO_URI is set there)
require('dotenv').config();

// 3. Connect to MongoDB using the connection string in your .env file
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB successfully!');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
});

// 4. Export mongoose in case you need it in other parts of your app
module.exports = mongoose;
