export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
}

class Analytics {
  private userId: string | null = null;
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeAnalytics();
  }

  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private initializeAnalytics() {
    // Initialize Google Analytics or other analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
        session_id: this.sessionId
      });
    }
  }

  public identifyUser(userId: string) {
    this.userId = userId;
    
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
        user_id: userId
      });
    }
  }

  public trackEvent(event: AnalyticsEvent) {
    const eventData = {
      ...event,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer
    };

    // Track with Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event.name, eventData.properties);
    }

    // Track with custom analytics service
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData)
    }).catch(console.error);

    // Log for development
    console.log('Analytics Event:', eventData);
  }

  public trackPageView(pageName: string, url: string) {
    this.trackEvent({
      name: 'page_view',
      properties: {
        page_name: pageName,
        url: url
      }
    });
  }

  public trackSearch(params: any) {
    this.trackEvent({
      name: 'search_flights',
      properties: {
        origin: params.origin,
        destination: params.destination,
        departure_date: params.departureDate,
        return_date: params.returnDate,
        passengers: params.passengers,
        cabin_class: params.cabinClass
      }
    });
  }

  public trackBooking(bookingData: any) {
    this.trackEvent({
      name: 'booking_created',
      properties: {
        flight_id: bookingData.flightId,
        total_amount: bookingData.totalAmount,
        passengers: bookingData.passengers.length,
        currency: bookingData.currency
      }
    });
  }

  public trackConversion(conversionType: string, value: number, currency: string) {
    this.trackEvent({
      name: 'conversion',
      properties: {
        conversion_type: conversionType,
        value: value,
        currency: currency
      }
    });
  }

  public trackError(error: Error, context: string) {
    this.trackEvent({
      name: 'error',
      properties: {
        error_message: error.message,
        error_stack: error.stack,
        context: context
      }
    });
  }
}

export const analytics = new Analytics();

// Convenience methods
export const trackEvent = (name: string, properties?: Record<string, any>) => {
  analytics.trackEvent({ name, properties });
};

export const trackPageView = (pageName: string, url: string) => {
  analytics.trackPageView(pageName, url);
};