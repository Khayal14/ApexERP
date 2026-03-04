from celery import shared_task
import logging

logger = logging.getLogger('apex_erp')


@shared_task
def generate_demand_forecast(product_id, company_id):
    """Generate demand forecast for a product using ML."""
    from inventory.models import StockMovement, DemandForecast, Product
    from django.utils import timezone
    from .ml_models import DemandForecaster

    try:
        product = Product.objects.get(id=product_id)
        movements = StockMovement.objects.filter(
            product=product, movement_type='out',
            date__gte=timezone.now() - timezone.timedelta(days=365)
        ).order_by('date')

        historical = []
        for m in movements:
            historical.append({
                'month': m.date.month,
                'day_of_week': m.date.weekday(),
                'quarter': (m.date.month - 1) // 3 + 1,
                'price': float(product.selling_price),
                'demand': float(m.quantity),
            })

        forecaster = DemandForecaster()
        result = forecaster.train(historical)
        logger.info(f'Demand forecast training: {result}')

        if result.get('status') == 'trained':
            today = timezone.now().date()
            for i in range(1, 4):
                future_date = today + timezone.timedelta(days=30 * i)
                features = [future_date.month, future_date.weekday(),
                           (future_date.month - 1) // 3 + 1, float(product.selling_price), 0]
                prediction = forecaster.predict(features)
                DemandForecast.objects.create(
                    product=product, company_id=company_id,
                    period_start=future_date, period_end=future_date + timezone.timedelta(days=30),
                    forecasted_demand=prediction['predicted_demand'],
                    confidence=prediction['confidence'],
                    model_version='rf-1.0',
                )
        logger.info(f'Generated demand forecast for product {product.name}')
    except Exception as e:
        logger.error(f'Demand forecast generation failed: {e}')


@shared_task
def auto_categorize_expenses(company_id):
    """Auto-categorize uncategorized expenses."""
    from finance.models import Expense, ExpenseCategory
    from .ml_models import ExpenseCategorizer

    categorizer = ExpenseCategorizer()
    categories = ExpenseCategory.objects.filter(company_id=company_id)
    keywords_map = {cat.name: cat.ai_keywords for cat in categories if cat.ai_keywords}

    expenses = Expense.objects.filter(company_id=company_id, category__isnull=True, ai_categorized=False)
    categorized = 0

    for expense in expenses:
        result = categorizer.categorize(expense.description, keywords_map)
        if result['category'] and result['confidence'] > 0.5:
            try:
                cat = ExpenseCategory.objects.get(company_id=company_id, name=result['category'])
                expense.category = cat
                expense.ai_categorized = True
                expense.ai_confidence = result['confidence']
                expense.save()
                categorized += 1
            except ExpenseCategory.DoesNotExist:
                pass

    logger.info(f'Auto-categorized {categorized} expenses for company {company_id}')


@shared_task
def update_lead_scores(company_id):
    """Update AI lead scores for all contacts."""
    from crm.models import Contact
    from .ml_models import LeadScorer

    scorer = LeadScorer()
    contacts = Contact.objects.filter(company_id=company_id, contact_type__in=['lead', 'prospect'])

    for contact in contacts:
        data = {
            'email': contact.email,
            'phone': contact.phone,
            'company_name': contact.company_name,
            'job_title': contact.job_title,
            'industry': contact.industry,
            'activity_count': contact.activities.filter(is_completed=True).count(),
            'deal_count': contact.deals.count(),
        }
        result = scorer.score(data)
        contact.ai_lead_score = result['score']
        contact.save(update_fields=['ai_lead_score'])

    logger.info(f'Updated lead scores for {contacts.count()} contacts')


@shared_task
def generate_ai_insights(company_id):
    """Generate cross-module AI insights."""
    from .models import AIInsight
    from django.utils import timezone

    # Example: detect revenue anomalies
    from finance.models import Invoice
    from django.db.models import Sum

    today = timezone.now().date()
    this_month = Invoice.objects.filter(
        company_id=company_id, status='paid', issue_date__month=today.month
    ).aggregate(total=Sum('total'))['total'] or 0
    last_month = Invoice.objects.filter(
        company_id=company_id, status='paid', issue_date__month=today.month - 1 if today.month > 1 else 12
    ).aggregate(total=Sum('total'))['total'] or 0

    if last_month > 0:
        change = (float(this_month) - float(last_month)) / float(last_month) * 100
        if abs(change) > 20:
            AIInsight.objects.create(
                company_id=company_id,
                module='finance',
                insight_type='anomaly' if change < -20 else 'trend',
                title=f'Revenue {"decreased" if change < 0 else "increased"} by {abs(round(change))}%',
                description=f'Monthly revenue has {"dropped" if change < 0 else "risen"} significantly compared to last month.',
                data={'this_month': float(this_month), 'last_month': float(last_month), 'change_percent': round(change, 2)},
                severity='warning' if change < -20 else 'info',
            )

    logger.info(f'Generated AI insights for company {company_id}')
