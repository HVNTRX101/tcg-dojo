import React, { useEffect, useState } from 'react';

interface DashboardData {
  products: {
    total: number;
    active: number;
    lowStock: number;
    outOfStock: number;
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
    total: number;
    averageRating: number;
  };
}

interface PerformanceData {
  orders: {
    last30Days: number;
    last7Days: number;
  };
  revenue: {
    last30Days: number;
    last7Days: number;
  };
  reviews: {
    newLast30Days: number;
    averageRating: number;
  };
  followers: {
    total: number;
    newLast30Days: number;
  };
}

export default function SellerAnalyticsPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');

      const [dashboardResponse, performanceResponse] = await Promise.all([
        fetch('http://localhost:3000/api/seller/analytics/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('http://localhost:3000/api/seller/analytics/performance', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!dashboardResponse.ok || !performanceResponse.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const dashboard = await dashboardResponse.json();
      const performance = await performanceResponse.json();

      setDashboardData(dashboard);
      setPerformanceData(performance);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading analytics...</div>
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
          <h1 className="text-3xl font-bold text-gray-900">Seller Analytics</h1>
          <p className="text-gray-600 mt-2">Track your performance and sales</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Total Products</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardData?.products.total}</p>
            <p className="text-sm text-green-600 mt-2">{dashboardData?.products.active} active</p>
            {dashboardData && dashboardData.products.lowStock > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                {dashboardData.products.lowStock} low stock
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Total Orders</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{dashboardData?.orders.total}</p>
            <p className="text-sm text-gray-600 mt-2">
              +{dashboardData?.orders.last30Days} this month
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Total Revenue</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">
              ${dashboardData?.revenue.total.toFixed(2)}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              ${dashboardData?.revenue.last30Days.toFixed(2)} this month
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 uppercase">Average Rating</h3>
            <p className="text-3xl font-bold text-yellow-500 mt-2">
              {dashboardData?.reviews.averageRating.toFixed(1)}
            </p>
            <p className="text-sm text-gray-600 mt-2">{dashboardData?.reviews.total} reviews</p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Performance Overview</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Orders Performance */}
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Orders</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Last 30 days:</span>
                  <span className="ml-2 text-lg font-bold text-gray-900">
                    {performanceData?.orders.last30Days}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Last 7 days:</span>
                  <span className="ml-2 text-lg font-bold text-gray-900">
                    {performanceData?.orders.last7Days}
                  </span>
                </div>
              </div>
            </div>

            {/* Revenue Performance */}
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Revenue</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Last 30 days:</span>
                  <span className="ml-2 text-lg font-bold text-green-600">
                    ${performanceData?.revenue.last30Days.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Last 7 days:</span>
                  <span className="ml-2 text-lg font-bold text-green-600">
                    ${performanceData?.revenue.last7Days.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div className="border-l-4 border-yellow-500 pl-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Reviews</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">New this month:</span>
                  <span className="ml-2 text-lg font-bold text-gray-900">
                    {performanceData?.reviews.newLast30Days}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Average rating:</span>
                  <span className="ml-2 text-lg font-bold text-yellow-500">
                    {performanceData?.reviews.averageRating.toFixed(1)} ⭐
                  </span>
                </div>
              </div>
            </div>

            {/* Followers */}
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="text-sm font-medium text-gray-500 uppercase mb-3">Followers</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Total followers:</span>
                  <span className="ml-2 text-lg font-bold text-gray-900">
                    {performanceData?.followers.total}
                  </span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">New this month:</span>
                  <span className="ml-2 text-lg font-bold text-gray-900">
                    +{performanceData?.followers.newLast30Days}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Alerts */}
        {dashboardData &&
          (dashboardData.products.lowStock > 0 || dashboardData.products.outOfStock > 0) && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
              <h2 className="text-lg font-bold text-orange-900 mb-4">Inventory Alerts</h2>
              <div className="space-y-2">
                {dashboardData.products.lowStock > 0 && (
                  <p className="text-orange-800">
                    ⚠️ {dashboardData.products.lowStock} products are running low on stock
                  </p>
                )}
                {dashboardData.products.outOfStock > 0 && (
                  <p className="text-red-800">
                    ❌ {dashboardData.products.outOfStock} products are out of stock
                  </p>
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
