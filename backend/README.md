# ApexERP Backend

A powerful Django REST Framework backend for the ApexERP enterprise resource planning system.

## Technologies

- **Django 4.2** - Web framework
- **Django REST Framework** - REST API framework
- **PostgreSQL** - Primary database
- **Redis** - Caching & message queue
- **Celery** - Async task processing
- **JWT** - Authentication (djangorestframework-simplejwt)
- **Channels** - WebSocket support
- **django-cors-headers** - CORS handling

## Project Structure

```
backend/
├── apex_erp/                 # Project settings
│   ├── settings.py           # Main settings
│   ├── urls.py               # URL routing
│   ├── wsgi.py               # WSGI configuration
│   └── asgi.py               # ASGI configuration
│
├── core/                     # Core functionality
│   ├── models.py             # User, Company, Role, Notification
│   ├── serializers.py        # DRF serializers
│   ├── views.py              # API views
│   ├── urls.py               # Core URLs
│   ├── permissions.py        # Custom permissions
│   └── auth.py               # Authentication logic
│
├── finance/                  # Finance module
│   ├── models.py             # Invoice, Expense, COA models
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── signals.py
│
├── hr/                       # Human Resources
│   ├── models.py             # Employee, Department, Payroll
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
│
├── crm/                      # Customer Relationship Management
│   ├── models.py             # Contact, Deal, Pipeline
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── ai_scoring.py         # AI lead scoring
│
├── inventory/                # Inventory Management
│   ├── models.py             # Product, Stock, Warehouse
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
│
├── sales/                    # Sales module
│   ├── models.py             # Order, Quote, LineItem
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
│
├── projects/                 # Project Management
│   ├── models.py             # Project, Task, Milestone
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
│
├── manufacturing/            # Manufacturing
│   ├── models.py             # ProductionOrder, BOM, WorkCenter
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
│
├── marketing/                # Marketing module
│   ├── models.py             # Campaign, Email, Lead
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
│
├── analytics/                # Analytics & Reporting
│   ├── models.py             # Dashboard, Report, KPI
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── dashboards.py         # Dashboard logic
│
├── ecommerce/                # E-commerce
│   ├── models.py             # Store, Product, Order
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
│
├── common/                   # Common utilities
│   ├── models.py             # AuditLog, ActivityLog
│   ├── permissions.py        # RBAC permissions
│   ├── decorators.py         # Custom decorators
│   └── utils.py              # Helper functions
│
├── management/
│   └── commands/             # Custom management commands
│
├── migrations/               # Database migrations
├── tests/                    # Test suite
├── manage.py
├── requirements.txt          # Python dependencies
├── pytest.ini                # Pytest configuration
└── setup.cfg                 # Flake8 & test config
```

## Getting Started

### Installation

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
```

### Database Setup

```bash
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Load sample data (optional)
python manage.py loaddata fixtures/sample_data.json
```

### Running the Development Server

```bash
python manage.py runserver
```

Server will be available at http://localhost:8000

## Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/apexerp
DATABASE_PASSWORD=your-secure-password

# Django
SECRET_KEY=your-secret-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# JWT
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRATION_HOURS=24

# Redis
REDIS_URL=redis://localhost:6379/0

# Email
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_FROM=noreply@apexerp.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# AWS (optional)
USE_S3=False
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=apexerp-files

# Internationalization
LANGUAGE_CODE=en-us
TIME_ZONE=UTC

# Feature Flags
ENABLE_AI_FEATURES=True
ENABLE_WEBHOOKS=True
```

## API Endpoints

### Authentication
- `POST /api/auth/login/` - User login
- `POST /api/auth/refresh/` - Refresh JWT token
- `POST /api/auth/logout/` - User logout
- `POST /api/auth/password-reset/` - Reset password

### Core
- `GET /api/core/users/me/` - Get current user
- `GET /api/core/users/` - List users
- `POST /api/core/users/` - Create user
- `GET /api/core/companies/` - List companies
- `GET /api/core/notifications/` - Get notifications

### Finance
- `GET /api/finance/invoices/` - List invoices
- `POST /api/finance/invoices/` - Create invoice
- `GET /api/finance/invoices/{id}/` - Get invoice details
- `GET /api/finance/invoices/summary/` - Invoice summary
- `GET /api/finance/expenses/` - List expenses
- `GET /api/finance/accounts/` - Chart of accounts

### HR
- `GET /api/hr/employees/` - List employees
- `POST /api/hr/employees/` - Create employee
- `GET /api/hr/employees/dashboard/` - HR dashboard
- `GET /api/hr/departments/` - List departments
- `GET /api/hr/payroll/` - Payroll management

### CRM
- `GET /api/crm/contacts/` - List contacts
- `POST /api/crm/contacts/` - Create contact
- `GET /api/crm/contacts/dashboard/` - CRM dashboard
- `GET /api/crm/deals/` - List deals
- `GET /api/crm/deals/forecast/` - Sales forecast

### Inventory
- `GET /api/inventory/products/` - List products
- `POST /api/inventory/products/` - Create product
- `GET /api/inventory/stock/` - Stock levels
- `POST /api/inventory/adjustments/` - Stock adjustment

### Sales
- `GET /api/sales/orders/` - List orders
- `POST /api/sales/orders/` - Create order
- `GET /api/sales/quotes/` - List quotes
- `POST /api/sales/quotes/` - Create quote

### Projects
- `GET /api/projects/` - List projects
- `POST /api/projects/` - Create project
- `GET /api/projects/{id}/tasks/` - Project tasks
- `GET /api/projects/dashboard/` - Projects dashboard

### Analytics
- `GET /api/analytics/dashboards/executive/` - Executive dashboard
- `GET /api/analytics/reports/` - Available reports
- `POST /api/analytics/reports/` - Generate report

### Health Check
- `GET /api/health/` - API health status

## Authentication

The API uses JWT tokens:

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Response contains access and refresh tokens
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}

# Use access token in headers
curl -H "Authorization: Bearer ACCESS_TOKEN" \
  http://localhost:8000/api/core/users/me/
```

## Role-Based Access Control (RBAC)

Define permissions in views:

```python
from rest_framework.permissions import BasePermission
from django.contrib.auth.models import Permission

class IsFinanceManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.has_perm('finance.view_invoice')

class InvoiceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsFinanceManager]
```

## Database Models

### Core Models
- **User** - System users with authentication
- **Company** - Multi-tenancy support
- **Role** - User roles (Admin, Manager, Employee, etc.)
- **Permission** - Fine-grained permissions
- **Notification** - User notifications
- **AuditLog** - Activity tracking

### Finance Models
- **Invoice** - Sales/Purchase invoices
- **InvoiceLineItem** - Invoice line items
- **Expense** - Expense records
- **ChartOfAccount** - General ledger accounts
- **JournalEntry** - Journal entries
- **FiscalYear** - Fiscal year configuration

### HR Models
- **Employee** - Employee records
- **Department** - Organizational departments
- **Position** - Job positions
- **Salary** - Salary information
- **Attendance** - Attendance records
- **LeaveRequest** - Leave/time-off requests

### CRM Models
- **Contact** - Customer/vendor contacts
- **Company** (CRM) - Customer companies
- **Deal** - Sales opportunities
- **Pipeline** - Sales pipeline
- **PipelineStage** - Pipeline stages
- **Activity** - Contact activities

## Celery Tasks

Configure Celery for async processing:

```bash
# Start Celery worker
celery -A apex_erp worker -l info

# Start beat scheduler (for periodic tasks)
celery -A apex_erp beat -l info
```

Example task:

```python
from celery import shared_task

@shared_task
def send_invoice_email(invoice_id):
    invoice = Invoice.objects.get(id=invoice_id)
    # Send email logic
    return f"Invoice {invoice_id} email sent"
```

## Testing

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/backend/test_finance.py

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test class
pytest tests/backend/test_finance.py::TestInvoice

# Run with verbose output
pytest -v

# Run and stop on first failure
pytest -x
```

## Code Quality

```bash
# Run linting
flake8 .

# Format code
black .

# Check import sorting
isort .

# Run mypy type checking
mypy .
```

## Caching

Using Django's cache framework with Redis:

```python
from django.core.cache import cache

# Set cache
cache.set('key', value, timeout=300)

# Get cache
value = cache.get('key')

# Delete cache
cache.delete('key')

# Cache a view
from django.views.decorators.cache import cache_page

@cache_page(60)  # Cache for 60 seconds
def my_view(request):
    pass
```

## Logging

Configure logging in settings.py:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'debug.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}
```

## API Documentation

Access interactive API docs at:
- Swagger UI: http://localhost:8000/api/docs/
- ReDoc: http://localhost:8000/api/redoc/

Generate OpenAPI schema:
```bash
python manage.py spectacular --file schema.yaml
```

## Production Deployment

### Using Gunicorn

```bash
# Install
pip install gunicorn

# Run
gunicorn apex_erp.wsgi:application --workers 4 --bind 0.0.0.0:8000
```

### Using uWSGI

```bash
# Install
pip install uwsgi

# Run
uwsgi --http :8000 --wsgi-file apex_erp/wsgi.py --master --processes 4
```

### Environment Settings

For production, set:
```env
DEBUG=False
SECRET_KEY=use-a-long-random-secret-key
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
USE_HTTPS=True
CSRF_COOKIE_SECURE=True
SESSION_COOKIE_SECURE=True
```

## Troubleshooting

### Migration conflicts
```bash
python manage.py makemigrations --no-input
python manage.py migrate
```

### Database connection errors
```bash
python manage.py dbshell
# Test connection directly
```

### Static files not loading
```bash
python manage.py collectstatic --noinput
```

### Clear cache
```bash
python manage.py shell
>>> from django.core.cache import cache
>>> cache.clear()
```

## Performance Optimization

1. **Database Queries**
   - Use `select_related()` for ForeignKey
   - Use `prefetch_related()` for ManyToMany
   - Index frequently queried fields

2. **Caching**
   - Cache expensive queries
   - Use Redis for distributed caching
   - Implement cache warming

3. **API Response**
   - Use pagination
   - Limit fields with sparse fieldsets
   - Compress responses

4. **Async Processing**
   - Use Celery for long-running tasks
   - Offload email/file operations
   - Implement job queues

## Security Best Practices

1. Use HTTPS in production
2. Set secure cookie flags
3. Implement CSRF protection
4. Validate all inputs
5. Use parameterized queries
6. Keep dependencies updated
7. Implement rate limiting
8. Use environment variables for secrets
9. Enable audit logging
10. Regular security audits

## Contributing

Follow these guidelines:

1. Follow PEP 8 style guide
2. Write tests for new features
3. Document API endpoints
4. Use meaningful commit messages
5. Create feature branches

## Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Celery Documentation](https://docs.celeryproject.org/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Redis Docs](https://redis.io/docs/)

## License

MIT License - see LICENSE file for details
