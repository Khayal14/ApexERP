from celery import shared_task
import logging
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger('apex_erp')


@shared_task
def check_overdue_tasks(company_id):
    """Check for overdue tasks and send notifications to assignees."""
    from .models import Task
    from notifications.models import Notification

    today = timezone.now().date()

    # Find overdue tasks
    overdue_tasks = Task.objects.filter(
        company_id=company_id,
        status__in=['backlog', 'todo', 'in_progress', 'review'],
        due_date__lt=today
    )

    notifications_sent = 0
    for task in overdue_tasks:
        if task.assigned_to:
            # Check if notification already sent today
            existing = Notification.objects.filter(
                company_id=company_id,
                user=task.assigned_to,
                notification_type='task_overdue',
                reference_id=str(task.id),
                created_at__date=today
            ).exists()

            if not existing:
                days_overdue = (today - task.due_date).days
                Notification.objects.create(
                    company_id=company_id,
                    user=task.assigned_to,
                    notification_type='task_overdue',
                    title=f'Task Overdue: {task.title}',
                    message=f'Task is {days_overdue} days overdue. Project: {task.project.name}',
                    reference_id=str(task.id),
                    reference_type='task'
                )
                notifications_sent += 1

    logger.info(f'Checked overdue tasks: {notifications_sent} notifications sent for company {company_id}')


@shared_task
def send_milestone_reminders(company_id):
    """Send reminders for upcoming project milestones."""
    from .models import Milestone
    from notifications.models import Notification

    today = timezone.now().date()
    upcoming_window = today + timedelta(days=3)

    # Find milestones due within next 3 days
    upcoming_milestones = Milestone.objects.filter(
        project__company_id=company_id,
        is_completed=False,
        due_date__gte=today,
        due_date__lte=upcoming_window
    )

    reminders_sent = 0
    for milestone in upcoming_milestones:
        # Send reminder to project manager
        project_manager = milestone.project.manager

        if project_manager:
            Notification.objects.create(
                company_id=company_id,
                user=project_manager,
                notification_type='milestone_reminder',
                title=f'Milestone Due: {milestone.name}',
                message=f'Milestone "{milestone.name}" in project {milestone.project.name} is due on {milestone.due_date}',
                reference_id=str(milestone.id),
                reference_type='milestone'
            )
            reminders_sent += 1

        # Notify project members
        for member in milestone.project.members.all():
            Notification.objects.create(
                company_id=company_id,
                user=member,
                notification_type='milestone_reminder',
                title=f'Milestone Due: {milestone.name}',
                message=f'Milestone "{milestone.name}" in project {milestone.project.name} is due on {milestone.due_date}',
                reference_id=str(milestone.id),
                reference_type='milestone'
            )
            reminders_sent += 1

    logger.info(f'Sent {reminders_sent} milestone reminders for company {company_id}')


@shared_task
def update_project_progress(company_id):
    """Update project progress based on task completion status."""
    from .models import Project, Task

    projects = Project.objects.filter(
        company_id=company_id,
        status__in=['planning', 'active']
    )

    progress_updates = 0
    for project in projects:
        tasks = project.tasks.all()

        if not tasks.exists():
            # No tasks, progress stays at current value
            continue

        # Calculate progress based on task status
        completed_tasks = tasks.filter(status='done').count()
        total_tasks = tasks.count()
        progress_percentage = int((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0

        if project.progress != progress_percentage:
            project.progress = progress_percentage
            project.save(update_fields=['progress'])
            progress_updates += 1

            logger.debug(
                f'Updated progress for project {project.code}: {progress_percentage}% '
                f'({completed_tasks}/{total_tasks} tasks completed)'
            )

    logger.info(f'Updated progress for {progress_updates} projects in company {company_id}')
