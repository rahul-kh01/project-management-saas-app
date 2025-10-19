import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  FolderKanban, 
  Users, 
  CheckSquare, 
  FileText, 
  Shield, 
  Zap, 
  Clock, 
  BarChart,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import Button from '../components/common/Button';

const Home = () => {
  const { user } = useAuth();

  const features = [
    {
      icon: <FolderKanban className="w-8 h-8" />,
      title: "Project Management",
      description: "Create and manage multiple projects with ease. Organize your work efficiently."
    },
    {
      icon: <CheckSquare className="w-8 h-8" />,
      title: "Task Tracking",
      description: "Break down projects into tasks and subtasks. Track progress in real-time."
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Team Collaboration",
      description: "Invite team members, assign tasks, and collaborate seamlessly."
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Project Notes",
      description: "Keep important notes and documentation for each project in one place."
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Role-Based Access",
      description: "Admin, Project Admin, and Member roles with different permissions."
    },
    {
      icon: <BarChart className="w-8 h-8" />,
      title: "Progress Tracking",
      description: "Monitor project progress with status tracking and team insights."
    }
  ];

  const roles = [
    {
      name: "Admin",
      color: "text-secondary-600 bg-secondary-100",
      permissions: [
        "Full system access",
        "Manage all projects",
        "Add/remove members",
        "Create and delete projects",
        "Manage notes"
      ]
    },
    {
      name: "Project Admin",
      color: "text-primary-600 bg-primary-100",
      permissions: [
        "Manage assigned projects",
        "Create and assign tasks",
        "Manage project members",
        "Update project details"
      ]
    },
    {
      name: "Member",
      color: "text-success-600 bg-success-100",
      permissions: [
        "View assigned tasks",
        "Update task status",
        "Add subtasks",
        "Collaborate with team"
      ]
    }
  ];

  const stats = [
    { icon: <Zap className="w-6 h-6" />, label: "Fast & Efficient", value: "Real-time Updates" },
    { icon: <Clock className="w-6 h-6" />, label: "Time Tracking", value: "Task Deadlines" },
    { icon: <Users className="w-6 h-6" />, label: "Team Size", value: "Unlimited" },
    { icon: <Shield className="w-6 h-6" />, label: "Security", value: "Role-Based" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header/Hero Section */}
      <header className="relative overflow-hidden bg-gradient-to-b from-slate-900/50 to-transparent">
        {/* Navigation */}
        <nav className="container mx-auto px-4 py-6 flex justify-between items-center backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <FolderKanban className="text-primary-400" size={32} />
            <span className="text-2xl font-bold text-white">Project Camp</span>
          </div>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/projects">
                  <Button variant="outline">Dashboard</Button>
                </Link>
                <Link to="/profile">
                  <Button>My Profile</Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Hero Content */}
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Manage Projects
                <span className="bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent"> Like a Pro</span>
              </h1>
              <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                Streamline your workflow, collaborate with your team, and deliver projects on time. 
                The all-in-one project management solution for modern teams.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                {!user && (
                  <Link to="/register">
                    <Button size="lg" className="w-full sm:w-auto">
                      Start Free Today
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                )}
                <Link to="/login">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    {user ? 'Go to Dashboard' : 'Sign In'}
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero Image/Illustration Placeholder */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary-600/20 to-secondary-600/20 rounded-3xl blur-2xl"></div>
              <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-slate-700/50">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 mb-4 shadow-lg border border-slate-700/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <FolderKanban className="text-primary-400" size={24} />
                      <div>
                        <h3 className="font-semibold text-white">Website Redesign</h3>
                        <p className="text-sm text-slate-400">12 tasks • 5 members</p>
                      </div>
                    </div>
                    <div className="bg-success-500/20 text-success-400 px-3 py-1 rounded-full text-sm font-medium border border-success-500/30">
                      In Progress
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="text-success-400" size={16} />
                      <span className="text-sm text-slate-300">Design mockups completed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="text-success-400" size={16} />
                      <span className="text-sm text-slate-300">Frontend development started</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-slate-600 rounded-full"></div>
                      <span className="text-sm text-slate-500">Backend integration pending</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {stats.map((stat, idx) => (
                    <div key={idx} className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-slate-700/30 hover:border-primary-500/30 transition-all">
                      <div className="text-primary-400 mb-2">{stat.icon}</div>
                      <div className="text-xs text-slate-400">{stat.label}</div>
                      <div className="text-sm font-semibold text-white">{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-20 bg-slate-900/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything You Need to Manage Projects
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Powerful features to help your team collaborate and deliver exceptional results.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="group bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl shadow-lg hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-300 border border-slate-700/50 hover:border-primary-500/50"
              >
                <div className="text-primary-400 mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-slate-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Role-Based Access Section */}
      <section className="py-20 bg-gradient-to-b from-slate-800 to-slate-900">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Role-Based Access Control
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Three distinct roles designed to give the right access to the right people.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {roles.map((role, index) => (
              <div 
                key={index}
                className="bg-slate-800/70 backdrop-blur-sm p-8 rounded-xl shadow-lg hover:shadow-2xl hover:shadow-primary-500/10 transition-all duration-300 border border-slate-700/50"
              >
                <div className={`inline-block px-4 py-2 rounded-lg ${role.color} font-semibold mb-6`}>
                  {role.name}
                </div>
                <ul className="space-y-3">
                  {role.permissions.map((permission, idx) => (
                    <li key={idx} className="flex items-start space-x-2">
                      <CheckCircle2 className="text-success-400 flex-shrink-0 mt-0.5" size={20} />
                      <span className="text-slate-300">{permission}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-600 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Transform Your Project Management?
          </h2>
          <p className="text-xl text-primary-50 mb-8 max-w-2xl mx-auto">
            Join teams who are already delivering projects faster and more efficiently.
          </p>
          {!user && (
            <Link to="/register">
              <Button 
                size="lg" 
                className="bg-white text-primary-600 hover:bg-neutral-100"
              >
                Get Started Now - It's Free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          )}
          {user && (
            <Link to="/projects">
              <Button 
                size="lg" 
                className="bg-white text-primary-600 hover:bg-neutral-100"
              >
                Go to Your Projects
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <FolderKanban size={24} />
                <span className="text-xl font-bold">Project Camp</span>
              </div>
              <p className="text-neutral-400">
                The complete project management solution for modern teams.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-neutral-400">
                <li><Link to="/login" className="hover:text-white">Features</Link></li>
                <li><Link to="/register" className="hover:text-white">Pricing</Link></li>
                <li><Link to="/login" className="hover:text-white">Documentation</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-neutral-400">
                <li><Link to="/login" className="hover:text-white">About</Link></li>
                <li><Link to="/login" className="hover:text-white">Blog</Link></li>
                <li><Link to="/login" className="hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-neutral-400">
                <li><Link to="/login" className="hover:text-white">Privacy</Link></li>
                <li><Link to="/login" className="hover:text-white">Terms</Link></li>
                <li><Link to="/login" className="hover:text-white">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-neutral-400">
            <p>&copy; 2025 Project Camp. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

