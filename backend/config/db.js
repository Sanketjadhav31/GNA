const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zomato_ops_pro', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Create initial data if needed (only in development)
    if (process.env.NODE_ENV === 'development') {
      await seedInitialData();
    }
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};



module.exports = connectDB; 