import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from core.models import BaseModel


class Department(BaseModel):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    manager = models.ForeignKey('Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_departments')
    budget = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    description = models.TextField(blank=True)

    class Meta:
        unique_together = ['company', 'code']

    def __str__(self):
        return self.name


class JobPosition(BaseModel):
    title = models.CharField(max_length=200)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='positions')
    description = models.TextField(blank=True)
    requirements = models.TextField(blank=True)
    min_salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    max_salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    headcount = models.IntegerField(default=1)
    filled = models.IntegerField(default=0)

    def __str__(self):
        return self.title


class Employee(BaseModel):
    EMPLOYMENT_TYPES = [
        ('full_time', _('Full Time')), ('part_time', _('Part Time')),
        ('contract', _('Contract')), ('intern', _('Intern')),
    ]
    STATUS_CHOICES = [
        ('active', _('Active')), ('on_leave', _('On Leave')),
        ('terminated', _('Terminated')), ('suspended', _('Suspended')),
    ]
    employee_id = models.CharField(max_length=20, unique=True)
    user = models.OneToOneField('core.User', on_delete=models.CASCADE, null=True, blank=True, related_name='employee_profile')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=[('male', _('Male')), ('female', _('Female')), ('other', _('Other'))], blank=True)
    national_id = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name='employees')
    position = models.ForeignKey(JobPosition, on_delete=models.SET_NULL, null=True, related_name='employees')
    manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPES, default='full_time')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    hire_date = models.DateField()
    termination_date = models.DateField(null=True, blank=True)
    salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bank_account = models.CharField(max_length=50, blank=True)
    emergency_contact = models.JSONField(default=dict, blank=True)
    skills = models.JSONField(default=list, blank=True)
    photo = models.ImageField(upload_to='employees/', blank=True, null=True)

    class Meta:
        indexes = [
            models.Index(fields=['company', 'status']),
            models.Index(fields=['department']),
            models.Index(fields=['employee_id']),
        ]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_id})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class PayrollPeriod(BaseModel):
    name = models.CharField(max_length=100)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, default='draft', choices=[
        ('draft', _('Draft')), ('processing', _('Processing')),
        ('approved', _('Approved')), ('paid', _('Paid')),
    ])
    total_gross = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=18, decimal_places=2, default=0)
    total_net = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    def __str__(self):
        return self.name


class Payslip(BaseModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='payslips')
    period = models.ForeignKey(PayrollPeriod, on_delete=models.CASCADE, related_name='payslips')
    basic_salary = models.DecimalField(max_digits=12, decimal_places=2)
    allowances = models.JSONField(default=dict)
    deductions = models.JSONField(default=dict)
    gross_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default='draft', choices=[
        ('draft', _('Draft')), ('approved', _('Approved')), ('paid', _('Paid')),
    ])

    class Meta:
        unique_together = ['employee', 'period']

    def calculate(self):
        self.gross_salary = self.basic_salary + sum(self.allowances.values())
        self.total_deductions = sum(self.deductions.values()) + self.tax_amount
        self.net_salary = self.gross_salary - self.total_deductions
        return self


class LeaveType(BaseModel):
    name = models.CharField(max_length=100)
    days_per_year = models.IntegerField(default=21)
    is_paid = models.BooleanField(default=True)
    requires_approval = models.BooleanField(default=True)
    carry_forward = models.BooleanField(default=False)
    max_carry_forward_days = models.IntegerField(default=5)

    def __str__(self):
        return self.name


class LeaveRequest(BaseModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='leave_requests')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    days = models.DecimalField(max_digits=5, decimal_places=1)
    reason = models.TextField(blank=True)
    status = models.CharField(max_length=20, default='pending', choices=[
        ('pending', _('Pending')), ('approved', _('Approved')),
        ('rejected', _('Rejected')), ('cancelled', _('Cancelled')),
    ])
    approved_by = models.ForeignKey('core.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='+')

    class Meta:
        ordering = ['-start_date']


class Attendance(BaseModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance_records')
    date = models.DateField()
    check_in = models.DateTimeField(null=True, blank=True)
    check_out = models.DateTimeField(null=True, blank=True)
    hours_worked = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default='present', choices=[
        ('present', _('Present')), ('absent', _('Absent')),
        ('half_day', _('Half Day')), ('remote', _('Remote')),
    ])
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ['employee', 'date']
        ordering = ['-date']


class PerformanceReview(BaseModel):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, related_name='given_reviews')
    review_period = models.CharField(max_length=50)
    rating = models.IntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    goals = models.JSONField(default=list)
    achievements = models.TextField(blank=True)
    areas_of_improvement = models.TextField(blank=True)
    comments = models.TextField(blank=True)
    status = models.CharField(max_length=20, default='draft', choices=[
        ('draft', _('Draft')), ('submitted', _('Submitted')),
        ('acknowledged', _('Acknowledged')),
    ])

    class Meta:
        ordering = ['-created_at']


class Recruitment(BaseModel):
    """Job posting and recruitment tracking."""
    position = models.ForeignKey(JobPosition, on_delete=models.CASCADE, related_name='recruitments')
    title = models.CharField(max_length=200)
    description = models.TextField()
    requirements = models.TextField()
    location = models.CharField(max_length=200, blank=True)
    salary_range = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, default='open', choices=[
        ('draft', _('Draft')), ('open', _('Open')),
        ('closed', _('Closed')), ('filled', _('Filled')),
    ])
    deadline = models.DateField(null=True, blank=True)
    applicant_count = models.IntegerField(default=0)

    def __str__(self):
        return self.title


class Applicant(BaseModel):
    recruitment = models.ForeignKey(Recruitment, on_delete=models.CASCADE, related_name='applicants')
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    resume = models.FileField(upload_to='resumes/', blank=True)
    cover_letter = models.TextField(blank=True)
    stage = models.CharField(max_length=30, default='applied', choices=[
        ('applied', _('Applied')), ('screening', _('Screening')),
        ('interview', _('Interview')), ('assessment', _('Assessment')),
        ('offer', _('Offer')), ('hired', _('Hired')),
        ('rejected', _('Rejected')),
    ])
    rating = models.IntegerField(null=True, blank=True)
    notes = models.TextField(blank=True)
    ai_match_score = models.FloatField(null=True, blank=True, help_text='AI-calculated match score')

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
