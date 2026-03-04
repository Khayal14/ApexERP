from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'boms', views.BillOfMaterialsViewSet, basename='bom')
router.register(r'work-centers', views.WorkCenterViewSet, basename='work-center')
router.register(r'production-orders', views.ProductionOrderViewSet, basename='production-order')
router.register(r'work-orders', views.WorkOrderViewSet, basename='work-order')
router.register(r'quality-checks', views.QualityCheckViewSet, basename='quality-check')
router.register(r'maintenance', views.MaintenanceRecordViewSet, basename='maintenance')

urlpatterns = [path('', include(router.urls))]
