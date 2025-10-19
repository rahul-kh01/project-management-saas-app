import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import Card from '../components/common/Card';
import { User, Mail, Calendar, Shield } from 'lucide-react';
import { formatDate, getInitials } from '../utils/helpers';

const Profile = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">My Profile</h1>

        <div className="space-y-6">
          {/* Profile Card */}
          <Card>
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                {getInitials(user.fullName || user.username)}
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">
                  {user.fullName || user.username}
                </h2>
                <p className="text-slate-400">@{user.username}</p>
                {user.isEmailVerified && (
                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-success-100 text-success-800 text-xs font-medium rounded">
                    <Shield size={12} />
                    Email Verified
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* Details Card */}
          <Card>
            <h3 className="text-lg font-semibold text-white mb-4">Account Details</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="text-slate-500" size={20} />
                <div>
                  <p className="text-sm text-slate-500">Username</p>
                  <p className="text-white">{user.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="text-slate-500" size={20} />
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="text-white">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <User className="text-slate-500" size={20} />
                <div>
                  <p className="text-sm text-slate-500">Full Name</p>
                  <p className="text-white">{user.fullName || 'Not provided'}</p>
                </div>
              </div>

              {user.createdAt && (
                <div className="flex items-center gap-3">
                  <Calendar className="text-slate-500" size={20} />
                  <div>
                    <p className="text-sm text-slate-500">Member Since</p>
                    <p className="text-white">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;

