from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'dashboards', views.DashboardViewSet, basename='dashboard')
router.register(r'widgets', views.WidgetViewSet, basename='widget')
router.register(r'reports', views.ReportViewSet, basename='report')
router.register(r'kpis', views.KPIViewSet, basename='kpi')
router.register(r'exports', views.DataExportViewSet, basename='data-export')

urlpatterns = [path('', include(router.urls))]
