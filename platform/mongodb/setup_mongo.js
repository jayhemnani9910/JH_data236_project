// MongoDB Setup Script for Kayak System
// Run with: mongo localhost:27017/kayak setup_mongo.js

// Switch to kayak database
db = db.getSiblingDB('kayak');

// Create collections with validation
print("🔧 Setting up MongoDB collections for Kayak system...");

try {
  // Reviews collection
  db.createCollection("reviews", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["reviewId", "userId", "entityType", "entityId", "rating", "reviewText", "createdAt"],
        properties: {
          reviewId: { bsonType: "string" },
          userId: { bsonType: "string" },
          entityType: { 
            bsonType: "string", 
            enum: ["flight", "hotel", "car"] 
          },
          entityId: { bsonType: "string" },
          rating: { 
            bsonType: "int", 
            minimum: 1, 
            maximum: 5 
          },
          reviewText: { bsonType: "string", maxLength: 2000 },
          title: { bsonType: "string", maxLength: 100 },
          pros: { bsonType: ["array", "null"] },
          cons: { bsonType: ["array", "null"] },
          createdAt: { bsonType: "date" },
          updatedAt: { bsonType: "date" },
          helpfulCount: { bsonType: "int", minimum: 0, default: 0 },
          verified: { bsonType: "bool", default: false }
        }
      }
    }
  });
  print("✅ Created 'reviews' collection");

  // Clickstream collection
  db.createCollection("clickstream", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["eventId", "userId", "sessionId", "eventType", "timestamp", "page"],
        properties: {
          eventId: { bsonType: "string" },
          userId: { bsonType: "string" },
          sessionId: { bsonType: "string" },
          eventType: { 
            bsonType: "string", 
            enum: ["page_view", "click", "search", "filter", "booking_start", "booking_complete", "login", "logout"] 
          },
          page: { bsonType: "string" },
          timestamp: { bsonType: "date" },
          userAgent: { bsonType: "string" },
          ipAddress: { bsonType: "string" },
          referrer: { bsonType: ["string", "null"] },
          searchQuery: { bsonType: ["string", "null"] },
          filterCriteria: { bsonType: ["object", "null"] },
          entityType: { bsonType: ["string", "null"], enum: ["flight", "hotel", "car", null] },
          entityId: { bsonType: ["string", "null"] },
          position: { bsonType: ["int", "null"] },
          metadata: { bsonType: ["object", "null"] }
        }
      }
    }
  });
  print("✅ Created 'clickstream' collection");

  // Analytics collection
  db.createCollection("analytics", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["metricType", "date", "value"],
        properties: {
          metricType: { 
            bsonType: "string", 
            enum: [
              "daily_revenue", "monthly_revenue", "yearly_revenue", "city_revenue",
              "top_properties", "user_engagement", "conversion_rate", "page_views",
              "search_queries", "booking_counts"
            ] 
          },
          date: { bsonType: "date" },
          value: { bsonType: ["double", "int", "object"] },
          entityId: { bsonType: ["string", "null"] },
          entityType: { bsonType: ["string", "null"] },
          dimensions: { bsonType: ["object", "null"] },
          createdAt: { bsonType: "date" }
        }
      }
    }
  });
  print("✅ Created 'analytics' collection");

  // Notifications collection
  db.createCollection("notifications", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["notificationId", "userId", "type", "message", "timestamp"],
        properties: {
          notificationId: { bsonType: "string" },
          userId: { bsonType: "string" },
          type: { bsonType: "string", enum: ["email", "sms", "push", "in_app"] },
          message: { bsonType: "string" },
          title: { bsonType: ["string", "null"] },
          status: { bsonType: "string", enum: ["pending", "sent", "failed"], default: "pending" },
          timestamp: { bsonType: "date" },
          sentAt: { bsonType: ["date", "null"] },
          error: { bsonType: ["string", "null"] }
        }
      }
    }
  });
  print("✅ Created 'notifications' collection");

  // Create indexes
  print("📊 Creating indexes...");

  // Reviews indexes
  db.reviews.createIndex({ "reviewId": 1 }, { unique: true });
  db.reviews.createIndex({ "userId": 1, "entityType": 1, "entityId": 1 }, { unique: true });
  db.reviews.createIndex({ "entityType": 1, "entityId": 1, "rating": -1 });
  db.reviews.createIndex({ "entityType": 1, "entityId": 1, "createdAt": -1 });
  db.reviews.createIndex({ "userId": 1, "createdAt": -1 });

  // Clickstream indexes
  db.clickstream.createIndex({ "eventId": 1 }, { unique: true });
  db.clickstream.createIndex({ "userId": 1, "timestamp": -1 });
  db.clickstream.createIndex({ "sessionId": 1, "timestamp": 1 });
  db.clickstream.createIndex({ "eventType": 1, "timestamp": -1 });
  db.clickstream.createIndex({ "timestamp": -1 });
  db.clickstream.createIndex({ "entityType": 1, "entityId": 1, "timestamp": -1 });

  // Analytics indexes
  db.analytics.createIndex({ "metricType": 1, "date": -1 });
  db.analytics.createIndex({ "date": -1 });
  db.analytics.createIndex({ "entityType": 1, "entityId": 1, "date": -1 });

  // Notifications indexes
  db.notifications.createIndex({ "notificationId": 1 }, { unique: true });
  db.notifications.createIndex({ "userId": 1, "timestamp": -1 });
  db.notifications.createIndex({ "type": 1, "status": 1 });

  // Lightweight collections for admin analytics code paths (bookings, users, deals, user_interactions)
  if (!db.getCollectionNames().includes('bookings')) {
    db.createCollection('bookings');
    print("✅ Created 'bookings' collection (analytics placeholder)");
  }
  if (!db.getCollectionNames().includes('users')) {
    db.createCollection('users');
    print("✅ Created 'users' collection (analytics placeholder)");
  }
  if (!db.getCollectionNames().includes('deals')) {
    db.createCollection('deals');
    print("✅ Created 'deals' collection (analytics placeholder)");
  }
  if (!db.getCollectionNames().includes('user_interactions')) {
    db.createCollection('user_interactions');
    print("✅ Created 'user_interactions' collection (analytics placeholder)");
  }

  print("📊 Indexes created successfully");

  // Verify collections
  const collections = db.getCollectionNames();
  print(`\n📋 MongoDB Collections created (${collections.length}):`);
  collections.forEach(name => {
    const count = db[name].countDocuments();
    print(`   - ${name}: ${count} documents`);
  });

} catch (error) {
  print("❌ Error creating collections: " + error);
  throw error;
}

print("✅ MongoDB setup completed successfully!");
