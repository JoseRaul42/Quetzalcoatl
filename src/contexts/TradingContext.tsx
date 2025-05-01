import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { toast } from "sonner";

export type TradingPair = 'BTC/USD' | 'ETH/USD' | 'TAO/USD' | 'ADA/USD' | 'SOL/USD';
export type DataMode = 'websocket' | 'rest';
export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface TradeRule {
  volumeThreshold: number;
  sentiment: Sentiment;
  maxUsdPerTrade: number;
  minUsdThreshold: number;
  portfolioPercentage: number;
  sellVolumeThreshold: number;
  sellSentiment: Sentiment;
  maxUsdPerSell: number;
  minUsdSellThreshold: number;
  sellPortfolioPercentage: number;
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

export interface PortfolioHolding {
  pair: TradingPair;
  usdValue: number;
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
  portfolioHoldings: PortfolioHolding[];
  totalPortfolioValue: number;
  updatePair: (pair: TradingPair) => void;
  updateDataMode: (mode: DataMode) => void;
  updateRefreshRate: (rate: number) => void;
  updateTradeRules: (rules: Partial<TradeRule>) => void;
  toggleAutoTrading: () => void;
  togglePaperTrading: () => void;
  toggleVerboseLogging: () => void;
  connectToMarket: () => Promise<void>;
  disconnectFromMarket: () => void;
  updatePortfolioValue: (value: number) => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const KrakenPairMap: Record<TradingPair, string> = {
  'BTC/USD': 'XBT/USD',
  'ETH/USD': 'ETH/USD',
  'TAO/USD': 'TAO/USD',
  'ADA/USD': 'ADA/USD',
  'SOL/USD': 'SOL/USD',
};

const Kraken_WS_URL = "wss://ws.Kraken.com/";

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
    sellVolumeThreshold: 1000000,
    sellSentiment: 'negative',
    maxUsdPerSell: 500,
    minUsdSellThreshold: 10,
    sellPortfolioPercentage: 5,
  });

  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);

  const [currentMarketData, setCurrentMarketData] = useState({
    price: null as number | null,
    volume24h: null as number | null,
    high24h: null as number | null,
    low24h: null as number | null,
    lastUpdated: null as Date | null,
  });

  const [portfolioHoldings, setPortfolioHoldings] = useState<PortfolioHolding[]>([]);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState<number>(100000);

  const websocketRef = useRef<WebSocket | null>(null);

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

  const updatePortfolioValue = (value: number) => {
    setTotalPortfolioValue(value);
  };

  const connectToMarket = async (): Promise<void> => {
    try {
      const KrakenPair = KrakenPairMap[selectedPair];
      const ws = new WebSocket(Kraken_WS_URL);

      ws.onopen = () => {
        ws.send(JSON.stringify({
          event: "subscribe",
          pair: [KrakenPair],
          subscription: { name: "ticker" },
        }));
        setIsConnected(true);
        toast.success(`WebSocket connected to ${KrakenPair}`);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (Array.isArray(data) && data[1]?.c) {
          const [ , ticker ] = data;
          const price = parseFloat(ticker.c[0]);
          const volume24h = parseFloat(ticker.v[1]);

          setCurrentMarketData(prev => ({
            ...prev,
            price,
            volume24h,
            lastUpdated: new Date(),
          }));

          if (verboseLogging) {
            console.log(`[Kraken WS] ${KrakenPair} price: $${price}, volume: $${volume24h}`);
          }
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        toast.error("Kraken WebSocket error");
      };

      ws.onclose = () => {
        setIsConnected(false);
        toast.info(`WebSocket closed for ${KrakenPair}`);
      };

      websocketRef.current = ws;
    } catch (error) {
      console.error('Failed to connect to Kraken WS:', error);
      toast.error(`Failed to connect to ${selectedPair} WebSocket`);
    }
  };

  const disconnectFromMarket = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
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
      portfolioHoldings,
      totalPortfolioValue,
      updatePair,
      updateDataMode,
      updateRefreshRate,
      updateTradeRules,
      toggleAutoTrading,
      togglePaperTrading,
      toggleVerboseLogging,
      connectToMarket,
      disconnectFromMarket,
      updatePortfolioValue,
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
