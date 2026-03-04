from celery import shared_task
import logging

logger = logging.getLogger('apex_erp')

@shared_task
def process_payroll(period_id):
    from .models import PayrollPeriod, Payslip
    period = PayrollPeriod.objects.get(id=period_id)
    for payslip in period.payslips.filter(status='draft'):
        payslip.calculate()
        payslip.save()
    logger.info(f'Processed payroll for period {period.name}')

@shared_task
def send_birthday_notifications():
    from .models import Employee
    from django.utils import timezone
    today = timezone.now().date()
    birthdays = Employee.objects.filter(
        date_of_birth__month=today.month,
        date_of_birth__day=today.day,
        status='active'
    )
    for emp in birthdays:
        logger.info(f'Birthday notification for {emp.full_name}')

@shared_task
def calculate_ai_match_scores(recruitment_id):
    logger.info(f'Calculating AI match scores for recruitment {recruitment_id}')
    # AI matching logic would go here
