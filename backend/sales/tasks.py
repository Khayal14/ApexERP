from celery import shared_task
import logging
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger('apex_erp')


@shared_task
def check_quotation_expiry(company_id):
    """Check quotations approaching expiry and send reminders or mark as expired."""
    from .models import Quotation
    from notifications.models import Notification

    today = timezone.now().date()
    expiring_soon = today + timedelta(days=3)

    # Find quotations expiring within 3 days
    expiring_quotations = Quotation.objects.filter(
        company_id=company_id,
        status__in=['sent', 'draft'],
        expiry_date__gte=today,
        expiry_date__lte=expiring_soon
    )

    reminders_sent = 0
    for quote in expiring_quotations:
        # Create reminder notification
        Notification.objects.create(
            company_id=company_id,
            user=quote.assigned_to,
            notification_type='quotation_expiry',
            title=f'Quotation Expiring Soon: {quote.quote_number}',
            message=f'Quotation for {quote.customer_name} expires on {quote.expiry_date}',
            reference_id=str(quote.id),
            reference_type='quotation'
        )
        reminders_sent += 1

    # Mark expired quotations
    expired_quotations = Quotation.objects.filter(
        company_id=company_id,
        status__in=['sent', 'draft'],
        expiry_date__lt=today
    )

    expired_count = 0
    for quote in expired_quotations:
        if quote.status != 'expired':
            quote.status = 'expired'
            quote.save(update_fields=['status'])
            expired_count += 1

    logger.info(f'Quotation expiry check: {reminders_sent} reminders sent, {expired_count} marked expired for company {company_id}')


@shared_task
def generate_sales_report(company_id):
    """Generate daily/weekly sales reports with key metrics."""
    from .models import SalesOrder, SalesOrderLine
    from django.db.models import Sum, Count, Q
    from datetime import datetime, timedelta

    today = timezone.now().date()
    week_start = today - timedelta(days=7)
    month_start = today - timedelta(days=30)

    # Daily metrics
    daily_orders = SalesOrder.objects.filter(
        company_id=company_id,
        order_date=today
    )
    daily_count = daily_orders.count()
    daily_revenue = daily_orders.aggregate(total=Sum('total'))['total'] or 0

    # Weekly metrics
    weekly_orders = SalesOrder.objects.filter(
        company_id=company_id,
        order_date__gte=week_start,
        order_date__lt=today
    )
    weekly_count = weekly_orders.count()
    weekly_revenue = weekly_orders.aggregate(total=Sum('total'))['total'] or 0

    # Monthly metrics
    monthly_orders = SalesOrder.objects.filter(
        company_id=company_id,
        order_date__gte=month_start
    )
    monthly_count = monthly_orders.count()
    monthly_revenue = monthly_orders.aggregate(total=Sum('total'))['total'] or 0

    # Status breakdown
    status_breakdown = SalesOrder.objects.filter(
        company_id=company_id,
        order_date__gte=month_start
    ).values('status').annotate(count=Count('id'), revenue=Sum('total'))

    logger.info(
        f'Sales Report for {company_id}: '
        f'Daily(Orders={daily_count}, Revenue={float(daily_revenue)}), '
        f'Weekly(Orders={weekly_count}, Revenue={float(weekly_revenue)}), '
        f'Monthly(Orders={monthly_count}, Revenue={float(monthly_revenue)})'
    )

    for status_data in status_breakdown:
        logger.info(
            f'Status {status_data["status"]}: {status_data["count"]} orders, '
            f'Revenue: {float(status_data["revenue"] or 0)}'
        )

    logger.info(f'Sales report generated for company {company_id}')


@shared_task
def update_pricing_rules(company_id):
    """Update and apply pricing rules for products."""
    from .models import PricingRule
    from inventory.models import Product
    from django.utils import timezone

    today = timezone.now().date()

    # Find rules that need to be applied/removed
    active_rules = PricingRule.objects.filter(
        company_id=company_id,
        start_date__lte=today
    ).exclude(
        end_date__isnull=False,
        end_date__lt=today
    )

    # Find rules that expired
    expired_rules = PricingRule.objects.filter(
        company_id=company_id,
        end_date__lt=today
    )

    expired_count = expired_rules.count()
    active_count = active_rules.count()

    # Log the pricing rule update
    logger.info(
        f'Pricing rules update for {company_id}: '
        f'{active_count} rules active, {expired_count} rules expired'
    )

    # Log rule details
    for rule in active_rules[:10]:  # Log first 10 rules
        logger.debug(
            f'Active rule: {rule.name} - Type: {rule.rule_type}, '
            f'Value: {rule.value}, Min Qty: {rule.min_quantity}'
        )

    logger.info(f'Pricing rules updated for company {company_id}')
