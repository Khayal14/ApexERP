import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import DataTable from '../components/common/DataTable';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import api from '../api/client';

const emptyProject = { name: '', code: '', description: '', status: 'planning', priority: 'medium', start_date: '', end_date: '', budget: '' };
const emptyTask = { title: '', project: '', status: 'todo', priority: 'medium', due_date: '', description: '' };

export default function ProjectsPage() {
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('projects');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyProject);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchData = () => {
    setLoading(true);
    Promise.all([
      api.get('/projects/projects/').catch(() => ({ data: { results: [] } })),
      api.get('/projects/tasks/').catch(() => ({ data: { results: [] } })),
    ]).then(([p, tk]) => {
      setProjects(p.data.results || []);
      setTasks(tk.data.results || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditItem(null);
    setForm(tab === 'projects' ? { ...emptyProject } : { ...emptyTask });
    setError('');
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    if (tab === 'projects') {
      setForm({ name: item.name || '', code: item.code || '', description: item.description || '', status: item.status || 'planning', priority: item.priority || 'medium', start_date: item.start_date || '', end_date: item.end_date || '', budget: item.budget || '' });
    } else {
      setForm({ title: item.title || '', project: item.project || '', status: item.status || 'todo', priority: item.priority || 'medium', due_date: item.due_date || '', description: item.description || '' });
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
      const endpoint = tab === 'projects' ? '/projects/projects/' : '/projects/tasks/';
      const payload = { ...form };
      // Convert empty numeric fields to 0
      ['budget'].forEach(k => {
        if (k in payload && (payload[k] === '' || payload[k] === null || payload[k] === undefined)) {
          payload[k] = 0;
        }
      });
      // Convert empty FK fields to null
      ['project'].forEach(k => {
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
      const endpoint = tab === 'projects' ? '/projects/projects/' : '/projects/tasks/';
      await api.delete(`${endpoint}${editItem.id}/`);
      setShowModal(false);
      fetchData();
    } catch { setError('Failed to delete'); }
  };

  const projectCols = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: t('common.name') },
    { key: 'status', label: t('common.status'), render: v => <StatusBadge status={v} /> },
    { key: 'priority', label: 'Priority' },
    { key: 'progress', label: 'Progress', render: v => `${v || 0}%` },
    { key: 'manager_name', label: 'Manager' },
  ];

  const taskCols = [
    { key: 'title', label: 'Task' },
    { key: 'status', label: 'Status', render: v => <StatusBadge status={v} /> },
    { key: 'priority', label: 'Priority' },
    { key: 'due_date', label: 'Due Date' },
  ];

  const projectOptions = projects.map(p => ({ value: p.id, label: p.name }));

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('nav.projects')}</h1>
        <Button onClick={openCreate}>{t('common.create')} {tab === 'projects' ? 'Project' : 'Task'}</Button>
      </div>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {['projects', 'tasks'].map(t2 => (
          <button key={t2} onClick={() => setTab(t2)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t2 ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t2.charAt(0).toUpperCase() + t2.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'projects' && <Card title="Projects"><DataTable columns={projectCols} data={projects} loading={loading} onRowClick={openEdit} /></Card>}
      {tab === 'tasks' && <Card title="Tasks"><DataTable columns={taskCols} data={tasks} loading={loading} onRowClick={openEdit} /></Card>}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={`${editItem ? 'Edit' : 'New'} ${tab === 'projects' ? 'Project' : 'Task'}`} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg whitespace-pre-line">{error}</div>}

          {tab === 'projects' ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Project Name" name="name" value={form.name} onChange={handleChange} required />
                <FormField label="Code" name="code" value={form.code} onChange={handleChange} required />
              </div>
              <FormField label="Description" name="description" type="textarea" value={form.description} onChange={handleChange} />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Status" name="status" type="select" value={form.status} onChange={handleChange} options={['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']} />
                <FormField label="Priority" name="priority" type="select" value={form.priority} onChange={handleChange} options={['low', 'medium', 'high', 'critical']} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Start Date" name="start_date" type="date" value={form.start_date} onChange={handleChange} />
                <FormField label="End Date" name="end_date" type="date" value={form.end_date} onChange={handleChange} />
              </div>
              <FormField label="Budget ($)" name="budget" type="number" value={form.budget} onChange={handleChange} />
            </>
          ) : (
            <>
              <FormField label="Task Title" name="title" value={form.title} onChange={handleChange} required />
              <FormField label="Project" name="project" type="select" value={form.project} onChange={handleChange} options={projectOptions} required />
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Status" name="status" type="select" value={form.status} onChange={handleChange} options={['todo', 'in_progress', 'in_review', 'done', 'blocked']} />
                <FormField label="Priority" name="priority" type="select" value={form.priority} onChange={handleChange} options={['low', 'medium', 'high', 'critical']} />
              </div>
              <FormField label="Due Date" name="due_date" type="date" value={form.due_date} onChange={handleChange} />
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
