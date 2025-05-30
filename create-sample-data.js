const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Sample data for creating orders
const sampleOrders = [
  {
    items: [
      { name: 'Butter Chicken', quantity: 2, price: 350 },
      { name: 'Naan', quantity: 4, price: 40 },
      { name: 'Dal Makhani', quantity: 1, price: 250 }
    ],
    customerName: 'Rajesh Kumar',
    customerPhone: '9876543210',
    customerAddress: 'A-123, Sector 15, Noida, UP - 201301',
    prepTime: 15,
    estimatedDeliveryTime: 30,
    priority: 'medium'
  },
  {
    items: [
      { name: 'Chicken Biryani', quantity: 1, price: 450 },
      { name: 'Raita', quantity: 1, price: 80 },
      { name: 'Gulab Jamun', quantity: 2, price: 100 }
    ],
    customerName: 'Priya Sharma',
    customerPhone: '9876543211',
    customerAddress: 'B-456, Golf Course Road, Gurgaon, HR - 122002',
    prepTime: 20,
    estimatedDeliveryTime: 35,
    priority: 'high'
  },
  {
    items: [
      { name: 'Paneer Tikka Masala', quantity: 1, price: 320 },
      { name: 'Roti', quantity: 3, price: 30 },
      { name: 'Jeera Rice', quantity: 1, price: 180 }
    ],
    customerName: 'Amit Singh',
    customerPhone: '9876543212',
    customerAddress: 'C-789, Connaught Place, New Delhi - 110001',
    prepTime: 12,
    estimatedDeliveryTime: 25,
    priority: 'medium'
  },
  {
    items: [
      { name: 'Chole Bhature', quantity: 2, price: 200 },
      { name: 'Lassi', quantity: 2, price: 120 }
    ],
    customerName: 'Neha Gupta',
    customerPhone: '9876543213',
    customerAddress: 'D-321, Lajpat Nagar, New Delhi - 110024',
    prepTime: 10,
    estimatedDeliveryTime: 20,
    priority: 'low'
  },
  {
    items: [
      { name: 'Mutton Curry', quantity: 1, price: 480 },
      { name: 'Basmati Rice', quantity: 1, price: 200 },
      { name: 'Pickle', quantity: 1, price: 50 }
    ],
    customerName: 'Vikash Yadav',
    customerPhone: '9876543214',
    customerAddress: 'E-654, Dwarka Sector 21, New Delhi - 110075',
    prepTime: 25,
    estimatedDeliveryTime: 40,
    priority: 'high'
  }
];

async function createSampleData() {
  try {
    console.log('🚀 Starting sample data creation...');
    
    // Step 1: Login as manager
    console.log('1️⃣ Logging in as manager...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'manager@gnaenergy.com',
      password: 'manager123'
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    const token = loginResponse.data.data.token;
    console.log('✅ Manager login successful');
    
    // Set up axios with auth header
    const authApi = axios.create({
      baseURL: API_BASE,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Step 2: Create sample orders
    console.log('2️⃣ Creating sample orders...');
    const createdOrders = [];
    
    for (let i = 0; i < sampleOrders.length; i++) {
      try {
        const orderResponse = await authApi.post('/orders', sampleOrders[i]);
        if (orderResponse.data.success) {
          createdOrders.push(orderResponse.data.data);
          console.log(`✅ Order ${i + 1} created: ${orderResponse.data.data.orderId}`);
        }
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Failed to create order ${i + 1}:`, error.response?.data?.message || error.message);
      }
    }
    
    // Step 3: Get available partners
    console.log('3️⃣ Fetching available partners...');
    const partnersResponse = await authApi.get('/partners/available');
    
    if (!partnersResponse.data.success || !partnersResponse.data.data.length) {
      console.log('⚠️ No available partners found');
      return;
    }
    
    const partners = partnersResponse.data.data;
    console.log(`✅ Found ${partners.length} available partners`);
    
    // Step 4: Assign partners to some orders
    console.log('4️⃣ Assigning partners to orders...');
    const assignableOrders = createdOrders.slice(0, Math.min(createdOrders.length, partners.length));
    
    for (let i = 0; i < assignableOrders.length; i++) {
      try {
        const order = assignableOrders[i];
        const partner = partners[i % partners.length];
        
        const assignResponse = await authApi.put(`/orders/${order._id}/assign-partner`, {
          partnerId: partner._id
        });
        
        if (assignResponse.data.success) {
          console.log(`✅ Partner ${partner.name} assigned to order ${order.orderId}`);
        }
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Failed to assign partner to order:`, error.response?.data?.message || error.message);
      }
    }
    
    // Step 5: Update some order statuses to simulate progress
    console.log('5️⃣ Updating order statuses...');
    const statuses = ['PICKED', 'ON_ROUTE', 'DELIVERED'];
    
    for (let i = 0; i < Math.min(assignableOrders.length, 3); i++) {
      try {
        const order = assignableOrders[i];
        const status = statuses[i % statuses.length];
        
        // First login as partner to update status
        const partnerLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
          email: 'raj@gnadelivery.com',
          password: 'partner123'
        });
        
        if (partnerLoginResponse.data.success) {
          const partnerToken = partnerLoginResponse.data.data.token;
          const partnerApi = axios.create({
            baseURL: API_BASE,
            headers: {
              'Authorization': `Bearer ${partnerToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          const statusResponse = await partnerApi.put(`/orders/${order._id}/status`, {
            status: status
          });
          
          if (statusResponse.data.success) {
            console.log(`✅ Order ${order.orderId} status updated to ${status}`);
          }
        }
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Failed to update order status:`, error.response?.data?.message || error.message);
      }
    }
    
    console.log('🎉 Sample data creation completed!');
    console.log('📊 You should now see data in your dashboard');
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error.response?.data?.message || error.message);
  }
}

// Run the script
createSampleData(); 