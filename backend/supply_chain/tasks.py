import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


@shared_task
def check_purchase_order_deliveries(company_id=None):
    """Check for overdue purchase order deliveries and send alerts."""
    from .models import PurchaseOrder
    from core.models import Notification

    filters = {'status': 'confirmed', 'expected_delivery__lt': timezone.now().date()}
    if company_id:
        filters['company_id'] = company_id

    overdue_orders = PurchaseOrder.objects.filter(**filters)
    count = 0

    for order in overdue_orders:
        days_overdue = (timezone.now().date() - order.expected_delivery).days
        Notification.objects.create(
            company=order.company,
            user=order.created_by,
            title=f'Overdue PO: {order.po_number}',
            message=f'Purchase order {order.po_number} from {order.vendor.name} '
                    f'is {days_overdue} days overdue.',
            notification_type='warning',
        )
        count += 1

    logger.info(f'Found {count} overdue purchase orders')
    return {'overdue_orders': count}


@shared_task
def evaluate_vendor_performance(company_id=None):
    """Evaluate and update vendor performance scores based on delivery history."""
    from .models import Vendor, PurchaseOrder

    filters = {'is_active': True}
    if company_id:
        filters['company_id'] = company_id

    vendors = Vendor.objects.filter(**filters)
    updated = 0

    for vendor in vendors:
        completed_orders = PurchaseOrder.objects.filter(
            vendor=vendor,
            status='received',
        )
        total = completed_orders.count()
        if total == 0:
            continue

        on_time = completed_orders.filter(
            received_date__lte=models_F('expected_delivery')
        ).count() if hasattr(completed_orders, 'filter') else 0

        # Simple on-time delivery rate
        try:
            on_time_count = 0
            for order in completed_orders:
                if hasattr(order, 'received_date') and hasattr(order, 'expected_delivery'):
                    if order.received_date and order.expected_delivery:
                        if order.received_date <= order.expected_delivery:
                            on_time_count += 1

            delivery_rate = (on_time_count / total) * 100 if total > 0 else 0
            vendor.performance_score = round(delivery_rate, 2)
            vendor.save(update_fields=['performance_score'])
            updated += 1
        except Exception as e:
            logger.error(f'Error evaluating vendor {vendor.name}: {e}')

    logger.info(f'Updated performance scores for {updated} vendors')
    return {'vendors_evaluated': updated}


@shared_task
def verify_supply_chain_integrity(company_id=None):
    """Verify blockchain-inspired supply chain event hash integrity."""
    from .models import SupplyChainEvent
    import hashlib

    filters = {}
    if company_id:
        filters['company_id'] = company_id

    events = SupplyChainEvent.objects.filter(**filters).order_by('created_at')
    verified = 0
    broken = 0

    previous_hash = '0' * 64
    for event in events:
        expected_hash = hashlib.sha256(
            f'{previous_hash}{event.event_type}{event.description}{event.created_at}'.encode()
        ).hexdigest()

        if event.event_hash == expected_hash:
            verified += 1
        else:
            broken += 1
            event.verified = False
            event.save(update_fields=['verified'])

        previous_hash = event.event_hash

    logger.info(f'Chain verification: {verified} valid, {broken} broken')
    return {'verified': verified, 'broken_links': broken}


@shared_task
def process_rfq_responses(company_id=None):
    """Process pending RFQ responses and notify procurement team."""
    from .models import RFQ, VendorQuotation
    from core.models import Notification

    filters = {'status': 'sent'}
    if company_id:
        filters['company_id'] = company_id

    open_rfqs = RFQ.objects.filter(**filters)
    processed = 0

    for rfq in open_rfqs:
        quotes = VendorQuotation.objects.filter(rfq=rfq)
        if quotes.exists():
            # Check if deadline has passed
            if hasattr(rfq, 'deadline') and rfq.deadline and rfq.deadline < timezone.now():
                best_quote = quotes.order_by('total_amount').first()
                if best_quote and rfq.created_by:
                    Notification.objects.create(
                        company=rfq.company,
                        user=rfq.created_by,
                        title=f'RFQ Responses Ready: {rfq.rfq_number}',
                        message=f'RFQ {rfq.rfq_number} has {quotes.count()} responses. '
                                f'Best quote: {best_quote.total_amount} from {best_quote.vendor.name}.',
                        notification_type='info',
                    )
                    processed += 1

    logger.info(f'Processed {processed} RFQs with responses')
    return {'rfqs_processed': processed}
