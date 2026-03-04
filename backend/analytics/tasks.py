from celery import shared_task
import logging

logger = logging.getLogger('apex_erp')

@shared_task
def process_data_export(export_id):
    from .models import DataExport
    export = DataExport.objects.get(id=export_id)
    export.status = 'processing'
    export.save()
    try:
        # Data export logic
        export.status = 'completed'
        export.save()
        logger.info(f'Export {export.name} completed')
    except Exception as e:
        export.status = 'failed'
        export.save()
        logger.error(f'Export failed: {e}')

@shared_task
def refresh_kpis(company_id):
    from .models import KPI
    from django.utils import timezone
    kpis = KPI.objects.filter(company_id=company_id)
    for kpi in kpis:
        kpi.last_calculated = timezone.now()
        kpi.save()
    logger.info(f'Refreshed {kpis.count()} KPIs for company {company_id}')
