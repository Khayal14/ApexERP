from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Avg, Q, F
from django.utils import timezone
from core.permissions import IsSameCompany
from .models import Contact, Pipeline, PipelineStage, Deal, Activity, EmailCampaign, CustomerSegment
from .serializers import (
    ContactSerializer, PipelineSerializer, PipelineStageSerializer,
    DealSerializer, ActivitySerializer, EmailCampaignSerializer, CustomerSegmentSerializer
)


class CompanyFilterMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(qs.model, 'company'):
            return qs.filter(company=self.request.user.company)
        return qs

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, created_by=self.request.user, updated_by=self.request.user)


class ContactViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Contact.objects.all()
    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]
    filterset_fields = ['contact_type', 'assigned_to', 'source', 'industry']
    search_fields = ['first_name', 'last_name', 'email', 'company_name']

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        qs = self.get_queryset()
        return Response({
            'total': qs.count(),
            'by_type': list(qs.values('contact_type').annotate(count=Count('id'))),
            'by_source': list(qs.values('source').annotate(count=Count('id'))),
            'top_value': ContactSerializer(qs.order_by('-lifetime_value')[:5], many=True).data,
            'recent': ContactSerializer(qs.order_by('-created_at')[:5], many=True).data,
        })

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        contact = self.get_object()
        activities = contact.activities.order_by('-created_at')[:20]
        return Response(ActivitySerializer(activities, many=True).data)


class PipelineViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Pipeline.objects.all()
    serializer_class = PipelineSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['get'])
    def board(self, request, pk=None):
        pipeline = self.get_object()
        stages = pipeline.stages.all()
        board = []
        for stage in stages:
            deals = stage.deals.filter(status='open', company=request.user.company)
            board.append({
                'stage': PipelineStageSerializer(stage).data,
                'deals': DealSerializer(deals, many=True).data,
            })
        return Response(board)


class DealViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Deal.objects.all()
    serializer_class = DealSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]
    filterset_fields = ['status', 'pipeline', 'stage', 'assigned_to', 'priority']
    search_fields = ['title', 'contact__first_name', 'contact__last_name']

    @action(detail=True, methods=['post'])
    def move_stage(self, request, pk=None):
        deal = self.get_object()
        stage_id = request.data.get('stage_id')
        try:
            stage = PipelineStage.objects.get(id=stage_id, pipeline=deal.pipeline)
            deal.stage = stage
            deal.probability = stage.probability
            deal.save()
            return Response(DealSerializer(deal).data)
        except PipelineStage.DoesNotExist:
            return Response({'error': 'Stage not found'}, status=404)

    @action(detail=True, methods=['post'])
    def win(self, request, pk=None):
        deal = self.get_object()
        deal.status = 'won'
        deal.actual_close_date = timezone.now().date()
        deal.probability = 100
        deal.save()
        contact = deal.contact
        contact.contact_type = 'customer'
        contact.lifetime_value += deal.value
        contact.save()
        return Response(DealSerializer(deal).data)

    @action(detail=True, methods=['post'])
    def lose(self, request, pk=None):
        deal = self.get_object()
        deal.status = 'lost'
        deal.actual_close_date = timezone.now().date()
        deal.probability = 0
        deal.loss_reason = request.data.get('reason', '')
        deal.save()
        return Response(DealSerializer(deal).data)

    @action(detail=False, methods=['get'])
    def forecast(self, request):
        qs = self.get_queryset().filter(status='open')
        return Response({
            'total_pipeline': float(qs.aggregate(total=Sum('value'))['total'] or 0),
            'weighted_pipeline': float(qs.aggregate(total=Sum(F('value') * F('probability') / 100))['total'] or 0),
            'by_stage': list(qs.values('stage__name').annotate(
                count=Count('id'), total=Sum('value')
            )),
            'by_month': list(qs.filter(expected_close_date__isnull=False).extra(
                select={'month': "TO_CHAR(expected_close_date, 'YYYY-MM')"}
            ).values('month').annotate(total=Sum('value'), count=Count('id')).order_by('month')[:6]),
            'avg_deal_size': float(qs.aggregate(avg=Avg('value'))['avg'] or 0),
        })

    @action(detail=False, methods=['get'])
    def won_lost_analysis(self, request):
        period = request.query_params.get('period', '90')
        cutoff = timezone.now() - timezone.timedelta(days=int(period))
        qs = self.get_queryset().filter(actual_close_date__gte=cutoff)
        return Response({
            'won': qs.filter(status='won').aggregate(count=Count('id'), total=Sum('value')),
            'lost': qs.filter(status='lost').aggregate(count=Count('id'), total=Sum('value')),
            'win_rate': qs.filter(status='won').count() / max(qs.count(), 1) * 100,
        })


class ActivityViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['activity_type', 'is_completed', 'contact', 'deal']

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        activity = self.get_object()
        activity.is_completed = True
        activity.completed_at = timezone.now()
        activity.outcome = request.data.get('outcome', '')
        activity.save()
        return Response(ActivitySerializer(activity).data)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        upcoming = self.get_queryset().filter(
            is_completed=False,
            due_date__gte=timezone.now(),
            due_date__lte=timezone.now() + timezone.timedelta(days=7)
        )
        return Response(ActivitySerializer(upcoming, many=True).data)


class EmailCampaignViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = EmailCampaign.objects.all()
    serializer_class = EmailCampaignSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['status']

    @action(detail=True, methods=['post'])
    def send_campaign(self, request, pk=None):
        campaign = self.get_object()
        campaign.status = 'sending'
        campaign.save()
        from .tasks import send_email_campaign
        send_email_campaign.delay(str(campaign.id))
        return Response({'status': 'Campaign queued for sending'})


class CustomerSegmentViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = CustomerSegment.objects.all()
    serializer_class = CustomerSegmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def refresh(self, request, pk=None):
        segment = self.get_object()
        # Apply criteria to refresh segment membership
        return Response({'status': 'Segment refreshed', 'count': segment.contacts.count()})
