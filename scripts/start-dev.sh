#!/bin/bash

# =============================================================================
# HVV Mobility Platform - Development Startup Script
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_NAME="HVV Mobility Platform"
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." &> /dev/null && pwd )"
SERVER_PORT=${PORT:-3000}

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${PURPLE}[INFO] $1${NC}"
}

header() {
    echo -e "${CYAN}"
    echo "=============================================================================="
    echo "$1"
    echo "=============================================================================="
    echo -e "${NC}"
}

# Show banner
show_banner() {
    header "$PROJECT_NAME - Development Environment"
    echo -e "${CYAN}🚀 Sustainable mobility platform for Hamburg${NC}"
    echo -e "${CYAN}🌍 Combining ÖPNV, e-scooters, and ride-sharing${NC}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed. Please install Node.js 18+"
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js version 18+ is required. Current version: $(node -v)"
    fi
    success "Node.js $(node -v) found"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
    fi
    success "npm $(npm -v) found"
    
    # Check PostgreSQL (optional for development)
    if command -v psql &> /dev/null; then
        success "PostgreSQL client found"
    else
        warning "PostgreSQL client not found. Database features may not work"
    fi
    
    # Check Redis (optional for development)
    if command -v redis-cli &> /dev/null; then
        success "Redis client found"
    else
        warning "Redis client not found. Caching features may not work"
    fi
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    # Check if .env file exists
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        if [ -f "$PROJECT_DIR/.env.example" ]; then
            log "Creating .env file from .env.example..."
            cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
            success ".env file created"
            warning "Please update the .env file with your actual configuration"
        else
            warning ".env.example file not found. Creating basic .env file..."
            cat > "$PROJECT_DIR/.env" << EOF
NODE_ENV=development
PORT=$SERVER_PORT
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hvv_mobility
DB_USER=postgres
DB_PASSWORD=your_password_here
JWT_SECRET=your_super_secret_jwt_key_here_change_in_production
JWT_SECRET_REFRESH=your_super_secret_refresh_key_here_change_in_production
EOF
            success "Basic .env file created"
        fi
    else
        success ".env file already exists"
    fi
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    cd "$PROJECT_DIR"
    
    # Check if node_modules exists and package.json is newer
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        log "Running npm install..."
        npm install
        success "Dependencies installed"
    else
        success "Dependencies already installed"
    fi
    
    # Check if mobile app dependencies exist
    if [ -d "mobile" ] && [ -f "mobile/package.json" ]; then
        cd mobile
        if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
            log "Installing mobile app dependencies..."
            npm install
            success "Mobile app dependencies installed"
        else
            success "Mobile app dependencies already installed"
        fi
        cd ..
    fi
}

# Setup database
setup_database() {
    log "Setting up database..."
    
    # Check if migration script exists
    if [ -f "$PROJECT_DIR/database/migration.sh" ]; then
        log "Running database migrations..."
        cd "$PROJECT_DIR"
        
        # Make migration script executable (if possible)
        chmod +x database/migration.sh 2>/dev/null || true
        
        # Run migrations
        if ./database/migration.sh migrate; then
            success "Database setup completed"
        else
            warning "Database setup failed. You may need to configure your database manually"
        fi
    else
        warning "Database migration script not found"
    fi
}

# Start backend server
start_backend() {
    log "Starting backend server..."
    
    cd "$PROJECT_DIR"
    
    # Check if the build directory exists
    if [ ! -d "dist" ]; then
        log "Building TypeScript..."
        npm run build
        success "TypeScript build completed"
    fi
    
    # Start the development server
    log "Starting development server on port $SERVER_PORT..."
    info "Backend API will be available at: http://localhost:$SERVER_PORT"
    info "Health check: http://localhost:$SERVER_PORT/health"
    info "API docs: http://localhost:$SERVER_PORT/api-docs"
    
    # Start in background and keep the script running
    npm run dev &
    BACKEND_PID=$!
    
    # Wait a moment for server to start
    sleep 3
    
    # Check if server is running
    if curl -s "http://localhost:$SERVER_PORT/health" > /dev/null 2>&1; then
        success "Backend server started successfully (PID: $BACKEND_PID)"
    else
        warning "Backend server may not have started properly"
    fi
    
    echo $BACKEND_PID > "$PROJECT_DIR/.backend.pid"
}

# Start mobile app (optional)
start_mobile() {
    if [ "$START_MOBILE" = "true" ] && [ -d "$PROJECT_DIR/mobile" ]; then
        log "Starting mobile development server..."
        cd "$PROJECT_DIR/mobile"
        
        # Check if Expo CLI is available
        if command -v npx expo &> /dev/null; then
            log "Starting Expo development server..."
            npx expo start --web &
            MOBILE_PID=$!
            echo $MOBILE_PID > "$PROJECT_DIR/.mobile.pid"
            success "Mobile development server started (PID: $MOBILE_PID)"
            info "Mobile app will be available at: http://localhost:19006"
        else
            warning "Expo CLI not found. Skipping mobile app startup"
        fi
        cd "$PROJECT_DIR"
    fi
}

# Show development URLs
show_urls() {
    echo ""
    header "Development URLs"
    echo -e "${GREEN}🌐 Backend API:${NC}       http://localhost:$SERVER_PORT"
    echo -e "${GREEN}💚 Health Check:${NC}       http://localhost:$SERVER_PORT/health"
    echo -e "${GREEN}📚 API Documentation:${NC}  http://localhost:$SERVER_PORT/api-docs"
    echo -e "${GREEN}📊 API Info:${NC}          http://localhost:$SERVER_PORT/api/v1"
    
    if [ "$START_MOBILE" = "true" ] && [ -d "$PROJECT_DIR/mobile" ]; then
        echo -e "${GREEN}📱 Mobile App:${NC}        http://localhost:19006"
    fi
    
    echo ""
    info "Press Ctrl+C to stop all services"
    echo ""
}

# Cleanup function
cleanup() {
    log "Shutting down services..."
    
    # Stop backend server
    if [ -f "$PROJECT_DIR/.backend.pid" ]; then
        BACKEND_PID=$(cat "$PROJECT_DIR/.backend.pid")
        if kill -0 "$BACKEND_PID" 2>/dev/null; then
            kill "$BACKEND_PID"
            success "Backend server stopped"
        fi
        rm "$PROJECT_DIR/.backend.pid"
    fi
    
    # Stop mobile server
    if [ -f "$PROJECT_DIR/.mobile.pid" ]; then
        MOBILE_PID=$(cat "$PROJECT_DIR/.mobile.pid")
        if kill -0 "$MOBILE_PID" 2>/dev/null; then
            kill "$MOBILE_PID"
            success "Mobile development server stopped"
        fi
        rm "$PROJECT_DIR/.mobile.pid"
    fi
    
    success "All services stopped"
    exit 0
}

# Show help
show_help() {
    echo "HVV Mobility Platform - Development Startup Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --mobile           Also start the mobile development server"
    echo "  --no-install       Skip dependency installation"
    echo "  --no-migrate       Skip database migration"
    echo "  --help, -h         Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  PORT               Backend server port (default: 3000)"
    echo "  START_MOBILE       Set to 'true' to start mobile server"
    echo ""
    echo "Examples:"
    echo "  $0                  # Start backend only"
    echo "  $0 --mobile         # Start backend and mobile"
    echo "  PORT=8080 $0        # Start backend on port 8080"
}

# Main execution
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --mobile)
                START_MOBILE=true
                shift
                ;;
            --no-install)
                SKIP_INSTALL=true
                shift
                ;;
            --no-migrate)
                SKIP_MIGRATE=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                error "Unknown option: $1. Use --help for usage information."
                ;;
        esac
    done
    
    # Set up signal handlers for graceful shutdown
    trap cleanup SIGINT SIGTERM
    
    # Show banner
    show_banner
    
    # Run setup steps
    check_prerequisites
    setup_environment
    
    if [ "$SKIP_INSTALL" != "true" ]; then
        install_dependencies
    fi
    
    if [ "$SKIP_MIGRATE" != "true" ]; then
        setup_database
    fi
    
    # Start services
    start_backend
    start_mobile
    
    # Show URLs
    show_urls
    
    # Keep script running
    log "All services started. Waiting for interrupt signal..."
    while true; do
        sleep 1
    done
}

# Execute main function with all arguments
main "$@"