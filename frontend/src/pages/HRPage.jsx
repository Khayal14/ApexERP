import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import api from '../api/client';

const emptyEmployee = { employee_id: '', first_name: '', last_name: '', email: '', phone: '', department: '', position: '', status: 'active', hire_date: '', salary: '', employment_type: 'full_time' };
const emptyDepartment = { name: '', code: '', description: '', manager: '' };

export default function HRPage() {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('employees');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyEmployee);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/hr/employees/').catch(() => ({ data: { results: [] } })),
      api.get('/hr/departments/').catch(() => ({ data: { results: [] } })),
    ]).then(([emp, dept]) => {
      setEmployees(emp.data.results || []);
      setDepartments(dept.data.results || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm(tab === 'employees' ? { ...emptyEmployee } : { ...emptyDepartment });
    setError('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    if (tab === 'employees') {
      setForm({ employee_id: item.employee_id || '', first_name: item.first_name || '', last_name: item.last_name || '', email: item.email || '', phone: item.phone || '', department: item.department || '', position: item.position || '', status: item.status || 'active', hire_date: item.hire_date || '', salary: item.salary || '', employment_type: item.employment_type || 'full_time' });
    } else {
      setForm({ name: item.name || '', code: item.code || '', description: item.description || '', manager: item.manager || '' });
    }
    setError('');
    setShowModal(true);
  };

  const handleChange = (name, value) => setForm(f => ({ ...f, [name]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const endpoint = tab === 'employees' ? '/hr/employees/' : '/hr/departments/';
      const payload = { ...form };
      // Convert empty numeric fields to 0
      ['salary'].forEach(k => {
        if (k in payload && (payload[k] === '' || payload[k] === null || payload[k] === undefined)) {
          payload[k] = 0;
        }
      });
      // Convert empty FK fields to null
      ['department', 'position', 'manager'].forEach(k => {
        if (k in payload && payload[k] === '') payload[k] = null;
      });
      if (editItem) {
        await api.put(`${endpoint}${editItem.id}/`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.entries(data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n') : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editItem || !confirm('Are you sure?')) return;
    try {
      const endpoint = tab === 'employees' ? '/hr/employees/' : '/hr/departments/';
      await api.delete(`${endpoint}${editItem.id}/`);
      setShowModal(false);
      fetchData();
    } catch { setError('Failed to delete'); }
  };

  const empCols = [
    { key: 'employee_id', label: 'ID' },
    { key: 'full_name', label: t('common.name') },
    { key: 'department_name', label: 'Department' },
    { key: 'position_title', label: 'Position' },
    { key: 'status', label: t('common.status'), render: v => <StatusBadge status={v} /> },
    { key: 'hire_date', label: 'Hire Date' },
  ];

  const deptCols = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'description', label: 'Description' },
  ];

  const deptOptions = departments.map(d => ({ value: d.id, label: d.name }));

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('hr.title')}</h1>
        <Button onClick={openCreate}>{t('common.create')} {tab === 'employees' ? 'Employee' : 'Department'}</Button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {['employees', 'departments'].map(t2 => (
          <button key={t2} onClick={() => setTab(t2)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t2 ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t2.charAt(0).toUpperCase() + t2.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'employees' && <Card title={t('hr.employees')}><DataTable columns={empCols} data={employees} loading={loading} onRowClick={openEdit} /></Card>}
      {tab === 'departments' && <Card title="Departments"><DataTable columns={deptCols} data={departments} loading={loading} onRowClick={openEdit} /></Card>}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editItem ? 'Edit' : 'New'} ${tab === 'employees' ? 'Employee' : 'Department'}`} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg whitespace-pre-line">{error}</div>}

          {tab === 'employees' ? (
            <>
              <FormField label="Employee ID" name="employee_id" value={form.employee_id} onChange={handleChange} required />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="First Name" name="first_name" value={form.first_name} onChange={handleChange} required />
                <FormField label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
                <FormField label="Phone" name="phone" value={form.phone} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Department" name="department" type="select" value={form.department} onChange={handleChange} options={deptOptions} />
                <FormField label="Employment Type" name="employment_type" type="select" value={form.employment_type} onChange={handleChange} options={['full_time', 'part_time', 'contract', 'intern']} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Hire Date" name="hire_date" type="date" value={form.hire_date} onChange={handleChange} required />
                <FormField label="Salary" name="salary" type="number" value={form.salary} onChange={handleChange} />
              </div>
              <FormField label="Status" name="status" type="select" value={form.status} onChange={handleChange} options={['active', 'on_leave', 'terminated', 'probation']} />
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Name" name="name" value={form.name} onChange={handleChange} required />
                <FormField label="Code" name="code" value={form.code} onChange={handleChange} required />
              </div>
              <FormField label="Description" name="description" type="textarea" value={form.description} onChange={handleChange} />
            </>
          )}

          <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>{editItem && <Button type="button" variant="danger" onClick={handleDelete}>Delete</Button>}</div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" loading={saving}>{editItem ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
