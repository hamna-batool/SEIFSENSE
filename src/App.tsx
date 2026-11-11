import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Footer } from './components/layout/Footer';
import { RulesDrawer } from './components/layout/RulesDrawer';
import { ToastContainer } from './components/layout/ToastContainer';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';

// Pages
import { DashboardPage } from './components/pages/DashboardPage';
import { BatchInventoryPage } from './components/pages/BatchInventoryPage';
import { FefoDispatchPage } from './components/pages/FefoDispatchPage';
import { ExpiryAlertsPage } from './components/pages/ExpiryAlertsPage';
import { SlowMovingPage } from './components/pages/SlowMovingPage';
import { PurchaseRecommendationsPage } from './components/pages/PurchaseRecommendationsPage';
import { DemandForecastPage } from './components/pages/DemandForecastPage';
import { WriteOffsFinancePage } from './components/pages/WriteOffsFinancePage';
import { ImpactMetricsPage } from './components/pages/ImpactMetricsPage';
import { WorkflowMapPage } from './components/pages/WorkflowMapPage';
import { RolesInterviewsPage } from './components/pages/RolesInterviewsPage';

const AppContent: React.FC = () => {
  const { state, setRulesDrawer, setSearchModal } = useApp();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Global keyboard shortcuts (Cmd+K / Ctrl+K for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSearchModal]);

  const renderActivePage = () => {
    switch (state.currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'inventory':
        return <BatchInventoryPage />;
      case 'dispatch':
        return <FefoDispatchPage />;
      case 'alerts':
        return <ExpiryAlertsPage />;
      case 'slow-moving':
        return <SlowMovingPage />;
      case 'purchasing':
        return <PurchaseRecommendationsPage />;
      case 'forecast':
        return <DemandForecastPage />;
      case 'writeoffs':
        return <WriteOffsFinancePage />;
      case 'impact':
        return <ImpactMetricsPage />;
      case 'workflow':
        return <WorkflowMapPage />;
      case 'roles':
        return <RolesInterviewsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col font-sans transition-colors">
      {/* Top Header */}
      <Header onToggleSidebarMobile={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

      {/* Main Layout Canvas: Sidebar + Scrollable Viewport */}
      <div className="flex-1 flex max-w-[1720px] w-full mx-auto">
        <Sidebar
          mobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 flex flex-col justify-between">
          <div>{renderActivePage()}</div>
        </main>
      </div>

      {/* Mandatory Academic Prototype Footer */}
      <Footer />

      {/* Slide-over Drawers and Modals */}
      <RulesDrawer
        isOpen={state.rulesDrawerOpen}
        onClose={() => setRulesDrawer(false)}
      />
      <GlobalSearchModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
