import { useState, useEffect } from 'react';
import { taskService } from '../../services/taskService';
import { noteService } from '../../services/noteService';
import { projectService } from '../../services/projectService';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { CheckSquare, FileText, Users, Calendar } from 'lucide-react';
import { formatDate } from '../../utils/helpers';

const OverviewTab = ({ project, projectId }) => {
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    totalNotes: 0,
    totalMembers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [projectId]);

  const fetchStats = async () => {
    try {
      const [tasksResponse, notesResponse, membersResponse] = await Promise.all([
        taskService.getTasks(projectId).catch(() => ({ data: [] })),
        noteService.getNotes(projectId).catch(() => ({ data: [] })),
        projectService.getProjectMembers(projectId).catch(() => ({ data: [] })),
      ]);

      const tasks = tasksResponse.data || [];
      const notes = notesResponse.data || [];
      const members = membersResponse.data || [];

      setStats({
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === 'done').length,
        inProgressTasks: tasks.filter((t) => t.status === 'in_progress').length,
        totalNotes: notes.length,
        totalMembers: members.length,
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
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
    <div className="space-y-6">
      {/* Project Info */}
      <Card>
        <h2 className="text-xl font-semibold text-white mb-4">Project Information</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar size={18} />
            <span>Created on {formatDate(project.createdAt)}</span>
          </div>
          <div>
            <span className="text-slate-400">Description:</span>
            <p className="mt-1 text-white">
              {project.description || 'No description provided'}
            </p>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-primary-500/10 border-primary-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-400 font-medium">Total Tasks</p>
              <p className="text-3xl font-bold text-white mt-1">
                {stats.totalTasks}
              </p>
            </div>
            <CheckSquare className="text-primary-400" size={40} />
          </div>
        </Card>

        <Card className="bg-success-500/10 border-success-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-success-400 font-medium">Completed</p>
              <p className="text-3xl font-bold text-white mt-1">
                {stats.completedTasks}
              </p>
            </div>
            <CheckSquare className="text-success-400" size={40} />
          </div>
        </Card>

        <Card className="bg-warning-500/10 border-warning-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-warning-400 font-medium">In Progress</p>
              <p className="text-3xl font-bold text-white mt-1">
                {stats.inProgressTasks}
              </p>
            </div>
            <CheckSquare className="text-warning-400" size={40} />
          </div>
        </Card>

        <Card className="bg-secondary-500/10 border-secondary-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary-400 font-medium">Notes</p>
              <p className="text-3xl font-bold text-white mt-1">
                {stats.totalNotes}
              </p>
            </div>
            <FileText className="text-secondary-400" size={40} />
          </div>
        </Card>
      </div>

      {/* Team Size */}
      <Card>
        <div className="flex items-center gap-3">
          <Users className="text-primary-400" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-white">Team Members</h3>
            <p className="text-slate-400">{stats.totalMembers} members in this project</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OverviewTab;

