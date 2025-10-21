import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { projectService } from '../services/projectService';
import Layout from '../components/layout/Layout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import { Plus, FolderKanban, Users, Calendar, MoreVertical, Trash2 } from 'lucide-react';
import { formatDate } from '../utils/helpers';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [creating, setCreating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchProjects();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectService.getProjects();
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      await projectService.createProject(formData);
      setShowCreateModal(false);
      setFormData({ name: '', description: '' });
      fetchProjects();
    } catch (error) {
      console.error('Failed to create project:', error);
      alert(error.response?.data?.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClick = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToDelete(project);
    setShowDeleteModal(true);
    setOpenDropdown(null);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    setDeleting(true);
    try {
      await projectService.deleteProject(projectToDelete.project._id);
      setShowDeleteModal(false);
      setProjectToDelete(null);
      fetchProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert(error.response?.data?.message || 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  const toggleDropdown = (e, projectId) => {
    e.preventDefault();
    e.stopPropagation();
    setOpenDropdown(openDropdown === projectId ? null : projectId);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Projects</h1>
            <p className="text-slate-300 mt-1">
              Manage and collaborate on your projects
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus size={20} />
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="mx-auto text-slate-600 mb-4" size={64} />
            <h3 className="text-xl font-semibold text-white mb-2">
              No projects yet
            </h3>
            <p className="text-slate-400 mb-4">
              Get started by creating your first project
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus size={20} />
              Create Project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((item) => (
              <div key={item.project?._id} className="relative">
                <Link
                  to={`/projects/${item.project?._id}`}
                  className="block"
                >
                  <Card className="group hover:shadow-2xl hover:shadow-primary-500/20 transition-all cursor-pointer h-full hover:border-primary-500/50">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary-400 transition-colors">
                          {item.project?.name}
                        </h3>
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {item.project?.description || 'No description'}
                        </p>
                      </div>
                      
                      {/* Three-dot menu button - only show for admins */}
                      {item.role === 'admin' && (
                        <div className="relative" ref={openDropdown === item.project._id ? dropdownRef : null}>
                          <button
                            onClick={(e) => toggleDropdown(e, item.project._id)}
                            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                          >
                            <MoreVertical size={18} />
                          </button>
                          
                          {/* Dropdown menu */}
                          {openDropdown === item.project._id && (
                            <div className="absolute right-0 top-8 w-48 bg-slate-800 rounded-lg shadow-xl border border-slate-700 z-10 overflow-hidden">
                              <button
                                onClick={(e) => handleDeleteClick(e, item)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-red-400 hover:bg-slate-700 transition-colors"
                              >
                                <Trash2 size={16} />
                                <span>Delete Project</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-4">
                      <div className="flex items-center gap-1">
                        <Users size={16} />
                        <span>{item.project?.members || 0} members</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        <span>{formatDate(item.project?.createdAt)}</span>
                      </div>
                    </div>

                    <div className="mt-3">
                      <span className={`badge badge-${item.role}`}>
                        {item.role === 'admin' ? 'Admin' : item.role === 'project_admin' ? 'Project Admin' : 'Member'}
                      </span>
                    </div>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Create Project Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Project"
        >
          <form onSubmit={handleCreateProject} className="space-y-4">
            <Input
              label="Project Name"
              placeholder="Enter project name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Description
              </label>
              <textarea
                className="input min-h-[100px]"
                placeholder="Enter project description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={creating} disabled={creating}>
                Create Project
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Project Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setProjectToDelete(null);
          }}
          title="Delete Project"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <Trash2 className="text-red-400" size={24} />
              <div>
                <p className="text-white font-medium">Warning: This action cannot be undone</p>
                <p className="text-sm text-slate-400 mt-1">
                  All project data including tasks, issues, comments, and chat messages will be permanently deleted.
                </p>
              </div>
            </div>

            <p className="text-slate-300">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-white">
                {projectToDelete?.project?.name}
              </span>
              ?
            </p>

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowDeleteModal(false);
                  setProjectToDelete(null);
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteProject}
                loading={deleting}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Project
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default Projects;

