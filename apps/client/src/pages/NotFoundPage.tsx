import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Search, AlertCircle } from 'lucide-react';
import { Button, Card } from '../components/ui';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-gray-50 flex items-center justify-center px-4">
      <Card className="max-w-2xl w-full">
        <div className="text-center py-12 px-6">
          {/* 404 Illustration */}
          <div className="mb-6">
            <AlertCircle className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">Page Not Found</h2>
            <p className="text-gray-500 text-lg">
              Oops! The page you're looking for doesn't exist.
            </p>
          </div>

          {/* Suggestions */}
          <div className="mb-8">
            <p className="text-gray-600 mb-4">
              You may have mistyped the address or the page may have moved.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => navigate('/')}
              className="flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Go to Homepage
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/search')}
              className="flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search Trips
            </Button>
          </div>

          {/* Quick Links */}
          <div className="mt-8 pt-8 border-t">
            <p className="text-sm text-gray-500 mb-3">Quick Links:</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => navigate('/search?type=flights')}
                className="text-sm text-[#FF690F] hover:text-orange-700 underline"
              >
                Flights
              </button>
              <button
                onClick={() => navigate('/search?type=hotels')}
                className="text-sm text-[#FF690F] hover:text-orange-700 underline"
              >
                Hotels
              </button>
              <button
                onClick={() => navigate('/search?type=cars')}
                className="text-sm text-[#FF690F] hover:text-orange-700 underline"
              >
                Cars
              </button>
              <button
                onClick={() => navigate('/deals')}
                className="text-sm text-[#FF690F] hover:text-orange-700 underline"
              >
                Deals
              </button>
              <button
                onClick={() => navigate('/bookings')}
                className="text-sm text-[#FF690F] hover:text-orange-700 underline"
              >
                My Trips
              </button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
