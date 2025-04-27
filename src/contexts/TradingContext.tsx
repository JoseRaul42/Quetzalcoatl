
import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from "sonner";

export type TradingPair = 'BTC/USD' | 'ETH/USD' | 'XRP/USD' | 'ADA/USD' | 'SOL/USD';
export type DataMode = 'websocket' | 'rest';
export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface TradeRule {
  volumeThreshold: number;
  sentiment: Sentiment;
  maxUsdPerTrade: number;
  minUsdThreshold: number;
  portfolioPercentage: number;
}

export interface TradeLog {
  id: string;
  timestamp: Date;
  pair: TradingPair;
  volumeChecked: number;
  sentiment: Sentiment;
  action: 'buy' | 'sell' | 'hold';
  usdAmount: number;
  paperMode: boolean;
}

interface TradingContextType {
  selectedPair: TradingPair;
  dataMode: DataMode;
  refreshRate: number;
  autoTrading: boolean;
  paperTrading: boolean;
  verboseLogging: boolean;
  tradeRules: TradeRule;
  tradeLogs: TradeLog[];
  currentMarketData: {
    price: number | null;
    volume24h: number | null;
    high24h: number | null;
    low24h: number | null;
    lastUpdated: Date | null;
  };
  isConnected: boolean;
  updatePair: (pair: TradingPair) => void;
  updateDataMode: (mode: DataMode) => void;
  updateRefreshRate: (rate: number) => void;
  updateTradeRules: (rules: Partial<TradeRule>) => void;
  toggleAutoTrading: () => void;
  togglePaperTrading: () => void;
  toggleVerboseLogging: () => void;
  connectToMarket: () => Promise<void>;
  disconnectFromMarket: () => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedPair, setSelectedPair] = useState<TradingPair>('BTC/USD');
  const [dataMode, setDataMode] = useState<DataMode>('websocket');
  const [refreshRate, setRefreshRate] = useState<number>(3000);
  const [autoTrading, setAutoTrading] = useState<boolean>(false);
  const [paperTrading, setPaperTrading] = useState<boolean>(true);
  const [verboseLogging, setVerboseLogging] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  const [tradeRules, setTradeRules] = useState<TradeRule>({
    volumeThreshold: 1000000,
    sentiment: 'positive',
    maxUsdPerTrade: 500,
    minUsdThreshold: 10,
    portfolioPercentage: 5,
  });
  
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  
  const [currentMarketData, setCurrentMarketData] = useState({
    price: null as number | null,
    volume24h: null as number | null,
    high24h: null as number | null,
    low24h: null as number | null,
    lastUpdated: null as Date | null,
  });
  
  const updatePair = (pair: TradingPair) => {
    setSelectedPair(pair);
    if (isConnected) {
      disconnectFromMarket();
      setTimeout(() => connectToMarket(), 500);
    }
  };
  
  const updateDataMode = (mode: DataMode) => {
    setDataMode(mode);
    if (isConnected) {
      disconnectFromMarket();
      setTimeout(() => connectToMarket(), 500);
    }
  };
  
  const updateRefreshRate = (rate: number) => {
    setRefreshRate(rate);
  };
  
  const updateTradeRules = (rules: Partial<TradeRule>) => {
    setTradeRules(prev => ({ ...prev, ...rules }));
  };
  
  const toggleAutoTrading = () => {
    setAutoTrading(prev => !prev);
    toast(autoTrading ? "Auto-trading disabled" : "Auto-trading enabled");
  };
  
  const togglePaperTrading = () => {
    setPaperTrading(prev => !prev);
    toast(paperTrading ? "Live trading mode" : "Paper trading mode");
  };
  
  const toggleVerboseLogging = () => {
    setVerboseLogging(prev => !prev);
  };
  
  // Simulated market data updates
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (isConnected) {
      interval = setInterval(() => {
        // Generate random market data for simulation purposes
        const priceChange = (Math.random() - 0.5) * 200;
        const newPrice = currentMarketData.price 
          ? currentMarketData.price + priceChange
          : 40000 + priceChange; // Starting BTC price
        
        const newVolume = Math.random() * 5000000 + 1000000;
        
        setCurrentMarketData({
          price: newPrice,
          volume24h: newVolume,
          high24h: currentMarketData.high24h 
            ? Math.max(currentMarketData.high24h, newPrice)
            : newPrice + 500,
          low24h: currentMarketData.low24h
            ? Math.min(currentMarketData.low24h, newPrice)
            : newPrice - 500,
          lastUpdated: new Date(),
        });
        
        if (verboseLogging) {
          console.log(`[${selectedPair}] Price: $${newPrice.toFixed(2)}, Volume: $${newVolume.toFixed(2)}`);
        }
        
        // If auto trading is enabled, check rules and potentially execute trades
        if (autoTrading && newVolume > tradeRules.volumeThreshold) {
          const tradeAction = Math.random() > 0.5 ? 'buy' : 'sell';
          const tradeAmount = Math.min(
            Math.random() * tradeRules.maxUsdPerTrade, 
            (newPrice * tradeRules.portfolioPercentage / 100)
          );
          
          if (tradeAmount >= tradeRules.minUsdThreshold) {
            const newLog: TradeLog = {
              id: Date.now().toString(),
              timestamp: new Date(),
              pair: selectedPair,
              volumeChecked: newVolume,
              sentiment: tradeRules.sentiment,
              action: tradeAction as 'buy' | 'sell',
              usdAmount: tradeAmount,
              paperMode: paperTrading,
            };
            
            setTradeLogs(prev => [newLog, ...prev].slice(0, 100)); // Keep the last 100 logs
            
            if (verboseLogging) {
              console.log(`Trade executed: ${tradeAction} $${tradeAmount.toFixed(2)} of ${selectedPair}`);
            }
            
            toast.info(
              `${tradeAction.toUpperCase()} $${tradeAmount.toFixed(2)} of ${selectedPair}`,
              { description: paperTrading ? "Paper Trading Mode" : "LIVE TRADING" }
            );
          }
        }
      }, refreshRate);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, refreshRate, selectedPair, autoTrading, paperTrading, tradeRules, verboseLogging, currentMarketData]);
  
  const connectToMarket = async (): Promise<void> => {
    try {
      toast.info(`Connecting to ${selectedPair} market...`);
      // Simulate connection delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setIsConnected(true);
      toast.success(`Connected to ${selectedPair} market`);
    } catch (error) {
      console.error('Failed to connect to market:', error);
      toast.error(`Failed to connect to ${selectedPair} market`);
    }
  };
  
  const disconnectFromMarket = () => {
    setIsConnected(false);
    toast.info(`Disconnected from ${selectedPair} market`);
  };
  
  return (
    <TradingContext.Provider value={{
      selectedPair,
      dataMode,
      refreshRate,
      autoTrading,
      paperTrading,
      verboseLogging,
      tradeRules,
      tradeLogs,
      currentMarketData,
      isConnected,
      updatePair,
      updateDataMode,
      updateRefreshRate,
      updateTradeRules,
      toggleAutoTrading,
      togglePaperTrading,
      toggleVerboseLogging,
      connectToMarket,
      disconnectFromMarket,
    }}>
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = (): TradingContextType => {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};
