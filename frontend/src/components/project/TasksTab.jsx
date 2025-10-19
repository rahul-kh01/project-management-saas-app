import { useState, useEffect } from 'react';
import { taskService } from '../../services/taskService';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Badge from '../common/Badge';
import TaskDetail from './TaskDetail';
import { Plus, Edit2, Trash2, CheckCircle2, Circle, Clock, Eye, Paperclip, X } from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import { TASK_STATUS, STATUS_LABELS } from '../../utils/constants';

const TasksTab = ({ projectId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: TASK_STATUS.TODO,
    attachments: [],
  });

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      const response = await taskService.getTasks(projectId);
      setTasks(response.data || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await taskService.createTask(projectId, formData);
      setShowCreateModal(false);
      setFormData({ title: '', description: '', status: TASK_STATUS.TODO, attachments: [] });
      fetchTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert(error.response?.data?.message || 'Failed to create task');
    }
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    try {
      await taskService.updateTask(projectId, selectedTask._id, formData);
      setShowEditModal(false);
      setSelectedTask(null);
      setFormData({ title: '', description: '', status: TASK_STATUS.TODO, attachments: [] });
      fetchTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
      alert(error.response?.data?.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await taskService.deleteTask(projectId, taskId);
      fetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert(error.response?.data?.message || 'Failed to delete task');
    }
  };

  const openEditModal = (task) => {
    setSelectedTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
    });
    setShowEditModal(true);
  };

  const openDetailModal = (task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file count (max 5)
    if (files.length > 5) {
      alert('Maximum 5 files allowed');
      return;
    }
    
    // Validate file size (1MB max per file)
    const validFiles = files.filter(file => {
      if (file.size > 1000000) {
        alert(`${file.name} is too large. Maximum file size is 1MB.`);
        return false;
      }
      return true;
    });
    
    setFormData({ ...formData, attachments: validFiles });
  };

  const removeFile = (index) => {
    const newFiles = formData.attachments.filter((_, i) => i !== index);
    setFormData({ ...formData, attachments: newFiles });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case TASK_STATUS.DONE:
        return <CheckCircle2 className="text-success-600" size={20} />;
      case TASK_STATUS.IN_PROGRESS:
        return <Clock className="text-primary-600" size={20} />;
      default:
        return <Circle className="text-neutral-400" size={20} />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Tasks</h2>
        <Button onClick={() => setShowCreateModal(true)} size="sm">
          <Plus size={16} />
          New Task
        </Button>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-slate-400">No tasks yet. Create your first task!</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <Card key={task._id} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(task.status)}
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{task.title}</h3>
                    {task.description && (
                      <p className="text-sm text-slate-400 mt-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant={task.status}>
                        {STATUS_LABELS[task.status]}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {formatDate(task.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDetailModal(task)}
                  >
                    <Eye size={14} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(task)}
                  >
                    <Edit2 size={14} />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteTask(task._id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Task"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Task Title"
            placeholder="Enter task title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description
            </label>
            <textarea
              className="input min-h-[100px]"
              placeholder="Enter task description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Status
            </label>
            <select
              className="input"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value={TASK_STATUS.TODO}>{STATUS_LABELS[TASK_STATUS.TODO]}</option>
              <option value={TASK_STATUS.IN_PROGRESS}>{STATUS_LABELS[TASK_STATUS.IN_PROGRESS]}</option>
              <option value={TASK_STATUS.DONE}>{STATUS_LABELS[TASK_STATUS.DONE]}</option>
            </select>
          </div>

          {/* File Attachments */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              <div className="flex items-center gap-2">
                <Paperclip size={16} />
                <span>Attachments (Max 5 files, 1MB each)</span>
              </div>
            </label>
            <input
              type="file"
              multiple
              accept="*/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-medium
                file:bg-primary-50 file:text-primary-700
                hover:file:bg-primary-100
                cursor-pointer border border-slate-600 rounded-lg"
            />
            
            {/* Selected Files Preview */}
            {formData.attachments && formData.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-sm font-medium text-slate-300">
                  {formData.attachments.length} file(s) selected:
                </p>
                {formData.attachments.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg border border-slate-700/50"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Paperclip size={14} className="text-neutral-400 flex-shrink-0" />
                      <span className="text-sm text-slate-300 truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-danger-500 hover:text-danger-700 p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Task</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Task"
      >
        <form onSubmit={handleUpdateTask} className="space-y-4">
          <Input
            label="Task Title"
            placeholder="Enter task title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description
            </label>
            <textarea
              className="input min-h-[100px]"
              placeholder="Enter task description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Status
            </label>
            <select
              className="input"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value={TASK_STATUS.TODO}>{STATUS_LABELS[TASK_STATUS.TODO]}</option>
              <option value={TASK_STATUS.IN_PROGRESS}>{STATUS_LABELS[TASK_STATUS.IN_PROGRESS]}</option>
              <option value={TASK_STATUS.DONE}>{STATUS_LABELS[TASK_STATUS.DONE]}</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Update Task</Button>
          </div>
        </form>
      </Modal>

      {/* Task Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTask(null);
        }}
        title=""
        size="lg"
      >
        {selectedTask && (
          <TaskDetail
            projectId={projectId}
            taskId={selectedTask._id}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedTask(null);
            }}
            onUpdate={fetchTasks}
          />
        )}
      </Modal>
    </div>
  );
};

export default TasksTab;

