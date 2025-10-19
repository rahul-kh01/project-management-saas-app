import api from '../config/api';

export const projectService = {
  // Get all projects
  getProjects: async () => {
    const response = await api.get('/api/v1/projects');
    return response.data;
  },

  // Get project by ID
  getProjectById: async (projectId) => {
    const response = await api.get(`/api/v1/projects/${projectId}`);
    return response.data;
  },

  // Create new project
  createProject: async (projectData) => {
    const response = await api.post('/api/v1/projects', projectData);
    return response.data;
  },

  // Update project
  updateProject: async (projectId, projectData) => {
    const response = await api.put(`/api/v1/projects/${projectId}`, projectData);
    return response.data;
  },

  // Delete project
  deleteProject: async (projectId) => {
    const response = await api.delete(`/api/v1/projects/${projectId}`);
    return response.data;
  },

  // Get project members
  getProjectMembers: async (projectId) => {
    const response = await api.get(`/api/v1/projects/${projectId}/members`);
    return response.data;
  },

  // Add member to project
  addMember: async (projectId, memberData) => {
    const response = await api.post(`/api/v1/projects/${projectId}/members`, memberData);
    return response.data;
  },

  // Update member role
  updateMemberRole: async (projectId, userId, newRole) => {
    const response = await api.put(`/api/v1/projects/${projectId}/members/${userId}`, { newRole });
    return response.data;
  },

  // Remove member from project
  removeMember: async (projectId, userId) => {
    const response = await api.delete(`/api/v1/projects/${projectId}/members/${userId}`);
    return response.data;
  },
};

