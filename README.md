# HVV Mobility Platform

Sustainable mobility platform for Hamburg combining ÖPNV, e-scooters, and ride-sharing with CO₂ optimization.

## Project Structure

```
my-first-project/
├── src/
│   ├── controllers/         # Request handlers
│   ├── services/           # Business logic
│   ├── models/             # Data models
│   ├── middleware/         # Express middleware
│   ├── routes/             # API routes
│   ├── utils/              # Utility functions
│   ├── config/             # Configuration
│   └── types/              # TypeScript types
├── database/               # Database schemas and migrations
├── tests/                  # Test files
├── docker/                 # Docker configurations
├── k8s/                    # Kubernetes manifests
└── scripts/                # Utility scripts
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis
- Docker (optional)

### Installation

```bash
npm install
```

### Environment Setup

Copy `.env.example` to `.env` and configure your environment variables.

### Database Setup

```bash
npm run db:migrate
npm run db:seed
```

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## API Documentation

The API documentation will be available at `http://localhost:3000/api-docs` when running the development server.

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```