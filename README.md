# 🍕 FoodFlow - Food Delivery Management System

A comprehensive real-time food delivery management system built with React.js, Node.js, Express.js, MongoDB, and Socket.io.

## 🚀 Features

### 🏪 Restaurant Manager Dashboard
- **Order Management**: Create, track, and manage food orders
- **Partner Assignment**: Assign delivery partners to orders
- **Real-time Updates**: Live order status tracking
- **Analytics**: View order statistics and performance metrics
- **Partner Management**: Monitor available delivery partners

### 🚚 Delivery Partner Dashboard
- **Order Tracking**: View assigned orders and delivery tasks
- **Status Updates**: Update order status in real-time (PREP → READY → PICKED → ON_ROUTE → DELIVERED)
- **Availability Toggle**: Set availability status for new orders
- **Performance Stats**: Track deliveries, earnings, and ratings
- **Real-time Notifications**: Instant updates for new assignments

### 🔄 Real-time Features
- **Socket.io Integration**: Live updates across all users
- **Order Status Sync**: Real-time status changes
- **Partner Availability**: Live partner status updates
- **Notifications**: Instant alerts for order updates

## 🛠️ Tech Stack

### Frontend
- **React.js** - User interface
- **React Router** - Navigation
- **Axios** - HTTP client
- **Socket.io Client** - Real-time communication
- **Tailwind CSS** - Styling

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** (v6 or higher)
- **MongoDB** (v4.4 or higher)
- **Git**

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd GNA
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create environment file
copy .env.example .env
# OR on Linux/Mac:
# cp .env.example .env

# Edit .env file with your configuration:
# MONGODB_URI=mongodb://localhost:27017/fooddelivery
# JWT_SECRET=your_jwt_secret_key
# PORT=5000
# NODE_ENV=development
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Create environment file
copy .env.example .env
# OR on Linux/Mac:
# cp .env.example .env

# Edit .env file:
# REACT_APP_BACKEND_URL=http://localhost:5000
```

### 4. Database Setup
Make sure MongoDB is running on your system:

```bash
# Start MongoDB service
# Windows:
net start MongoDB

# Linux/Mac:
sudo systemctl start mongod
# OR
brew services start mongodb-community
```

## 🚀 Running the Application

### Method 1: Run Both Services Separately

#### Start Backend Server
```bash
# From project root
cd backend
npm start
```
Backend will run on: `http://localhost:5000`

#### Start Frontend Server
```bash
# From project root (in new terminal)
cd frontend
npm start
```
Frontend will run on: `http://localhost:3000`

### Method 2: Using PowerShell (Windows)
```powershell
# Start backend
cd backend; npm start

# In new terminal, start frontend
cd frontend; npm start
```

## 👥 User Accounts & Testing

### Default Test Accounts

#### Restaurant Manager
- **Email**: `manager@restaurant.com`
- **Password**: `password123`
- **Role**: Restaurant Manager

#### Delivery Partner
- **Email**: `partner@delivery.com`
- **Password**: `password123`
- **Role**: Delivery Partner

### Creating New Accounts
1. Go to `http://localhost:3000/register`
2. Fill in the registration form
3. Select your role (Restaurant Manager or Delivery Partner)
4. For delivery partners, select vehicle type
5. Complete registration

## 📱 Usage Guide

### For Restaurant Managers

1. **Login** to your account
2. **Create Orders**:
   - Fill customer details
   - Add order items and total amount
   - Set priority and estimated delivery time
3. **Assign Partners**:
   - View available delivery partners
   - Assign partners to orders
   - Track order progress
4. **Monitor Dashboard**:
   - View order statistics
   - Track active orders
   - Monitor partner availability

### For Delivery Partners

1. **Login** to your account
2. **Set Availability**:
   - Toggle availability status
   - Receive order assignments when available
3. **Manage Orders**:
   - View assigned orders
   - Update order status step by step
   - Complete deliveries
4. **Track Performance**:
   - View delivery statistics
   - Monitor earnings and ratings

## 🔄 Order Status Flow

```
PENDING → PREP → READY → PICKED → ON_ROUTE → DELIVERED
```

- **PENDING**: Order created, waiting for partner assignment
- **PREP**: Partner assigned, food being prepared
- **READY**: Food ready for pickup
- **PICKED**: Partner picked up the order
- **ON_ROUTE**: Order is on the way to customer
- **DELIVERED**: Order successfully delivered

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Orders
- `GET /api/orders` - Get orders (filtered by user role)
- `POST /api/orders` - Create new order (Restaurant Manager)
- `PUT /api/orders/:id/assign` - Assign partner to order
- `PUT /api/orders/:id/status` - Update order status (Delivery Partner)

### Partners
- `GET /api/partners` - Get all delivery partners
- `GET /api/partners/my/active-orders` - Get partner's active orders
- `PUT /api/partners/availability` - Update partner availability

## 🔧 Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/fooddelivery
JWT_SECRET=your_super_secret_jwt_key
PORT=5000
NODE_ENV=development
```

### Frontend (.env)
```env
REACT_APP_BACKEND_URL=http://localhost:5000
```

## 🐛 Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```bash
# Make sure MongoDB is running
# Windows:
net start MongoDB

# Check if MongoDB is accessible
mongo --eval "db.adminCommand('ismaster')"
```

#### 2. Port Already in Use
```bash
# Kill process using port 5000
netstat -ano | findstr :5000
taskkill /PID <process_id> /F

# Kill process using port 3000
netstat -ano | findstr :3000
taskkill /PID <process_id> /F
```

#### 3. CORS Issues
Make sure backend CORS is configured for frontend URL:
```javascript
// In backend/server.js
const corsOptions = {
  origin: ['http://localhost:3000'],
  credentials: true
};
```

#### 4. Socket.io Connection Issues
- Check if backend is running on correct port
- Verify REACT_APP_BACKEND_URL in frontend .env
- Check browser console for WebSocket errors

### 5. Orders Not Showing on Dashboard
- Check browser console for API errors
- Verify user authentication
- Ensure proper role-based access

## 📝 Development Notes

### Project Structure
```
GNA/
├── backend/
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── middleware/      # Authentication & validation
│   └── server.js        # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── contexts/    # React contexts
│   │   └── pages/       # Page components
│   └── public/
└── README.md
```

### Key Features Implementation
- **Real-time Updates**: Socket.io rooms for role-based messaging
- **Authentication**: JWT-based auth with role management
- **Order Management**: Complete CRUD operations with status tracking
- **Partner Management**: Availability tracking and assignment logic

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

For support or questions, please contact:
- **Email**: support@foodflow.com
- **GitHub Issues**: Create an issue in this repository

---

**Happy Coding! 🚀** 