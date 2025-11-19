import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, CheckCircle, Clock, XCircle, AlertCircle, Search, Filter, Eye, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button, Input, Tabs, useToast } from '../components/ui';
import { useAuth, useBookings } from '../hooks';
import { bookingApi } from '../services/api';

const BookingsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { bookings, loading: bookingsLoading, fetchBookings } = useBookings(user?.id);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/bookings');
    }
  }, [authLoading, user, navigate]);

  const handleViewDetails = (booking: any) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
      return;
    }

    setCancelling(bookingId);
    try {
      await bookingApi.cancelBooking(bookingId);
      showToast('success', 'Booking cancelled successfully');
      fetchBookings();
    } catch (error: any) {
      showToast('error', error.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setCancelling(null);
    }
  };

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!user) return null;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
      confirmed: 'success',
      pending: 'warning',
      cancelled: 'danger',
      completed: 'info'
    };
    const icons: Record<string, any> = {
      confirmed: CheckCircle,
      pending: Clock,
      cancelled: XCircle,
      completed: CheckCircle
    };
    const Icon = icons[status] || AlertCircle;

    return (
      <Badge variant={variants[status] || 'default'} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  const BookingList = ({ filterStatus }: { filterStatus?: string[] }) => {
    const filteredBookings = filterStatus 
      ? bookings.filter(b => filterStatus.includes(b.status))
      : bookings;

    if (bookingsLoading) {
      return <div className="text-center py-12">Loading your trips...</div>;
    }

    if (filteredBookings.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No bookings found</p>
            <Button className="mt-4" onClick={() => navigate('/')}>Start Searching</Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {filteredBookings.map((booking) => (
          <Card key={booking.id} hover>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="default" className="capitalize">{booking.type}</Badge>
                    {getStatusBadge(booking.status)}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {booking.type === 'flight' ? 'Flight to Destination' : 
                     booking.type === 'hotel' ? 'Hotel Stay' : 'Car Rental'}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Booking ID: <span className="font-mono">{booking.id}</span> • {new Date(booking.createdAt).toLocaleDateString()}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => handleViewDetails(booking)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                    {booking.status === 'confirmed' && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={cancelling === booking.id}
                      >
                        <X className="w-4 h-4 mr-1" />
                        {cancelling === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    ${booking.totalAmount.toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Trips</h1>
            <p className="text-gray-600 mt-1">Manage your upcoming and past bookings</p>
          </div>
          <Button onClick={() => navigate('/')}>Book New Trip</Button>
        </div>

        <Tabs
          tabs={[
            {
              id: 'upcoming',
              label: 'Upcoming',
              content: <BookingList filterStatus={['confirmed', 'pending']} />
            },
            {
              id: 'past',
              label: 'Past',
              content: <BookingList filterStatus={['completed']} />
            },
            {
              id: 'cancelled',
              label: 'Cancelled',
              content: <BookingList filterStatus={['cancelled']} />
            },
            {
              id: 'all',
              label: 'All Bookings',
              content: <BookingList />
            }
          ]}
        />
      </div>

      {/* Booking Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Booking Details</CardTitle>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
                title="Close"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Booking Info */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Booking Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Booking ID</p>
                    <p className="font-mono font-semibold">{selectedBooking.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Type</p>
                    <p className="font-semibold capitalize">{selectedBooking.type}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    {getStatusBadge(selectedBooking.status)}
                  </div>
                  <div>
                    <p className="text-gray-500">Booked On</p>
                    <p className="font-semibold">{new Date(selectedBooking.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Items */}
              {selectedBooking.items && selectedBooking.items.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">Items</h3>
                  <div className="space-y-2">
                    {selectedBooking.items.map((item: any, index: number) => (
                      <Card key={index} className="bg-gray-50">
                        <CardContent className="p-4">
                          <p className="text-sm text-gray-600">{JSON.stringify(item, null, 2)}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Info */}
              <div>
                <h3 className="font-semibold text-lg mb-3">Payment Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">${(selectedBooking.totalAmount / 1.12).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Taxes & Fees</span>
                    <span className="font-semibold">${(selectedBooking.totalAmount - (selectedBooking.totalAmount / 1.12)).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-xl">${selectedBooking.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="secondary" fullWidth onClick={() => setShowDetailsModal(false)}>
                  Close
                </Button>
                {selectedBooking.status === 'confirmed' && (
                  <Button 
                    variant="danger" 
                    fullWidth
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleCancelBooking(selectedBooking.id);
                    }}
                  >
                    Cancel Booking
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BookingsPage;
