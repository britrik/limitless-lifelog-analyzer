import React from 'react';

const SettingsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-foreground">Settings</h1>
      <p className="text-muted-foreground">
        Configure your application preferences, API keys (securely managed via backend), data import/export, and AI feature settings.
      </p>
      {/* Placeholder for settings options */}
      <div className="space-y-6 mt-6">
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-card-foreground mb-2">API Configuration</h2>
          <p className="text-sm text-muted-foreground">Limitless API and Gemini API key status (will be managed by backend).</p>
          {/* Actual key input will be in backend setup or via .env for backend */}
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-card-foreground mb-2">Data Management</h2>
          <p className="text-sm text-muted-foreground">Options to export analyzed data (CSV, JSON, Markdown) and import/export settings.</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-card-foreground mb-2">AI Features</h2>
          <p className="text-sm text-muted-foreground">Toggle specific AI analyses, manage custom prompt templates.</p>
        </div>
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-card-foreground mb-2">Theme</h2>
          <p className="text-sm text-muted-foreground">Dark mode / Light mode toggle will be here.</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
