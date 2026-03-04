from django.contrib import admin
from .models import Project, Milestone, Task, TaskComment, TimeEntry

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'status', 'priority', 'manager', 'progress']
    list_filter = ['status', 'priority']

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'project', 'status', 'priority', 'assigned_to', 'due_date']
    list_filter = ['status', 'priority', 'project']

@admin.register(TimeEntry)
class TimeEntryAdmin(admin.ModelAdmin):
    list_display = ['task', 'user', 'date', 'hours', 'is_billable']

admin.site.register(Milestone)
admin.site.register(TaskComment)
