import api from '../config/api';

export const noteService = {
  // Get all notes for a project
  getNotes: async (projectId) => {
    const response = await api.get(`/api/v1/notes/${projectId}`);
    return response.data;
  },

  // Get note by ID
  getNoteById: async (projectId, noteId) => {
    const response = await api.get(`/api/v1/notes/${projectId}/n/${noteId}`);
    return response.data;
  },

  // Create new note
  createNote: async (projectId, noteData) => {
    const response = await api.post(`/api/v1/notes/${projectId}`, noteData);
    return response.data;
  },

  // Update note
  updateNote: async (projectId, noteId, noteData) => {
    const response = await api.put(`/api/v1/notes/${projectId}/n/${noteId}`, noteData);
    return response.data;
  },

  // Delete note
  deleteNote: async (projectId, noteId) => {
    const response = await api.delete(`/api/v1/notes/${projectId}/n/${noteId}`);
    return response.data;
  },
};

