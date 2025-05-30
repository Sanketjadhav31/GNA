import { FiPackage, FiInfo } from 'react-icons/fi';

        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full space-y-8">
            {/* Header */}
            <div className="text-center">
              <div className="flex justify-center items-center mb-4">
                <div className="bg-red-600 p-3 rounded-full">
                  <FiPackage className="w-8 h-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Zomato Ops Pro</h1>
              <p className="mt-2 text-gray-600">Smart Logistics Coordination Platform</p>
              
              {/* Demo Notice */}
              <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                <p className="text-sm text-blue-800">
                  <FiInfo className="inline w-4 h-4 mr-1" />
                  <strong>Demo Mode:</strong> Use any email/password to login or register
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Email with "manager", "restaurant", or "admin" → Manager role<br />
                  Other emails → Partner role
                </p>
              </div>
            </div>
          </div>
        </div> 