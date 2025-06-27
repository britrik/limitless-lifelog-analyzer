import React from 'react';
import { Menu } from 'lucide-react'; // For burger menu
import { ThemeToggle } from '@/components/common/ThemeToggle'; // Import ThemeToggle

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center">
        {/* Burger menu button for mobile (visible on screens smaller than md) */}
        <button
          onClick={onToggleSidebar}
          className="md:hidden mr-3 text-muted-foreground hover:text-foreground"
          aria-label="Toggle sidebar"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-lg sm:text-xl font-semibold text-foreground">Limitless Lifelog Analyzer</h1>
      </div>
      <div className="flex items-center space-x-3 sm:space-x-4">
        <ThemeToggle />
        {/* Placeholder for future icons like notifications or user profile */}
        {/* Example:
        <button className="text-muted-foreground hover:text-foreground">
          <Bell size={20} />
        </button>
        <button className="text-muted-foreground hover:text-foreground">
          <UserCircle size={24} />
        </button>
        */}
      </div>
    </header>
  );
};

export default Header;
