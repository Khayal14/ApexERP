from django.contrib import admin
from .models import Campaign, EmailTemplate, CampaignEmail, ABTest, LeadNurture, SocialPost

@admin.register(Campaign)
class CampaignAdmin(admin.ModelAdmin):
    list_display = ['name', 'campaign_type', 'status', 'budget', 'spent']
    list_filter = ['status', 'campaign_type']

admin.site.register(EmailTemplate)
admin.site.register(CampaignEmail)
admin.site.register(ABTest)
admin.site.register(LeadNurture)
admin.site.register(SocialPost)
