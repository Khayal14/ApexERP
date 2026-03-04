from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'campaigns', views.CampaignViewSet, basename='campaign')
router.register(r'email-templates', views.EmailTemplateViewSet, basename='email-template')
router.register(r'campaign-emails', views.CampaignEmailViewSet, basename='campaign-email')
router.register(r'ab-tests', views.ABTestViewSet, basename='ab-test')
router.register(r'lead-nurture', views.LeadNurtureViewSet, basename='lead-nurture')
router.register(r'social-posts', views.SocialPostViewSet, basename='social-post')

urlpatterns = [path('', include(router.urls))]
