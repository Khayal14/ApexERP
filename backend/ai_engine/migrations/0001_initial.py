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
            name='MLModel',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('name', models.CharField(max_length=255)),
                ('model_type', models.CharField(max_length=50, choices=[
                    ('demand_forecast', 'Demand Forecasting'),
                    ('lead_scoring', 'Lead Scoring'),
                    ('expense_categorization', 'Expense Categorization'),
                    ('talent_matching', 'Talent Matching'),
                    ('price_optimization', 'Price Optimization'),
                    ('sentiment_analysis', 'Sentiment Analysis'),
                    ('task_prioritization', 'Task Prioritization'),
                ])),
                ('version', models.CharField(max_length=20)),
                ('file_path', models.CharField(blank=True, max_length=500)),
                ('accuracy', models.FloatField(blank=True, null=True)),
                ('parameters', models.JSONField(default=dict)),
                ('training_data_info', models.JSONField(default=dict)),
                ('last_trained', models.DateTimeField(blank=True, null=True)),
                ('last_used', models.DateTimeField(blank=True, null=True)),
                ('prediction_count', models.IntegerField(default=0)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='mlmodel_set', to='core.company')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='mlmodel_created', to='core.user')),
                ('updated_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='mlmodel_updated', to='core.user')),
            ],
            options={
                'abstract': False,
                'unique_together': {('company', 'model_type', 'version')},
            },
        ),
        migrations.CreateModel(
            name='PredictionLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('input_data', models.JSONField()),
                ('output_data', models.JSONField()),
                ('confidence', models.FloatField(blank=True, null=True)),
                ('feedback', models.CharField(blank=True, max_length=20, choices=[
                    ('correct', 'Correct'),
                    ('incorrect', 'Incorrect'),
                    ('partial', 'Partial'),
                ])),
                ('processing_time_ms', models.IntegerField(blank=True, null=True)),
                ('model', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='predictions', to='ai_engine.mlmodel')),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='predictionlog_set', to='core.company')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='predictionlog_created', to='core.user')),
                ('updated_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='predictionlog_updated', to='core.user')),
            ],
            options={
                'ordering': ['-created_at'],
                'abstract': False,
            },
        ),
        migrations.CreateModel(
            name='AIInsight',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('module', models.CharField(max_length=50)),
                ('insight_type', models.CharField(max_length=50, choices=[
                    ('anomaly', 'Anomaly Detection'),
                    ('trend', 'Trend Analysis'),
                    ('recommendation', 'Recommendation'),
                    ('forecast', 'Forecast'),
                    ('optimization', 'Optimization'),
                ])),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('data', models.JSONField(default=dict)),
                ('severity', models.CharField(default='info', max_length=20, choices=[
                    ('info', 'Info'),
                    ('warning', 'Warning'),
                    ('critical', 'Critical'),
                ])),
                ('is_acknowledged', models.BooleanField(default=False)),
                ('acknowledged_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='core.user')),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='aiinsight_set', to='core.company')),
                ('created_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='aiinsight_created', to='core.user')),
                ('updated_by', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='aiinsight_updated', to='core.user')),
            ],
            options={
                'ordering': ['-created_at'],
                'abstract': False,
            },
        ),
    ]
