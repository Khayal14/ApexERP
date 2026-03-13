"""
Celery tasks for inventory module.
Runs low-stock checks and generates StockAlert records.
"""
from celery import shared_task
from django.utils import timezone


@shared_task(name='inventory.check_low_stock')
def check_low_stock():
    """
    Check all products across all companies.
    Create StockAlert if quantity <= min_stock_level.
    Resolve existing alerts if stock is back above threshold.
    """
    from .models import Product, StockLevel, StockAlert

    created = 0
    resolved = 0

    for product in Product.objects.filter(is_active=True).select_related('company'):
        total_qty = sum(
            sl.quantity for sl in product.stock_levels.all()
        )
        threshold = product.min_stock_level or 0

        if total_qty <= 0:
            alert_type = 'out_of_stock'
        elif total_qty <= threshold:
            if product.product_role == 'raw_material':
                alert_type = 'low_raw_material'
            else:
                alert_type = 'low_stock'
        else:
            # Stock is fine — resolve any open alerts for this product
            resolved += StockAlert.objects.filter(
                product=product,
                is_acknowledged=False,
                alert_type__in=['low_stock', 'out_of_stock', 'low_raw_material'],
            ).update(is_acknowledged=True, acknowledged_at=timezone.now())
            continue

        # Avoid duplicate open alerts
        existing = StockAlert.objects.filter(
            product=product,
            alert_type=alert_type,
            is_acknowledged=False,
        ).first()

        if not existing:
            StockAlert.objects.create(
                company=product.company,
                product=product,
                alert_type=alert_type,
                threshold_qty=threshold,
                current_qty=total_qty,
            )
            created += 1
        else:
            # Update the current qty on existing alert
            existing.current_qty = total_qty
            existing.save(update_fields=['current_qty'])

    return f'Low stock check complete: {created} alerts created, {resolved} resolved'
