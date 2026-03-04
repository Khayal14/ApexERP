import pytest
from django.urls import reverse
from core.models import User, Company, Role, Notification

class TestHealthCheck:
    def test_health_endpoint(self, anon_client):
        response = anon_client.get('/api/health/')
        assert response.status_code == 200
        assert response.data['version'] == '1.0.0'

class TestAuth:
    def test_login(self, anon_client, user):
        response = anon_client.post('/api/auth/login/', {'email': 'test@example.com', 'password': 'TestPass123!'})
        assert response.status_code == 200
        assert 'access' in response.data
        assert 'refresh' in response.data

    def test_login_invalid(self, anon_client):
        response = anon_client.post('/api/auth/login/', {'email': 'wrong@example.com', 'password': 'wrong'})
        assert response.status_code == 401

class TestUserAPI:
    def test_get_current_user(self, api_client, user):
        response = api_client.get('/api/core/users/me/')
        assert response.status_code == 200
        assert response.data['email'] == user.email

    def test_list_users(self, api_client):
        response = api_client.get('/api/core/users/')
        assert response.status_code == 200

class TestCompanyAPI:
    def test_list_companies(self, api_client):
        response = api_client.get('/api/core/companies/')
        assert response.status_code == 200

class TestNotifications:
    def test_list_notifications(self, api_client, user):
        Notification.objects.create(user=user, title='Test', message='Test notification')
        response = api_client.get('/api/core/notifications/')
        assert response.status_code == 200

    def test_mark_all_read(self, api_client, user):
        Notification.objects.create(user=user, title='Test', message='Test')
        response = api_client.post('/api/core/notifications/mark_all_read/')
        assert response.status_code == 200
