from celery import shared_task
import logging
from django.utils import timezone
from django.db.models import Q, Count

logger = logging.getLogger('apex_erp')


@shared_task
def check_maintenance_schedules(company_id):
    """Check maintenance schedules and send reminders for upcoming maintenance."""
    from .models import MaintenanceRecord, WorkCenter
    from notifications.models import Notification

    today = timezone.now().date()
    upcoming_window = today + timezone.timedelta(days=7)

    # Find scheduled maintenance within next 7 days
    upcoming_maintenance = MaintenanceRecord.objects.filter(
        work_center__company_id=company_id,
        status='scheduled',
        scheduled_date__gte=today,
        scheduled_date__lte=upcoming_window
    )

    reminders_sent = 0
    for maintenance in upcoming_maintenance:
        # Create notification for maintenance team
        Notification.objects.create(
            company_id=company_id,
            user=maintenance.work_center.manager if maintenance.work_center.manager else None,
            notification_type='maintenance_reminder',
            title=f'Maintenance Due: {maintenance.work_center.name}',
            message=f'{maintenance.maintenance_type.title()} maintenance scheduled for {maintenance.scheduled_date}',
            reference_id=str(maintenance.id),
            reference_type='maintenance'
        )
        reminders_sent += 1

    logger.info(f'Sent {reminders_sent} maintenance reminders for company {company_id}')


@shared_task
def update_production_status(company_id):
    """Update production order statuses based on work order progress."""
    from .models import ProductionOrder, WorkOrder

    production_orders = ProductionOrder.objects.filter(
        company_id=company_id,
        status__in=['confirmed', 'in_progress']
    )

    status_updates = 0
    for order in production_orders:
        work_orders = order.work_orders.all()

        if not work_orders.exists():
            continue

        # Check if all work orders are completed
        completed_orders = work_orders.filter(status='completed').count()
        total_orders = work_orders.count()

        if completed_orders == total_orders:
            # All work orders done
            if order.status != 'completed':
                order.status = 'completed'
                order.actual_end = timezone.now()
                order.save(update_fields=['status', 'actual_end'])
                status_updates += 1
        elif completed_orders > 0:
            # Some work orders done
            if order.status != 'in_progress':
                order.status = 'in_progress'
                order.actual_start = order.actual_start or timezone.now()
                order.save(update_fields=['status', 'actual_start'])
                status_updates += 1

    logger.info(f'Updated production status for {status_updates} orders in company {company_id}')


@shared_task
def quality_report_generation(company_id):
    """Generate quality reports for completed production orders."""
    from .models import ProductionOrder, QualityCheck
    from django.db.models import Count, Q
    from datetime import timedelta

    today = timezone.now()
    week_ago = today - timedelta(days=7)

    # Get recently completed production orders
    completed_orders = ProductionOrder.objects.filter(
        company_id=company_id,
        status='completed',
        actual_end__gte=week_ago
    )

    report_count = 0
    for order in completed_orders:
        # Aggregate quality check results
        quality_checks = QualityCheck.objects.filter(production_order=order)

        if quality_checks.exists():
            total_checks = quality_checks.count()
            passed_checks = quality_checks.filter(result='pass').count()
            failed_checks = quality_checks.filter(result='fail').count()
            conditional_checks = quality_checks.filter(result='conditional').count()

            quality_rate = (passed_checks / total_checks * 100) if total_checks > 0 else 0

            # Log quality metrics
            logger.info(
                f'Quality Report for MO-{order.order_number}: '
                f'Total={total_checks}, Passed={passed_checks}, Failed={failed_checks}, '
                f'Quality Rate={quality_rate:.2f}%'
            )

            # Create quality metrics record if quality_rate is below 95%
            if quality_rate < 95:
                logger.warning(
                    f'Quality alert for MO-{order.order_number}: {quality_rate:.2f}% pass rate'
                )

            report_count += 1

    logger.info(f'Generated quality reports for {report_count} production orders in company {company_id}')
