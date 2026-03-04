from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Company, User, Role, UserRole, AuditLog, Notification, SystemSetting


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'email', 'country', 'currency', 'is_active']
    list_filter = ['is_active', 'country']
    search_fields = ['name', 'email']


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'first_name', 'last_name', 'company', 'is_company_admin', 'is_active']
    list_filter = ['is_active', 'is_company_admin', 'company']
    search_fields = ['email', 'first_name', 'last_name']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('ApexERP', {'fields': ('company', 'phone', 'department', 'job_title', 'language', 'timezone', 'theme', 'is_company_admin')}),
    )


@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'is_system']
    list_filter = ['company', 'is_system']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'user', 'action', 'model_name', 'object_id']
    list_filter = ['action', 'model_name']
    search_fields = ['user__email', 'object_id']
    readonly_fields = ['id', 'user', 'company', 'action', 'model_name', 'object_id', 'changes', 'ip_address', 'timestamp']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read']


@admin.register(SystemSetting)
class SystemSettingAdmin(admin.ModelAdmin):
    list_display = ['key', 'company', 'is_global']
    list_filter = ['is_global', 'company']
