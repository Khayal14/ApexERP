from rest_framework import serializers
from .models import Contact, Pipeline, PipelineStage, Deal, Activity, EmailCampaign, CustomerSegment


class ContactSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True, default='')
    deals_count = serializers.SerializerMethodField()

    class Meta:
        model = Contact
        fields = '__all__'

    def get_deals_count(self, obj):
        return obj.deals.count()


class PipelineStageSerializer(serializers.ModelSerializer):
    deals_count = serializers.SerializerMethodField()
    deals_value = serializers.SerializerMethodField()

    class Meta:
        model = PipelineStage
        fields = '__all__'

    def get_deals_count(self, obj):
        return obj.deals.filter(status='open').count()

    def get_deals_value(self, obj):
        return float(obj.deals.filter(status='open').aggregate(total=models.Sum('value'))['total'] or 0)


class PipelineSerializer(serializers.ModelSerializer):
    stages = PipelineStageSerializer(many=True, read_only=True)

    class Meta:
        model = Pipeline
        fields = '__all__'


class DealSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source='contact.full_name', read_only=True)
    stage_name = serializers.CharField(source='stage.name', read_only=True)
    weighted_value = serializers.SerializerMethodField()

    class Meta:
        model = Deal
        fields = '__all__'

    def get_weighted_value(self, obj):
        return float(obj.value * obj.probability / 100)


class ActivitySerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source='contact.full_name', read_only=True, default='')
    deal_title = serializers.CharField(source='deal.title', read_only=True, default='')

    class Meta:
        model = Activity
        fields = '__all__'


class EmailCampaignSerializer(serializers.ModelSerializer):
    open_rate = serializers.ReadOnlyField()
    click_rate = serializers.ReadOnlyField()

    class Meta:
        model = EmailCampaign
        fields = '__all__'


class CustomerSegmentSerializer(serializers.ModelSerializer):
    contact_count = serializers.SerializerMethodField()

    class Meta:
        model = CustomerSegment
        fields = '__all__'

    def get_contact_count(self, obj):
        return obj.contacts.count()
