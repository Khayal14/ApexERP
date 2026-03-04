from celery import shared_task
import logging

logger = logging.getLogger('apex_erp')

@shared_task
def send_email_campaign(campaign_id):
    from .models import EmailCampaign
    campaign = EmailCampaign.objects.get(id=campaign_id)
    recipients = campaign.recipients.all()
    sent = 0
    for contact in recipients:
        # Send email logic
        sent += 1
    campaign.sent_count = sent
    campaign.status = 'sent'
    campaign.save()
    logger.info(f'Sent campaign {campaign.name} to {sent} recipients')

@shared_task
def calculate_lead_scores(company_id):
    from .models import Contact
    contacts = Contact.objects.filter(company_id=company_id, contact_type__in=['lead', 'prospect'])
    for contact in contacts:
        score = 50  # Base score
        if contact.email:
            score += 10
        if contact.phone:
            score += 5
        if contact.deals.exists():
            score += 20
        if contact.activities.filter(is_completed=True).count() > 3:
            score += 15
        contact.ai_lead_score = min(score, 100)
        contact.save(update_fields=['ai_lead_score'])
    logger.info(f'Updated lead scores for {contacts.count()} contacts')

@shared_task
def update_deal_probabilities():
    from .models import Deal
    deals = Deal.objects.filter(status='open')
    for deal in deals:
        if deal.stage:
            deal.probability = deal.stage.probability
            deal.save(update_fields=['probability'])
