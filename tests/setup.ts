import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods for cleaner test output
global.console = {
  ...console,
  // Uncomment to ignore console.log in tests
  // log: jest.fn(),
  // Uncomment to ignore console.warn in tests
  // warn: jest.fn(),
  // Uncomment to ignore console.error in tests
  // error: jest.fn(),
};

// Setup global test database connection
beforeAll(async () => {
  // Any global test setup can go here
  console.log('🧪 Test suite started');
});

// Cleanup after all tests
afterAll(async () => {
  // Any global test cleanup can go here
  console.log('✅ Test suite completed');
});

// Mock external APIs if needed
jest.mock('axios');

// Mock Redis if needed
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

// Export test utilities
export const testUtils = {
  generateTestUser: () => ({
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
    phone: '+491234567890',
  }),
  
  generateTestRoute: () => ({
    origin: 'Hamburg Hauptbahnhof',
    destination: 'Hamburg Airport',
    preferences: {
      co2Optimized: true,
      maxWalkingDistance: 1000,
      preferredModes: ['public_transport', 'bike', 'walk'],
    },
  }),
  
  createMockRequest: (overrides = {}) => ({
    body: {},
    params: {},
    query: {},
    headers: {},
    user: null,
    ...overrides,
  }),
  
  createMockResponse: () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.cookie = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  },
};