from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from core.permissions import IsSameCompany
from .models import Project, Milestone, Task, TaskComment, TimeEntry
from .serializers import (
    ProjectSerializer, MilestoneSerializer, TaskSerializer,
    TaskCommentSerializer, TimeEntrySerializer
)

class CompanyFilterMixin:
    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(qs.model, 'company'):
            return qs.filter(company=self.request.user.company)
        return qs
    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company, created_by=self.request.user, updated_by=self.request.user)

class ProjectViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated, IsSameCompany]
    filterset_fields = ['status', 'priority', 'manager']
    search_fields = ['name', 'code']

    @action(detail=True, methods=['get'])
    def board(self, request, pk=None):
        project = self.get_object()
        columns = {}
        for status_val, status_label in Task.STATUS_CHOICES:
            tasks = project.tasks.filter(status=status_val)
            columns[status_val] = TaskSerializer(tasks, many=True).data
        return Response(columns)

    @action(detail=True, methods=['get'])
    def gantt(self, request, pk=None):
        project = self.get_object()
        tasks = project.tasks.filter(start_date__isnull=False, due_date__isnull=False).values(
            'id', 'title', 'start_date', 'due_date', 'status', 'assigned_to__first_name', 'parent_id'
        )
        milestones = project.milestones.values('id', 'name', 'due_date', 'is_completed')
        return Response({'tasks': list(tasks), 'milestones': list(milestones)})

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        qs = self.get_queryset()
        return Response({
            'total_projects': qs.count(),
            'active': qs.filter(status='active').count(),
            'by_status': list(qs.values('status').annotate(count=Count('id'))),
            'overdue_tasks': Task.objects.filter(
                project__company=request.user.company, due_date__lt=timezone.now().date(),
                status__in=['backlog', 'todo', 'in_progress']
            ).count(),
            'total_budget': float(qs.aggregate(total=Sum('budget'))['total'] or 0),
            'total_spent': float(qs.aggregate(total=Sum('spent'))['total'] or 0),
        })

class MilestoneViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Milestone.objects.all()
    serializer_class = MilestoneSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['project', 'is_completed']

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        milestone = self.get_object()
        milestone.is_completed = True
        milestone.completed_at = timezone.now()
        milestone.save()
        return Response(MilestoneSerializer(milestone).data)

class TaskViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['project', 'status', 'priority', 'assigned_to', 'milestone']
    search_fields = ['title']

    @action(detail=True, methods=['post'])
    def add_comment(self, request, pk=None):
        task = self.get_object()
        comment = TaskComment.objects.create(
            task=task, author=request.user, content=request.data.get('content', '')
        )
        return Response(TaskCommentSerializer(comment).data, status=201)

    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        task = self.get_object()
        return Response(TaskCommentSerializer(task.comments.all(), many=True).data)

    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        tasks = self.get_queryset().filter(assigned_to=request.user, status__in=['todo', 'in_progress', 'review'])
        return Response(TaskSerializer(tasks, many=True).data)

class TimeEntryViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    queryset = TimeEntry.objects.all()
    serializer_class = TimeEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['task', 'user', 'date', 'is_billable']

    @action(detail=False, methods=['get'])
    def summary(self, request):
        project_id = request.query_params.get('project_id')
        qs = self.get_queryset()
        if project_id:
            qs = qs.filter(task__project_id=project_id)
        return Response({
            'total_hours': float(qs.aggregate(total=Sum('hours'))['total'] or 0),
            'billable_hours': float(qs.filter(is_billable=True).aggregate(total=Sum('hours'))['total'] or 0),
            'by_user': list(qs.values('user__first_name', 'user__last_name').annotate(total=Sum('hours'))),
        })
