import pytest
from rest_framework.test import APIClient
from core.models import User, Company

@pytest.fixture
def company(db):
    return Company.objects.create(name='Test Company', currency='USD', country='US')

@pytest.fixture
def user(db, company):
    user = User.objects.create_user(
        email='test@example.com', username='testuser', password='TestPass123!',
        first_name='Test', last_name='User', company=company, is_company_admin=True
    )
    return user

@pytest.fixture
def api_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client

@pytest.fixture
def anon_client():
    return APIClient()
