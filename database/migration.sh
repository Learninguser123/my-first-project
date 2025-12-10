#!/bin/bash

# =============================================================================
# HVV Mobility Platform - Database Migration Script
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configuration (can be overridden by environment variables)
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-hvv_mobility}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-}

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

# Check if PostgreSQL is running
check_postgres() {
    log "Checking PostgreSQL connection..."
    
    if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" >/dev/null 2>&1; then
        error "PostgreSQL is not running or not accessible at $DB_HOST:$DB_PORT"
    fi
    
    success "PostgreSQL is running"
}

# Create database if it doesn't exist
create_database() {
    log "Creating database '$DB_NAME' if it doesn't exist..."
    
    # Check if database exists
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
        warning "Database '$DB_NAME' already exists"
    else
        PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
        success "Database '$DB_NAME' created successfully"
    fi
}

# Run migration files
run_migrations() {
    log "Running database migrations..."
    
    # Get the directory of this script
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
    
    # Check if migration files exist
    if [ ! -d "$SCRIPT_DIR" ]; then
        error "Database directory not found: $SCRIPT_DIR"
    fi
    
    # Create migrations table to track executed migrations
    log "Creating migrations table..."
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    " || error "Failed to create migrations table"
    
    # Find and run migration files in order
    for migration_file in "$SCRIPT_DIR"/[0-9][0-9][0-9]_*.sql; do
        if [ -f "$migration_file" ]; then
            filename=$(basename "$migration_file")
            
            # Check if migration has already been executed
            if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM migrations WHERE filename = '$filename'" | grep -q "1"; then
                warning "Migration '$filename' already executed, skipping..."
                continue
            fi
            
            log "Executing migration: $filename"
            
            # Execute the migration
            if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file"; then
                # Record the migration as executed
                PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO migrations (filename) VALUES ('$filename');"
                success "Migration '$filename' executed successfully"
            else
                error "Failed to execute migration: $filename"
            fi
        fi
    done
}

# Seed initial data
seed_data() {
    log "Seeding initial data..."
    
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
    
    # Check if seed file exists
    if [ -f "$SCRIPT_DIR/003_seed_data.sql" ]; then
        # Check if data has already been seeded
        if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1 FROM migrations WHERE filename = '003_seed_data.sql'" | grep -q "1"; then
            warning "Seed data already applied, skipping..."
        else
            log "Executing seed data..."
            if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SCRIPT_DIR/003_seed_data.sql"; then
                # Record the seed as executed
                PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO migrations (filename) VALUES ('003_seed_data.sql');"
                success "Seed data applied successfully"
            else
                error "Failed to apply seed data"
            fi
        fi
    else
        warning "Seed data file not found: $SCRIPT_DIR/003_seed_data.sql"
    fi
}

# Show migration status
show_status() {
    log "Migration status:"
    
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            filename,
            executed_at::timestamp(0) as executed_at
        FROM migrations 
        ORDER BY executed_at;
    " 2>/dev/null || warning "Could not retrieve migration status"
}

# Reset database (dangerous!)
reset_database() {
    log "WARNING: This will delete all data in the database '$DB_NAME'"
    read -p "Are you sure you want to continue? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        log "Dropping database '$DB_NAME'..."
        PGPASSWORD="$DB_PASSWORD" dropdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" --if-exists "$DB_NAME"
        
        log "Creating fresh database..."
        PGPASSWORD="$DB_PASSWORD" createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
        
        run_migrations
        seed_data
        
        success "Database reset completed"
    else
        log "Database reset cancelled"
    fi
}

# Show help
show_help() {
    echo "HVV Mobility Platform - Database Migration Script"
    echo ""
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  migrate    Run database migrations (default)"
    echo "  status     Show migration status"
    echo "  seed       Seed initial data only"
    echo "  reset      Reset database (dangerous!)"
    echo "  help       Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DB_HOST    Database host (default: localhost)"
    echo "  DB_PORT    Database port (default: 5432)"
    echo "  DB_NAME    Database name (default: hvv_mobility)"
    echo "  DB_USER    Database user (default: postgres)"
    echo "  DB_PASSWORD Database password"
    echo ""
    echo "Examples:"
    echo "  $0                      # Run migrations"
    echo "  $0 migrate              # Run migrations"
    echo "  $0 status               # Show migration status"
    echo "  $0 seed                 # Seed data only"
    echo "  DB_NAME=test_db $0      # Use custom database name"
}

# Main execution
main() {
    local command=${1:-migrate}
    
    log "Starting database migration process..."
    log "Database: $DB_HOST:$DB_PORT/$DB_NAME"
    
    case $command in
        "migrate")
            check_postgres
            create_database
            run_migrations
            seed_data
            success "Migration process completed successfully!"
            ;;
        "status")
            check_postgres
            show_status
            ;;
        "seed")
            check_postgres
            seed_data
            success "Seeding completed successfully!"
            ;;
        "reset")
            check_postgres
            reset_database
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            error "Unknown command: $command. Use '$0 help' for usage information."
            ;;
    esac
}

# Execute main function with all arguments
main "$@"