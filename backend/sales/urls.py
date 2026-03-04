from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'quotations', views.QuotationViewSet, basename='quotation')
router.register(r'orders', views.SalesOrderViewSet, basename='sales-order')
router.register(r'returns', views.ReturnOrderViewSet, basename='return-order')
router.register(r'pricing-rules', views.PricingRuleViewSet, basename='pricing-rule')

urlpatterns = [path('', include(router.urls))]
