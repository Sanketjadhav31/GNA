const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/zomato-ops-pro')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const createDemoUsers = async () => {
  try {
    // Check if demo users already exist
    const existingManager = await User.findOne({ email: 'manager@demo.com' });
    const existingDriver = await User.findOne({ email: 'driver@demo.com' });

    if (existingManager && existingDriver) {
      console.log('✅ Demo users already exist');
      return;
    }

    // Create demo restaurant manager
    if (!existingManager) {
      const manager = new User({
        username: 'manager',
        email: 'manager@demo.com',
        password: 'demo123',
        role: 'restaurant_manager',
        firstName: 'Restaurant',
        lastName: 'Manager',
        phone: '9876543210'
      });
      await manager.save();
      console.log('✅ Created demo restaurant manager - manager@demo.com / demo123');
    }

    // Create demo delivery partner
    if (!existingDriver) {
      const driver = new User({
        username: 'driver',
        email: 'driver@demo.com',
        password: 'demo123',
        role: 'delivery_partner',
        firstName: 'Delivery',
        lastName: 'Partner',
        phone: '9876543211',
        vehicleType: 'bike'
      });
      await driver.save();
      console.log('✅ Created demo delivery partner - driver@demo.com / demo123');
    }

    console.log('\n🎉 Demo users created successfully!');
    console.log('Login credentials:');
    console.log('Restaurant Manager: manager@demo.com / demo123');
    console.log('Delivery Partner: driver@demo.com / demo123');

  } catch (error) {
    console.error('❌ Error creating demo users:', error);
  } finally {
    mongoose.connection.close();
  }
};

createDemoUsers(); 