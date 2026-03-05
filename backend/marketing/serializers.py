from rest_framework import serializers
from .models import Campaign, EmailTemplate, CampaignEmail, ABTest, LeadNurture, SocialPost

AUTO_FIELDS = ('company', 'created_by', 'updated_by', 'created_at', 'updated_at')


class CampaignSerializer(serializers.ModelSerializer):
    roi = serializers.SerializerMethodField()
    class Meta:
        model = Campaign
        fields = '__all__'
        read_only_fields = AUTO_FIELDS
    def get_roi(self, obj):
        if obj.spent and obj.spent > 0:
            return round(float((obj.budget - obj.spent) / obj.spent * 100), 2)
        return 0

class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class CampaignEmailSerializer(serializers.ModelSerializer):
    open_rate = serializers.SerializerMethodField()
    click_rate = serializers.SerializerMethodField()
    class Meta:
        model = CampaignEmail
        fields = '__all__'
        read_only_fields = AUTO_FIELDS
    def get_open_rate(self, obj):
        return round(obj.open_count / max(obj.sent_count, 1) * 100, 2)
    def get_click_rate(self, obj):
        return round(obj.click_count / max(obj.sent_count, 1) * 100, 2)

class ABTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ABTest
        fields = '__all__'
        read_only_fields = AUTO_FIELDS

class LeadNurtureSerializer(serializers.ModelSerializer):
    conversion_rate = serializers.SerializerMethodField()
    class Meta:
        model = LeadNurture
        fields = '__all__'
        read_only_fields = AUTO_FIELDS
    def get_conversion_rate(self, obj):
        return round(obj.completed_count / max(obj.enrolled_count, 1) * 100, 2)

class SocialPostSerializer(serializers.ModelSerializer):
    engagement_rate = serializers.SerializerMethodField()
    class Meta:
        model = SocialPost
        fields = '__all__'
        read_only_fields = AUTO_FIELDS
    def get_engagement_rate(self, obj):
        total = obj.likes + obj.shares + obj.comments_count
        return round(total / max(obj.reach, 1) * 100, 2)
