import { useState, useEffect } from 'react';
import { projectService } from '../../services/projectService';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Badge from '../common/Badge';
import { Plus, Trash2, Users as UsersIcon, Shield } from 'lucide-react';
import { USER_ROLES, ROLE_LABELS } from '../../utils/constants';
import { getInitials } from '../../utils/helpers';

const MembersTab = ({ projectId }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: USER_ROLES.MEMBER,
  });

  useEffect(() => {
    fetchMembers();
  }, [projectId]);

  const fetchMembers = async () => {
    try {
      const response = await projectService.getProjectMembers(projectId);
      setMembers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      await projectService.addMember(projectId, formData);
      setShowAddModal(false);
      setFormData({ email: '', role: USER_ROLES.MEMBER });
      fetchMembers();
    } catch (error) {
      console.error('Failed to add member:', error);
      alert(error.response?.data?.message || 'Failed to add member');
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await projectService.updateMemberRole(projectId, userId, newRole);
      fetchMembers();
    } catch (error) {
      console.error('Failed to update role:', error);
      alert(error.response?.data?.message || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    try {
      await projectService.removeMember(projectId, userId);
      fetchMembers();
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert(error.response?.data?.message || 'Failed to remove member');
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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Team Members</h2>
        <Button onClick={() => setShowAddModal(true)} size="sm">
          <Plus size={16} />
          Add Member
        </Button>
      </div>

      {/* Members List */}
      {members.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <UsersIcon className="mx-auto text-slate-400 mb-2" size={48} />
            <p className="text-slate-600">No members yet. Add your first member!</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {members.map((member) => (
            <Card key={member.user?._id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center text-white font-semibold shadow-lg">
                    {getInitials(member.user?.username || member.user?.fullName)}
                  </div>

                  {/* User Info */}
                  <div>
                    <h3 className="font-semibold text-white">
                      {member.user?.fullName || member.user?.username}
                    </h3>
                    <p className="text-sm text-slate-600">{member.user?.username}</p>
                  </div>
                </div>

                {/* Role & Actions */}
                <div className="flex items-center gap-3">
                  <select
                    className="input py-1 px-2 text-sm"
                    value={member.role}
                    onChange={(e) => handleUpdateRole(member.user?._id, e.target.value)}
                  >
                    <option value={USER_ROLES.ADMIN}>{ROLE_LABELS[USER_ROLES.ADMIN]}</option>
                    <option value={USER_ROLES.PROJECT_ADMIN}>
                      {ROLE_LABELS[USER_ROLES.PROJECT_ADMIN]}
                    </option>
                    <option value={USER_ROLES.MEMBER}>{ROLE_LABELS[USER_ROLES.MEMBER]}</option>
                  </select>

                  <Badge variant={member.role}>{ROLE_LABELS[member.role]}</Badge>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleRemoveMember(member.user?._id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Team Member"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="member@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Role
            </label>
            <select
              className="input"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value={USER_ROLES.MEMBER}>{ROLE_LABELS[USER_ROLES.MEMBER]}</option>
              <option value={USER_ROLES.PROJECT_ADMIN}>
                {ROLE_LABELS[USER_ROLES.PROJECT_ADMIN]}
              </option>
              <option value={USER_ROLES.ADMIN}>{ROLE_LABELS[USER_ROLES.ADMIN]}</option>
            </select>
          </div>

          <div className="bg-primary-500/10 border border-primary-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Shield className="text-primary-400 flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm text-slate-300">
                <p className="font-medium mb-1">Role Permissions:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>Admin:</strong> Full project access including member management</li>
                  <li><strong>Project Admin:</strong> Manage tasks and content</li>
                  <li><strong>Member:</strong> View and update task status</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Member</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MembersTab;

