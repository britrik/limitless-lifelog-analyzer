import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectionStatusIndicator } from './ConnectionStatus';

interface HeaderProps {
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/lifelogs', label: 'Lifelogs' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <header className="bg-slate-800 bg-opacity-90 backdrop-blur-lg shadow-lg border-b border-slate-700 sticky top-0 z-30">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Mobile menu button and title */}
          <div className="flex items-center space-x-3">
            {/* Mobile menu button */}
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              aria-label="Open sidebar"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Title/Logo */}
            <div className="flex items-center space-x-2">
              <svg 
                className="w-8 h-8 text-purple-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" 
                />
              </svg>
              <h1 className="text-xl font-bold text-white lg:hidden">Limitless</h1>
            </div>
          </div>

          {/* Desktop navigation - hidden on mobile since we have sidebar */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right side - Connection Status */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:block">
              <ConnectionStatusIndicator className="text-sm" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};