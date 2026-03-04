from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'contacts', views.ContactViewSet, basename='contact')
router.register(r'pipelines', views.PipelineViewSet, basename='pipeline')
router.register(r'deals', views.DealViewSet, basename='deal')
router.register(r'activities', views.ActivityViewSet, basename='activity')
router.register(r'campaigns', views.EmailCampaignViewSet, basename='campaign')
router.register(r'segments', views.CustomerSegmentViewSet, basename='segment')

urlpatterns = [path('', include(router.urls))]
