import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orderTrackingService, OrderTracking } from '../services/orderTracking.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Separator } from '../components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Package, Truck, CheckCircle, XCircle, Clock, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function OrderTrackingPage() {
  const [selectedTab, setSelectedTab] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  // Fetch user's orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['my-orders', selectedTab],
    queryFn: () =>
      orderTrackingService.getMyOrders(selectedTab === 'all' ? undefined : { status: selectedTab }),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch order statistics
  const { data: stats } = useQuery({
    queryKey: ['order-stats'],
    queryFn: () => orderTrackingService.getOrderStats(),
  });

  // Fetch detailed tracking for selected order
  const { data: trackingData, isLoading: trackingLoading } = useQuery({
    queryKey: ['order-tracking', selectedOrder],
    queryFn: () => orderTrackingService.getOrderTracking(selectedOrder!),
    enabled: !!selectedOrder,
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }
    > = {
      PENDING: {
        variant: 'secondary',
        icon: <Clock className="h-3 w-3 mr-1" />,
      },
      PROCESSING: {
        variant: 'default',
        icon: <Package className="h-3 w-3 mr-1" />,
      },
      SHIPPED: {
        variant: 'default',
        icon: <Truck className="h-3 w-3 mr-1" />,
      },
      DELIVERED: {
        variant: 'default',
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
      },
      CANCELLED: {
        variant: 'destructive',
        icon: <XCircle className="h-3 w-3 mr-1" />,
      },
    };

    const config = statusConfig[status] || statusConfig.PENDING;

    return (
      <Badge variant={config.variant} className="flex items-center w-fit">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const getStatusTimeline = (tracking: OrderTracking) => {
    const allStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    const currentStatusIndex = allStatuses.indexOf(tracking.status);

    return allStatuses.map((status, index) => {
      const isCompleted = index <= currentStatusIndex;
      const isCurrent = index === currentStatusIndex;
      const statusEntry = tracking.statusHistory.find(h => h.status === status);

      return (
        <div key={status} className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isCompleted ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
              } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}
            >
              {status === 'PENDING' && <Clock className="h-5 w-5" />}
              {status === 'PROCESSING' && <Package className="h-5 w-5" />}
              {status === 'SHIPPED' && <Truck className="h-5 w-5" />}
              {status === 'DELIVERED' && <CheckCircle className="h-5 w-5" />}
            </div>
            {index < allStatuses.length - 1 && (
              <div className={`w-0.5 h-16 ${isCompleted ? 'bg-blue-600' : 'bg-gray-200'}`} />
            )}
          </div>
          <div className="flex-1 pb-8">
            <p className={`font-semibold ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
              {status}
            </p>
            {statusEntry && (
              <>
                <p className="text-sm text-gray-600">
                  {format(new Date(statusEntry.createdAt), 'PPp')}
                </p>
                {statusEntry.notes && (
                  <p className="text-sm text-gray-500 mt-1">{statusEntry.notes}</p>
                )}
              </>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Order Tracking</h1>
        <p className="text-gray-600">Track and manage your orders</p>
      </div>

      {/* Order Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-gray-600">Total Orders</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-sm text-gray-600">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.processing}</div>
              <p className="text-sm text-gray-600">Processing</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.shipped}</div>
              <p className="text-sm text-gray-600">Shipped</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.delivered}</div>
              <p className="text-sm text-gray-600">Delivered</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Orders</CardTitle>
          <CardDescription>View and track all your orders</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Orders</TabsTrigger>
              <TabsTrigger value="PENDING">Pending</TabsTrigger>
              <TabsTrigger value="PROCESSING">Processing</TabsTrigger>
              <TabsTrigger value="SHIPPED">Shipped</TabsTrigger>
              <TabsTrigger value="DELIVERED">Delivered</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab}>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading orders...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-500">No orders found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <Card key={order.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <p className="font-semibold text-lg">Order #{order.id.slice(0, 8)}</p>
                            <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(order.createdAt), 'PPP')}
                            </p>
                          </div>
                          <div className="text-right">
                            {getStatusBadge(order.status)}
                            <p className="text-sm font-semibold mt-2 flex items-center justify-end gap-1">
                              <DollarSign className="h-4 w-4" />
                              {order.totalAmount.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {order.trackingNumber && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm font-medium">Tracking Number</p>
                            <p className="text-sm text-gray-600">{order.trackingNumber}</p>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 mb-4">
                          {order.items.slice(0, 3).map(item => (
                            <div
                              key={item.id}
                              className="text-sm bg-gray-100 px-3 py-1 rounded-full"
                            >
                              {item.product?.name || 'Product'} x{item.quantity}
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="text-sm bg-gray-100 px-3 py-1 rounded-full">
                              +{order.items.length - 3} more
                            </div>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setSelectedOrder(order.id)}
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Track Order
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Order Tracking Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={open => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Tracking</DialogTitle>
            <DialogDescription>Detailed tracking information for your order</DialogDescription>
          </DialogHeader>

          {trackingLoading ? (
            <div className="text-center py-8 text-gray-500">Loading tracking information...</div>
          ) : trackingData ? (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Order ID</p>
                  <p className="font-semibold">#{trackingData.id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  {getStatusBadge(trackingData.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Order Date</p>
                  <p className="font-semibold">{format(new Date(trackingData.createdAt), 'PPP')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-semibold">${trackingData.totalAmount.toFixed(2)}</p>
                </div>
              </div>

              {trackingData.trackingNumber && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Tracking Number</p>
                  <p className="text-lg font-semibold text-blue-600">
                    {trackingData.trackingNumber}
                  </p>
                </div>
              )}

              <Separator />

              {/* Status Timeline */}
              <div>
                <h3 className="font-semibold mb-4">Tracking Timeline</h3>
                <div className="pl-4">{getStatusTimeline(trackingData)}</div>
              </div>

              <Separator />

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-4">Order Items</h3>
                <div className="space-y-2">
                  {trackingData.items.map(item => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.product?.name || 'Product'}</p>
                        <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                      </div>
                      <p className="font-semibold">${item.price.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
