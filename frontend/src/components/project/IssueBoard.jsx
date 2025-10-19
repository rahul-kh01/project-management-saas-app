import { useState, useEffect } from 'react';
import { issueService } from '../../services/issueService';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Modal from '../common/Modal';
import IssueDetail from './IssueDetail';
import {
  ISSUE_STATUSES,
  ISSUE_STATUS_LABELS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_TYPE_LABELS,
  STATUS_TRANSITIONS,
} from '../../utils/constants';

const IssueBoard = ({ projectId }) => {
  const [issuesByStatus, setIssuesByStatus] = useState({
    [ISSUE_STATUSES.BACKLOG]: [],
    [ISSUE_STATUSES.SELECTED]: [],
    [ISSUE_STATUSES.IN_PROGRESS]: [],
    [ISSUE_STATUSES.IN_REVIEW]: [],
    [ISSUE_STATUSES.BLOCKED]: [],
    [ISSUE_STATUSES.DONE]: [],
  });
  const [loading, setLoading] = useState(true);
  const [draggedIssue, setDraggedIssue] = useState(null);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchAllIssues();
  }, [projectId]);

  const fetchAllIssues = async () => {
    try {
      setLoading(true);
      const response = await issueService.list(projectId, { limit: 100 });
      const issues = response.data.data || [];

      // Group issues by status
      const grouped = {
        [ISSUE_STATUSES.BACKLOG]: [],
        [ISSUE_STATUSES.SELECTED]: [],
        [ISSUE_STATUSES.IN_PROGRESS]: [],
        [ISSUE_STATUSES.IN_REVIEW]: [],
        [ISSUE_STATUSES.BLOCKED]: [],
        [ISSUE_STATUSES.DONE]: [],
      };

      issues.forEach((issue) => {
        if (grouped[issue.status]) {
          grouped[issue.status].push(issue);
        }
      });

      setIssuesByStatus(grouped);
    } catch (error) {
      console.error('Failed to fetch issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (e, issue) => {
    setDraggedIssue(issue);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();

    if (!draggedIssue) return;

    const sourceStatus = draggedIssue.status;

    // Check if transition is allowed
    const allowedTransitions = STATUS_TRANSITIONS[sourceStatus] || [];
    if (sourceStatus === targetStatus || !allowedTransitions.includes(targetStatus)) {
      alert(
        `Cannot move from ${ISSUE_STATUS_LABELS[sourceStatus]} to ${ISSUE_STATUS_LABELS[targetStatus]}`
      );
      setDraggedIssue(null);
      return;
    }

    try {
      // Transition the issue
      await issueService.transition(projectId, draggedIssue._id, {
        to: targetStatus,
      });

      // Update local state
      setIssuesByStatus((prev) => {
        const newState = { ...prev };

        // Remove from source
        newState[sourceStatus] = newState[sourceStatus].filter(
          (issue) => issue._id !== draggedIssue._id
        );

        // Add to target
        newState[targetStatus] = [
          ...newState[targetStatus],
          { ...draggedIssue, status: targetStatus },
        ];

        return newState;
      });
    } catch (error) {
      console.error('Failed to transition issue:', error);
      alert(error.response?.data?.message || 'Failed to move issue');
    } finally {
      setDraggedIssue(null);
    }
  };

  const openDetailModal = (issue) => {
    setSelectedIssue(issue);
    setShowDetailModal(true);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'highest':
        return 'border-l-4 border-l-danger-500';
      case 'high':
        return 'border-l-4 border-l-warning-500';
      case 'medium':
        return 'border-l-4 border-l-warning-400';
      case 'low':
        return 'border-l-4 border-l-success-500';
      case 'lowest':
        return 'border-l-4 border-l-neutral-500';
      default:
        return 'border-l-4 border-l-neutral-300';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const columns = [
    ISSUE_STATUSES.BACKLOG,
    ISSUE_STATUSES.SELECTED,
    ISSUE_STATUSES.IN_PROGRESS,
    ISSUE_STATUSES.IN_REVIEW,
    ISSUE_STATUSES.BLOCKED,
    ISSUE_STATUSES.DONE,
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Issue Board</h2>
        <p className="text-sm text-slate-400 mt-1">
          Drag and drop issues to change their status
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((status) => (
          <div
            key={status}
            className="flex-shrink-0 w-80"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* Column Header */}
            <div className="bg-slate-700/50 rounded-t-lg p-3 border-b-2 border-slate-600">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">
                  {ISSUE_STATUS_LABELS[status]}
                </h3>
                <span className="text-sm text-slate-400 bg-white px-2 py-1 rounded">
                  {issuesByStatus[status].length}
                </span>
              </div>
            </div>

            {/* Column Content */}
            <div className="bg-slate-800/30 rounded-b-lg p-3 min-h-[500px] space-y-3">
              {issuesByStatus[status].length === 0 ? (
                <p className="text-center text-slate-500 text-sm py-8">
                  No issues
                </p>
              ) : (
                issuesByStatus[status].map((issue) => (
                  <div
                    key={issue._id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, issue)}
                    onClick={() => openDetailModal(issue)}
                    className={`bg-white rounded-lg p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${getPriorityColor(issue.priority)}`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-mono text-slate-500">
                          {issue.key}
                        </span>
                        <span className="text-xs px-2 py-0.5 bg-slate-700/50 text-neutral-700 rounded">
                          {ISSUE_TYPE_LABELS[issue.type]}
                        </span>
                      </div>

                      <h4 className="text-sm font-medium text-white line-clamp-2">
                        {issue.title}
                      </h4>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          {ISSUE_PRIORITY_LABELS[issue.priority]}
                        </span>
                        {issue.assignee && (
                          <div className="flex items-center gap-1">
                            <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary-700">
                                {issue.assignee.username?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {issue.labels.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {issue.labels.slice(0, 2).map((label, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-0.5 bg-primary-100 text-primary-800 rounded"
                            >
                              {label}
                            </span>
                          ))}
                          {issue.labels.length > 2 && (
                            <span className="text-xs px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded">
                              +{issue.labels.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

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
            onUpdate={fetchAllIssues}
          />
        )}
      </Modal>
    </div>
  );
};

export default IssueBoard;

