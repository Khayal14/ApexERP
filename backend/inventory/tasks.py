from celery import shared_task
import logging
from django.utils import timezone
from django.db.models import Q, Sum

logger = logging.getLogger('apex_erp')


@shared_task
def check_low_stock_alerts(company_id):
    """Check for products with stock levels below reorder point and create alerts."""
    from .models import Product, StockLevel
    from notifications.models import Alert

    products = Product.objects.filter(company_id=company_id)
    low_stock_count = 0

    for product in products:
        stock_levels = StockLevel.objects.filter(product=product)
        for stock in stock_levels:
            if stock.available_quantity <= product.reorder_point:
                # Check if alert already exists
                if not Alert.objects.filter(
                    company_id=company_id,
                    alert_type='low_stock',
                    reference_id=str(product.id),
                    is_resolved=False
                ).exists():
                    Alert.objects.create(
                        company_id=company_id,
                        alert_type='low_stock',
                        title=f'Low Stock Alert: {product.name}',
                        message=f'Product {product.name} (SKU: {product.sku}) is below reorder point at {stock.warehouse.name}',
                        severity='warning',
                        reference_id=str(product.id),
                        reference_type='product',
                    )
                    low_stock_count += 1

    logger.info(f'Created {low_stock_count} low stock alerts for company {company_id}')


@shared_task
def generate_demand_forecasts(company_id):
    """Generate demand forecasts for all products based on historical movements."""
    from .models import Product, StockMovement, DemandForecast

    products = Product.objects.filter(company_id=company_id)
    forecast_count = 0

    for product in products:
        # Get historical stock movements from last 90 days
        movements = StockMovement.objects.filter(
            product=product,
            movement_type='out',
            date__gte=timezone.now() - timezone.timedelta(days=90)
        ).order_by('date')

        if movements.count() >= 5:  # Need at least 5 data points
            total_quantity = sum(m.quantity for m in movements)
            avg_daily_demand = float(total_quantity) / 90

            # Create forecast for next 3 months
            today = timezone.now().date()
            for month_offset in range(1, 4):
                period_start = today + timezone.timedelta(days=30 * (month_offset - 1))
                period_end = today + timezone.timedelta(days=30 * month_offset)

                # Simple linear forecast based on average
                forecasted_demand = avg_daily_demand * 30

                DemandForecast.objects.update_or_create(
                    company_id=company_id,
                    product=product,
                    period_start=period_start,
                    defaults={
                        'period_end': period_end,
                        'forecasted_demand': forecasted_demand,
                        'confidence': 0.75,
                        'model_version': 'linear-1.0',
                        'factors': {'method': 'historical_average', 'days_analyzed': 90}
                    }
                )
                forecast_count += 1

    logger.info(f'Generated {forecast_count} demand forecasts for company {company_id}')


@shared_task
def sync_warehouse_stock(company_id):
    """Synchronize warehouse stock levels from external sources or recalculate from movements."""
    from .models import Warehouse, StockLevel, StockMovement

    warehouses = Warehouse.objects.filter(company_id=company_id)
    updates_count = 0

    for warehouse in warehouses:
        stock_levels = StockLevel.objects.filter(warehouse=warehouse)

        for stock in stock_levels:
            # Calculate available quantity based on recent movements
            recent_movements = StockMovement.objects.filter(
                Q(source_warehouse=warehouse, movement_type__in=['out', 'transfer']) |
                Q(destination_warehouse=warehouse, movement_type__in=['in', 'transfer', 'return']),
                product=stock.product,
                date__gte=timezone.now() - timezone.timedelta(days=30)
            )

            inbound = recent_movements.filter(destination_warehouse=warehouse).aggregate(
                total=Sum('quantity')
            )['total'] or 0
            outbound = recent_movements.filter(source_warehouse=warehouse).aggregate(
                total=Sum('quantity')
            )['total'] or 0

            # Recalculate available quantity
            new_available = stock.quantity - stock.reserved_quantity
            if new_available < 0:
                new_available = 0

            if stock.available_quantity != new_available:
                stock.available_quantity = new_available
                stock.save(update_fields=['available_quantity'])
                updates_count += 1

    logger.info(f'Synchronized stock levels for {updates_count} warehouse locations in company {company_id}')
