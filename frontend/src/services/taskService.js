import api from '../config/api';

export const taskService = {
  // Get all tasks for a project
  getTasks: async (projectId) => {
    const response = await api.get(`/api/v1/tasks/${projectId}`);
    return response.data;
  },

  // Get task by ID
  getTaskById: async (projectId, taskId) => {
    const response = await api.get(`/api/v1/tasks/${projectId}/t/${taskId}`);
    return response.data;
  },

  // Create new task
  createTask: async (projectId, taskData) => {
    // If there are attachments, use FormData
    if (taskData.attachments && taskData.attachments.length > 0) {
      const formData = new FormData();
      
      // Add text fields
      formData.append('title', taskData.title);
      if (taskData.description) formData.append('description', taskData.description);
      formData.append('status', taskData.status);
      if (taskData.assignedTo) formData.append('assignedTo', taskData.assignedTo);
      
      // Add files
      taskData.attachments.forEach(file => {
        formData.append('attachments', file);
      });
      
      const response = await api.post(`/api/v1/tasks/${projectId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      // No attachments, send as JSON
      const response = await api.post(`/api/v1/tasks/${projectId}`, taskData);
      return response.data;
    }
  },

  // Update task
  updateTask: async (projectId, taskId, taskData) => {
    const response = await api.put(`/api/v1/tasks/${projectId}/t/${taskId}`, taskData);
    return response.data;
  },

  // Delete task
  deleteTask: async (projectId, taskId) => {
    const response = await api.delete(`/api/v1/tasks/${projectId}/t/${taskId}`);
    return response.data;
  },

  // Create subtask
  createSubtask: async (projectId, taskId, subtaskData) => {
    const response = await api.post(`/api/v1/tasks/${projectId}/t/${taskId}/subtasks`, subtaskData);
    return response.data;
  },

  // Update subtask
  updateSubtask: async (projectId, subtaskId, subtaskData) => {
    const response = await api.put(`/api/v1/tasks/${projectId}/st/${subtaskId}`, subtaskData);
    return response.data;
  },

  // Delete subtask
  deleteSubtask: async (projectId, subtaskId) => {
    const response = await api.delete(`/api/v1/tasks/${projectId}/st/${subtaskId}`);
    return response.data;
  },
};

