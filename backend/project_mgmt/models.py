import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Project(BaseModel):
    STATUS_CHOICES = [
        ('planning', _('Planning')), ('active', _('Active')),
        ('on_hold', _('On Hold')), ('completed', _('Completed')),
        ('cancelled', _('Cancelled')),
    ]
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planning')
    priority = models.CharField(max_length=10, default='medium', choices=[
        ('low', _('Low')), ('medium', _('Medium')), ('high', _('High')),
    ])
    manager = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, related_name='managed_projects')
    members = models.ManyToManyField('core.User', blank=True, related_name='projects')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    budget = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    spent = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    progress = models.IntegerField(default=0, help_text='Completion percentage')
    tags = models.JSONField(default=list)
    color = models.CharField(max_length=7, default='#3B82F6')

    class Meta:
        unique_together = ['company', 'code']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.code}: {self.name}"


class Milestone(BaseModel):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='milestones')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateField()
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['due_date']

    def __str__(self):
        return f"{self.project.code}: {self.name}"


class Task(BaseModel):
    PRIORITY_CHOICES = [
        ('low', _('Low')), ('medium', _('Medium')),
        ('high', _('High')), ('urgent', _('Urgent')),
    ]
    STATUS_CHOICES = [
        ('backlog', _('Backlog')), ('todo', _('To Do')),
        ('in_progress', _('In Progress')), ('review', _('In Review')),
        ('done', _('Done')),
    ]
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    milestone = models.ForeignKey(Milestone, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subtasks')
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='backlog')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    assigned_to = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    estimated_hours = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    actual_hours = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    tags = models.JSONField(default=list)
    order = models.IntegerField(default=0)
    ai_priority_score = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ['order', '-priority']
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['assigned_to', 'status']),
        ]

    def __str__(self):
        return self.title


class TaskComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey('core.User', on_delete=models.CASCADE)
    content = models.TextField()
    attachments = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']


class TimeEntry(BaseModel):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='time_entries')
    user = models.ForeignKey('core.User', on_delete=models.CASCADE, related_name='time_entries')
    date = models.DateField()
    hours = models.DecimalField(max_digits=5, decimal_places=2)
    description = models.TextField(blank=True)
    is_billable = models.BooleanField(default=True)

    class Meta:
        ordering = ['-date']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        task = self.task
        task.actual_hours = task.time_entries.aggregate(total=Sum('hours'))['total'] or 0
        task.save(update_fields=['actual_hours'])

from django.db.models import Sum
