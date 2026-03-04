import pytest
from hr.models import Department, Employee
from datetime import date

class TestDepartment:
    def test_create_department(self, api_client, company, user):
        response = api_client.post('/api/hr/departments/', {
            'name': 'Engineering', 'code': 'ENG',
        })
        assert response.status_code == 201

class TestEmployee:
    def test_create_employee(self, api_client, company, user):
        dept = Department.objects.create(
            name='Engineering', code='ENG', company=company,
            created_by=user, updated_by=user
        )
        response = api_client.post('/api/hr/employees/', {
            'employee_id': 'EMP-001', 'first_name': 'John', 'last_name': 'Doe',
            'email': 'john@example.com', 'department': str(dept.id),
            'hire_date': '2024-01-01',
        })
        assert response.status_code == 201

    def test_employee_dashboard(self, api_client, company, user):
        Employee.objects.create(
            employee_id='EMP-002', first_name='Jane', last_name='Smith',
            email='jane@example.com', hire_date=date(2024,1,1),
            company=company, created_by=user, updated_by=user,
        )
        response = api_client.get('/api/hr/employees/dashboard/')
        assert response.status_code == 200
