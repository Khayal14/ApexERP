import uuid
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Dashboard',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('name', models.CharField(max_length=255)),
                ('description', models.TextField(blank=True)),
                ('layout', models.JSONField(default=list)),
                ('is_default', models.BooleanField(default=False)),
                ('is_shared', models.BooleanField(default=False)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dashboards', to='core.user')),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dashboard_set', to='core.company')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='dashboard_created', to='core.user')),
                ('updated_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='dashboard_updated', to='core.user')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='Widget',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('widget_type', models.CharField(max_length=50, choices=[
                    ('kpi', 'KPI Card'),
                    ('chart_line', 'Line Chart'),
                    ('chart_bar', 'Bar Chart'),
                    ('chart_pie', 'Pie Chart'),
                    ('table', 'Data Table'),
                    ('metric', 'Single Metric'),
                    ('gauge', 'Gauge'),
                    ('map', 'Map'),
                ])),
                ('title', models.CharField(max_length=255)),
                ('data_source', models.CharField(max_length=100)),
                ('query_config', models.JSONField(default=dict)),
                ('position', models.JSONField(default=dict)),
                ('size', models.JSONField(default=dict)),
                ('refresh_interval', models.IntegerField(default=300)),
                ('settings', models.JSONField(default=dict)),
                ('dashboard', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='widgets', to='analytics.dashboard')),
            ],
        ),
        migrations.CreateModel(
            name='Report',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('name', models.CharField(max_length=255)),
                ('report_type', models.CharField(max_length=20, choices=[
                    ('financial', 'Financial'),
                    ('sales', 'Sales'),
                    ('hr', 'HR'),
                    ('inventory', 'Inventory'),
                    ('custom', 'Custom'),
                ])),
                ('description', models.TextField(blank=True)),
                ('query_config', models.JSONField(default=dict)),
                ('filters', models.JSONField(default=dict)),
                ('columns', models.JSONField(default=list)),
                ('schedule', models.JSONField(blank=True, default=dict)),
                ('last_generated', models.DateTimeField(blank=True, null=True)),
                ('output_format', models.CharField(default='pdf', max_length=10, choices=[
                    ('pdf', 'PDF'),
                    ('excel', 'Excel'),
                    ('csv', 'CSV'),
                ])),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='report_set', to='core.company')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='report_created', to='core.user')),
                ('updated_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='report_updated', to='core.user')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='KPI',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('name', models.CharField(max_length=255)),
                ('module', models.CharField(max_length=50)),
                ('metric', models.CharField(max_length=100)),
                ('current_value', models.DecimalField(decimal_places=2, default=0, max_digits=18)),
                ('target_value', models.DecimalField(decimal_places=2, default=0, max_digits=18)),
                ('previous_value', models.DecimalField(decimal_places=2, default=0, max_digits=18)),
                ('unit', models.CharField(default='number', max_length=20)),
                ('trend', models.CharField(default='stable', max_length=10, choices=[
                    ('up', 'Up'),
                    ('down', 'Down'),
                    ('stable', 'Stable'),
                ])),
                ('last_calculated', models.DateTimeField(blank=True, null=True)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='kpi_set', to='core.company')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='kpi_created', to='core.user')),
                ('updated_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='kpi_updated', to='core.user')),
            ],
            options={
                'verbose_name': 'KPI',
                'verbose_name_plural': 'KPIs',
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='DataExport',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('name', models.CharField(max_length=255)),
                ('module', models.CharField(max_length=50)),
                ('export_format', models.CharField(max_length=10, choices=[
                    ('csv', 'CSV'),
                    ('excel', 'Excel'),
                    ('json', 'JSON'),
                ])),
                ('filters', models.JSONField(default=dict)),
                ('file_path', models.FileField(blank=True, upload_to='exports/')),
                ('status', models.CharField(default='pending', max_length=20, choices=[
                    ('pending', 'Pending'),
                    ('processing', 'Processing'),
                    ('completed', 'Completed'),
                    ('failed', 'Failed'),
                ])),
                ('row_count', models.IntegerField(default=0)),
                ('requested_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='exports', to='core.user')),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dataexport_set', to='core.company')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='dataexport_created', to='core.user')),
                ('updated_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='dataexport_updated', to='core.user')),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
