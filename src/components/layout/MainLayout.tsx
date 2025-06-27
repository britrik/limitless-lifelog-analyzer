import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react'; // For a potential toggle button

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false); // For a future toggle

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar for medium screens and up */}
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar (placeholder for actual toggle mechanism) */}
      {/*
        A more complete implementation would use a transition and overlay.
        For now, this structure allows sidebar to be conditionally rendered or styled.
        If sidebarOpen was true, you could show it here.
      */}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Pass a toggle function to Header for mobile */}
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Example of a floating toggle button for mobile (can be placed in Header too) */}
      {/* <button
        className="md:hidden fixed bottom-4 right-4 bg-primary text-primary-foreground p-3 rounded-full shadow-lg z-50"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <Menu size={24} />
      </button> */}
    </div>
  );
};

export default MainLayout;
