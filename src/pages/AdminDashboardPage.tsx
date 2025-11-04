import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface DashboardData {
  users: {
    total: number;
    newLast30Days: number;
    newLast7Days: number;
  };
  products: {
    total: number;
    newLast30Days: number;
  };
  orders: {
    total: number;
    last30Days: number;
  };
  revenue: {
    total: number;
    last30Days: number;
  };
  reviews: {
    pendingModeration: number;
  };
  sellers: {
    active: number;
  };
}

export default function AdminDashboardPage() {
  const _navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3000/api/admin/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your marketplace</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Users Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Total Users</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardData?.users.total}</p>
            <p className="text-sm text-gray-600 mt-2">
              +{dashboardData?.users.newLast30Days} in last 30 days
            </p>
            <p className="text-xs text-gray-500">
              +{dashboardData?.users.newLast7Days} in last 7 days
            </p>
          </div>

          {/* Products Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Total Products</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardData?.products.total}</p>
            <p className="text-sm text-gray-600 mt-2">
              +{dashboardData?.products.newLast30Days} in last 30 days
            </p>
          </div>

          {/* Orders Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Total Orders</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardData?.orders.total}</p>
            <p className="text-sm text-gray-600 mt-2">
              +{dashboardData?.orders.last30Days} in last 30 days
            </p>
          </div>

          {/* Revenue Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ${dashboardData?.revenue.total.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              ${dashboardData?.revenue.last30Days.toFixed(2)} in last 30 days
            </p>
          </div>

          {/* Pending Reviews Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Pending Reviews</h3>
            <p className="text-3xl font-bold text-orange-600 mt-2">
              {dashboardData?.reviews.pendingModeration}
            </p>
            <p className="text-sm text-gray-600 mt-2">Awaiting moderation</p>
          </div>

          {/* Active Sellers Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Active Sellers</h3>
            <p className="text-3xl font-bold text-blue-600 mt-2">{dashboardData?.sellers.active}</p>
            <p className="text-sm text-gray-600 mt-2">Currently active</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Manage Users
            </button>
            <button className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
              Manage Products
            </button>
            <button className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
              Manage Orders
            </button>
            <button className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition">
              Review Moderation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
