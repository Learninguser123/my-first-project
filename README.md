# 🚀 HVV Mobility Platform

**Sustainable mobility platform for Hamburg combining ÖPNV, e-scooters, and ride-sharing with CO₂ optimization.**

## 🌟 Features

- **🚌 Multi-modal Transport**: Combines public transport (ÖPNV), e-scooters, bike sharing, and ride-sharing
- **🌱 CO₂ Optimization**: Calculates and displays environmental impact for each route
- **🏆 Rewards System**: Earn points for eco-friendly travel choices
- **📱 Mobile App**: React Native app for iOS and Android
- **🔒 Secure Authentication**: JWT-based authentication with refresh tokens
- **⚡ Real-time Data**: Integration with HVV API for live transport information
- **🎯 Smart Routing**: AI-powered route optimization based on preferences and CO₂ impact

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Web Frontend  │    │   Admin Panel   │
│   (React Native)│    │   (React)       │    │   (Dashboard)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │     Backend API           │
                    │   (Node.js + Express)     │
                    └─────────────┬─────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
    ┌─────┴─────┐        ┌───────┴───────┐      ┌───────┴───────┐
    │ PostgreSQL│        │     Redis     │      │External APIs │
    │ Database  │        │    Cache      │      │(HVV, Maps)   │
    └───────────┘        └───────────────┘      └───────────────┘
```

## 📁 Project Structure

```
my-first-project/
├── 📂 src/
│   ├── 📂 controllers/         # Request handlers
│   │   ├── AuthController.ts
│   │   ├── RouteController.ts
│   │   └── BookingController.ts
│   ├── 📂 services/           # Business logic
│   │   ├── AuthService.ts
│   │   ├── RouteService.ts
│   │   ├── CO2Service.ts
│   │   └── RewardsService.ts
│   ├── 📂 models/             # Data models
│   │   ├── User.ts
│   │   ├── Route.ts
│   │   └── Booking.ts
│   ├── 📂 middleware/         # Express middleware
│   │   ├── auth.ts
│   │   └── validation.ts
│   ├── 📂 routes/             # API routes
│   │   ├── auth.ts
│   │   ├── routes.ts
│   │   └── bookings.ts
│   ├── 📂 utils/              # Utility functions
│   │   └── logger.ts
│   ├── 📂 config/             # Configuration
│   │   ├── index.ts
│   │   ├── database.ts
│   │   └── redis.ts
│   ├── 📂 types/              # TypeScript types
│   │   └── index.ts
│   └── 📄 index.ts            # Main application file
├── 📂 mobile/                 # React Native mobile app
│   ├── 📂 components/         # Reusable components
│   ├── 📂 screens/            # App screens
│   ├── 📂 services/           # API services
│   └── 📂 navigation/         # Navigation configuration
├── 📂 database/               # Database schemas and migrations
│   ├── 001_initial_schema.sql
│   ├── 002_create_indexes.sql
│   ├── 003_seed_data.sql
│   ├── 004_create_routes_tables.sql
│   └── 📄 migration.sh        # Database migration script
├── 📂 tests/                  # Test files
│   ├── 📂 integration/        # Integration tests
│   └── 📄 setup.ts            # Test setup
├── 📂 docs/                   # Documentation
│   ├── API.md                 # API documentation
│   └── DEPLOYMENT.md          # Deployment guide
├── 📂 scripts/                # Utility scripts
│   ├── 📄 start-dev.sh        # Development startup script
│   └── 📄 deploy.sh           # Deployment script
├── 📂 k8s/                    # Kubernetes manifests
│   ├── deployment.yml
│   └── ingress.yml
├── 📄 docker-compose.yml      # Docker development setup
├── 📄 docker-compose.prod.yml # Docker production setup
├── 📄 Dockerfile              # Docker configuration
├── 📄 package.json            # Node.js dependencies
├── 📄 tsconfig.json           # TypeScript configuration
├── 📄 .env.example            # Environment variables template
└── 📄 README.md               # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **PostgreSQL** 14+ ([Download](https://postgresql.org/download/))
- **Redis** ([Download](https://redis.io/download))
- **Git** ([Download](https://git-scm.com/))

### Option 1: Automated Setup (Recommended)

**🎯 One-command setup for local development:**

```bash
# Clone the repository
git clone <repository-url>
cd my-first-project

# Run the development setup script
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh

# Or with mobile app:
./scripts/start-dev.sh --mobile
```

The script will automatically:
- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Setup environment variables
- ✅ Run database migrations
- ✅ Start the development server

### Option 2: Manual Setup

**1. Clone and install dependencies:**
```bash
git clone <repository-url>
cd my-first-project
npm install
```

**2. Setup environment:**
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env  # or use your preferred editor
```

**3. Setup database:**
```bash
# Make migration script executable
chmod +x database/migration.sh

# Run database migrations
./database/migration.sh migrate

# Or check migration status
./database/migration.sh status
```

**4. Start development server:**
```bash
# Start backend only
npm run dev

# Or build and start
npm run build
npm start
```

**5. (Optional) Start mobile app:**
```bash
cd mobile
npm install
npx expo start --web
```

## 🌐 Development URLs

Once running, access these URLs:

- **🌐 Backend API**: http://localhost:3000
- **💚 Health Check**: http://localhost:3000/health
- **📚 API Documentation**: http://localhost:3000/api-docs
- **📊 API Info**: http://localhost:3000/api/v1
- **📱 Mobile App**: http://localhost:19006 (if started with --mobile)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run integration tests
npm run test:integration

# Run tests in watch mode
npm run test:watch
```

## 📝 API Documentation

### Authentication Endpoints

```bash
# Register new user
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Doe"
}

# Login
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

# Refresh token
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your_refresh_token_here"
}
```

### Route Planning Endpoints

```bash
# Search routes
GET /api/v1/routes/search?from=53.5511,9.9937&to=53.5753,10.0153&preferences=eco

# Get route details
GET /api/v1/routes/:routeId

# Get saved routes
GET /api/v1/routes/saved
```

### Booking Endpoints

```bash
# Create booking
POST /api/v1/bookings
Authorization: Bearer <your_jwt_token>
Content-Type: application/json

{
  "routeId": "uuid-here",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T10:30:00Z",
  "passengers": 2
}

# Get user bookings
GET /api/v1/bookings
Authorization: Bearer <your_jwt_token>

# Get booking details
GET /api/v1/bookings/:bookingId
Authorization: Bearer <your_jwt_token>
```

## 🔧 Development Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build            # Build TypeScript to JavaScript
npm start                # Start production server

# Database
./database/migration.sh migrate    # Run migrations
./database/migration.sh status     # Check migration status
./database/migration.sh seed       # Seed initial data
./database/migration.sh reset      # Reset database (dangerous!)

# Testing
npm test                # Run tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage

# Code Quality
npm run lint            # Run ESLint
npm run lint:fix        # Fix linting issues
```

## 🐳 Docker Development

**Using Docker Compose (Recommended for isolated development):**

```bash
# Start all services (database, redis, backend)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start
docker-compose up --build
```

**Production Docker Setup:**

```bash
# Use production configuration
docker-compose -f docker-compose.prod.yml up -d
```

## 🚢 Deployment

### Production Deployment Options

**1. Traditional Server (VPS/Dedicated):**
```bash
# Build for production
npm run build

# Start production server
npm start

# Use PM2 for process management
npm install -g pm2
pm2 start ecosystem.config.js
```

**2. Docker Deployment:**
```bash
# Build Docker image
docker build -t hvv-mobility-platform .

# Run with Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

**3. Kubernetes Deployment:**
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/deployment.yml
kubectl apply -f k8s/ingress.yml
```

For detailed deployment instructions, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## 🔧 Configuration

### Environment Variables

Key environment variables to configure in `.env`:

```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hvv_mobility
DB_USER=postgres
DB_PASSWORD=your_password_here

# External APIs
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
HVV_API_KEY=your_hvv_api_key
HVV_API_SECRET=your_hvv_api_secret

# Security
JWT_SECRET=your_super_secret_jwt_key
SESSION_SECRET=your_session_secret
```

For complete configuration options, see [.env.example](.env.example).

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript and ESLint configurations
- Write tests for new features
- Update documentation
- Use conventional commit messages
- Keep PRs focused and atomic

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **📧 Email**: support@hvv-mobility.com
- **📖 Documentation**: [docs/API.md](docs/API.md)
- **🐛 Issues**: [GitHub Issues](https://github.com/your-repo/issues)

## 🙏 Acknowledgments

- **HVV (Hamburger Verkehrsverbund)** - Transport data and API integration
- **Google Maps Platform** - Mapping and geolocation services
- **OpenWeatherMap** - Weather data integration
- **React Native** - Mobile app framework
- **Express.js** - Backend framework

---

**🌍 Built with ❤️ for a sustainable Hamburg**