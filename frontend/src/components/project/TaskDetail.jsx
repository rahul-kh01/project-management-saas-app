import { useState, useEffect } from 'react';
import { taskService } from '../../services/taskService';
import Card from '../common/Card';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Input from '../common/Input';
import Modal from '../common/Modal';
import { 
  X, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2,
  Calendar,
  User,
  FileText
} from 'lucide-react';
import { formatDate, formatDateTime } from '../../utils/helpers';
import { TASK_STATUS, STATUS_LABELS } from '../../utils/constants';

const TaskDetail = ({ projectId, taskId, onClose, onUpdate }) => {
  const [task, setTask] = useState(null);
  const [subtasks, setSubtasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');

  useEffect(() => {
    if (taskId) {
      fetchTaskDetail();
    }
  }, [taskId]);

  const fetchTaskDetail = async () => {
    try {
      const response = await taskService.getTaskById(projectId, taskId);
      setTask(response.data);
      // Note: Subtasks should be included in the task response
      setSubtasks(response.data.subtasks || []);
    } catch (error) {
      console.error('Failed to fetch task details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubtask = async (e) => {
    e.preventDefault();
    try {
      await taskService.createSubtask(projectId, taskId, { title: subtaskTitle });
      setShowSubtaskModal(false);
      setSubtaskTitle('');
      fetchTaskDetail();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to create subtask:', error);
      alert(error.response?.data?.message || 'Failed to create subtask');
    }
  };

  const handleToggleSubtask = async (subtaskId, currentStatus) => {
    try {
      await taskService.updateSubtask(projectId, subtaskId, { 
        isCompleted: !currentStatus 
      });
      fetchTaskDetail();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to update subtask:', error);
      alert(error.response?.data?.message || 'Failed to update subtask');
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    if (!window.confirm('Are you sure you want to delete this subtask?')) return;

    try {
      await taskService.deleteSubtask(projectId, subtaskId);
      fetchTaskDetail();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to delete subtask:', error);
      alert(error.response?.data?.message || 'Failed to delete subtask');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-600">Task not found</p>
      </div>
    );
  }

  const completedSubtasks = subtasks.filter(st => st.isCompleted).length;
  const totalSubtasks = subtasks.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-white mb-2">{task.title}</h2>
          <Badge variant={task.status}>{STATUS_LABELS[task.status]}</Badge>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      {/* Description */}
      {task.description && (
        <Card>
          <div className="flex items-start gap-3">
            <FileText className="text-slate-400 mt-1" size={20} />
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Description</h3>
              <p className="text-slate-700 whitespace-pre-wrap">{task.description}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Task Info */}
      <Card>
        <div className="space-y-3">
          {task.assignedTo && (
            <div className="flex items-center gap-3">
              <User className="text-slate-400" size={20} />
              <div>
                <p className="text-sm text-slate-500">Assigned to</p>
                <p className="text-white">{task.assignedTo.username}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar className="text-slate-400" size={20} />
            <div>
              <p className="text-sm text-slate-500">Created</p>
              <p className="text-white">{formatDateTime(task.createdAt)}</p>
            </div>
          </div>
          {task.updatedAt && task.updatedAt !== task.createdAt && (
            <div className="flex items-center gap-3">
              <Calendar className="text-slate-400" size={20} />
              <div>
                <p className="text-sm text-slate-500">Last updated</p>
                <p className="text-white">{formatDateTime(task.updatedAt)}</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Subtasks */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white">Subtasks</h3>
            {totalSubtasks > 0 && (
              <p className="text-sm text-slate-500 mt-1">
                {completedSubtasks} of {totalSubtasks} completed
              </p>
            )}
          </div>
          <Button size="sm" onClick={() => setShowSubtaskModal(true)}>
            <Plus size={16} />
            Add Subtask
          </Button>
        </div>

        {/* Progress Bar */}
        {totalSubtasks > 0 && (
          <div className="mb-4">
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Subtasks List */}
        {subtasks.length === 0 ? (
          <p className="text-center text-slate-500 py-4">No subtasks yet</p>
        ) : (
          <div className="space-y-2">
            {subtasks.map((subtask) => (
              <div
                key={subtask._id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/30 transition-colors"
              >
                <button
                  onClick={() => handleToggleSubtask(subtask._id, subtask.isCompleted)}
                  className="flex-shrink-0"
                >
                  {subtask.isCompleted ? (
                    <CheckCircle2 className="text-success-400" size={20} />
                  ) : (
                    <Circle className="text-slate-400" size={20} />
                  )}
                </button>
                <span
                  className={`flex-1 ${
                    subtask.isCompleted
                      ? 'text-slate-500 line-through'
                      : 'text-white'
                  }`}
                >
                  {subtask.title}
                </span>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteSubtask(subtask._id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* File Attachments (Placeholder) */}
      {task.attachments && task.attachments.length > 0 && (
        <Card>
          <h3 className="font-semibold text-white mb-3">Attachments</h3>
          <div className="space-y-2">
            {task.attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 rounded-lg border border-gray-200"
              >
                <FileText className="text-slate-400" size={20} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">
                    {file.url.split('/').pop()}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create Subtask Modal */}
      <Modal
        isOpen={showSubtaskModal}
        onClose={() => setShowSubtaskModal(false)}
        title="Add Subtask"
        size="sm"
      >
        <form onSubmit={handleCreateSubtask} className="space-y-4">
          <Input
            label="Subtask Title"
            placeholder="Enter subtask title"
            value={subtaskTitle}
            onChange={(e) => setSubtaskTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowSubtaskModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Subtask</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TaskDetail;

