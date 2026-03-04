from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'projects', views.ProjectViewSet, basename='project')
router.register(r'milestones', views.MilestoneViewSet, basename='milestone')
router.register(r'tasks', views.TaskViewSet, basename='task')
router.register(r'time-entries', views.TimeEntryViewSet, basename='time-entry')

urlpatterns = [path('', include(router.urls))]
