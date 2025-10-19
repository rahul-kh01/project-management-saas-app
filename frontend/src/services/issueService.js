import api from "../config/api";

export const issueService = {
  // List issues with filters and pagination
  list: async (projectId, params = {}) => {
    const queryParams = new URLSearchParams();

    if (params.type) {
      if (Array.isArray(params.type)) {
        params.type.forEach((t) => queryParams.append("type", t));
      } else {
        queryParams.append("type", params.type);
      }
    }

    if (params.status) {
      if (Array.isArray(params.status)) {
        params.status.forEach((s) => queryParams.append("status", s));
      } else {
        queryParams.append("status", params.status);
      }
    }

    if (params.priority) {
      if (Array.isArray(params.priority)) {
        params.priority.forEach((p) => queryParams.append("priority", p));
      } else {
        queryParams.append("priority", params.priority);
      }
    }

    if (params.assignee) queryParams.append("assignee", params.assignee);
    if (params.labels && params.labels.length > 0) {
      params.labels.forEach((l) => queryParams.append("labels", l));
    }
    if (params.search) queryParams.append("search", params.search);
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);
    if (params.sort) queryParams.append("sort", params.sort);

    const queryString = queryParams.toString();
    const url = `/api/v1/issues/${projectId}${queryString ? `?${queryString}` : ""}`;

    const response = await api.get(url);
    return response.data;
  },

  // Create new issue
  create: async (projectId, issueData) => {
    // If there are attachments, use FormData
    if (issueData.attachments && issueData.attachments.length > 0) {
      const formData = new FormData();

      // Add text fields
      formData.append("title", issueData.title);
      if (issueData.description)
        formData.append("description", issueData.description);
      if (issueData.type) formData.append("type", issueData.type);
      if (issueData.priority) formData.append("priority", issueData.priority);
      if (issueData.status) formData.append("status", issueData.status);
      if (issueData.assignee) formData.append("assignee", issueData.assignee);
      if (issueData.dueDate) formData.append("dueDate", issueData.dueDate);
      if (issueData.storyPoints)
        formData.append("storyPoints", issueData.storyPoints);

      // Add labels
      if (issueData.labels && issueData.labels.length > 0) {
        formData.append("labels", JSON.stringify(issueData.labels));
      }

      // Add files
      issueData.attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await api.post(`/api/v1/issues/${projectId}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return response.data;
    } else {
      // No attachments, send as JSON
      const response = await api.post(`/api/v1/issues/${projectId}`, issueData);
      return response.data;
    }
  },

  // Get issue by ID
  get: async (projectId, issueId) => {
    const response = await api.get(`/api/v1/issues/${projectId}/i/${issueId}`);
    return response.data;
  },

  // Update issue
  update: async (projectId, issueId, issueData) => {
    const response = await api.put(
      `/api/v1/issues/${projectId}/i/${issueId}`,
      issueData
    );
    return response.data;
  },

  // Delete issue
  remove: async (projectId, issueId) => {
    const response = await api.delete(
      `/api/v1/issues/${projectId}/i/${issueId}`
    );
    return response.data;
  },

  // Add comment
  addComment: async (projectId, issueId, commentData) => {
    // If there are attachments, use FormData
    if (commentData.attachments && commentData.attachments.length > 0) {
      const formData = new FormData();
      formData.append("body", commentData.body);

      // Add files
      commentData.attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await api.post(
        `/api/v1/issues/${projectId}/i/${issueId}/comments`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } else {
      const response = await api.post(
        `/api/v1/issues/${projectId}/i/${issueId}/comments`,
        commentData
      );
      return response.data;
    }
  },

  // List comments
  listComments: async (projectId, issueId, params = {}) => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append("page", params.page);
    if (params.limit) queryParams.append("limit", params.limit);

    const queryString = queryParams.toString();
    const url = `/api/v1/issues/${projectId}/i/${issueId}/comments${queryString ? `?${queryString}` : ""}`;

    const response = await api.get(url);
    return response.data;
  },

  // Transition issue status
  transition: async (projectId, issueId, transitionData) => {
    const response = await api.post(
      `/api/v1/issues/${projectId}/i/${issueId}/transition`,
      transitionData
    );
    return response.data;
  },

  // Watch issue
  watch: async (projectId, issueId) => {
    const response = await api.post(
      `/api/v1/issues/${projectId}/i/${issueId}/watch`
    );
    return response.data;
  },

  // Unwatch issue
  unwatch: async (projectId, issueId) => {
    const response = await api.delete(
      `/api/v1/issues/${projectId}/i/${issueId}/watch`
    );
    return response.data;
  },
};

