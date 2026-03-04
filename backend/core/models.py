import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser, Group, Permission
from django.utils.translation import gettext_lazy as _


class Company(models.Model):
    """Multi-company support."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(_('company name'), max_length=255)
    legal_name = models.CharField(_('legal name'), max_length=255, blank=True)
    tax_id = models.CharField(_('tax ID'), max_length=50, blank=True)
    email = models.EmailField(_('email'), blank=True)
    phone = models.CharField(_('phone'), max_length=30, blank=True)
    website = models.URLField(_('website'), blank=True)
    address = models.TextField(_('address'), blank=True)
    city = models.CharField(_('city'), max_length=100, blank=True)
    country = models.CharField(_('country'), max_length=100, blank=True)
    currency = models.CharField(_('currency'), max_length=3, default='USD')
    logo = models.ImageField(_('logo'), upload_to='company_logos/', blank=True, null=True)
    timezone = models.CharField(_('timezone'), max_length=50, default='UTC')
    fiscal_year_start = models.IntegerField(_('fiscal year start month'), default=1)
    is_active = models.BooleanField(_('active'), default=True)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subsidiaries')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('company')
        verbose_name_plural = _('companies')
        ordering = ['name']

    def __str__(self):
        return self.name


class User(AbstractUser):
    """Custom user model with RBAC and multi-company support."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_('email address'), unique=True)
    phone = models.CharField(_('phone'), max_length=30, blank=True)
    avatar = models.ImageField(_('avatar'), upload_to='avatars/', blank=True, null=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True, related_name='users')
    companies = models.ManyToManyField(Company, blank=True, related_name='all_users')
    department = models.CharField(_('department'), max_length=100, blank=True)
    job_title = models.CharField(_('job_title'), max_length=100, blank=True)
    language = models.CharField(_('language'), max_length=10, default='en', choices=[('en', 'English'), ('ar', 'العربية')])
    timezone = models.CharField(_('timezone'), max_length=50, default='UTC')
    theme = models.CharField(_('theme'), max_length=10, default='light', choices=[('light', 'Light'), ('dark', 'Dark'), ('system', 'System')])
    is_company_admin = models.BooleanField(_('company admin'), default=False)
    last_active = models.DateTimeField(_('last active'), null=True, blank=True)
    mfa_enabled = models.BooleanField(_('MFA enabled'), default=False)
    mfa_secret = models.CharField(max_length=32, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['company']),
        ]

    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"


class Role(models.Model):
    """Custom RBAC roles beyond Django's built-in groups."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(_('role name'), max_length=100)
    description = models.TextField(_('description'), blank=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='roles')
    permissions = models.ManyToManyField(Permission, blank=True)
    modules = models.JSONField(_('accessible modules'), default=list, help_text='List of module names this role can access')
    is_system = models.BooleanField(_('system role'), default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('role')
        verbose_name_plural = _('roles')
        unique_together = ['name', 'company']

    def __str__(self):
        return f"{self.name} ({self.company.name})"


class UserRole(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_roles')
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_users')
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='+')

    class Meta:
        unique_together = ['user', 'role']


class AuditLog(models.Model):
    """Comprehensive audit trail for GDPR/HIPAA compliance."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, null=True)
    action = models.CharField(max_length=50)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=255)
    changes = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['model_name', 'object_id']),
        ]

    def __str__(self):
        return f"{self.user} {self.action} {self.model_name}:{self.object_id}"


class Notification(models.Model):
    """Real-time notification system."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=50, choices=[
        ('info', 'Info'), ('warning', 'Warning'), ('error', 'Error'), ('success', 'Success'),
    ], default='info')
    module = models.CharField(max_length=50, blank=True)
    link = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
        ]


class SystemSetting(models.Model):
    """Global and company-level settings."""
    company = models.ForeignKey(Company, on_delete=models.CASCADE, null=True, blank=True)
    key = models.CharField(max_length=255)
    value = models.JSONField()
    description = models.TextField(blank=True)
    is_global = models.BooleanField(default=False)

    class Meta:
        unique_together = ['company', 'key']

    def __str__(self):
        return f"{self.key}: {self.value}"


class BaseModel(models.Model):
    """Abstract base model for all ApexERP models."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='%(class)s_set')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='%(class)s_created')
    updated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='%(class)s_updated')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        abstract = True
        ordering = ['-created_at']
