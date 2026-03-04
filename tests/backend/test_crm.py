import pytest
from crm.models import Contact, Pipeline, PipelineStage

class TestContact:
    def test_create_contact(self, api_client):
        response = api_client.post('/api/crm/contacts/', {
            'first_name': 'Lead', 'last_name': 'User',
            'email': 'lead@example.com', 'contact_type': 'lead',
        })
        assert response.status_code == 201

    def test_contact_dashboard(self, api_client):
        response = api_client.get('/api/crm/contacts/dashboard/')
        assert response.status_code == 200

class TestDeal:
    def test_deal_forecast(self, api_client):
        response = api_client.get('/api/crm/deals/forecast/')
        assert response.status_code == 200
