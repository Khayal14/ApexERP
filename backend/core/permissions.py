from rest_framework import permissions


class IsCompanyAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_superuser or request.user.is_company_admin
        )


class IsSameCompany(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        if hasattr(obj, 'company'):
            return obj.company == request.user.company
        if hasattr(obj, 'company_id'):
            return obj.company_id == request.user.company_id
        return True


class HasModuleAccess(permissions.BasePermission):
    module_name = None

    def has_permission(self, request, view):
        if request.user.is_superuser:
            return True
        if not self.module_name:
            return True
        user_roles = request.user.user_roles.select_related('role').all()
        for ur in user_roles:
            if self.module_name in (ur.role.modules or []):
                return True
        return False


def module_permission(module_name):
    return type(f'{module_name}Permission', (HasModuleAccess,), {'module_name': module_name})
