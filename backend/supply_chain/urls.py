from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'vendors', views.VendorViewSet, basename='vendor')
router.register(r'purchase-orders', views.PurchaseOrderViewSet, basename='purchase-order')
router.register(r'rfqs', views.RFQViewSet, basename='rfq')
router.register(r'quotations', views.VendorQuotationViewSet, basename='quotation')
router.register(r'events', views.SupplyChainEventViewSet, basename='supply-chain-event')

urlpatterns = [path('', include(router.urls))]
