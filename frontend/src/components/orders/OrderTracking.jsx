import React from 'react';
import { useParams } from 'react-router-dom';

const OrderTracking = () => {
  const { id } = useParams();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Tracking</h1>
      <p className="text-gray-600">Track order #{id}</p>
      <div className="card p-6 mt-6">
        <p className="text-center text-gray-500">Order tracking functionality will be implemented here.</p>
      </div>
    </div>
  );
};

export default OrderTracking; 