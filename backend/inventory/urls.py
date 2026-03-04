from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'warehouses', views.WarehouseViewSet, basename='warehouse')
router.register(r'categories', views.ProductCategoryViewSet, basename='product-category')
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'stock-levels', views.StockLevelViewSet, basename='stock-level')
router.register(r'movements', views.StockMovementViewSet, basename='stock-movement')
router.register(r'counts', views.InventoryCountViewSet, basename='inventory-count')
router.register(r'forecasts', views.DemandForecastViewSet, basename='demand-forecast')

urlpatterns = [path('', include(router.urls))]
