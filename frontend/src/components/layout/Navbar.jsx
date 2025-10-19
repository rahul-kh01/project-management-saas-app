import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { LogOut, User, Settings, FolderKanban } from "lucide-react";
import { useState } from "react";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="bg-slate-900/95 backdrop-blur-lg shadow-lg sticky top-0 z-40 border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* --- Logo Section --- */}
          <div className="flex items-center">
            <Link to="/projects" className="flex items-center gap-2 group">
              <FolderKanban className="text-primary-400 group-hover:text-primary-300 transition-colors" size={32} />
              <span className="text-xl font-bold text-white">
                Project Camp
              </span>
            </Link>
          </div>

          {/* --- Navigation Links --- */}
          <div className="flex items-center gap-6">
            <Link
              to="/projects"
              className="text-slate-300 hover:text-primary-400 font-medium transition-colors"
            >
              Projects
            </Link>

            {user && (
              <div className="relative">
                {/* --- User Menu Button --- */}
                <button
                  onClick={() => setShowDropdown((prev) => !prev)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-400 backdrop-blur-sm"
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center text-white font-semibold uppercase shadow-lg">
                    {user.username?.charAt(0) || "U"}
                  </div>
                  <span className="text-sm font-medium text-white">
                    {user.username}
                  </span>
                </button>

                {/* --- Dropdown --- */}
                {showDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowDropdown(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-slate-800/95 backdrop-blur-lg border border-slate-700/50 rounded-lg shadow-2xl py-2 z-20">
                      <Link
                        to="/profile"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-700/50 hover:text-primary-400 transition-colors"
                      >
                        <User size={16} />
                        <span>Profile</span>
                      </Link>

                      <Link
                        to="/settings"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center gap-2 px-4 py-2 text-slate-300 hover:bg-slate-700/50 hover:text-primary-400 transition-colors"
                      >
                        <Settings size={16} />
                        <span>Settings</span>
                      </Link>

                      <hr className="my-2 border-slate-700/50" />

                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 w-full text-left text-danger-400 hover:bg-danger-500/20 hover:text-danger-300 transition-colors"
                      >
                        <LogOut size={16} />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
