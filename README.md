# ApexERP - Enterprise Resource Planning System

ApexERP is a comprehensive, open-source Enterprise Resource Planning (ERP) system designed to streamline business operations with modules for Finance, HR, CRM, Inventory, Sales, Projects, Manufacturing, Marketing, Analytics, and E-commerce.

## Features

- **Multi-Module Architecture**: Finance, HR, CRM, Inventory, Sales, Projects, Manufacturing, Marketing, Analytics, E-commerce
- **Modern Tech Stack**: Django + React with TypeScript, TailwindCSS, and real-time updates
- **Internationalization**: Support for English and Arabic
- **Dark Mode**: Theme switching for improved UX
- **AI-Powered Features**: Lead scoring, demand forecasting, and intelligent routing
- **Advanced Analytics**: Executive dashboards, KPI tracking, and data visualization
- **Enterprise Security**: JWT authentication, role-based access control, audit trails
- **Scalable Architecture**: Microservices-ready with containerization
- **Mobile-Responsive**: Fully responsive design for desktop and tablet devices

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+ (included in Docker)

### One-Click Setup

```bash
cd ApexERP
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This will:
1. Build and start all Docker containers
2. Run database migrations
3. Create a superuser (admin@apexerp.com / ApexERP2024!)
4. Collect static files

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Admin Panel**: http://localhost:8000/admin/
- **API Documentation**: http://localhost:8000/api/docs/
- **Monitoring**:
  - Prometheus: http://localhost:9090
  - Grafana: http://localhost:3001

**Demo Login**: admin@apexerp.com / ApexERP2024!

## Project Structure

```
ApexERP/
├── frontend/                 # React application
│   ├── src/
│   │   ├── pages/           # Page components (Login, Dashboard, etc.)
│   │   ├── components/      # Reusable components
│   │   ├── contexts/        # React Context (Auth, Theme)
│   │   ├── api/             # API client configuration
│   │   ├── hooks/           # Custom React hooks
│   │   ├── utils/           # Utility functions
│   │   └── App.jsx          # Main app component
│   ├── public/
│   └── package.json
│
├── backend/                  # Django application
│   ├── apex_erp/            # Project settings
│   ├── core/                # Core functionality (Auth, Users)
│   ├── finance/             # Finance module
│   ├── hr/                  # Human Resources module
│   ├── crm/                 # Customer Relationship Management
│   ├── inventory/           # Inventory Management
│   ├── sales/               # Sales module
│   ├── projects/            # Project Management
│   ├── manufacturing/       # Manufacturing module
│   ├── marketing/           # Marketing module
│   ├── analytics/           # Analytics & Reporting
│   ├── ecommerce/           # E-commerce module
│   ├── manage.py
│   └── requirements.txt
│
├── tests/
│   └── backend/             # Backend test suite
│       ├── conftest.py      # Pytest fixtures
│       ├── test_core.py     # Core module tests
│       ├── test_finance.py  # Finance module tests
│       ├── test_hr.py       # HR module tests
│       └── test_crm.py      # CRM module tests
│
├── scripts/
│   └── setup.sh             # One-click setup script
│
├── docker-compose.yml       # Container orchestration
├── Dockerfile               # Backend container definition
├── frontend/Dockerfile      # Frontend container definition
└── README.md               # This file
```

## Modules

### Finance
- Invoice management (sales & purchase)
- Expense tracking
- Chart of Accounts (COA)
- Fiscal year management
- Financial reporting & reconciliation
- Payment processing
- Multi-currency support

### Human Resources
- Employee management
- Department & position tracking
- Attendance & time-off management
- Payroll processing
- Performance reviews
- Training & development tracking
- Org chart visualization

### CRM
- Contact & company management
- Sales pipeline management
- Deal tracking with AI lead scoring
- Activity logging
- Email integration
- Customer communication history
- Sales forecasting

### Inventory
- Product catalog management
- SKU & barcode management
- Stock level tracking
- Warehouse management
- Reorder automation
- Multi-location support
- Batch & serial number tracking

### Sales
- Sales order management
- Quote generation
- Order fulfillment tracking
- Commission calculation
- Sales analytics & KPIs
- Customer segmentation

### Projects
- Project planning & tracking
- Gantt chart visualization
- Resource allocation
- Time and cost tracking
- Milestone management
- Risk & issue management

### Manufacturing
- Production order management
- Bill of Materials (BOM)
- Work center management
- Quality control & inspection
- Production scheduling
- Waste tracking

### Marketing
- Campaign management
- Email marketing
- Social media integration
- Lead generation tracking
- Customer segmentation
- A/B testing support

### Analytics & Reporting
- Executive dashboards
- KPI tracking
- Custom report builder
- Data export (PDF, Excel, CSV)
- Real-time metrics
- Trend analysis

### E-commerce
- Online store management
- Product catalog sync
- Order management
- Payment gateway integration
- Shipping integration
- Customer reviews & ratings

## Technology Stack

### Frontend
- **React 18** - UI framework
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **react-i18next** - Internationalization
- **Axios** - HTTP client
- **React Hot Toast** - Toast notifications
- **Recharts** - Data visualization

### Backend
- **Django 4.2** - Web framework
- **Django REST Framework** - REST API
- **PostgreSQL** - Primary database
- **Redis** - Caching & message queue
- **Celery** - Async task processing
- **JWT** - Authentication
- **Django Cors Headers** - CORS support

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Orchestration
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization
- **Nginx** - Reverse proxy

## Running Tests

### Backend Tests

```bash
# Run all tests
cd backend
pytest

# Run specific module tests
pytest tests/backend/test_core.py
pytest tests/backend/test_finance.py
pytest tests/backend/test_hr.py
pytest tests/backend/test_crm.py

# Run with coverage
pytest --cov=. --cov-report=html
```

### Frontend Tests

```bash
cd frontend
npm test
npm run test:coverage
```

## Development

### Backend Development

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver

# Run Celery worker
celery -A apex_erp worker -l info
```

### Frontend Development

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm start

# Build for production
npm run build
```

## API Documentation

The API documentation is available at `/api/docs/` when the backend is running. Key endpoints include:

- `POST /api/auth/login/` - User login
- `POST /api/auth/refresh/` - Refresh JWT token
- `GET /api/core/users/me/` - Get current user
- `GET /api/finance/invoices/` - List invoices
- `GET /api/hr/employees/` - List employees
- `GET /api/crm/contacts/` - List contacts
- `GET /api/analytics/dashboards/executive/` - Executive dashboard

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL=postgresql://user:password@db:5432/apexerp
DATABASE_PASSWORD=your-secure-password

# Django
SECRET_KEY=your-secret-key-change-in-production-min-50-chars-long-random
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1

# JWT
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRATION_HOURS=24

# Redis
REDIS_URL=redis://redis:6379/0

# Email
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
EMAIL_FROM=noreply@apexerp.com

# AWS (optional)
USE_S3=False
AWS_STORAGE_BUCKET_NAME=apexerp-files

# Internationalization
LANGUAGE_CODE=en-us
TIME_ZONE=UTC
```

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Guidelines

- Follow PEP 8 for Python code
- Use TypeScript in React components where possible
- Write tests for new features
- Update documentation as needed
- Use meaningful commit messages

## Performance Optimization

ApexERP includes several performance optimizations:

- Database query optimization with select_related() and prefetch_related()
- Redis caching for frequently accessed data
- Pagination for large datasets
- Frontend code splitting and lazy loading
- Asset minification and compression
- CDN support for static assets

## Security

Security features include:

- HTTPS/TLS encryption
- CSRF protection
- SQL injection prevention (ORM)
- XSS protection
- Rate limiting on API endpoints
- JWT token-based authentication
- Role-based access control (RBAC)
- Audit logging for sensitive operations
- Password hashing with bcrypt
- Data encryption at rest (configurable)

## Troubleshooting

### Containers not starting
```bash
# Check logs
docker compose logs backend
docker compose logs frontend

# Restart services
docker compose restart
```

### Database migration issues
```bash
# Reset database
docker compose exec backend python manage.py reset_db
docker compose exec backend python manage.py migrate
```

### Port conflicts
Edit `docker-compose.yml` and change port mappings:
```yaml
services:
  backend:
    ports:
      - "8001:8000"  # Changed from 8000 to 8001
```

## Scaling

For production deployment:

1. **Database**: Use managed PostgreSQL service (AWS RDS, Google Cloud SQL)
2. **Cache**: Use managed Redis (AWS ElastiCache, Redis Cloud)
3. **Storage**: Use S3 or equivalent cloud storage
4. **CDN**: Configure Cloudfront or Cloudflare
5. **Containers**: Deploy on Kubernetes or Docker Swarm
6. **Monitoring**: Set up comprehensive logging and monitoring

## License

ApexERP is released under the MIT License. See LICENSE file for details.

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check documentation at https://apexerp.docs
- Contact support@apexerp.com

## Roadmap

- Mobile app (iOS/Android)
- Advanced AI features (demand forecasting, anomaly detection)
- Blockchain integration for supply chain
- Advanced BI capabilities with ML
- GraphQL API alongside REST
- Microservices migration
- Industry-specific templates

## Acknowledgments

ApexERP is built with contributions from the open-source community. We thank all contributors and users who help make ApexERP better.
