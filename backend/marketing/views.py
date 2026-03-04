from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg
from core.permissions import IsSameCompany
from .models import Campaign, EmailTemplate, CampaignEmail, ABTest, LeadNurture, SocialPost
from .serializers import (
    CampaignSerializer, EmailTemplateSerializer, CampaignEmailSerializer,
    ABTestSerializer, LeadNurtureSerializer, SocialPostSerializer
)

class CompanyFilterMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(qs.model, 'company'):
            return qs.filter(company=self.request.user.company)
        return qs
    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, created_by=self.request.user, updated_by=self.request.user)

class CampaignViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Campaign.objects.all()
    serializer_class = CampaignSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]
    filterset_fields = ['status', 'campaign_type']
    search_fields = ['name']

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        qs = self.get_queryset()
        return Response({
            'total_campaigns': qs.count(),
            'active': qs.filter(status='active').count(),
            'total_budget': float(qs.aggregate(total=Sum('budget'))['total'] or 0),
            'total_spent': float(qs.aggregate(total=Sum('spent'))['total'] or 0),
            'by_type': list(qs.values('campaign_type').annotate(count=Count('id'))),
        })

class EmailTemplateViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = EmailTemplate.objects.all()
    serializer_class = EmailTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ['name', 'subject']

class CampaignEmailViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = CampaignEmail.objects.all()
    serializer_class = CampaignEmailSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['campaign', 'status']

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        email = self.get_object()
        email.status = 'sending'
        email.save()
        return Response({'status': 'Email queued for sending'})

class ABTestViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = ABTest.objects.all()
    serializer_class = ABTestSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['campaign', 'status']

class LeadNurtureViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = LeadNurture.objects.all()
    serializer_class = LeadNurtureSerializer
    permission_classes = [permissions.IsAuthenticated]

class SocialPostViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = SocialPost.objects.all()
    serializer_class = SocialPostSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['campaign', 'platform', 'status']

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        post = self.get_object()
        post.status = 'published'
        from django.utils import timezone
        post.published_at = timezone.now()
        post.save()
        return Response(SocialPostSerializer(post).data)
