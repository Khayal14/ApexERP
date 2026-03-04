from django.contrib import admin
from .models import Contact, Pipeline, PipelineStage, Deal, Activity, EmailCampaign, CustomerSegment

@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'email', 'contact_type', 'company_name', 'assigned_to']
    list_filter = ['contact_type', 'source']
    search_fields = ['first_name', 'last_name', 'email']

@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ['title', 'contact', 'stage', 'value', 'status', 'expected_close_date']
    list_filter = ['status', 'pipeline', 'priority']

@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['title', 'activity_type', 'contact', 'is_completed', 'due_date']
    list_filter = ['activity_type', 'is_completed']

admin.site.register(Pipeline)
admin.site.register(PipelineStage)
admin.site.register(EmailCampaign)
admin.site.register(CustomerSegment)
