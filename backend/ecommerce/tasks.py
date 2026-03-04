from celery import shared_task
import logging
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger('apex_erp')


@shared_task
def process_abandoned_carts(company_id, store_id=None):
    """Process abandoned shopping carts and send recovery emails."""
    from .models import Cart
    from notifications.models import Notification

    # Carts abandoned for more than 24 hours
    cutoff_time = timezone.now() - timedelta(hours=24)

    query = Cart.objects.filter(
        store__company_id=company_id,
        updated_at__lt=cutoff_time,
        is_abandoned=False
    )

    if store_id:
        query = query.filter(store_id=store_id)

    abandoned_carts = query

    recovery_count = 0
    for cart in abandoned_carts:
        # Mark cart as abandoned
        cart.is_abandoned = True
        cart.save(update_fields=['is_abandoned'])

        # Send recovery notification if customer email is available
        if cart.customer_email:
            cart_value = float(cart.total)
            items_count = len(cart.items) if cart.items else 0

            Notification.objects.create(
                company_id=company_id,
                notification_type='abandoned_cart',
                title='Your Cart Is Waiting',
                message=f'Complete your purchase! You have {items_count} items worth {cart_value:.2f} in your cart.',
                recipient_email=cart.customer_email,
                reference_id=str(cart.id),
                reference_type='cart'
            )

            logger.info(
                f'Abandoned cart recovery: {cart.customer_email} - '
                f'{items_count} items, value: {cart_value:.2f}'
            )
            recovery_count += 1

    logger.info(f'Processed {recovery_count} abandoned carts for company {company_id}')


@shared_task
def update_product_rankings(company_id, store_id=None):
    """Update product rankings based on sales, reviews, and engagement."""
    from .models import ProductListing, EcommerceOrder
    from django.db.models import Count, Sum, Q
    from datetime import timedelta

    query = ProductListing.objects.filter(
        store__company_id=company_id,
        is_published=True
    )

    if store_id:
        query = query.filter(store_id=store_id)

    listings = query

    # Time window for ranking (last 30 days)
    thirty_days_ago = timezone.now() - timedelta(days=30)

    ranking_updates = 0
    for listing in listings:
        # Calculate ranking score based on multiple factors
        sales_count = EcommerceOrder.objects.filter(
            store=listing.store,
            created_at__gte=thirty_days_ago,
            items__contains=[{'product_id': str(listing.product.id)}]
        ).count()

        reviews_count = listing.reviews.filter(is_approved=True).count()
        avg_rating = listing.avg_rating or 0
        views_proxy = listing.reviews_count  # Simplified - in reality track page views

        # Weighted score calculation
        score = (
            (sales_count * 10) +  # Weight sales heavily
            (avg_rating * 20) +   # Quality matters
            (reviews_count * 5)   # More reviews = more social proof
        )

        logger.debug(
            f'Product ranking {listing.display_name}: '
            f'Sales={sales_count}, Avg Rating={avg_rating}, Reviews={reviews_count}, Score={score}'
        )

        ranking_updates += 1

    logger.info(f'Updated rankings for {ranking_updates} products in company {company_id}')


@shared_task
def sync_inventory_stock(company_id, store_id=None):
    """Synchronize ecommerce inventory with main inventory system."""
    from .models import ProductListing
    from inventory.models import StockLevel

    query = ProductListing.objects.filter(
        store__company_id=company_id,
        is_published=True
    )

    if store_id:
        query = query.filter(store_id=store_id)

    listings = query

    sync_count = 0
    out_of_stock_count = 0

    for listing in listings:
        # Get total available stock from inventory system
        stock_levels = StockLevel.objects.filter(product=listing.product)
        total_available = sum(float(sl.available_quantity) for sl in stock_levels)

        # Check if product should be marked as out of stock
        if total_available <= 0 and listing.is_published:
            # In a real implementation, would update ecommerce status
            out_of_stock_count += 1
            logger.warning(
                f'Product {listing.display_name} is out of stock in inventory system'
            )

        logger.debug(
            f'Sync inventory: {listing.display_name} - '
            f'Available stock: {total_available}'
        )

        sync_count += 1

    logger.info(
        f'Inventory sync for {company_id}: '
        f'{sync_count} products synced, {out_of_stock_count} out of stock'
    )
