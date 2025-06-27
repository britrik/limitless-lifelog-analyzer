import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ListChecks, BarChart3, Settings } from 'lucide-react'; // Example icons

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/lifelogs', label: 'Lifelogs', icon: ListChecks },
  { to: '/insights', label: 'Insights', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-card border-r border-border p-4 space-y-4 flex flex-col">
      <div className="text-2xl font-bold text-primary mb-6">
        Lifelog App
      </div>
      <nav className="flex-grow">
        <ul>
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto text-xs text-muted-foreground">
        © {new Date().getFullYear()} Lifelog Analyzer
      </div>
    </aside>
  );
};

export default Sidebar;
