FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    gettext \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/staticfiles /app/media /app/ml_models /app/logs

EXPOSE 8000

CMD sh -c "python manage.py makemigrations core finance analytics crm hr inventory sales manufacturing supply_chain project_mgmt marketing ecommerce ai_engine --noinput && python manage.py migrate --noinput && python manage.py collectstatic --noinput && echo \"from core.models import User; User.objects.filter(email='admin@apexerp.com').exists() or User.objects.create_superuser(email='admin@apexerp.com', username='admin', password='ApexERP2024!', first_name='Admin', last_name='User')\" | python manage.py shell && daphne -b 0.0.0.0 -p \${PORT:-8000} apex_erp.asgi:application"
