import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck, Menu, X, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { useApp } from '../AppContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);
  const { user, loading, result } = useApp();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/auth');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const navLinks = [
    { name: 'Landing', path: '/' },
    { name: 'Upload', path: '/upload' },
    ...(result ? [
      { name: 'Audit Dashboard', path: '/audit' },
      { name: 'Remediation', path: '/remediation' },
      { name: 'Export', path: '/export' },
    ] : []),
  ];

  return (
    <nav className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-lg">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <span className="text-xl font-black tracking-tight text-slate-800">FairAudit</span>
      </div>
      
      <div className="hidden md:flex gap-6 text-sm font-medium">
        {navLinks.map((link) => (
          <Link
            key={link.name}
            to={link.path}
            className={cn(
              "transition-colors pb-1 border-b-2",
              location.pathname === link.path
                ? "text-indigo-600 border-indigo-600"
                : "text-slate-500 border-transparent hover:text-indigo-600"
            )}
          >
            {link.name}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-4">
        {loading ? (
          <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse"></div>
        ) : user ? (
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">{user.email}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Organization</span>
             </div>
             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                <UserIcon className="h-4 w-4" />
             </div>
             <button 
               onClick={handleLogout}
               title="Sign Out"
               className="p-2 border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 hover:text-rose-500 transition-all flex items-center gap-2 text-xs font-bold"
             >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Logout</span>
             </button>
          </div>
        ) : (
          <Link 
            to="/auth"
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
          >
            <LogIn className="h-4 w-4" /> Sign In
          </Link>
        )}

        <div className="md:hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500 transition-colors"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full border-b border-slate-200 bg-white animate-in slide-in-from-top-2">
          <div className="space-y-1 px-2 pb-3 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "block rounded-md px-3 py-2 text-base font-medium",
                  location.pathname === link.path
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl p-6 flex flex-col gap-6 flex-grow">
        {children}
      </main>
    </div>
  );
}
