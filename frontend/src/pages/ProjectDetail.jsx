import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../services/projectService';
import { taskService } from '../services/taskService';
import { noteService } from '../services/noteService';
import Layout from '../components/layout/Layout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { Settings, ArrowLeft } from 'lucide-react';
import TasksTab from '../components/project/TasksTab';
import NotesTab from '../components/project/NotesTab';
import MembersTab from '../components/project/MembersTab';
import OverviewTab from '../components/project/OverviewTab';
import IssuesTab from '../components/project/IssuesTab';
import IssueBoard from '../components/project/IssueBoard';
import ChatTab from '../components/project/ChatTab';

const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const response = await projectService.getProjectById(projectId);
      setProject(response.data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
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

  if (!project) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-neutral-900">Project not found</h2>
            <Button onClick={() => navigate('/projects')} className="mt-4">
              Back to Projects
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'issues', label: 'Issues' },
    { id: 'board', label: 'Board' },
    { id: 'chat', label: 'Chat' },
    { id: 'notes', label: 'Notes' },
    { id: 'members', label: 'Members' },
  ];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/projects')}
            className="mb-4"
          >
            <ArrowLeft size={16} />
            Back to Projects
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">{project.name}</h1>
              <p className="text-slate-300 mt-1">{project.description}</p>
            </div>
            <Button variant="outline">
              <Settings size={20} />
              Settings
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-700/50 mb-6">
          <nav className="flex gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 px-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary-400 text-primary-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && <OverviewTab project={project} projectId={projectId} />}
          {activeTab === 'tasks' && <TasksTab projectId={projectId} />}
          {activeTab === 'issues' && <IssuesTab projectId={projectId} />}
          {activeTab === 'board' && <IssueBoard projectId={projectId} />}
          {activeTab === 'chat' && <ChatTab projectId={projectId} />}
          {activeTab === 'notes' && <NotesTab projectId={projectId} />}
          {activeTab === 'members' && <MembersTab projectId={projectId} />}
        </div>
      </div>
    </Layout>
  );
};

export default ProjectDetail;

