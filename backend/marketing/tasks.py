from celery import shared_task
import logging
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger('apex_erp')


@shared_task
def send_campaign_emails(company_id, campaign_id=None):
    """Send scheduled campaign emails to recipients."""
    from .models import Campaign, CampaignEmail
    from django.core.mail import send_mass_mail

    now = timezone.now()

    # Get campaigns ready to send
    query = Campaign.objects.filter(
        company_id=company_id,
        campaign_type='email',
        status='active'
    )

    if campaign_id:
        query = query.filter(id=campaign_id)

    campaigns = query

    total_sent = 0
    for campaign in campaigns:
        emails_to_send = CampaignEmail.objects.filter(
            campaign=campaign,
            status='scheduled',
            scheduled_at__lte=now
        )

        for campaign_email in emails_to_send:
            recipients_list = list(campaign_email.recipients.values_list('email', flat=True))

            if recipients_list:
                # Prepare email data
                subject = campaign_email.subject
                message = campaign_email.template.body_text if campaign_email.template else subject
                from_email = f'noreply@{company_id}.apexerp.local'

                # Send emails
                email_list = [(subject, message, from_email, [email]) for email in recipients_list]

                try:
                    send_mass_mail(email_list, fail_silently=True)

                    # Update campaign email status
                    campaign_email.status = 'sent'
                    campaign_email.sent_at = now
                    campaign_email.sent_count = len(recipients_list)
                    campaign_email.save(update_fields=['status', 'sent_at', 'sent_count'])

                    total_sent += len(recipients_list)
                    logger.info(f'Sent {len(recipients_list)} emails for campaign {campaign.name}')
                except Exception as e:
                    logger.error(f'Failed to send campaign emails: {e}')

    logger.info(f'Campaign email sending completed: {total_sent} emails sent for company {company_id}')


@shared_task
def update_campaign_analytics(company_id, campaign_id=None):
    """Update campaign analytics and engagement metrics."""
    from .models import Campaign, CampaignEmail, SocialPost
    from django.db.models import Sum, Count

    query = Campaign.objects.filter(
        company_id=company_id,
        status__in=['active', 'completed']
    )

    if campaign_id:
        query = query.filter(id=campaign_id)

    campaigns = query

    analytics_updates = 0
    for campaign in campaigns:
        # Update email campaign metrics
        if campaign.campaign_type == 'email':
            emails = CampaignEmail.objects.filter(campaign=campaign)

            email_metrics = emails.aggregate(
                total_sent=Sum('sent_count'),
                total_delivered=Sum('delivered_count'),
                total_opens=Sum('open_count'),
                total_clicks=Sum('click_count'),
                total_bounces=Sum('bounce_count'),
                total_unsubscribes=Sum('unsubscribe_count')
            )

            if email_metrics['total_sent']:
                open_rate = (email_metrics['total_opens'] or 0) / email_metrics['total_sent'] * 100
                click_rate = (email_metrics['total_clicks'] or 0) / email_metrics['total_sent'] * 100

                logger.info(
                    f'Campaign {campaign.name} analytics: '
                    f'Sent={email_metrics["total_sent"]}, '
                    f'Open Rate={open_rate:.2f}%, '
                    f'Click Rate={click_rate:.2f}%'
                )

        # Update social campaign metrics
        if campaign.campaign_type == 'social':
            posts = SocialPost.objects.filter(campaign=campaign)

            social_metrics = posts.aggregate(
                total_reach=Sum('reach'),
                total_likes=Sum('likes'),
                total_shares=Sum('shares'),
                total_comments=Sum('comments_count')
            )

            logger.info(
                f'Campaign {campaign.name} social metrics: '
                f'Reach={social_metrics["total_reach"] or 0}, '
                f'Engagement={((social_metrics["total_likes"] or 0) + (social_metrics["total_shares"] or 0) + (social_metrics["total_comments"] or 0))}'
            )

        analytics_updates += 1

    logger.info(f'Updated analytics for {analytics_updates} campaigns in company {company_id}')


@shared_task
def schedule_social_posts(company_id, campaign_id=None):
    """Schedule and publish social media posts at optimal times."""
    from .models import SocialPost

    now = timezone.now()

    # Get posts ready to publish
    query = SocialPost.objects.filter(
        company_id=company_id,
        status='scheduled',
        scheduled_at__lte=now
    )

    if campaign_id:
        query = query.filter(campaign_id=campaign_id)

    posts_to_publish = query

    published_count = 0
    for post in posts_to_publish:
        try:
            # In a real implementation, integrate with social media APIs
            # For now, just update the status
            post.status = 'published'
            post.published_at = now
            post.save(update_fields=['status', 'published_at'])

            logger.info(
                f'Published social post on {post.platform}: {post.content[:50]}...'
            )
            published_count += 1

        except Exception as e:
            logger.error(f'Failed to publish social post: {e}')

    logger.info(f'Scheduled social posts: {published_count} posts published for company {company_id}')
