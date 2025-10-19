import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { Lock, User } from 'lucide-react';

const Settings = () => {
  const { user, changePassword } = useAuth();
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setLoading(true);
    const result = await changePassword(passwordForm.oldPassword, passwordForm.newPassword);

    if (result.success) {
      setMessage({ type: 'success', text: 'Password changed successfully' });
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      setMessage({ type: 'error', text: result.error });
    }

    setLoading(false);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Profile Information */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <User className="text-primary-400" size={24} />
              <h2 className="text-xl font-semibold text-white">Profile Information</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Username
                </label>
                <p className="text-white">{user?.username}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Email
                </label>
                <p className="text-white">{user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Full Name
                </label>
                <p className="text-white">{user?.fullName || 'Not provided'}</p>
              </div>
            </div>
          </Card>

          {/* Change Password */}
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Lock className="text-primary-400" size={24} />
              <h2 className="text-xl font-semibold text-white">Change Password</h2>
            </div>

            {message.text && (
              <div
                className={`mb-4 px-4 py-3 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-success-50 border border-success-200 text-success-700'
                    : 'bg-danger-50 border border-danger-200 text-danger-700'
                }`}
              >
                {message.text}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={passwordForm.oldPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, oldPassword: e.target.value })
                }
                required
              />

              <Input
                label="New Password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, newPassword: e.target.value })
                }
                required
              />

              <Input
                label="Confirm New Password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
                }
                required
              />

              <Button type="submit" loading={loading} disabled={loading}>
                Update Password
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;

