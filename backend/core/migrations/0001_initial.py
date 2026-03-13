import django.contrib.auth.models
import django.contrib.auth.validators
import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='Company',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=255, verbose_name='company name')),
                ('legal_name', models.CharField(blank=True, max_length=255, verbose_name='legal name')),
                ('tax_id', models.CharField(blank=True, max_length=50, verbose_name='tax ID')),
                ('email', models.EmailField(blank=True, max_length=254, verbose_name='email')),
                ('phone', models.CharField(blank=True, max_length=30, verbose_name='phone')),
                ('website', models.URLField(blank=True, verbose_name='website')),
                ('address', models.TextField(blank=True, verbose_name='address')),
                ('city', models.CharField(blank=True, max_length=100, verbose_name='city')),
                ('country', models.CharField(blank=True, max_length=100, verbose_name='country')),
                ('currency', models.CharField(default='USD', max_length=3, verbose_name='currency')),
                ('logo', models.ImageField(blank=True, null=True, upload_to='company_logos/', verbose_name='logo')),
                ('timezone', models.CharField(default='UTC', max_length=50, verbose_name='timezone')),
                ('fiscal_year_start', models.IntegerField(default=1, verbose_name='fiscal year start month')),
                ('is_active', models.BooleanField(default=True, verbose_name='active')),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='subsidiaries', to='core.company')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'company',
                'verbose_name_plural': 'companies',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='User',
            fields=[
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('last_login', models.DateTimeField(blank=True, null=True, verbose_name='last login')),
                ('is_superuser', models.BooleanField(
                    default=False,
                    help_text='Designates that this user has all permissions without explicitly assigning them.',
                    verbose_name='superuser status',
                )),
                ('username', models.CharField(
                    error_messages={'unique': 'A user with that username already exists.'},
                    help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.',
                    max_length=150,
                    unique=True,
                    validators=[django.contrib.auth.validators.UnicodeUsernameValidator()],
                    verbose_name='username',
                )),
                ('first_name', models.CharField(blank=True, max_length=150, verbose_name='first name')),
                ('last_name', models.CharField(blank=True, max_length=150, verbose_name='last name')),
                ('is_staff', models.BooleanField(
                    default=False,
                    help_text='Designates whether the user can log into this admin site.',
                    verbose_name='staff status',
                )),
                ('is_active', models.BooleanField(
                    default=True,
                    help_text='Designates whether this user should be treated as active. Unselect this instead of deleting accounts.',
                    verbose_name='active',
                )),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date joined')),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('email', models.EmailField(max_length=254, unique=True, verbose_name='email address')),
                ('phone', models.CharField(blank=True, max_length=30, verbose_name='phone')),
                ('avatar', models.ImageField(blank=True, null=True, upload_to='avatars/', verbose_name='avatar')),
                ('department', models.CharField(blank=True, max_length=100, verbose_name='department')),
                ('job_title', models.CharField(blank=True, max_length=100, verbose_name='job_title')),
                ('language', models.CharField(
                    choices=[('en', 'English'), ('ar', 'العربية')],
                    default='en',
                    max_length=10,
                    verbose_name='language',
                )),
                ('timezone', models.CharField(default='UTC', max_length=50, verbose_name='timezone')),
                ('theme', models.CharField(
                    choices=[('light', 'Light'), ('dark', 'Dark'), ('system', 'System')],
                    default='light',
                    max_length=10,
                    verbose_name='theme',
                )),
                ('is_company_admin', models.BooleanField(default=False, verbose_name='company admin')),
                ('last_active', models.DateTimeField(blank=True, null=True, verbose_name='last active')),
                ('mfa_enabled', models.BooleanField(default=False, verbose_name='MFA enabled')),
                ('mfa_secret', models.CharField(blank=True, max_length=32)),
                ('company', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='users',
                    to='core.company',
                )),
                ('groups', models.ManyToManyField(
                    blank=True,
                    help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.',
                    related_name='user_set',
                    related_query_name='user',
                    to='auth.group',
                    verbose_name='groups',
                )),
                ('user_permissions', models.ManyToManyField(
                    blank=True,
                    help_text='Specific permissions for this user.',
                    related_name='user_set',
                    related_query_name='user',
                    to='auth.permission',
                    verbose_name='user permissions',
                )),
            ],
            options={
                'verbose_name': 'user',
                'verbose_name_plural': 'users',
            },
            managers=[
                ('objects', django.contrib.auth.models.UserManager()),
            ],
        ),
        migrations.AddField(
            model_name='user',
            name='companies',
            field=models.ManyToManyField(blank=True, related_name='all_users', to='core.company'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['email'], name='core_user_email_9de97f_idx'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['company'], name='core_user_company_3f2a8b_idx'),
        ),
        migrations.CreateModel(
            name='Role',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100, verbose_name='role name')),
                ('description', models.TextField(blank=True, verbose_name='description')),
                ('modules', models.JSONField(
                    default=list,
                    help_text='List of module names this role can access',
                    verbose_name='accessible modules',
                )),
                ('is_system', models.BooleanField(default=False, verbose_name='system role')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('company', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='roles', to='core.company')),
                ('permissions', models.ManyToManyField(blank=True, to='auth.permission')),
            ],
            options={
                'verbose_name': 'role',
                'verbose_name_plural': 'roles',
                'unique_together': {('name', 'company')},
            },
        ),
        migrations.CreateModel(
            name='UserRole',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('assigned_at', models.DateTimeField(auto_now_add=True)),
                ('assigned_by', models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='+',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('role', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='role_users', to='core.role')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='user_roles', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('user', 'role')},
            },
        ),
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('action', models.CharField(max_length=50)),
                ('model_name', models.CharField(max_length=100)),
                ('object_id', models.CharField(max_length=255)),
                ('changes', models.JSONField(default=dict)),
                ('ip_address', models.GenericIPAddressField(null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('timestamp', models.DateTimeField(auto_now_add=True)),
                ('company', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to='core.company')),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-timestamp'],
            },
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['-timestamp'], name='core_audit_ts_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['user', '-timestamp'], name='core_audit_user_ts_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['model_name', 'object_id'], name='core_audit_model_idx'),
        ),
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('notification_type', models.CharField(
                    choices=[('info', 'Info'), ('warning', 'Warning'), ('error', 'Error'), ('success', 'Success')],
                    default='info',
                    max_length=50,
                )),
                ('module', models.CharField(blank=True, max_length=50)),
                ('link', models.CharField(blank=True, max_length=500)),
                ('is_read', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', 'is_read', '-created_at'], name='core_notif_user_read_idx'),
        ),
        migrations.CreateModel(
            name='SystemSetting',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(max_length=255)),
                ('value', models.JSONField()),
                ('description', models.TextField(blank=True)),
                ('is_global', models.BooleanField(default=False)),
                ('company', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    to='core.company',
                )),
            ],
            options={
                'unique_together': {('company', 'key')},
            },
        ),
    ]
