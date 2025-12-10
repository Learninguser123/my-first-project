# 📚 HVV Mobility Platform API Documentation

**Version**: 1.0.0  
**Base URL**: `http://localhost:3000/api/v1`  
**Content-Type**: `application/json`

## 🚀 Overview

The HVV Mobility Platform API provides endpoints for route planning, booking management, user authentication, and sustainable mobility services in Hamburg. This RESTful API supports multi-modal transportation options including public transport (ÖPNV), e-scooters, bike sharing, and ride-sharing.

## 🔐 Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

### Token Types

- **Access Token**: Short-lived (15 minutes) for API requests
- **Refresh Token**: Long-lived (7 days) for obtaining new access tokens

---

## 📡 Base Endpoints

### Server Information

#### Get API Info
```http
GET /api/v1
```

**Response:**
```json
{
  "message": "HVV Mobility Platform API v1",
  "version": "1.0.0",
  "endpoints": {
    "health": "/health",
    "auth": "/api/v1/auth",
    "routes": "/api/v1/routes",
    "vehicles": "/api/v1/vehicles",
    "bookings": "/api/v1/bookings",
    "payments": "/api/v1/payments"
  }
}
```

### Health Check

#### Health Status
```http
GET /health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.123,
  "environment": "development",
  "version": "1.0.0"
}
```

---

## 👤 Authentication Endpoints

### Register New User
```http
POST /auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+49123456789",
  "dateOfBirth": "1990-01-15",
  "address": {
    "street": "Mönckebergstraße 1",
    "city": "Hamburg",
    "postalCode": "20095",
    "country": "Germany"
  },
  "preferences": {
    "preferredTransport": ["public_transport", "bike"],
    "mobilityNeeds": ["eco_friendly", "accessible"],
    "notifications": true
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+49123456789",
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token",
      "expiresIn": 900
    }
  }
}
```

### User Login
```http
POST /auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token",
      "expiresIn": 900
    }
  }
}
```

### Refresh Access Token
```http
POST /auth/refresh
```

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "new-jwt-access-token",
    "expiresIn": 900
  }
}
```

### User Logout
```http
POST /auth/logout
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### Get User Profile
```http
GET /auth/profile
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-string",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+49123456789",
      "dateOfBirth": "1990-01-15",
      "address": {
        "street": "Mönckebergstraße 1",
        "city": "Hamburg",
        "postalCode": "20095",
        "country": "Germany"
      },
      "preferences": {
        "preferredTransport": ["public_transport", "bike"],
        "mobilityNeeds": ["eco_friendly", "accessible"],
        "notifications": true
      },
      "statistics": {
        "totalTrips": 42,
        "totalCO2Saved": 156.7,
        "pointsEarned": 1250,
        "currentStreak": 7
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-20T14:22:00.000Z"
    }
  }
}
```

### Update User Profile
```http
PUT /auth/profile
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+49123456789",
  "preferences": {
    "preferredTransport": ["public_transport", "bike", "e_scooter"],
    "mobilityNeeds": ["eco_friendly"],
    "notifications": true
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "uuid-string",
      "firstName": "John",
      "lastName": "Smith",
      "phone": "+49123456789",
      "preferences": {
        "preferredTransport": ["public_transport", "bike", "e_scooter"],
        "mobilityNeeds": ["eco_friendly"],
        "notifications": true
      },
      "updatedAt": "2024-01-20T14:22:00.000Z"
    }
  }
}
```

---

## 🛣️ Route Planning Endpoints

### Search Routes
```http
GET /routes/search
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `from` (required): Starting coordinates (lat,lng)
- `to` (required): Destination coordinates (lat,lng)
- `preferences` (optional): Route preferences (eco, fast, comfortable, accessible)
- `transportModes` (optional): Transport modes (public_transport, bike, e_scooter, car, walk)
- `departureTime` (optional): ISO 8601 datetime
- `arrivalTime` (optional): ISO 8601 datetime
- `maxWalkingDistance` (optional): Maximum walking distance in meters (default: 1000)

**Example:**
```http
GET /routes/search?from=53.5511,9.9937&to=53.5753,10.0153&preferences=eco&transportModes=public_transport,bike&departureTime=2024-01-15T10:00:00Z
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "routes": [
      {
        "id": "route-uuid-1",
        "name": "ÖPNV + Walk Route",
        "totalDuration": 25,
        "totalDistance": 5.2,
        "totalCO2Emissions": 0.45,
        "estimatedCost": 3.20,
        "segments": [
          {
            "type": "walk",
            "duration": 5,
            "distance": 0.4,
            "instructions": "Walk to Mönckebergstraße station",
            "polyline": "encoded_polyline_string"
          },
          {
            "type": "public_transport",
            "transportMode": "ubahn",
            "line": "U3",
            "duration": 15,
            "distance": 4.2,
            "departure": "Mönckebergstraße",
            "arrival": "Hauptbahnhof",
            "instructions": "Take U3 towards Wandsbek-Gartenstadt",
            "polyline": "encoded_polyline_string"
          },
          {
            "type": "walk",
            "duration": 5,
            "distance": 0.6,
            "instructions": "Walk to destination",
            "polyline": "encoded_polyline_string"
          }
        ],
        "accessibility": {
          "wheelchairAccessible": true,
          "stepFreeAccess": true,
          "elevatorAvailable": true
        },
        "realTimeUpdates": true,
        "ecoScore": 9.2,
        "popularity": 4.5
      },
      {
        "id": "route-uuid-2",
        "name": "Bike Route",
        "totalDuration": 18,
        "totalDistance": 4.8,
        "totalCO2Emissions": 0.0,
        "estimatedCost": 0.0,
        "segments": [
          {
            "type": "bike",
            "duration": 18,
            "distance": 4.8,
            "instructions": "Cycle via bicycle-friendly route",
            "polyline": "encoded_polyline_string",
            "elevationGain": 12,
            "bikePathType": "protected_bike_lane"
          }
        ],
        "accessibility": {
          "wheelchairAccessible": false,
          "stepFreeAccess": true,
          "elevatorAvailable": false
        },
        "realTimeUpdates": false,
        "ecoScore": 10.0,
        "popularity": 4.2
      }
    ],
    "metadata": {
      "searchTime": "2024-01-15T09:45:00.000Z",
      "totalRoutes": 2,
      "searchRadius": 5000,
      "realTimeDataAvailable": true
    }
  }
}
```

### Get Route Details
```http
GET /routes/:routeId
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "route": {
      "id": "route-uuid-1",
      "name": "ÖPNV + Walk Route",
      "totalDuration": 25,
      "totalDistance": 5.2,
      "totalCO2Emissions": 0.45,
      "estimatedCost": 3.20,
      "segments": [
        {
          "id": "segment-1",
          "type": "walk",
          "duration": 5,
          "distance": 0.4,
          "instructions": "Walk to Mönckebergstraße station",
          "polyline": "encoded_polyline_string",
          "waypoints": [
            {
              "lat": 53.5511,
              "lng": 9.9937,
              "instruction": "Start at current location"
            },
            {
              "lat": 53.5515,
              "lng": 9.9942,
              "instruction": "Turn right onto Mönckebergstraße"
            }
          ]
        },
        {
          "id": "segment-2",
          "type": "public_transport",
          "transportMode": "ubahn",
          "line": "U3",
          "duration": 15,
          "distance": 4.2,
          "departure": {
            "station": "Mönckebergstraße",
            "platform": "2",
            "time": "2024-01-15T10:05:00.000Z",
            "realTime": true,
            "delay": 0
          },
          "arrival": {
            "station": "Hauptbahnhof",
            "platform": "1",
            "time": "2024-01-15T10:20:00.000Z",
            "realTime": true,
            "delay": 0
          },
          "instructions": "Take U3 towards Wandsbek-Gartenstadt",
          "polyline": "encoded_polyline_string"
        }
      ],
      "accessibility": {
        "wheelchairAccessible": true,
        "stepFreeAccess": true,
        "elevatorAvailable": true
      },
      "ecoScore": 9.2,
      "popularity": 4.5,
      "createdAt": "2024-01-15T09:45:00.000Z"
    }
  }
}
```

### Get Saved Routes
```http
GET /routes/saved
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "routes": [
      {
        "id": "route-uuid-1",
        "name": "Home to Work",
        "description": "Daily commute route",
        "from": {
          "address": "Mönckebergstraße 1, Hamburg",
          "coordinates": "53.5511,9.9937"
        },
        "to": {
          "address": "Hauptbahnhof, Hamburg",
          "coordinates": "53.5523,10.0085"
        },
        "preferredTransportModes": ["public_transport", "bike"],
        "createdAt": "2024-01-10T08:00:00.000Z",
        "lastUsed": "2024-01-15T09:45:00.000Z",
        "usageCount": 15
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 1,
      "totalItems": 1,
      "itemsPerPage": 20
    }
  }
}
```

### Save Route
```http
POST /routes/saved
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "Home to Work",
  "description": "Daily commute route",
  "from": {
    "address": "Mönckebergstraße 1, Hamburg",
    "coordinates": "53.5511,9.9937"
  },
  "to": {
    "address": "Hauptbahnhof, Hamburg",
    "coordinates": "53.5523,10.0085"
  },
  "preferredTransportModes": ["public_transport", "bike"],
  "routeData": {
    "totalDuration": 25,
    "totalDistance": 5.2,
    "polyline": "encoded_polyline_string"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Route saved successfully",
  "data": {
    "savedRoute": {
      "id": "saved-route-uuid",
      "name": "Home to Work",
      "description": "Daily commute route",
      "from": {
        "address": "Mönckebergstraße 1, Hamburg",
        "coordinates": "53.5511,9.9937"
      },
      "to": {
        "address": "Hauptbahnhof, Hamburg",
        "coordinates": "53.5523,10.0085"
      },
      "preferredTransportModes": ["public_transport", "bike"],
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

---

## 🚗 Vehicle Endpoints

### Get Available Vehicles
```http
GET /vehicles/available
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `latitude` (required): User's latitude
- `longitude` (required): User's longitude
- `radius` (optional): Search radius in meters (default: 1000)
- `type` (optional): Vehicle type (bike, e_scooter, car)
- `providers` (optional): Specific providers

**Example:**
```http
GET /vehicles/available?latitude=53.5511&longitude=9.9937&radius=500&type=e_scooter
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "vehicles": [
      {
        "id": "vehicle-uuid-1",
        "type": "e_scooter",
        "provider": "Tier",
        "name": "Tier E-Scooter #1234",
        "location": {
          "latitude": 53.5515,
          "longitude": 9.9942,
          "address": "Mönckebergstraße 15, Hamburg"
        },
        "batteryLevel": 87,
        "price": {
          "unlockFee": 1.00,
          "perMinute": 0.25,
          "currency": "EUR"
        },
        "status": "available",
        "features": ["helmet_included", "parking_brake"],
        "estimatedRange": 25,
        "realTimeData": true,
        "lastUpdated": "2024-01-15T10:25:00.000Z"
      }
    ],
    "metadata": {
      "searchTime": "2024-01-15T10:30:00.000Z",
      "totalVehicles": 1,
      "searchRadius": 500,
      "realTimeDataAvailable": true
    }
  }
}
```

### Get Vehicle Details
```http
GET /vehicles/:vehicleId
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "vehicle": {
      "id": "vehicle-uuid-1",
      "type": "e_scooter",
      "provider": "Tier",
      "name": "Tier E-Scooter #1234",
      "location": {
        "latitude": 53.5515,
        "longitude": 9.9942,
        "address": "Mönckebergstraße 15, Hamburg",
        "parkingSpot": {
          "type": "designated_parking",
          "instructions": "Park in designated scooter area"
        }
      },
      "batteryLevel": 87,
      "price": {
        "unlockFee": 1.00,
        "perMinute": 0.25,
        "currency": "EUR",
        "estimatedCostFor30Min": 8.50
      },
      "status": "available",
      "features": ["helmet_included", "parking_brake", "front_light"],
      "specifications": {
        "maxSpeed": 20,
        "weight": 14.5,
        "maxLoad": 120,
        "estimatedRange": 25
      },
      "maintenance": {
        "lastService": "2024-01-10T08:00:00.000Z",
        "nextServiceDue": "2024-02-10T08:00:00.000Z"
      },
      "realTimeData": true,
      "lastUpdated": "2024-01-15T10:25:00.000Z"
    }
  }
}
```

---

## 🎫 Booking Endpoints

### Create Booking
```http
POST /bookings
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "routeId": "route-uuid-1",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T10:30:00Z",
  "passengers": 1,
  "specialRequests": [
    "Wheelchair accessible",
    "Extra luggage space"
  ],
  "preferences": {
    "quietCarriage": false,
    "bikeSpace": true
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": {
    "booking": {
      "id": "booking-uuid-1",
      "routeId": "route-uuid-1",
      "status": "pending",
      "startTime": "2024-01-15T10:00:00Z",
      "endTime": "2024-01-15T10:30:00Z",
      "passengers": 1,
      "totalCost": 3.20,
      "currency": "EUR",
      "specialRequests": [
        "Wheelchair accessible",
        "Extra luggage space"
      ],
      "preferences": {
        "quietCarriage": false,
        "bikeSpace": true
      },
      "co2Savings": 1.8,
      "pointsEarned": 25,
      "createdAt": "2024-01-15T09:45:00.000Z",
      "expiresAt": "2024-01-15T09:50:00.000Z"
    }
  }
}
```

### Confirm Booking
```http
POST /bookings/:bookingId/confirm
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Booking confirmed successfully",
  "data": {
    "booking": {
      "id": "booking-uuid-1",
      "status": "confirmed",
      "confirmationCode": "ABC123",
      "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "paymentStatus": "paid",
      "confirmedAt": "2024-01-15T09:48:00.000Z"
    }
  }
}
```

### Start Trip
```http
POST /bookings/:bookingId/start
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Trip started successfully",
  "data": {
    "booking": {
      "id": "booking-uuid-1",
      "status": "in_progress",
      "startedAt": "2024-01-15T10:00:00.000Z",
      "currentLocation": {
        "latitude": 53.5511,
        "longitude": 9.9937
      },
      "estimatedArrival": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### Complete Trip
```http
POST /bookings/:bookingId/complete
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Trip completed successfully",
  "data": {
    "booking": {
      "id": "booking-uuid-1",
      "status": "completed",
      "completedAt": "2024-01-15T10:28:00.000Z",
      "actualDuration": 28,
      "actualDistance": 5.1,
      "actualCO2Savings": 1.9,
      "pointsEarned": 35,
      "totalCost": 3.20,
      "finalLocation": {
        "latitude": 53.5753,
        "longitude": 10.0153
      }
    },
    "rewards": {
      "pointsEarned": 35,
      "ecoBonusPoints": 15,
      "streakBonusPoints": 10,
      "totalPoints": 35
    }
  }
}
```

### Cancel Booking
```http
POST /bookings/:bookingId/cancel
Authorization: Bearer <access_token>
```

**Request Body (optional):**
```json
{
  "reason": "Change of plans",
  "refundRequested": true
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "booking": {
      "id": "booking-uuid-1",
      "status": "cancelled",
      "cancelledAt": "2024-01-15T09:55:00.000Z",
      "reason": "Change of plans",
      "refundStatus": "processing",
      "refundAmount": 3.20
    }
  }
}
```

### Get User Bookings
```http
GET /bookings
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, confirmed, in_progress, completed, cancelled)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `fromDate` (optional): Start date filter (ISO 8601)
- `toDate` (optional): End date filter (ISO 8601)

**Example:**
```http
GET /bookings?status=completed&page=1&limit=10
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "booking-uuid-1",
        "routeName": "Home to Work",
        "status": "completed",
        "startTime": "2024-01-15T10:00:00Z",
        "endTime": "2024-01-15T10:30:00Z",
        "totalCost": 3.20,
        "co2Savings": 1.9,
        "pointsEarned": 35,
        "transportModes": ["public_transport", "walk"]
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 3,
      "totalItems": 25,
      "itemsPerPage": 10
    },
    "statistics": {
      "totalBookings": 25,
      "completedTrips": 22,
      "totalCO2Savings": 45.6,
      "totalPoints": 850
    }
  }
}
```

### Get Booking Details
```http
GET /bookings/:bookingId
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "booking": {
      "id": "booking-uuid-1",
      "routeId": "route-uuid-1",
      "routeName": "Home to Work",
      "status": "completed",
      "startTime": "2024-01-15T10:00:00Z",
      "endTime": "2024-01-15T10:28:00Z",
      "passengers": 1,
      "totalCost": 3.20,
      "currency": "EUR",
      "co2Savings": 1.9,
      "pointsEarned": 35,
      "specialRequests": [
        "Wheelchair accessible"
      ],
      "segments": [
        {
          "type": "walk",
          "duration": 5,
          "distance": 0.4
        },
        {
          "type": "public_transport",
          "transportMode": "ubahn",
          "line": "U3",
          "duration": 15,
          "distance": 4.2
        }
      ],
      "createdAt": "2024-01-15T09:45:00.000Z",
      "completedAt": "2024-01-15T10:28:00.000Z"
    }
  }
}
```

---

## 🏆 Rewards & Statistics Endpoints

### Get User Statistics
```http
GET /bookings/stats
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `period` (optional): Period filter (week, month, year, all)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "statistics": {
      "overview": {
        "totalTrips": 42,
        "totalDistance": 156.7,
        "totalCO2Savings": 23.4,
        "totalPoints": 1250,
        "currentStreak": 7,
        "longestStreak": 14
      },
      "thisMonth": {
        "trips": 12,
        "distance": 45.2,
        "co2Savings": 6.8,
        "points": 380
      },
      "transportModes": [
        {
          "mode": "public_transport",
          "trips": 28,
          "percentage": 66.7,
          "co2Savings": 18.9
        },
        {
          "mode": "bike",
          "trips": 10,
          "percentage": 23.8,
          "co2Savings": 4.5
        },
        {
          "mode": "walk",
          "trips": 4,
          "percentage": 9.5,
          "co2Savings": 0.0
        }
      ],
      "achievements": [
        {
          "id": "eco_warrior",
          "name": "Eco Warrior",
          "description": "Save 20kg CO2",
          "earnedAt": "2024-01-10T08:00:00.000Z",
          "icon": "🌱"
        },
        {
          "id": "commuter_champion",
          "name": "Commuter Champion",
          "description": "Complete 20 trips",
          "earnedAt": "2024-01-15T10:00:00.000Z",
          "icon": "🏆"
        }
      ]
    }
  }
}
```

---

## 🚨 Error Responses

All endpoints return standardized error responses:

### Standard Error Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": "Additional error details (optional)"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Common Error Codes

| Status Code | Error Code | Description |
|-------------|------------|-------------|
| 400 | VALIDATION_ERROR | Request validation failed |
| 401 | UNAUTHORIZED | Invalid or missing authentication token |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource already exists or conflict detected |
| 422 | UNPROCESSABLE_ENTITY | Request data is semantically incorrect |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_SERVER_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | External service unavailable |

### Validation Error Example
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ]
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 📊 Rate Limiting

The API implements rate limiting to ensure fair usage:

- **Default**: 100 requests per 15 minutes per IP
- **Authenticated**: 200 requests per 15 minutes per user
- **Search endpoints**: 30 requests per 15 minutes per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1642248600
```

---

## 🔄 Real-time Updates

For real-time updates on bookings and vehicle availability, the API supports:

### WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
ws.send(JSON.stringify({
  type: 'authenticate',
  token: 'your_jwt_token'
}));
```

### Real-time Events
- `booking_status_update`: Booking status changes
- `vehicle_location_update`: Vehicle position updates
- `route_delay_update`: Real-time delay information
- `service_alerts`: Service disruptions and alerts

---

## 🧪 Testing

### API Testing with curl

**Test Health Check:**
```bash
curl -X GET http://localhost:3000/health
```

**Test User Registration:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }'
```

**Test Route Search:**
```bash
curl -X GET "http://localhost:3000/api/v1/routes/search?from=53.5511,9.9937&to=53.5753,10.0153&preferences=eco" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📋 API Changelog

### v1.0.0 (Current)
- Initial API release
- Authentication and user management
- Route planning and search
- Booking management
- Vehicle availability
- Rewards and statistics
- Real-time updates support

---

## 📞 Support

For API support and questions:
- **Email**: api-support@hvv-mobility.com
- **Documentation**: https://docs.hvv-mobility.com
- **Status Page**: https://status.hvv-mobility.com

---

**Last Updated**: January 15, 2024  
**API Version**: 1.0.0