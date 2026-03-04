from celery import shared_task
from django.utils import timezone
import logging

logger = logging.getLogger('apex_erp')


@shared_task
def check_overdue_invoices():
    from .models import Invoice
    today = timezone.now().date()
    updated = Invoice.objects.filter(
        status__in=['sent', 'partial'],
        due_date__lt=today
    ).update(status='overdue')
    logger.info(f'Marked {updated} invoices as overdue')


@shared_task
def generate_financial_report(company_id, fiscal_year_id):
    from .models import ChartOfAccount, FiscalYear
    logger.info(f'Generating financial report for company {company_id}')
    # Report generation logic
    return {'status': 'completed'}


@shared_task
def sync_exchange_rates():
    logger.info('Syncing exchange rates')
    # Integration with exchange rate API
