from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LeadViewSet, SupplierPIViewSet, ClientQuotationViewSet,
    ClientPOViewSet, CommercialInvoiceViewSet, DeliveryViewSet,
)
from .pdf_api import generate_pdf_view

router = DefaultRouter()
router.register(r'leads', LeadViewSet)
router.register(r'supplier-pis', SupplierPIViewSet)
router.register(r'quotations', ClientQuotationViewSet)
router.register(r'client-pos', ClientPOViewSet)
router.register(r'invoices', CommercialInvoiceViewSet)
router.register(r'deliveries', DeliveryViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('generate-pdf/<str:doc_type>/', generate_pdf_view, name='generate-pdf'),
]
