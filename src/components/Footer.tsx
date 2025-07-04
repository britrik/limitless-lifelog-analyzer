
import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-800 bg-opacity-50 backdrop-blur-md text-center p-4 mt-auto">
      <p className="text-sm text-gray-400">&copy; {new Date().getFullYear()} Limitless Insights. Powered by Gemini.</p>
    </footer>
  );
};
