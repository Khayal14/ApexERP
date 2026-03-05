import os
import dj_database_url
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent.parent / '.env')

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-me')
DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1,.railway.app').split(',')

CSRF_TRUSTED_ORIGINS = os.getenv('CSRF_TRUSTED_ORIGINS', 'https://*.railway.app').split(',')

# Application definition - Modular architecture
DJANGO_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

THIRD_PARTY_APPS = [
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'django_celery_beat',
    'channels',
    'auditlog',
    'django_prometheus',
    'import_export',
]

# Each module is a toggleable Django app
APEX_MODULES = {
    'core': True,
    'finance': True,
    'hr': True,
    'crm': True,
    'supply_chain': True,
    'inventory': True,
    'manufacturing': True,
    'sales': True,
    'project_mgmt': True,
    'marketing': True,
    'analytics': True,
    'ecommerce': True,
    'ai_engine': True,
}

LOCAL_APPS = [app for app, enabled in APEX_MODULES.items() if enabled]
INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'auditlog.middleware.AuditlogMiddleware',
    'core.middleware.CompanyMiddleware',
    'core.middleware.TimezoneMiddleware',
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]

ROOT_URLCONF = 'apex_erp.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'django.template.context_processors.i18n',
            ],
        },
    },
]

WSGI_APPLICATION = 'apex_erp.wsgi:application'
ASGI_APPLICATION = 'apex_erp.asgi:application'

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.getenv('DB_NAME', 'apexerp'),
        'USER': os.getenv('DB_USER', 'apexerp'),
        'PASSWORD': os.getenv('DB_PASSWORD', 'apexerp_secure_2024'),
        'HOST': os.getenv('DB_HOST', 'localhost'),
        'PORT': os.getenv('DB_PORT', '5432'),
        'OPTIONS': {
            'connect_timeout': 10,
        },
        'CONN_MAX_AGE': 600,
        'CONN_HEALTH_CHECKS': True,
    }
}
if os.environ.get('DATABASE_URL'):
    DATABASES['default'] = dj_database_url.config(default=os.environ['DATABASE_URL'])
# Cache
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'TIMEOUT': 300,
    }
}

SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'

# Channels
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [os.getenv('REDIS_URL', 'redis://localhost:6379/0')],
        },
    },
}

# Auth
AUTH_USER_MODEL = 'core.User'
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 10}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.ApexPagination',
    'PAGE_SIZE': 25,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
    },
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DATETIME_FORMAT': '%Y-%m-%dT%H:%M:%S%z',
    'EXCEPTION_HANDLER': 'core.exceptions.apex_exception_handler',
}

# JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME', '60'))),
    'REFRESH_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_REFRESH_TOKEN_LIFETIME', '1440'))),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'TOKEN_OBTAIN_SERIALIZER': 'core.serializers.ApexTokenObtainPairSerializer',
}

# CORS
CORS_ALLOWED_ORIGINS = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:3000').split(',')
CORS_ALLOW_CREDENTIALS = True

# Celery
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/1')
CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# i18n
LANGUAGE_CODE = 'en'
LANGUAGES = [
    ('en', 'English'),
    ('ar', 'العربية'),
]
LOCALE_PATHS = [BASE_DIR / 'locale']
USE_I18N = True
USE_L10N = True
TIME_ZONE = 'UTC'
USE_TZ = True

# Static & Media
STATIC_URL = '/static/'
STATIC_ROOT = os.getenv('STATIC_ROOT', BASE_DIR / 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
MEDIA_URL = '/media/'
MEDIA_ROOT = os.getenv('MEDIA_ROOT', BASE_DIR / 'media')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Security
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', 'change-me-in-production')

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {'class': 'logging.StreamHandler', 'formatter': 'verbose'},
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'apex_erp.log',
            'formatter': 'verbose',
        },
    },
    'root': {'handlers': ['console', 'file'], 'level': 'INFO'},
    'loggers': {
        'django': {'handlers': ['console'], 'level': 'WARNING', 'propagate': False},
        'apex_erp': {'handlers': ['console', 'file'], 'level': 'DEBUG', 'propagate': False},
    },
}

# Audit
AUDITLOG_INCLUDE_ALL_MODELS = True
