# Makefile for Project Camp Backend Docker Operations

.PHONY: help build up down restart logs clean dev prod backup restore health test

# Default target
help:
	@echo "🐳 Project Camp Backend - Docker Commands"
	@echo ""
	@echo "Production Commands:"
	@echo "  make build          - Build production images"
	@echo "  make up             - Start production services"
	@echo "  make down           - Stop production services"
	@echo "  make restart        - Restart production services"
	@echo "  make logs           - View production logs"
	@echo ""
	@echo "Development Commands:"
	@echo "  make dev            - Start development environment (with hot reload)"
	@echo "  make dev-down       - Stop development environment"
	@echo "  make dev-logs       - View development logs"
	@echo ""
	@echo "Database Commands:"
	@echo "  make db-shell       - Access MongoDB shell"
	@echo "  make db-ui          - Start Mongo Express (UI)"
	@echo "  make backup         - Backup database and files"
	@echo "  make restore        - Restore from backup"
	@echo ""
	@echo "Maintenance Commands:"
	@echo "  make clean          - Remove containers and volumes"
	@echo "  make clean-all      - Remove everything (including images)"
	@echo "  make health         - Check service health"
	@echo "  make stats          - Show resource usage"
	@echo ""
	@echo "Setup Commands:"
	@echo "  make setup          - Initial setup (create .env)"
	@echo "  make generate-secrets - Generate JWT secrets"
	@echo ""

# Production Commands
build:
	@echo "🔨 Building production images..."
	docker-compose build --no-cache

up:
	@echo "🚀 Starting production services..."
	docker-compose up -d
	@echo "✅ Services started!"
	@echo "Backend: http://localhost:3000"
	@echo "Health: http://localhost:3000/api/v1/healthcheck"

down:
	@echo "🛑 Stopping production services..."
	docker-compose down

restart:
	@echo "🔄 Restarting production services..."
	docker-compose restart

logs:
	@echo "📋 Viewing production logs..."
	docker-compose logs -f backend

# Development Commands
dev:
	@echo "🚀 Starting development environment..."
	docker-compose -f docker-compose.dev.yml up
	@echo "✅ Development environment started!"
	@echo "Backend: http://localhost:3000"
	@echo "Mongo Express: http://localhost:8081"

dev-down:
	@echo "🛑 Stopping development environment..."
	docker-compose -f docker-compose.dev.yml down

dev-logs:
	@echo "📋 Viewing development logs..."
	docker-compose -f docker-compose.dev.yml logs -f backend

dev-build:
	@echo "🔨 Building development images..."
	docker-compose -f docker-compose.dev.yml build --no-cache

# Database Commands
db-shell:
	@echo "🗄️  Accessing MongoDB shell..."
	docker-compose exec mongodb mongosh -u admin -p $${MONGO_ROOT_PASSWORD:-securepassword}

db-ui:
	@echo "🌐 Starting Mongo Express UI..."
	docker-compose --profile tools up -d mongo-express
	@echo "✅ Mongo Express available at: http://localhost:8081"
	@echo "Credentials: admin / admin123"

backup:
	@echo "💾 Creating backup..."
	@mkdir -p backups/$$(date +%Y%m%d_%H%M%S)
	@BACKUP_DIR=backups/$$(date +%Y%m%d_%H%M%S) && \
	docker-compose exec -T mongodb mongodump --archive > $$BACKUP_DIR/mongodb.archive && \
	docker run --rm -v projectcamp-uploads:/data -v $(PWD)/$$BACKUP_DIR:/backup alpine tar czf /backup/uploads.tar.gz -C /data . && \
	cp .env $$BACKUP_DIR/.env.backup 2>/dev/null || true && \
	echo "✅ Backup completed: $$BACKUP_DIR"

restore:
	@read -p "Enter backup directory (e.g., backups/20231010_120000): " backup_dir; \
	echo "🔄 Restoring from $$backup_dir..."; \
	docker-compose exec -T mongodb mongorestore --archive < $$backup_dir/mongodb.archive && \
	docker run --rm -v projectcamp-uploads:/data -v $(PWD)/$$backup_dir:/backup alpine tar xzf /backup/uploads.tar.gz -C /data && \
	echo "✅ Restore completed from: $$backup_dir"

# Maintenance Commands
clean:
	@echo "🧹 Cleaning up containers and volumes..."
	docker-compose down -v
	@echo "✅ Cleanup completed!"

clean-all:
	@echo "⚠️  This will remove all containers, volumes, and images!"
	@read -p "Are you sure? (y/N): " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		docker-compose down -v --rmi all; \
		docker system prune -a --volumes -f; \
		echo "✅ Complete cleanup done!"; \
	else \
		echo "❌ Cleanup cancelled."; \
	fi

health:
	@echo "🏥 Checking service health..."
	@docker-compose ps
	@echo ""
	@echo "Testing health endpoint..."
	@curl -s http://localhost:3000/api/v1/healthcheck | grep -q "Server is running" && \
		echo "✅ Backend is healthy!" || \
		echo "❌ Backend is not responding!"

stats:
	@echo "📊 Resource usage:"
	@docker stats --no-stream

# Setup Commands
setup:
	@echo "⚙️  Setting up environment..."
	@if [ ! -f .env ]; then \
		cp env.example .env; \
		echo "✅ Created .env file from env.example"; \
		echo "⚠️  Please edit .env and add your secrets!"; \
		echo "Run 'make generate-secrets' to generate JWT secrets."; \
	else \
		echo "ℹ️  .env file already exists"; \
	fi

generate-secrets:
	@echo "🔑 Generating JWT secrets..."
	@echo ""
	@echo "ACCESS_TOKEN_SECRET:"
	@node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
	@echo ""
	@echo "REFRESH_TOKEN_SECRET:"
	@node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
	@echo ""
	@echo "Copy these values to your .env file!"

# Testing Commands
test:
	@echo "🧪 Running health checks..."
	@curl -f http://localhost:3000/api/v1/healthcheck || (echo "❌ Backend not responding"; exit 1)
	@echo "✅ All tests passed!"

# Advanced Commands
shell:
	@echo "🐚 Opening shell in backend container..."
	docker-compose exec backend sh

shell-mongo:
	@echo "🐚 Opening shell in MongoDB container..."
	docker-compose exec mongodb sh

rebuild:
	@echo "🔨 Rebuilding and restarting..."
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d
	@echo "✅ Rebuild completed!"

prod:
	@echo "🚀 Starting production deployment..."
	@if [ ! -f .env ]; then \
		echo "❌ .env file not found! Run 'make setup' first."; \
		exit 1; \
	fi
	docker-compose build --no-cache
	docker-compose up -d
	@echo "✅ Production deployment complete!"
	@echo "Backend: http://localhost:3000"
	@make health

