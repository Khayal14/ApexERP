import pytest
from finance.models import Currency, ChartOfAccount, Invoice, FiscalYear
from datetime import date

class TestCurrency:
    def test_list_currencies(self, api_client):
        Currency.objects.create(code='USD', name='US Dollar', symbol='$')
        response = api_client.get('/api/finance/currencies/')
        assert response.status_code == 200

class TestInvoice:
    def test_create_invoice(self, api_client, company, user):
        fy = FiscalYear.objects.create(
            name='FY2024', start_date=date(2024,1,1), end_date=date(2024,12,31),
            company=company, created_by=user, updated_by=user
        )
        response = api_client.post('/api/finance/invoices/', {
            'invoice_number': 'INV-001', 'invoice_type': 'sales',
            'customer_name': 'Test Customer', 'issue_date': '2024-01-15',
            'due_date': '2024-02-15', 'total': 1000,
        })
        assert response.status_code == 201

    def test_list_invoices(self, api_client):
        response = api_client.get('/api/finance/invoices/')
        assert response.status_code == 200

    def test_invoice_summary(self, api_client):
        response = api_client.get('/api/finance/invoices/summary/')
        assert response.status_code == 200

class TestExpense:
    def test_list_expenses(self, api_client):
        response = api_client.get('/api/finance/expenses/')
        assert response.status_code == 200
