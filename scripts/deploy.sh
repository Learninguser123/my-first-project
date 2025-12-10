#!/bin/bash

# HVV Mobility Platform Deployment Script
# This script handles the deployment of the HVV mobility platform to different environments

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"ghcr.io/hvv-mobility"}
IMAGE_NAME="hvv-mobility"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    local dependencies=("docker" "kubectl" "helm")
    local missing_deps=()
    
    for dep in "${dependencies[@]}"; do
        if ! command -v $dep &> /dev/null; then
            missing_deps+=($dep)
        fi
    done
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "Missing dependencies: ${missing_deps[*]}"
        log_error "Please install the missing dependencies and try again."
        exit 1
    fi
    
    log_success "All dependencies are installed"
}

# Function to validate environment
validate_environment() {
    log_info "Validating environment: $ENVIRONMENT"
    
    case $ENVIRONMENT in
        staging|production)
            log_success "Environment $ENVIRONMENT is valid"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            log_error "Valid environments are: staging, production"
            exit 1
            ;;
    esac
}

# Function to build Docker image
build_image() {
    log_info "Building Docker image for environment: $ENVIRONMENT"
    
    cd "$PROJECT_ROOT"
    
    local image_tag="${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}"
    
    # Build the image
    docker build \
        --target runner \
        --tag "$image_tag" \
        --build-arg NODE_ENV="$ENVIRONMENT" \
        .
    
    log_success "Docker image built successfully: $image_tag"
}

# Function to push Docker image
push_image() {
    log_info "Pushing Docker image to registry..."
    
    local image_tag="${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}"
    
    # Push the image
    docker push "$image_tag"
    
    log_success "Docker image pushed successfully: $image_tag"
}

# Function to deploy to Kubernetes
deploy_kubernetes() {
    log_info "Deploying to Kubernetes cluster..."
    
    cd "$PROJECT_ROOT"
    
    # Set namespace
    local namespace="hvv-$ENVIRONMENT"
    
    # Create namespace if it doesn't exist
    kubectl create namespace "$namespace" --dry-run=client -o yaml | kubectl apply -f -
    
    # Set current context to use the namespace
    kubectl config set-context --current --namespace="$namespace"
    
    # Update image in deployment files
    sed -i.bak "s|image: .*hvv-mobility.*|image: ${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}|g" k8s/deployment.yml
    
    # Apply secrets
    if [ -f "k8s/secrets/${ENVIRONMENT}-secrets.yml" ]; then
        kubectl apply -f "k8s/secrets/${ENVIRONMENT}-secrets.yml"
        log_info "Applied secrets for $ENVIRONMENT environment"
    else
        log_warning "No secrets file found for $ENVIRONMENT environment"
    fi
    
    # Apply ConfigMaps
    if [ -f "k8s/configmaps/${ENVIRONMENT}-configmap.yml" ]; then
        kubectl apply -f "k8s/configmaps/${ENVIRONMENT}-configmap.yml"
        log_info "Applied configmaps for $ENVIRONMENT environment"
    fi
    
    # Apply main Kubernetes manifests
    kubectl apply -f k8s/
    
    # Wait for deployment to be ready
    log_info "Waiting for deployment to be ready..."
    kubectl rollout status deployment/hvv-mobility --timeout=300s
    
    # Restore original deployment file
    mv k8s/deployment.yml.bak k8s/deployment.yml
    
    log_success "Kubernetes deployment completed successfully"
}

# Function to run database migrations
run_migrations() {
    log_info "Running database migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Create temporary migration pod
    kubectl run migration-job \
        --image="${DOCKER_REGISTRY}/${IMAGE_NAME}:${VERSION}" \
        --restart=Never \
        --env="NODE_ENV=$ENVIRONMENT" \
        --command -- \
        npm run db:migrate
    
    # Wait for migration job to complete
    kubectl wait --for=condition=complete job/migration-job --timeout=300s
    
    # Get migration logs
    kubectl logs job/migration-job
    
    # Clean up migration job
    kubectl delete job migration-job
    
    log_success "Database migrations completed successfully"
}

# Function to run health checks
health_check() {
    log_info "Running health checks..."
    
    local namespace="hvv-$ENVIRONMENT"
    local service_url
    
    # Get service URL based on environment
    if [ "$ENVIRONMENT" = "production" ]; then
        service_url="https://api.hvv-mobility.de"
    else
        service_url="https://staging-api.hvv-mobility.de"
    fi
    
    # Wait for service to be ready
    sleep 30
    
    # Health check endpoint
    local health_check_url="${service_url}/health"
    
    local attempt=1
    local max_attempts=10
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$health_check_url" > /dev/null; then
            log_success "Health check passed"
            return 0
        else
            log_warning "Health check failed (attempt $attempt/$max_attempts)"
            sleep 10
            ((attempt++))
        fi
    done
    
    log_error "Health check failed after $max_attempts attempts"
    return 1
}

# Function to notify monitoring systems
notify_monitoring() {
    log_info "Notifying monitoring systems..."
    
    # Send deployment event to monitoring systems
    if [ ! -z "$DATADOG_API_KEY" ]; then
        curl -X POST "https://api.datadoghq.com/api/v1/events" \
            -H "Content-Type: application/json" \
            -H "DD-API-KEY: $DATADOG_API_KEY" \
            -d "{
                \"title\": \"HVV Mobility Deployed\",
                \"text\": \"Version $VERSION deployed to $ENVIRONMENT environment\",
                \"tags\": [\"deploy\", \"$ENVIRONMENT\", \"version:$VERSION\"]
            }"
        log_info "Notified Datadog"
    fi
    
    # Send Slack notification
    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        local color="good"
        local message="🚀 HVV Mobility deployed successfully!"
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{
                \"text\": \"$message\",
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"fields\": [{
                        \"title\": \"Environment\",
                        \"value\": \"$ENVIRONMENT\",
                        \"short\": true
                    }, {
                        \"title\": \"Version\",
                        \"value\": \"$VERSION\",
                        \"short\": true
                    }, {
                        \"title\": \"Timestamp\",
                        \"value\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                        \"short\": true
                    }]
                }]
            }" \
            "$SLACK_WEBHOOK_URL"
        log_info "Notified Slack"
    fi
}

# Function to rollback deployment
rollback() {
    log_info "Rolling back deployment..."
    
    local namespace="hvv-$ENVIRONMENT"
    
    # Rollback deployment
    kubectl rollout undo deployment/hvv-mobility -n "$namespace"
    
    # Wait for rollback to complete
    kubectl rollout status deployment/hvv-mobility -n "$namespace" --timeout=300s
    
    log_success "Rollback completed successfully"
}

# Function to display deployment status
show_status() {
    log_info "Deployment status for $ENVIRONMENT environment:"
    
    local namespace="hvv-$ENVIRONMENT"
    
    echo
    echo "=== Pods ==="
    kubectl get pods -n "$namespace"
    
    echo
    echo "=== Services ==="
    kubectl get services -n "$namespace"
    
    echo
    echo "=== Ingress ==="
    kubectl get ingress -n "$namespace"
    
    echo
    echo "=== Deployment Status ==="
    kubectl rollout status deployment/hvv-mobility -n "$namespace"
}

# Main deployment function
main() {
    log_info "Starting HVV Mobility Platform deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Version: $VERSION"
    
    # Validate inputs
    validate_environment
    
    # Check dependencies
    check_dependencies
    
    # Build and push image
    build_image
    push_image
    
    # Deploy to Kubernetes
    deploy_kubernetes
    
    # Run database migrations
    run_migrations
    
    # Health check
    if health_check; then
        log_success "Deployment completed successfully!"
        
        # Notify monitoring systems
        notify_monitoring
        
        # Show status
        show_status
    else
        log_error "Deployment failed health check"
        
        # Rollback on failure
        if [ "$AUTO_ROLLBACK" = "true" ]; then
            log_info "Auto-rollback enabled, rolling back..."
            rollback
        fi
        
        exit 1
    fi
}

# Display usage
usage() {
    echo "Usage: $0 [ENVIRONMENT] [VERSION]"
    echo
    echo "ENVIRONMENT: staging (default) or production"
    echo "VERSION: Docker image tag (default: latest)"
    echo
    echo "Environment variables:"
    echo "  DOCKER_REGISTRY: Docker registry (default: ghcr.io/hvv-mobility)"
    echo "  DATADOG_API_KEY: Datadog API key for monitoring notifications"
    echo "  SLACK_WEBHOOK_URL: Slack webhook URL for deployment notifications"
    echo "  AUTO_ROLLBACK: Set to 'true' to automatically rollback on health check failure"
    echo
    echo "Examples:"
    echo "  $0 staging v1.0.0"
    echo "  $0 production latest"
    echo "  AUTO_ROLLBACK=true $0 staging v1.0.0"
}

# Check for help flag
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    usage
    exit 0
fi

# Run main function
main "$@"