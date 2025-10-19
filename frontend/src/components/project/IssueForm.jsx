import { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { Paperclip, X } from 'lucide-react';
import {
  ISSUE_TYPES,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  ISSUE_TYPE_LABELS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_LABELS,
} from '../../utils/constants';

const IssueForm = ({ onSubmit, onCancel, initialData = {}, isEdit = false }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: ISSUE_TYPES.TASK,
    priority: ISSUE_PRIORITIES.MEDIUM,
    status: ISSUE_STATUSES.BACKLOG,
    assignee: '',
    labels: [],
    dueDate: '',
    storyPoints: '',
    attachments: [],
    ...initialData,
  });

  const [labelInput, setLabelInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    if (files.length > 5) {
      alert('Maximum 5 files allowed');
      return;
    }

    const validFiles = files.filter((file) => {
      if (file.size > 5000000) {
        // 5MB max
        alert(`${file.name} is too large. Maximum file size is 5MB.`);
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

  const addLabel = () => {
    if (labelInput.trim() && !formData.labels.includes(labelInput.trim())) {
      setFormData({
        ...formData,
        labels: [...formData.labels, labelInput.trim()],
      });
      setLabelInput('');
    }
  };

  const removeLabel = (label) => {
    setFormData({
      ...formData,
      labels: formData.labels.filter((l) => l !== label),
    });
  };

  const handleLabelKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLabel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Title"
        placeholder="Enter issue title"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        required
      />

      <div>
        <label className="block text-sm font-medium text-slate-100 mb-1">
          Description
        </label>
        <textarea
          className="input min-h-[120px] bg-slate-900 text-slate-200 placeholder-slate-500 border border-slate-700"
          placeholder="Enter issue description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-100 mb-1">
            Type
          </label>
          <select
            className="input bg-slate-900 text-slate-200 border border-slate-700"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            {Object.entries(ISSUE_TYPES).map(([key, value]) => (
              <option key={value} value={value}>
                {ISSUE_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-100 mb-1">
            Priority
          </label>
          <select
            className="input bg-slate-900 text-slate-200 border border-slate-700"
            value={formData.priority}
            onChange={(e) =>
              setFormData({ ...formData, priority: e.target.value })
            }
          >
            {Object.entries(ISSUE_PRIORITIES).map(([key, value]) => (
              <option key={value} value={value}>
                {ISSUE_PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-slate-100 mb-1">
            Status
          </label>
          <select
            className="input bg-slate-900 text-slate-200 border border-slate-700"
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
          >
            {Object.entries(ISSUE_STATUSES).map(([key, value]) => (
              <option key={value} value={value}>
                {ISSUE_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-100 mb-1">
          Labels
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            className="input flex-1 bg-slate-900 text-slate-200 placeholder-slate-500 border border-slate-700"
            placeholder="Add a label"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyPress={handleLabelKeyPress}
          />
          <Button type="button" onClick={addLabel} size="sm">
            Add
          </Button>
        </div>
        {formData.labels.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.labels.map((label, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-primary-900 text-primary-300 rounded-full text-sm"
              >
                {label}
                <button
                  type="button"
                  onClick={() => removeLabel(label)}
                  className="hover:text-primary-400"
                >
                  <X size={14} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-100 mb-1">
            Due Date
          </label>
          <input
            type="date"
            className="input bg-slate-900 text-slate-200 border border-slate-700"
            value={formData.dueDate}
            onChange={(e) =>
              setFormData({ ...formData, dueDate: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-100 mb-1">
            Story Points
          </label>
          <input
            type="number"
            className="input bg-slate-900 text-slate-200 placeholder-slate-500 border border-slate-700"
            placeholder="0"
            min="0"
            value={formData.storyPoints}
            onChange={(e) =>
              setFormData({ ...formData, storyPoints: e.target.value })
            }
          />
        </div>
      </div>

      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-slate-100 mb-1">
            <div className="flex items-center gap-2">
              <Paperclip size={16} />
              <span>Attachments (Max 5 files, 5MB each)</span>
            </div>
          </label>
          <input
            type="file"
            multiple
            accept="*/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-medium
              file:bg-primary-900 file:text-primary-300
              hover:file:bg-primary-800
              cursor-pointer border border-slate-700 rounded-lg"
          />

          {formData.attachments && formData.attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-slate-100">
                {formData.attachments.length} file(s) selected:
              </p>
              {formData.attachments.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg border border-slate-700"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Paperclip
                      size={14}
                      className="text-slate-400 flex-shrink-0"
                    />
                    <span className="text-sm text-slate-200 truncate">
                      {file.name}
                    </span>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-danger-500 hover:text-danger-400 p-1"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{isEdit ? 'Update Issue' : 'Create Issue'}</Button>
      </div>
    </form>
  );
};

export default IssueForm;
