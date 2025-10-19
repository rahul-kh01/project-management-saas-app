import { useState, useEffect } from 'react';
import { issueService } from '../../services/issueService';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import IssueForm from './IssueForm';
import IssueDetail from './IssueDetail';
import {
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Bug,
  CheckSquare,
  BookOpen,
  Layers,
} from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import {
  ISSUE_TYPES,
  ISSUE_STATUSES,
  ISSUE_PRIORITIES,
  ISSUE_TYPE_LABELS,
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITY_LABELS,
} from '../../utils/constants';

const IssuesTab = ({ projectId }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filters and pagination
  const [filters, setFilters] = useState({
    search: '',
    type: [],
    status: [],
    priority: [],
    page: 1,
    limit: 20,
  });

  const [pagination, setPagination] = useState({
    total: 0,
    hasMore: false,
  });

  useEffect(() => {
    fetchIssues();
  }, [projectId, filters]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const response = await issueService.list(projectId, filters);
      setIssues(response.data.data || []);
      setPagination({
        total: response.data.total || 0,
        hasMore: response.data.hasMore || false,
      });
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIssue = async (issueData) => {
    try {
      await issueService.create(projectId, issueData);
      setShowCreateModal(false);
      fetchIssues();
    } catch (error) {
      console.error('Failed to create issue:', error);
      alert(error.response?.data?.message || 'Failed to create issue');
    }
  };

  const openDetailModal = (issue) => {
    setSelectedIssue(issue);
    setShowDetailModal(true);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
      page: 1, // Reset to first page on filter change
    }));
  };

  const toggleFilter = (filterType, value) => {
    setFilters((prev) => {
      const currentValues = prev[filterType];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];

      return {
        ...prev,
        [filterType]: newValues,
        page: 1,
      };
    });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      type: [],
      status: [],
      priority: [],
      page: 1,
      limit: 20,
    });
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case ISSUE_TYPES.BUG:
        return <Bug size={16} className="text-danger-400" />;
      case ISSUE_TYPES.STORY:
        return <BookOpen size={16} className="text-success-400" />;
      case ISSUE_TYPES.EPIC:
        return <Layers size={16} className="text-secondary-400" />;
      default:
        return <CheckSquare size={16} className="text-primary-400" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case ISSUE_PRIORITIES.HIGHEST:
        return 'bg-danger-500/20 text-danger-400 border border-danger-500/30';
      case ISSUE_PRIORITIES.HIGH:
        return 'bg-warning-500/20 text-warning-400 border border-warning-500/30';
      case ISSUE_PRIORITIES.MEDIUM:
        return 'bg-warning-400/20 text-warning-300 border border-warning-400/30';
      case ISSUE_PRIORITIES.LOW:
        return 'bg-success-500/20 text-success-400 border border-success-500/30';
      case ISSUE_PRIORITIES.LOWEST:
        return 'bg-slate-700/50 text-slate-400 border border-slate-600/50';
      default:
        return 'bg-slate-700/50 text-slate-400 border border-slate-600/50';
    }
  };

  if (loading && filters.page === 1) {
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
        <h2 className="text-xl font-semibold text-slate-100">Issues</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filters
          </Button>
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Plus size={16} />
            New Issue
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-6">
          <div className="space-y-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Search
              </label>
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500"
                />
                <input
                  type="text"
                  className="input pl-10 bg-slate-900 text-slate-200 placeholder-slate-500 border border-slate-700"
                  placeholder="Search issues..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Type
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ISSUE_TYPES).map(([key, value]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleFilter('type', value)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filters.type.includes(value)
                        ? 'bg-primary-600 text-slate-100'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {ISSUE_TYPE_LABELS[value]}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Status
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ISSUE_STATUSES).map(([key, value]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleFilter('status', value)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filters.status.includes(value)
                        ? 'bg-primary-600 text-slate-100'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {ISSUE_STATUS_LABELS[value]}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Priority
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(ISSUE_PRIORITIES).map(([key, value]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleFilter('priority', value)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      filters.priority.includes(value)
                        ? 'bg-primary-600 text-slate-100'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
                    }`}
                  >
                    {ISSUE_PRIORITY_LABELS[value]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      )}
      {/* Issues List */}
      {issues.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <p className="text-slate-400">No issues found. Create your first issue!</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {issues.map((issue) => (
              <Card
                key={issue._id}
                className="hover:shadow-md transition-shadow cursor-pointer bg-slate-800/50 border border-slate-700"
                onClick={() => openDetailModal(issue)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getTypeIcon(issue.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-500">
                            {issue.key}
                          </span>
                          <h3 className="font-semibold text-slate-100 truncate">
                            {issue.title}
                          </h3>
                        </div>
                        {issue.description && (
                          <p className="text-sm text-slate-400 line-clamp-2 mb-2">
                            {issue.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={issue.status}>
                            {ISSUE_STATUS_LABELS[issue.status]}
                          </Badge>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(issue.priority)}`}
                          >
                            {ISSUE_PRIORITY_LABELS[issue.priority]}
                          </span>
                          {issue.labels.map((label, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-primary-900 text-primary-300 border border-primary-700 rounded text-xs"
                            >
                              {label}
                            </span>
                          ))}
                          {issue.assignee && (
                            <span className="text-xs text-slate-400">
                              Assigned to {issue.assignee.username}
                            </span>
                          )}
                          <span className="text-xs text-slate-500">
                            {formatDate(issue.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6">
            <p className="text-sm text-slate-400">
              Showing {issues.length} of {pagination.total} issues
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange('page', filters.page - 1)}
                disabled={filters.page === 1}
              >
                <ChevronLeft size={16} />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange('page', filters.page + 1)}
                disabled={!pagination.hasMore}
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Create Issue Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Issue"
        size="lg"
      >
        <IssueForm
          onSubmit={handleCreateIssue}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Issue Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedIssue(null);
        }}
        title=""
        size="xl"
      >
        {selectedIssue && (
          <IssueDetail
            projectId={projectId}
            issueId={selectedIssue._id}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedIssue(null);
            }}
            onUpdate={fetchIssues}
          />
        )}
      </Modal>
    </div>
  );
};

export default IssuesTab;
