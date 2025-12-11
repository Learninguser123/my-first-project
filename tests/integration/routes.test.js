const request = require('supertest');
const app = require('../../dist/index').default;
const { Pool } = require('pg');

describe('Route Planning Integration Tests', () => {
  let pool;
  let authToken;
  let testUser;

  beforeAll(async () => {
    // Initialize test database connection
    pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 'postgresql://postgres:testpass@localhost:5432/hvv_test'
    });

    // Create test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'route-test@example.com',
        password: 'TestPassword123!',
        firstName: 'Route',
        lastName: 'Tester'
      });

    testUser = registerResponse.body.user;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'route-test@example.com',
        password: 'TestPassword123!'
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM users WHERE email LIKE $1', ['%route-test%']);
    await pool.query('DELETE FROM routes WHERE user_id = $1', [testUser.id]);
    
    // Close database connection
    await pool.end();
  });

  describe('POST /api/routes/plan', () => {
    it('should plan a route successfully with valid data', async () => {
      const routeRequest = {
        origin: {
          address: 'Hamburg Hauptbahnhof',
          coordinates: { lat: 53.5511, lng: 9.9937 }
        },
        destination: {
          address: 'Hamburg Airport',
          coordinates: { lat: 53.6304, lng: 9.9882 }
        },
        preferences: {
          co2Optimized: true,
          maxWalkingDistance: 1000,
          preferredModes: ['public_transport', 'bike', 'walk'],
          departureTime: '2024-01-01T10:00:00Z'
        }
      };

      const response = await request(app)
        .post('/api/routes/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(routeRequest)
        .expect(200);

      expect(response.body).toHaveProperty('routes');
      expect(Array.isArray(response.body.routes)).toBe(true);
      expect(response.body.routes.length).toBeGreaterThan(0);

      const firstRoute = response.body.routes[0];
      expect(firstRoute).toHaveProperty('id');
      expect(firstRoute).toHaveProperty('origin');
      expect(firstRoute).toHaveProperty('destination');
      expect(firstRoute).toHaveProperty('segments');
      expect(firstRoute).toHaveProperty('duration');
      expect(firstRoute).toHaveProperty('co2Emission');
      expect(firstRoute).toHaveProperty('price');
      expect(Array.isArray(firstRoute.segments)).toBe(true);
    });

    it('should return route with CO2 optimization information', async () => {
      const routeRequest = {
        origin: {
          address: 'Hamburg Hauptbahnhof',
          coordinates: { lat: 53.5511, lng: 9.9937 }
        },
        destination: {
          address: 'Mönckebergstraße',
          coordinates: { lat: 53.5529, lng: 9.9926 }
        },
        preferences: {
          co2Optimized: true,
          maxWalkingDistance: 500,
          preferredModes: ['public_transport', 'walk']
        }
      };

      const response = await request(app)
        .post('/api/routes/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(routeRequest)
        .expect(200);

      const routes = response.body.routes;
      const co2OptimizedRoute = routes.find(route => route.co2Optimized === true);
      
      expect(co2OptimizedRoute).toBeDefined();
      expect(co2OptimizedRoute.co2Emission).toBeDefined();
      expect(typeof co2OptimizedRoute.co2Emission).toBe('number');
    });

    it('should handle multi-modal routing requests', async () => {
      const multiModalRequest = {
        origin: {
          address: 'Eppendorf',
          coordinates: { lat: 53.5930, lng: 9.9767 }
        },
        destination: {
          address: 'Altona',
          coordinates: { lat: 53.5503, lng: 9.9345 }
        },
        preferences: {
          co2Optimized: false,
          maxWalkingDistance: 800,
          preferredModes: ['public_transport', 'bike', 'scooter', 'walk']
        }
      };

      const response = await request(app)
        .post('/api/routes/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(multiModalRequest)
        .expect(200);

      const routes = response.body.routes;
      const multiModalRoutes = routes.filter(route => 
        route.segments.some(segment => 
          segment.mode !== 'walk' && segment.mode !== 'public_transport'
        )
      );

      expect(multiModalRoutes.length).toBeGreaterThan(0);
    });

    it('should reject route planning without authentication', async () => {
      const routeRequest = {
        origin: {
          address: 'Hamburg Hauptbahnhof',
          coordinates: { lat: 53.5511, lng: 9.9937 }
        },
        destination: {
          address: 'Hamburg Airport',
          coordinates: { lat: 53.6304, lng: 9.9882 }
        }
      };

      const response = await request(app)
        .post('/api/routes/plan')
        .send(routeRequest)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('token');
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        origin: {
          address: 'Hamburg Hauptbahnhof'
          // Missing coordinates
        }
        // Missing destination
      };

      const response = await request(app)
        .post('/api/routes/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid coordinates', async () => {
      const invalidRequest = {
        origin: {
          address: 'Hamburg Hauptbahnhof',
          coordinates: { lat: 'invalid', lng: 9.9937 }
        },
        destination: {
          address: 'Hamburg Airport',
          coordinates: { lat: 53.6304, lng: 9.9882 }
        }
      };

      const response = await request(app)
        .post('/api/routes/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/routes/history', () => {
    let savedRouteId;

    beforeAll(async () => {
      // Create a saved route for testing
      const saveResponse = await request(app)
        .post('/api/routes/save')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          origin: {
            address: 'Test Origin',
            coordinates: { lat: 53.5511, lng: 9.9937 }
          },
          destination: {
            address: 'Test Destination',
            coordinates: { lat: 53.6304, lng: 9.9882 }
          },
          segments: [
            {
              mode: 'walk',
              duration: 300,
              distance: 250,
              co2Emission: 0
            },
            {
              mode: 'public_transport',
              duration: 1200,
              distance: 15000,
              co2Emission: 0.5,
              lineNumber: 'S1',
              carrier: 'HVV'
            }
          ],
          totalDuration: 1500,
          totalDistance: 15250,
          totalCo2Emission: 0.5,
          price: 3.20
        });

      savedRouteId = saveResponse.body.route.id;
    });

    it('should get user route history', async () => {
      const response = await request(app)
        .get('/api/routes/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('routes');
      expect(Array.isArray(response.body.routes)).toBe(true);
      expect(response.body.routes.length).toBeGreaterThan(0);

      const routes = response.body.routes;
      expect(routes[0]).toHaveProperty('id');
      expect(routes[0]).toHaveProperty('origin');
      expect(routes[0]).toHaveProperty('destination');
      expect(routes[0]).toHaveProperty('createdAt');
    });

    it('should support pagination in route history', async () => {
      const response = await request(app)
        .get('/api/routes/history?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('routes');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 5);
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');
    });

    it('should reject route history access without authentication', async () => {
      const response = await request(app)
        .get('/api/routes/history')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/routes/save', () => {
    it('should save a route successfully', async () => {
      const routeToSave = {
        origin: {
          address: 'Home',
          coordinates: { lat: 53.5511, lng: 9.9937 }
        },
        destination: {
          address: 'Work',
          coordinates: { lat: 53.6304, lng: 9.9882 }
        },
        segments: [
          {
            mode: 'bike',
            duration: 900,
            distance: 5000,
            co2Emission: 0
          }
        ],
        totalDuration: 900,
        totalDistance: 5000,
        totalCo2Emission: 0,
        price: 0,
        name: 'Daily Commute'
      };

      const response = await request(app)
        .post('/api/routes/save')
        .set('Authorization', `Bearer ${authToken}`)
        .send(routeToSave)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Route saved successfully');
      expect(response.body).toHaveProperty('route');
      expect(response.body.route.name).toBe('Daily Commute');
      expect(response.body.route.origin.address).toBe('Home');
      expect(response.body.route.destination.address).toBe('Work');
    });

    it('should validate route data before saving', async () => {
      const invalidRoute = {
        origin: {
          address: 'Home'
          // Missing coordinates
        },
        destination: {
          address: 'Work'
          // Missing coordinates
        }
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/routes/save')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRoute)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/routes/:id', () => {
    it('should update a saved route', async () => {
      // First, save a route to update
      const saveResponse = await request(app)
        .post('/api/routes/save')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          origin: {
            address: 'Original Origin',
            coordinates: { lat: 53.5511, lng: 9.9937 }
          },
          destination: {
            address: 'Original Destination',
            coordinates: { lat: 53.6304, lng: 9.9882 }
          },
          segments: [],
          totalDuration: 600,
          totalDistance: 1000,
          totalCo2Emission: 0.1,
          price: 2.50,
          name: 'Original Name'
        });

      const routeId = saveResponse.body.route.id;

      // Update the route
      const updateResponse = await request(app)
        .put(`/api/routes/${routeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          origin: {
            address: 'Updated Origin',
            coordinates: { lat: 53.5511, lng: 9.9937 }
          }
        })
        .expect(200);

      expect(updateResponse.body).toHaveProperty('message', 'Route updated successfully');
      expect(updateResponse.body.route.name).toBe('Updated Name');
    });

    it('should reject updating non-existent route', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .put(`/api/routes/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('DELETE /api/routes/:id', () => {
    it('should delete a saved route', async () => {
      // First, save a route to delete
      const saveResponse = await request(app)
        .post('/api/routes/save')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          origin: {
            address: 'To Delete',
            coordinates: { lat: 53.5511, lng: 9.9937 }
          },
          destination: {
            address: 'Destination',
            coordinates: { lat: 53.6304, lng: 9.9882 }
          },
          segments: [],
          totalDuration: 600,
          totalDistance: 1000,
          totalCo2Emission: 0.1,
          price: 2.50
        });

      const routeId = saveResponse.body.route.id;

      // Delete the route
      const deleteResponse = await request(app)
        .delete(`/api/routes/${routeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body).toHaveProperty('message', 'Route deleted successfully');

      // Verify route is deleted
      await request(app)
        .get(`/api/routes/${routeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /api/routes/favorites', () => {
    it('should get user favorite routes', async () => {
      const response = await request(app)
        .get('/api/routes/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('routes');
      expect(Array.isArray(response.body.routes)).toBe(true);
    });
  });

  describe('CO2 Emission Calculations', () => {
    it('should provide accurate CO2 emission data', async () => {
      const routeRequest = {
        origin: {
          address: 'Hamburg Hauptbahnhof',
          coordinates: { lat: 53.5511, lng: 9.9937 }
        },
        destination: {
          address: 'Hamburg Airport',
          coordinates: { lat: 53.6304, lng: 9.9882 }
        },
        preferences: {
          co2Optimized: true,
          preferredModes: ['public_transport', 'walk', 'bike']
        }
      };

      const response = await request(app)
        .post('/api/routes/plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(routeRequest)
        .expect(200);

      const routes = response.body.routes;
      routes.forEach(route => {
        expect(route.totalCo2Emission).toBeDefined();
        expect(typeof route.totalCo2Emission).toBe('number');
        expect(route.totalCo2Emission).toBeGreaterThanOrEqual(0);

        route.segments.forEach(segment => {
          expect(segment.co2Emission).toBeDefined();
          expect(typeof segment.co2Emission).toBe('number');
          expect(segment.co2Emission).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });
});