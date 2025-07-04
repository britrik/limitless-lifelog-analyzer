import React from 'react';

export const Lifelogs: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-100">Lifelogs</h1>
      </div>
      
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-slate-200 mb-4">Your Lifelog Data</h2>
        <p className="text-slate-400">
          This page will display your lifelog data from the Limitless API.
        </p>
      </div>
    </div>
  );
};