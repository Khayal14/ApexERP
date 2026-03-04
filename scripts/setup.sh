#!/bin/bash
set -e

echo "====================================="
echo "  ApexERP - One-Click Setup Script"
echo "====================================="

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || command -v docker compose >/dev/null 2>&1 || { echo "Docker Compose is required. Aborting."; exit 1; }

# Generate secrets if .env doesn't have them
if grep -q "your-secret-key-change-in-production" .env 2>/dev/null; then
  echo ">> Generating secure keys..."
  SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(50))" 2>/dev/null || openssl rand -base64 50)
  JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || openssl rand -base64 32)
  ENCRYPTION_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))" 2>/dev/null || openssl rand -base64 32)
  sed -i "s|your-secret-key-change-in-production-min-50-chars-long-random|${SECRET_KEY}|g" .env
  sed -i "s|your-jwt-secret-key-change-in-production|${JWT_SECRET}|g" .env
  sed -i "s|your-encryption-key-change-in-production|${ENCRYPTION_KEY}|g" .env
fi

echo ">> Building and starting containers..."
docker compose up -d --build

echo ">> Waiting for services to be ready..."
sleep 10

echo ">> Running database migrations..."
docker compose exec -T backend python manage.py migrate --noinput

echo ">> Creating superuser..."
docker compose exec -T backend python manage.py shell -c "
from core.models import User, Company
company, _ = Company.objects.get_or_create(name='ApexERP Demo', defaults={'currency': 'USD', 'country': 'US', 'email': 'info@apexerp.com'})
if not User.objects.filter(email='admin@apexerp.com').exists():
    user = User.objects.create_superuser(email='admin@apexerp.com', username='admin', password='ApexERP2024!', first_name='Admin', last_name='User')
    user.company = company
    user.is_company_admin = True
    user.save()
    print('Superuser created: admin@apexerp.com / ApexERP2024!')
else:
    print('Superuser already exists')
"

echo ">> Collecting static files..."
docker compose exec -T backend python manage.py collectstatic --noinput

echo ""
echo "====================================="
echo "  ApexERP Setup Complete!"
echo "====================================="
echo ""
echo "  Frontend:   http://localhost:3000"
echo "  Backend:    http://localhost:8000"
echo "  Admin:      http://localhost:8000/admin/"
echo "  API Docs:   http://localhost:8000/api/"
echo "  Prometheus: http://localhost:9090"
echo "  Grafana:    http://localhost:3001"
echo ""
echo "  Login: admin@apexerp.com / ApexERP2024!"
echo ""
