// MongoDB Collections Schema for Kayak-like Travel Booking System
// These collections store non-relational data like reviews, clickstream, etc.

// Reviews collection (for all types of bookings)
db.createCollection("reviews", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "type", "referenceId", "userId", "rating", "title", "content", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        type: {
          enum: ["flight", "hotel", "car", "service"]
        },
        referenceId: { bsonType: "string" }, // ID of the flight/hotel/car being reviewed
        userId: { bsonType: "string" },
        rating: {
          bsonType: "int",
          minimum: 1,
          maximum: 5
        },
        title: { bsonType: "string" },
        content: { bsonType: "string" },
        images: {
          bsonType: "array",
          items: { bsonType: "string" }
        },
        pros: {
          bsonType: "array",
          items: { bsonType: "string" }
        },
        cons: {
          bsonType: "array",
          items: { bsonType: "string" }
        },
        verified: { bsonType: "bool" }, // verified booking
        helpful: { bsonType: "int" }, // helpful votes
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});

db.reviews.createIndex({ referenceId: 1, createdAt: -1 });
db.reviews.createIndex({ userId: 1, createdAt: -1 });
db.reviews.createIndex({ type: 1, rating: 1 });
db.reviews.createIndex({ "text": "text" }, { name: "text_search" });

// Clickstream events collection
db.createCollection("clickstream_events", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "userId", "eventType", "page", "timestamp"],
      properties: {
        _id: { bsonType: "objectId" },
        userId: { bsonType: "string" },
        sessionId: { bsonType: "string" },
        eventType: {
          enum: ["page_view", "search", "filter", "click", "view", "book", "abandon"]
        },
        page: { bsonType: "string" },
        element: { bsonType: "string" }, // element clicked
        properties: { bsonType: "object" }, // flexible properties
        referrer: { bsonType: "string" },
        userAgent: { bsonType: "string" },
        ip: { bsonType: "string" },
        timestamp: { bsonType: "date" },
        processingStatus: {
          enum: ["pending", "processed", "failed"],
          bsonType: "string"
        }
      }
    }
  }
});

db.clickstream_events.createIndex({ userId: 1, timestamp: -1 });
db.clickstream_events.createIndex({ sessionId: 1, timestamp: -1 });
db.clickstream_events.createIndex({ eventType: 1, timestamp: -1 });
db.clickstream_events.createIndex({ page: 1, timestamp: -1 });
db.clickstream_events.createIndex({ timestamp: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

// Listing images collection
db.createCollection("listing_images", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "listingId", "listingType", "url", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        listingId: { bsonType: "string" },
        listingType: {
          enum: ["flight", "hotel", "car", "package"]
        },
        url: { bsonType: "string" },
        thumbnailUrl: { bsonType: "string" },
        description: { bsonType: "string" },
        order: { bsonType: "int" },
        isPrimary: { bsonType: "bool" },
        createdAt: { bsonType: "date" }
      }
    }
  }
});

db.listing_images.createIndex({ listingId: 1, listingType: 1 });
db.listing_images.createIndex({ listingId: 1, order: 1 });

// User preferences collection
db.createCollection("user_preferences", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "userId", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        userId: { bsonType: "string" },
        travelStyle: {
          bsonType: "object",
          properties: {
            preferredAirlines: { bsonType: "array", items: { bsonType: "string" } },
            preferredHotelAmenities: { bsonType: "array", items: { bsonType: "string" } },
            preferredCarTypes: { bsonType: "array", items: { bsonType: "string" } },
            seatPreference: { enum: ["aisle", "window", "middle"] },
            dietaryRestrictions: { bsonType: "array", items: { bsonType: "string" } }
          }
        },
        notificationSettings: {
          bsonType: "object",
          properties: {
            email: { bsonType: "bool" },
            sms: { bsonType: "bool" },
            push: { bsonType: "bool" },
            dealAlerts: { bsonType: "bool" },
            priceWatch: { bsonType: "bool" }
          }
        },
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" }
      }
    }
  }
});

db.user_preferences.createIndex({ userId: 1 }, { unique: true });

// Price watch collection
db.createCollection("price_watches", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "userId", "type", "referenceId", "targetPrice", "createdAt"],
      properties: {
        _id: { bsonType: "objectId" },
        userId: { bsonType: "string" },
        type: {
          enum: ["flight", "hotel", "car", "package"]
        },
        referenceId: { bsonType: "string" },
        targetPrice: { bsonType: "number" },
        currency: { bsonType: "string" },
        currentPrice: { bsonType: "number" },
        active: { bsonType: "bool" },
        notificationSent: { bsonType: "bool" },
        createdAt: { bsonType: "date" },
        triggeredAt: { bsonType: "date" }
      }
    }
  }
});

db.price_watches.createIndex({ userId: 1, active: 1 });
db.price_watches.createIndex({ referenceId: 1, type: 1 });
db.price_watches.createIndex({ currentPrice: 1 });

// Analytics aggregation collections
db.createCollection("listing_analytics", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "listingId", "listingType", "date"],
      properties: {
        _id: { bsonType: "objectId" },
        listingId: { bsonType: "string" },
        listingType: {
          enum: ["flight", "hotel", "car", "package"]
        },
        date: { bsonType: "date" },
        views: { bsonType: "int" },
        searches: { bsonType: "int" },
        clicks: { bsonType: "int" },
        bookings: { bsonType: "int" },
        conversionRate: { bsonType: "number" },
        averageTimeOnPage: { bsonType: "int" }, // seconds
        bounceRate: { bsonType: "number" }
      }
    }
  }
});

db.listing_analytics.createIndex({ listingId: 1, listingType: 1, date: 1 });
db.listing_analytics.createIndex({ date: 1 });

// Search analytics collection
db.createCollection("search_analytics", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["_id", "query", "filters", "timestamp"],
      properties: {
        _id: { bsonType: "objectId" },
        query: { bsonType: "string" },
        type: {
          enum: ["flight", "hotel", "car", "package"]
        },
        filters: { bsonType: "object" },
        resultsCount: { bsonType: "int" },
        clickedResult: { bsonType: "string" },
        timestamp: { bsonType: "date" }
      }
    }
  }
});

db.search_analytics.createIndex({ timestamp: 1 });
db.search_analytics.createIndex({ type: 1, timestamp: -1 });
db.search_analytics.createIndex({ "text": "text" }, { name: "search_text" });

// Create compound indexes for optimal performance
db.reviews.createIndex({ listingId: 1, listingType: 1, createdAt: -1 });
db.listing_images.createIndex({ listingId: 1, listingType: 1, isPrimary: -1 });
db.clickstream_events.createIndex({ userId: 1, eventType: 1, timestamp: -1 });
db.clickstream_events.createIndex({ sessionId: 1, page: 1, timestamp: -1 });