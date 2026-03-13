from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProductViewSet, WarehouseViewSet, ProductCategoryViewSet,
    StockLevelViewSet, StockMovementViewSet, ProductBOMViewSet,
    CompanyCostSettingViewSet, ProductCostViewSet,
    GoodsReceiptViewSet, StockAlertViewSet,
    InterCompanyTransferViewSet, InventoryCountViewSet,
)

router = DefaultRouter()
router.register(r'products',       ProductViewSet,              basename='product')
router.register(r'warehouses',     WarehouseViewSet,            basename='warehouse')
router.register(r'categories',     ProductCategoryViewSet,      basename='category')
router.register(r'stock-levels',   StockLevelViewSet,           basename='stock-level')
router.register(r'movements',      StockMovementViewSet,        basename='movement')
router.register(r'bom',            ProductBOMViewSet,      basename='bom')
router.register(r'cost-settings',  CompanyCostSettingViewSet,   basename='cost-setting')
router.register(r'product-costs',  ProductCostViewSet,          basename='product-cost')
router.register(r'goods-receipts', GoodsReceiptViewSet,         basename='goods-receipt')
router.register(r'alerts',         StockAlertViewSet,           basename='alert')
router.register(r'transfers',      InterCompanyTransferViewSet, basename='transfer')
router.register(r'counts',         InventoryCountViewSet,       basename='count')

urlpatterns = [path('', include(router.urls))]
