from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import Company, Role, UserRole, Notification, SystemSetting, AuditLog
from .serializers import (
    CompanySerializer, UserSerializer, UserCreateSerializer,
    RoleSerializer, NotificationSerializer, SystemSettingSerializer
)
from .permissions import IsCompanyAdmin, IsSameCompany

User = get_user_model()


class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyAdmin]

    def get_queryset(self):
        if self.request.user.is_superuser:
            return Company.objects.all()
        return Company.objects.filter(id__in=self.request.user.companies.values_list('id', flat=True))


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def get_queryset(self):
        if self.request.user.is_superuser:
            return User.objects.all()
        return User.objects.filter(company=self.request.user.company)

    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        if request.method == 'GET':
            return Response(UserSerializer(request.user).data)
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def assign_role(self, request, pk=None):
        user = self.get_object()
        role_id = request.data.get('role_id')
        try:
            role = Role.objects.get(id=role_id, company=request.user.company)
            UserRole.objects.get_or_create(user=user, role=role, defaults={'assigned_by': request.user})
            return Response({'status': 'Role assigned'})
        except Role.DoesNotExist:
            return Response({'error': 'Role not found'}, status=404)


class RoleViewSet(viewsets.ModelViewSet):
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyAdmin]

    def get_queryset(self):
        return Role.objects.filter(company=self.request.user.company)

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        self.get_queryset().filter(is_read=False).update(is_read=True)
        return Response({'status': 'All notifications marked as read'})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'Marked as read'})


class SystemSettingViewSet(viewsets.ModelViewSet):
    serializer_class = SystemSettingSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyAdmin]

    def get_queryset(self):
        return SystemSetting.objects.filter(
            Q(company=self.request.user.company) | Q(is_global=True)
        )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def health_check(request):
    from django.db import connection
    try:
        connection.ensure_connection()
        db_status = 'healthy'
    except Exception:
        db_status = 'unhealthy'

    from django.core.cache import cache
    try:
        cache.set('health_check', 'ok', 10)
        cache_status = 'healthy' if cache.get('health_check') == 'ok' else 'unhealthy'
    except Exception:
        cache_status = 'unhealthy'

    return Response({
        'status': 'ok' if db_status == 'healthy' else 'degraded',
        'database': db_status,
        'cache': cache_status,
        'version': '1.0.0',
    })


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        company = user.company
        data = {
            'user': UserSerializer(user).data,
            'company': CompanySerializer(company).data if company else None,
            'unread_notifications': Notification.objects.filter(user=user, is_read=False).count(),
            'modules': list(Role.objects.filter(
                role_users__user=user
            ).values_list('modules', flat=True).distinct()),
        }
        return Response(data)
