'use client';

import React from 'react';
import DashboardContainer from '../components/dashboard/DashboardContainer';

const DashboardPage = ({ user, onLogout, onViewChange }) => {
  return (
    <div className="dashboard-page">
      <DashboardContainer user={user} onLogout={onLogout} onViewChange={onViewChange} />
    </div>
  );
};

export default DashboardPage;