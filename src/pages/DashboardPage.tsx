import React from 'react';

const DashboardPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-foreground">Dashboard</h1>
      <p className="text-muted-foreground">Welcome to your Lifelog Dashboard. Analytics and summaries will appear here.</p>
      {/* Placeholder for dashboard widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-card-foreground mb-2">Overall Mood Trend</h2>
          <p className="text-sm text-muted-foreground">Chart placeholder</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-card-foreground mb-2">Recent Activity</h2>
          <p className="text-sm text-muted-foreground">List of recent lifelogs placeholder</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-card-foreground mb-2">Key Topics</h2>
          <p className="text-sm text-muted-foreground">Topic cloud placeholder</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
