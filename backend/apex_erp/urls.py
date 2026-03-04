from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('core.urls_auth')),
    path('api/core/', include('core.urls')),
    path('api/finance/', include('finance.urls')),
    path('api/hr/', include('hr.urls')),
    path('api/crm/', include('crm.urls')),
    path('api/supply-chain/', include('supply_chain.urls')),
    path('api/inventory/', include('inventory.urls')),
    path('api/manufacturing/', include('manufacturing.urls')),
    path('api/sales/', include('sales.urls')),
    path('api/projects/', include('project_mgmt.urls')),
    path('api/marketing/', include('marketing.urls')),
    path('api/analytics/', include('analytics.urls')),
    path('api/ecommerce/', include('ecommerce.urls')),
    path('api/ai/', include('ai_engine.urls')),
    path('api/health/', include('core.urls_health')),
    path('prometheus/', include('django_prometheus.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

admin.site.site_header = 'ApexERP Administration'
admin.site.site_title = 'ApexERP Admin'
admin.site.index_title = 'Dashboard'
