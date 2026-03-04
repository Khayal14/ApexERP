import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Campaign(BaseModel):
    CAMPAIGN_TYPES = [
        ('email', _('Email')), ('sms', _('SMS')), ('social', _('Social Media')),
        ('content', _('Content')), ('ppc', _('PPC')), ('event', _('Event')),
    ]
    name = models.CharField(max_length=255)
    campaign_type = models.CharField(max_length=20, choices=CAMPAIGN_TYPES)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, default='draft', choices=[
        ('draft', _('Draft')), ('active', _('Active')),
        ('paused', _('Paused')), ('completed', _('Completed')),
    ])
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    budget = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    spent = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    target_audience = models.JSONField(default=dict)
    goals = models.JSONField(default=dict)
    tags = models.JSONField(default=list)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class EmailTemplate(BaseModel):
    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    body_html = models.TextField()
    body_text = models.TextField(blank=True)
    category = models.CharField(max_length=50, blank=True)
    variables = models.JSONField(default=list, help_text='Template variables like {{name}}')

    def __str__(self):
        return self.name


class CampaignEmail(BaseModel):
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='emails')
    template = models.ForeignKey(EmailTemplate, on_delete=models.SET_NULL, null=True)
    subject = models.CharField(max_length=255)
    recipients = models.ManyToManyField('crm.Contact', blank=True)
    sent_count = models.IntegerField(default=0)
    delivered_count = models.IntegerField(default=0)
    open_count = models.IntegerField(default=0)
    click_count = models.IntegerField(default=0)
    bounce_count = models.IntegerField(default=0)
    unsubscribe_count = models.IntegerField(default=0)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='draft', choices=[
        ('draft', _('Draft')), ('scheduled', _('Scheduled')),
        ('sending', _('Sending')), ('sent', _('Sent')),
    ])


class ABTest(BaseModel):
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='ab_tests')
    name = models.CharField(max_length=255)
    variant_a = models.JSONField(default=dict)
    variant_b = models.JSONField(default=dict)
    variant_a_results = models.JSONField(default=dict)
    variant_b_results = models.JSONField(default=dict)
    winner = models.CharField(max_length=1, blank=True, choices=[('a', 'A'), ('b', 'B')])
    sample_size = models.IntegerField(default=100)
    confidence_level = models.FloatField(default=0.95)
    status = models.CharField(max_length=20, default='draft', choices=[
        ('draft', _('Draft')), ('running', _('Running')), ('completed', _('Completed')),
    ])


class LeadNurture(BaseModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    trigger_criteria = models.JSONField(default=dict)
    steps = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    enrolled_count = models.IntegerField(default=0)
    completed_count = models.IntegerField(default=0)

    def __str__(self):
        return self.name


class SocialPost(BaseModel):
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, null=True, blank=True, related_name='social_posts')
    platform = models.CharField(max_length=20, choices=[
        ('facebook', 'Facebook'), ('twitter', 'Twitter/X'),
        ('linkedin', 'LinkedIn'), ('instagram', 'Instagram'),
    ])
    content = models.TextField()
    media_urls = models.JSONField(default=list)
    scheduled_at = models.DateTimeField(null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='draft', choices=[
        ('draft', _('Draft')), ('scheduled', _('Scheduled')), ('published', _('Published')),
    ])
    likes = models.IntegerField(default=0)
    shares = models.IntegerField(default=0)
    comments_count = models.IntegerField(default=0)
    reach = models.IntegerField(default=0)
    ai_sentiment_score = models.FloatField(null=True, blank=True)
