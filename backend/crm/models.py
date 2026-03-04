import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Contact(BaseModel):
    """Customer/prospect contacts."""
    CONTACT_TYPES = [
        ('lead', _('Lead')), ('prospect', _('Prospect')),
        ('customer', _('Customer')), ('partner', _('Partner')),
    ]
    contact_type = models.CharField(max_length=20, choices=CONTACT_TYPES, default='lead')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    mobile = models.CharField(max_length=30, blank=True)
    company_name = models.CharField(max_length=255, blank=True)
    job_title = models.CharField(max_length=100, blank=True)
    industry = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    source = models.CharField(max_length=50, blank=True, choices=[
        ('website', _('Website')), ('referral', _('Referral')),
        ('social', _('Social Media')), ('email', _('Email Campaign')),
        ('trade_show', _('Trade Show')), ('cold_call', _('Cold Call')),
        ('other', _('Other')),
    ])
    assigned_to = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_contacts')
    tags = models.JSONField(default=list)
    notes = models.TextField(blank=True)
    ai_lead_score = models.FloatField(null=True, blank=True, help_text='AI-calculated lead score 0-100')
    last_contacted = models.DateTimeField(null=True, blank=True)
    lifetime_value = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    photo = models.ImageField(upload_to='contacts/', blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['company', 'contact_type']),
            models.Index(fields=['email']),
            models.Index(fields=['assigned_to']),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class Pipeline(BaseModel):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_default = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class PipelineStage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pipeline = models.ForeignKey(Pipeline, on_delete=models.CASCADE, related_name='stages')
    name = models.CharField(max_length=100)
    order = models.IntegerField(default=0)
    probability = models.IntegerField(default=0, help_text='Win probability percentage')
    color = models.CharField(max_length=7, default='#3B82F6')

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.pipeline.name} - {self.name}"


class Deal(BaseModel):
    """Sales opportunities/deals."""
    PRIORITY_CHOICES = [
        ('low', _('Low')), ('medium', _('Medium')),
        ('high', _('High')), ('urgent', _('Urgent')),
    ]
    title = models.CharField(max_length=255)
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name='deals')
    pipeline = models.ForeignKey(Pipeline, on_delete=models.CASCADE, related_name='deals')
    stage = models.ForeignKey(PipelineStage, on_delete=models.SET_NULL, null=True, related_name='deals')
    value = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    probability = models.IntegerField(default=50)
    expected_close_date = models.DateField(null=True, blank=True)
    actual_close_date = models.DateField(null=True, blank=True)
    assigned_to = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, related_name='assigned_deals')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, default='open', choices=[
        ('open', _('Open')), ('won', _('Won')),
        ('lost', _('Lost')), ('abandoned', _('Abandoned')),
    ])
    loss_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    tags = models.JSONField(default=list)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['pipeline', 'stage']),
        ]

    def __str__(self):
        return self.title


class Activity(BaseModel):
    """CRM activities: calls, emails, meetings, tasks."""
    ACTIVITY_TYPES = [
        ('call', _('Call')), ('email', _('Email')),
        ('meeting', _('Meeting')), ('task', _('Task')),
        ('note', _('Note')), ('demo', _('Demo')),
    ]
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, null=True, blank=True, related_name='activities')
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, null=True, blank=True, related_name='activities')
    assigned_to = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, related_name='crm_activities')
    due_date = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    outcome = models.TextField(blank=True)
    duration_minutes = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = _('activities')


class EmailCampaign(BaseModel):
    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255)
    body_html = models.TextField()
    body_text = models.TextField(blank=True)
    recipients = models.ManyToManyField(Contact, blank=True, related_name='campaigns')
    sent_count = models.IntegerField(default=0)
    open_count = models.IntegerField(default=0)
    click_count = models.IntegerField(default=0)
    status = models.CharField(max_length=20, default='draft', choices=[
        ('draft', _('Draft')), ('scheduled', _('Scheduled')),
        ('sending', _('Sending')), ('sent', _('Sent')),
    ])
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.name

    @property
    def open_rate(self):
        return (self.open_count / self.sent_count * 100) if self.sent_count > 0 else 0

    @property
    def click_rate(self):
        return (self.click_count / self.sent_count * 100) if self.sent_count > 0 else 0


class CustomerSegment(BaseModel):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    criteria = models.JSONField(default=dict, help_text='Filter criteria for segment')
    contacts = models.ManyToManyField(Contact, blank=True, related_name='segments')
    is_dynamic = models.BooleanField(default=True, help_text='Auto-update membership based on criteria')

    def __str__(self):
        return self.name
