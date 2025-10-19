import { useState, useEffect } from 'react';
import { issueService } from '../../services/issueService';
import Button from '../common/Button';
import Badge from '../common/Badge';
import IssueForm from './IssueForm';
import {
  X,
  Edit2,
  Eye,
  EyeOff,
  MessageSquare,
  Activity,
  Paperclip,
  Send,
  AlertCircle,
} from 'lucide-react';
import { formatDate } from '../../utils/helpers';
import {
  ISSUE_TYPE_LABELS,
  ISSUE_PRIORITY_LABELS,
  ISSUE_STATUS_LABELS,
  STATUS_TRANSITIONS,
} from '../../utils/constants';

const IssueDetail = ({ projectId, issueId, onClose, onUpdate }) => {
  const [issue, setIssue] = useState(null);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('description'); // description, comments, activity

  const [commentBody, setCommentBody] = useState('');
  const [commentAttachments, setCommentAttachments] = useState([]);
  const [isWatching, setIsWatching] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    fetchIssueDetails();
  }, [projectId, issueId]);

  const fetchIssueDetails = async () => {
    try {
      setLoading(true);
      const response = await issueService.get(projectId, issueId);
      setIssue(response.data.issue);
      setComments(response.data.comments || []);
      setActivities(response.data.activities || []);
      
      // Check if current user is watching
      // We would need user context here, but for simplicity we'll check if watchers array exists
      setIsWatching(response.data.issue.watchers?.length > 0);
    } catch (error) {
      console.error('Failed to fetch issue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateIssue = async (issueData) => {
    try {
      await issueService.update(projectId, issueId, issueData);
      setIsEditing(false);
      fetchIssueDetails();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to update issue:', error);
      alert(error.response?.data?.message || 'Failed to update issue');
    }
  };

  const handleTransition = async (newStatus) => {
    try {
      await issueService.transition(projectId, issueId, { to: newStatus });
      fetchIssueDetails();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to transition issue:', error);
      alert(error.response?.data?.message || 'Failed to transition issue');
    }
  };

  const handleToggleWatch = async () => {
    try {
      if (isWatching) {
        await issueService.unwatch(projectId, issueId);
      } else {
        await issueService.watch(projectId, issueId);
      }
      setIsWatching(!isWatching);
      fetchIssueDetails();
    } catch (error) {
      console.error('Failed to toggle watch:', error);
      alert(error.response?.data?.message || 'Failed to toggle watch');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentBody.trim()) return;

    try {
      setSubmittingComment(true);
      await issueService.addComment(projectId, issueId, {
        body: commentBody,
        attachments: commentAttachments,
      });
      setCommentBody('');
      setCommentAttachments([]);
      fetchIssueDetails();
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert(error.response?.data?.message || 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleCommentFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 3) {
      alert('Maximum 3 files allowed for comments');
      return;
    }
    setCommentAttachments(files);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="mx-auto text-slate-500 mb-2" size={48} />
        <p className="text-slate-400">Issue not found</p>
      </div>
    );
  }

  if (isEditing) {
    return (
      <IssueForm
        initialData={{
          title: issue.title,
          description: issue.description,
          type: issue.type,
          priority: issue.priority,
          labels: issue.labels,
          dueDate: issue.dueDate
            ? new Date(issue.dueDate).toISOString().split('T')[0]
            : '',
          storyPoints: issue.storyPoints || '',
        }}
        isEdit={true}
        onSubmit={handleUpdateIssue}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  const allowedTransitions = STATUS_TRANSITIONS[issue.status] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-mono text-slate-500">{issue.key}</span>
            <Badge variant={issue.status}>
              {ISSUE_STATUS_LABELS[issue.status]}
            </Badge>
          </div>
          <h2 className="text-2xl font-bold text-slate-100">{issue.title}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center gap-2 pb-4 border-b border-slate-700">
        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
          <Edit2 size={16} />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleToggleWatch}
        >
          {isWatching ? <EyeOff size={16} /> : <Eye size={16} />}
          {isWatching ? 'Unwatch' : 'Watch'}
        </Button>
        {allowedTransitions.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-slate-400">Transition to:</span>
            {allowedTransitions.map((status) => (
              <Button
                key={status}
                variant="outline"
                size="sm"
                onClick={() => handleTransition(status)}
              >
                {ISSUE_STATUS_LABELS[status]}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Properties Panel */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-lg">
        <div>
          <span className="text-sm font-medium text-slate-400">Type:</span>
          <p className="text-sm text-slate-200 mt-1">
            {ISSUE_TYPE_LABELS[issue.type]}
          </p>
        </div>
        <div>
          <span className="text-sm font-medium text-slate-400">Priority:</span>
          <p className="text-sm text-slate-200 mt-1">
            {ISSUE_PRIORITY_LABELS[issue.priority]}
          </p>
        </div>
        <div>
          <span className="text-sm font-medium text-slate-400">Reporter:</span>
          <p className="text-sm text-slate-200 mt-1">
            {issue.reporter?.username || 'Unknown'}
          </p>
        </div>
        <div>
          <span className="text-sm font-medium text-slate-400">Assignee:</span>
          <p className="text-sm text-slate-200 mt-1">
            {issue.assignee?.username || 'Unassigned'}
          </p>
        </div>
        {issue.dueDate && (
          <div>
            <span className="text-sm font-medium text-slate-400">Due Date:</span>
            <p className="text-sm text-slate-200 mt-1">
              {formatDate(issue.dueDate)}
            </p>
          </div>
        )}
        {issue.storyPoints && (
          <div>
            <span className="text-sm font-medium text-slate-400">
              Story Points:
            </span>
            <p className="text-sm text-slate-200 mt-1">{issue.storyPoints}</p>
          </div>
        )}
        {issue.labels.length > 0 && (
          <div className="col-span-2">
            <span className="text-sm font-medium text-slate-400 block mb-2">
              Labels:
            </span>
            <div className="flex flex-wrap gap-2">
              {issue.labels.map((label, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-primary-900 text-primary-300 rounded text-xs"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('description')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'description'
                ? 'border-primary-600 text-primary-500'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Description
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'comments'
                ? 'border-primary-600 text-primary-500'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare size={16} />
            Comments ({comments.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'activity'
                ? 'border-primary-600 text-primary-500'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity size={16} />
            Activity ({activities.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === 'description' && (
          <div>
            <p className="text-slate-200 whitespace-pre-wrap">
              {issue.description || 'No description provided.'}
            </p>
            {issue.attachments && issue.attachments.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-slate-300 mb-2">
                  Attachments:
                </h4>
                <div className="space-y-2">
                  {issue.attachments.map((attachment, idx) => (
                    <a
                      key={idx}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-slate-800/40 rounded hover:bg-slate-700/60"
                    >
                      <Paperclip size={16} className="text-slate-400" />
                      <span className="text-sm text-primary-400">
                        {attachment.name}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="space-y-4">
            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="p-4 bg-slate-800/50 rounded-lg">
              <textarea
                className="input min-h-[80px] mb-2 bg-slate-900 text-slate-200 placeholder-slate-500 border border-slate-700"
                placeholder="Add a comment..."
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                required
              />
              <div className="flex items-center justify-between">
                <div>
                  <input
                    type="file"
                    multiple
                    accept="*/*"
                    onChange={handleCommentFileChange}
                    className="text-sm text-slate-400"
                    id="comment-files"
                  />
                  {commentAttachments.length > 0 && (
                    <span className="text-xs text-slate-500 ml-2">
                      {commentAttachments.length} file(s) selected
                    </span>
                  )}
                </div>
                <Button type="submit" size="sm" disabled={submittingComment}>
                  <Send size={16} />
                  {submittingComment ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment._id} className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-900 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-primary-400">
                          {comment.authorId?.username?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-slate-200">
                            {comment.authorId?.username || 'Unknown'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap">
                          {comment.body}
                        </p>
                        {comment.attachments && comment.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {comment.attachments.map((attachment, idx) => (
                              <a
                                key={idx}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs text-primary-400 hover:underline"
                              >
                                <Paperclip size={12} />
                                {attachment.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No activity yet.</p>
            ) : (
              activities.map((activity) => (
                <div key={activity._id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary-600 mt-2"></div>
                  <div className="flex-1">
                    <p className="text-slate-200">
                      <span className="font-medium text-primary-400">
                        {activity.actorId?.username || 'Someone'}
                      </span>{' '}
                      {activity.action.replace(/_/g, ' ')}
                      {activity.from && activity.to && (
                        <span>
                          {' '}
                          from <strong>{activity.from}</strong> to{' '}
                          <strong>{activity.to}</strong>
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IssueDetail;
