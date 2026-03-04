from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from core.permissions import IsSameCompany
from .models import MLModel, PredictionLog, AIInsight
from .serializers import MLModelSerializer, PredictionLogSerializer, AIInsightSerializer
from .ml_models import LeadScorer, ExpenseCategorizer, TaskPrioritizer

class CompanyFilterMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(qs.model, 'company'):
            return qs.filter(company=self.request.user.company)
        return qs
    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, created_by=self.request.user, updated_by=self.request.user)

class MLModelViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = MLModel.objects.all()
    serializer_class = MLModelSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['model_type', 'is_active']

    @action(detail=False, methods=['get'])
    def status_overview(self, request):
        models = self.get_queryset()
        return Response({
            'total_models': models.count(),
            'active_models': models.filter(is_active=True).count(),
            'total_predictions': sum(m.prediction_count for m in models),
            'by_type': list(models.values('model_type').annotate(
                count=__import__('django.db.models', fromlist=['Count']).Count('id')
            )),
        })

class PredictionLogViewSet(CompanyFilterMixin, viewsets.ReadOnlyModelViewSet):
    queryset = PredictionLog.objects.all()
    serializer_class = PredictionLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['model', 'feedback']

class AIInsightViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = AIInsight.objects.all()
    serializer_class = AIInsightSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['module', 'insight_type', 'severity', 'is_acknowledged']

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        insight = self.get_object()
        insight.is_acknowledged = True
        insight.acknowledged_by = request.user
        insight.save()
        return Response(AIInsightSerializer(insight).data)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        from .tasks import generate_ai_insights
        generate_ai_insights.delay(str(request.user.company_id))
        return Response({'status': 'AI insight generation started'})

    @action(detail=False, methods=['post'])
    def score_lead(self, request):
        scorer = LeadScorer()
        result = scorer.score(request.data)
        return Response(result)

    @action(detail=False, methods=['post'])
    def categorize_expense(self, request):
        categorizer = ExpenseCategorizer()
        description = request.data.get('description', '')
        keywords_map = request.data.get('keywords_map', {})
        result = categorizer.categorize(description, keywords_map)
        return Response(result)

    @action(detail=False, methods=['post'])
    def prioritize_tasks(self, request):
        prioritizer = TaskPrioritizer()
        tasks_data = request.data.get('tasks', [])
        result = prioritizer.prioritize(tasks_data)
        return Response(result)
