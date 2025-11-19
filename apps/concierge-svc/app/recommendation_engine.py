import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler
from typing import List, Dict, Optional
import redis
import json
from datetime import datetime, timedelta
from shared.models import UserPreferences, FlightFeatures

class RecommendationEngine:
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.model = NearestNeighbors(n_neighbors=5, algorithm='brute')
        self.scaler = StandardScaler()
        self.redis_client = redis_client
        self.flight_features = None
        self.user_preferences = {}
        
    def train_model(self, flights: List[FlightFeatures]) -> None:
        """Train the recommendation model with flight data"""
        if not flights:
            return
            
        # Convert to feature matrix
        features = []
        for flight in flights:
            features.append([
                flight.price,
                flight.duration_minutes,
                flight.departure_hour,
                flight.airline_rating,
                flight.stops,
                flight.seats_available,
                flight.day_of_week,
                flight.season
            ])
        
        features = np.array(features)
        features = self.scaler.fit_transform(features)
        
        self.flight_features = features
        self.model.fit(features)
        
        # Cache flight data
        if self.redis_client:
            self.redis_client.setex(
                "flight_features", 
                3600, 
                json.dumps([f.__dict__ for f in flights])
            )
    
    def get_recommendations(self, user_prefs: UserPreferences, 
                          candidate_flights: List[FlightFeatures]) -> List[str]:
        """Get personalized flight recommendations"""
        if not candidate_flights or self.flight_features is None:
            return self._get_popular_recommendations()
        
        # Convert user preferences to feature vector
        user_vector = self._create_user_feature_vector(user_prefs)
        user_vector_scaled = self.scaler.transform([user_vector])
        
        # Find similar flights
        distances, indices = self.model.kneighbors(user_vector_scaled)
        
        # Filter recommendations based on constraints
        recommendations = []
        seen_flights = set()
        
        for idx in indices[0]:
            if idx < len(candidate_flights):
                flight = candidate_flights[idx]
                
                # Apply constraints
                if self._matches_constraints(flight, user_prefs):
                    flight_id = flight.id
                    if flight_id not in seen_flights:
                        recommendations.append(flight_id)
                        seen_flights.add(flight_id)
        
        # Cache recommendations
        if self.redis_client:
            cache_key = f"recommendations:{user_prefs.user_id}"
            self.redis_client.setex(
                cache_key, 
                300, 
                json.dumps(recommendations[:3])
            )
        
        return recommendations[:3]  # Return top 3 recommendations
    
    def _create_user_feature_vector(self, prefs: UserPreferences) -> List[float]:
        """Convert user preferences to feature vector"""
        return [
            prefs.max_price or 1000,
            prefs.preferred_duration or 300,
            prefs.preferred_departure_time or 12,
            4.5,  # Default airline rating preference
            0,    # Prefer non-stop
            150,  # Default seats available
            datetime.now().weekday(),
            self._get_current_season()
        ]
    
    def _matches_constraints(self, flight: FlightFeatures, 
                           prefs: UserPreferences) -> bool:
        """Check if flight matches user preferences"""
        if prefs.max_price and flight.price > prefs.max_price:
            return False
        
        if prefs.preferred_duration and flight.duration_minutes > prefs.preferred_duration:
            return False
        
        if prefs.preferred_airlines and flight.airline not in prefs.preferred_airlines:
            return False
        
        if prefs.max_stops and flight.stops > prefs.max_stops:
            return False
        
        return True
    
    def _get_popular_recommendations(self) -> List[str]:
        """Fallback to popular recommendations"""
        return []  # Implement popularity-based recommendations
    
    def _get_current_season(self) -> int:
        """Get current season as integer"""
        month = datetime.now().month
        if month in [12, 1, 2]:
            return 0  # Winter
        elif month in [3, 4, 5]:
            return 1  # Spring
        elif month in [6, 7, 8]:
            return 2  # Summer
        else:
            return 3  # Fall
    
    def get_price_alerts(self, user_prefs: UserPreferences,
                        tracked_flights: List[str]) -> List[Dict]:
        """Generate price drop alerts"""
        alerts = []
        
        for flight_id in tracked_flights:
            # Fetch current price
            current_price = self._get_current_price(flight_id)
            
            # Check against user's price threshold
            if user_prefs.price_alert_threshold and current_price:
                if current_price <= user_prefs.price_alert_threshold:
                    alerts.append({
                        'flight_id': flight_id,
                        'current_price': current_price,
                        'threshold': user_prefs.price_alert_threshold,
                        'message': f'Price dropped to ${current_price}',
                        'timestamp': datetime.now().isoformat()
                    })
        
        return alerts
    
    def _get_current_price(self, flight_id: str) -> Optional[float]:
        """Get current flight price from cache or API"""
        if self.redis_client:
            price = self.redis_client.get(f"price:{flight_id}")
            if price:
                return float(price)
        
        return None
    
    def update_user_preferences(self, user_id: str, 
                              preferences: UserPreferences) -> None:
        """Update user preferences cache"""
        if self.redis_client:
            self.redis_client.setex(
                f"prefs:{user_id}",
                86400,  # 24 hours
                json.dumps(preferences.__dict__)
            )