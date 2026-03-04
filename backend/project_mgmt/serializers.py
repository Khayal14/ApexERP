from rest_framework import serializers
from .models import Project, Milestone, Task, TaskComment, TimeEntry

class MilestoneSerializer(serializers.ModelSerializer):
    task_count = serializers.SerializerMethodField()
    class Meta:
        model = Milestone
        fields = '__all__'
    def get_task_count(self, obj):
        return obj.tasks.count()

class TaskCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    class Meta:
        model = TaskComment
        fields = '__all__'

class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True, default='')
    subtask_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    class Meta:
        model = Task
        fields = '__all__'
    def get_subtask_count(self, obj):
        return obj.subtasks.count()
    def get_comments_count(self, obj):
        return obj.comments.count()

class ProjectSerializer(serializers.ModelSerializer):
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True, default='')
    task_stats = serializers.SerializerMethodField()
    class Meta:
        model = Project
        fields = '__all__'
    def get_task_stats(self, obj):
        tasks = obj.tasks.all()
        return {
            'total': tasks.count(),
            'done': tasks.filter(status='done').count(),
            'in_progress': tasks.filter(status='in_progress').count(),
        }

class TimeEntrySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    task_title = serializers.CharField(source='task.title', read_only=True)
    class Meta:
        model = TimeEntry
        fields = '__all__'
