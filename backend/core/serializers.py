from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from .models import Company, Role, UserRole, Notification, SystemSetting

User = get_user_model()


class ApexTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['name'] = user.get_full_name()
        token['company_id'] = str(user.company_id) if user.company_id else None
        token['is_admin'] = user.is_company_admin or user.is_superuser
        token['theme'] = user.theme
        token['language'] = user.language
        return token


class CompanyMiniSerializer(serializers.ModelSerializer):
    """Lightweight company representation used inside nested user data."""

    class Meta:
        model = Company
        fields = ['id', 'name', 'city', 'country', 'logo', 'parent']


class CompanySerializer(serializers.ModelSerializer):
    subsidiaries_count = serializers.SerializerMethodField()

    class Meta:
        model = Company
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_subsidiaries_count(self, obj):
        return obj.subsidiaries.count()


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    company_data = serializers.SerializerMethodField()
    accessible_companies = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'phone', 'avatar', 'company', 'company_data', 'accessible_companies',
            'department', 'job_title',
            'language', 'timezone', 'theme', 'is_company_admin', 'is_active',
            'last_active', 'mfa_enabled', 'roles', 'date_joined',
        ]
        read_only_fields = ['id', 'date_joined', 'last_active']
        extra_kwargs = {'password': {'write_only': True}}

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_roles(self, obj):
        return list(obj.user_roles.values_list('role__name', flat=True))

    def get_company_data(self, obj):
        """Nested company object so the frontend can show the company name."""
        if obj.company:
            return CompanyMiniSerializer(obj.company).data
        return None

    def get_accessible_companies(self, obj):
        """
        All companies this user can switch into (branch list).
        Includes their primary company + any explicitly assigned via M2M.
        """
        companies = obj.companies.filter(is_active=True)
        # Also include the primary company if not already in the M2M list
        if obj.company and not companies.filter(id=obj.company_id).exists():
            companies = companies | Company.objects.filter(id=obj.company_id)
        return CompanyMiniSerializer(companies.order_by('name'), many=True).data


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=10)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'username', 'first_name', 'last_name', 'password',
                  'password_confirm', 'phone', 'company', 'department', 'job_title']

    def validate(self, data):
        if data['password'] != data.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class RoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Role
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = '__all__'
