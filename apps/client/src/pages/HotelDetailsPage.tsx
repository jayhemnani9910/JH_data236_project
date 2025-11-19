import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Hotel, MapPin, Star, Wifi, Car as CarIcon, Utensils, Dumbbell, Users, Coffee, AlertCircle, Check, X as XIcon, Waves } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '../components/ui';
import { hotelsApi } from '../services/api';

export function HotelDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [hotel, setHotel] = useState<any>(location.state?.item || null);
  const [loading, setLoading] = useState(!hotel);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);

  useEffect(() => {
    if (!hotel && id) {
      fetchHotelDetails();
    }
  }, [id, hotel]);

  const fetchHotelDetails = async () => {
    try {
      const response = await hotelsApi.getHotel(id!);
      setHotel(response.data.data);
    } catch (error) {
      console.error('Failed to fetch hotel details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookRoom = (room?: any) => {
    navigate(`/booking/hotels/${id}`, {
      state: {
        item: hotel,
        type: 'hotel',
        room: room || selectedRoom,
        startDate: location.state?.startDate,
        endDate: location.state?.endDate
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4" />
          <p className="text-gray-600">Loading hotel details...</p>
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Hotel Not Found</h2>
            <p className="text-gray-600 mb-4">The hotel you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate('/search?type=hotels')}>Search Hotels</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const starRating = hotel.starRating || hotel.rating || 3;

  // Mock room types
  const roomTypes = [
    {
      id: 1,
      name: 'Standard Room',
      price: hotel.pricePerNight,
      beds: '1 King or 2 Queen Beds',
      capacity: '2 Adults',
      size: '300 sq ft',
      features: ['Free WiFi', 'Flat-screen TV', 'Coffee Maker']
    },
    {
      id: 2,
      name: 'Deluxe Room',
      price: hotel.pricePerNight * 1.3,
      beds: '1 King Bed',
      capacity: '2 Adults',
      size: '400 sq ft',
      features: ['Free WiFi', 'City View', 'Mini Bar', 'Premium Toiletries']
    },
    {
      id: 3,
      name: 'Suite',
      price: hotel.pricePerNight * 1.8,
      beds: '1 King Bed + Sofa Bed',
      capacity: '4 Adults',
      size: '600 sq ft',
      features: ['Free WiFi', 'Separate Living Area', 'Mini Bar', 'Balcony', 'Premium Toiletries']
    }
  ];

  // Mock amenities
  const amenities = [
    { icon: Wifi, name: 'Free WiFi', available: true },
    { icon: CarIcon, name: 'Free Parking', available: true },
    { icon: Utensils, name: 'Restaurant', available: true },
    { icon: Dumbbell, name: 'Fitness Center', available: true },
    { icon: Waves, name: 'Swimming Pool', available: true },
    { icon: Coffee, name: '24/7 Room Service', available: true },
    { icon: Users, name: 'Business Center', available: false },
    { icon: Hotel, name: 'Spa', available: false }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
        >
          <XIcon className="w-4 h-4 mr-1" />
          Back to Results
        </button>

        {/* Hotel Header */}
        <Card className="mb-6">
          <CardContent className="p-0">
            {/* Photo Gallery Placeholder */}
            <div className="h-96 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
              <Hotel className="w-32 h-32 text-orange-400" />
            </div>
            
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{hotel.name}</h1>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-5 h-5 ${
                            i < starRating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">{starRating}-Star Hotel</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-600">
                    <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p>{hotel.location || hotel.city || 'Downtown Area'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 mb-1">Starting from</div>
                  <div className="text-4xl font-bold text-brand mb-1">${hotel.pricePerNight}</div>
                  <div className="text-sm text-gray-600">per night</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle>About This Hotel</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  {hotel.description || `Experience comfort and luxury at ${hotel.name}. Located in the heart of the city, 
                  our hotel offers modern amenities, spacious rooms, and exceptional service. Perfect for both business 
                  and leisure travelers, we provide everything you need for a memorable stay.`}
                </p>
              </CardContent>
            </Card>

            {/* Room Types */}
            <Card>
              <CardHeader>
                <CardTitle>Room Types & Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roomTypes.map((room) => (
                    <div
                      key={room.id}
                      className={`border rounded-lg p-4 transition-all cursor-pointer ${
                        selectedRoom?.id === room.id
                          ? 'border-brand bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedRoom(room)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">{room.name}</h3>
                          <div className="space-y-1 text-sm text-gray-600 mb-3">
                            <p>• {room.beds}</p>
                            <p>• Sleeps up to {room.capacity}</p>
                            <p>• {room.size}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {room.features.map((feature, idx) => (
                              <Badge key={idx} variant="default" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div className="text-2xl font-bold text-brand">
                            ${room.price.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-600">per night</div>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookRoom(room);
                            }}
                          >
                            Select Room
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card>
              <CardHeader>
                <CardTitle>Amenities & Services</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {amenities.map((amenity, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 ${
                        amenity.available ? 'text-gray-900' : 'text-gray-400'
                      }`}
                    >
                      {amenity.available ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <XIcon className="w-5 h-5 text-gray-300" />
                      )}
                      <amenity.icon className="w-5 h-5" />
                      <span className="text-sm">{amenity.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Hotel Policies */}
            <Card>
              <CardHeader>
                <CardTitle>Hotel Policies</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Check-in / Check-out</h4>
                    <p className="text-sm text-gray-600">Check-in: 3:00 PM | Check-out: 11:00 AM</p>
                    <p className="text-sm text-gray-600 mt-1">Early check-in and late check-out available upon request (subject to availability)</p>
                  </div>
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-2">Cancellation Policy</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Free cancellation up to 48 hours before check-in</p>
                      <p>• Cancellations within 48 hours: 1 night charge</p>
                      <p>• No-show: Full stay charge</p>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <h4 className="font-semibold mb-2">Other Policies</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Pets allowed (additional fee applies)</p>
                      <p>• Smoking not permitted in rooms</p>
                      <p>• Children of all ages welcome</p>
                      <p>• Valid credit card required for incidentals</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Guest Reviews */}
            <Card>
              <CardHeader>
                <CardTitle>Guest Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-brand">4.5</div>
                      <div className="text-sm text-gray-600">out of 5</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < 4
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">Based on 423 reviews</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="w-20">Cleanliness</span>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 w-11/12" />
                          </div>
                          <span className="w-8 text-right">4.6</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="w-20">Service</span>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 w-10/12" />
                          </div>
                          <span className="w-8 text-right">4.5</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="w-20">Location</span>
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 w-9/12" />
                          </div>
                          <span className="w-8 text-right">4.3</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Booking Card */}
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Reserve Your Stay</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedRoom ? (
                  <div className="space-y-4">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="font-semibold text-sm mb-1">{selectedRoom.name}</p>
                      <p className="text-xs text-gray-600">{selectedRoom.beds}</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Rate per night</span>
                        <span className="font-semibold">${selectedRoom.price.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Taxes & Fees (12%)</span>
                        <span className="font-semibold">${(selectedRoom.price * 0.12).toFixed(2)}</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between">
                        <span className="font-bold">Total per night</span>
                        <span className="font-bold text-xl text-brand">
                          ${(selectedRoom.price * 1.12).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <Button fullWidth onClick={() => handleBookRoom()}>
                      Continue to Booking
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Hotel className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-600 mb-4">Select a room type to continue</p>
                    <p className="text-xs text-gray-500">Or book the standard room</p>
                    <Button fullWidth className="mt-4" onClick={() => handleBookRoom(roomTypes[0])}>
                      Book Standard Room
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Important Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Important Information</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs text-gray-600">
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>Valid credit card required at check-in</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>Government-issued photo ID required</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>Minimum age to check-in: 21 years</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>Prices subject to change without notice</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
