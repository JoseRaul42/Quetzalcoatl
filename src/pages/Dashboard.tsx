
import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import ConnectionPanel from '@/components/ConnectionPanel';
import MarketMonitor from '@/components/MarketMonitor';
import TradingStrategy from '@/components/TradingStrategy';
import SentimentAnalysis from '@/components/SentimentAnalysis';
import StrategyLogs from '@/components/StrategyLogs';
import { ApiProvider } from '@/contexts/ApiContext';
import { TradingProvider } from '@/contexts/TradingContext';
import { SentimentProvider } from '@/contexts/SentimentContext';

const Dashboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState('connection');
  
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'connection':
        return <ConnectionPanel />;
      case 'market':
        return <MarketMonitor />;
      case 'strategy':
        return <TradingStrategy />;
      case 'sentiment':
        return <SentimentAnalysis />;
      case 'logs':
        return <StrategyLogs />;
      default:
        return <ConnectionPanel />;
    }
  };

  return (
    <ApiProvider>
      <TradingProvider>
        <SentimentProvider>
          <AppLayout 
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          >
            {renderActiveSection()}
          </AppLayout>
        </SentimentProvider>
      </TradingProvider>
    </ApiProvider>
  );
};

export default Dashboard;
