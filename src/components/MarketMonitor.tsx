import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { BarChart, TrendingUp, TrendingDown, RefreshCw, ChartBar, Gauge, AlertCircle } from "lucide-react";
import { useTrading, TradingPair, DataMode } from "@/contexts/TradingContext";
import { OrderBookChart } from "@/components/charts/OrderBookChart";
import { VolumeTimeChart } from "@/components/charts/VolumeTimeChart";
import { SentimentGauge } from "@/components/charts/SentimentGauge";
import IchimokuSignalsList from "@/components/IchimokuSignalsList";
import axios from 'axios';
import { toast } from "sonner";

const MarketMonitor: React.FC = () => {
  const { 
    selectedPair,
    dataMode,
    refreshRate,
    currentMarketData,
    isConnected,
    updatePair,
    updateDataMode,
    updateRefreshRate,
    connectToMarket,
    disconnectFromMarket
  } = useTrading();
  
  const [orderBookData, setOrderBookData] = useState<{
    asks: [number, number][];
    bids: [number, number][];
  }>({ asks: [], bids: [] });
  
  const [tradesData, setTradesData] = useState<{
    time: number;
    price: number;
    volume: number;
    side: 'buy' | 'sell';
  }[]>([]);
  
  const [ichimokuSignals, setIchimokuSignals] = useState<Record<string, any>>({});
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [ichimokuStatus, setIchimokuStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [ichimokuError, setIchimokuError] = useState<string | null>(null);
  
  const tradingPairs = ['XBT/USD', 'ETH/USD', 'XRP/USD', 'ADA/USD', 'SOL/USD'];
  const dataModes = ['websocket', 'rest'];
  
  // Format utility functions
  const formatCurrency = (value: number | null) => {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  const formatLargeNumber = (value: number | null) => {
    if (value === null) return 'N/A';
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(2)}K`;
    }
    return value.toFixed(2);
  };
  
  const formatTime = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString();
  };
  
  // Calculate market sentiment based on trade data
  const marketSentiment = useMemo(() => {
    if (!tradesData.length) return 0.5; // Neutral
    
    const buyVolume = tradesData
      .filter(trade => trade.side === 'buy')
      .reduce((sum, trade) => sum + trade.volume, 0);
      
    const totalVolume = tradesData.reduce((sum, trade) => sum + trade.volume, 0);
    
    return totalVolume > 0 ? buyVolume / totalVolume : 0.5;
  }, [tradesData]);
  
  // Fetch order flow data from backend
  const fetchOrderFlowData = async () => {
    if (isFetching || !isConnected) return;
    
    try {
      setIsFetching(true);
      // Convert pair format for API (e.g., BTC/USD -> BTCUSD)
      const krakenPair = selectedPair.replace('/', '');
      
      const response = await axios.get(`http://localhost:5000/api/kraken-orderflow?pair=${krakenPair}`);
      
      if (response.data.success) {
        // Transform order book data for visualization
        const { orderbook, trades } = response.data;
        
        // Update order book data
        setOrderBookData({
          asks: orderbook.asks.map((ask: string[]) => [parseFloat(ask[0]), parseFloat(ask[1])]),
          bids: orderbook.bids.map((bid: string[]) => [parseFloat(bid[0]), parseFloat(bid[1])])
        });
        
        // Transform and append trades data
        const newTrades = trades.slice(0, 100).map((trade: any[]) => ({
          time: trade[2],
          price: parseFloat(trade[0]),
          volume: parseFloat(trade[1]),
          side: trade[3] === 'b' ? 'buy' : 'sell'
        }));
        
        setTradesData(prev => {
          const combined = [...newTrades, ...prev].slice(0, 200);
          // Sort by time descending
          return combined.sort((a, b) => b.time - a.time);
        });
        
        setLastFetchTime(new Date());
        toast.success('Order flow data refreshed');
      }
    } catch (error) {
      console.error('Error fetching order flow data:', error);
      toast.error('Failed to fetch order flow data');
    } finally {
      setIsFetching(false);
    }
  };
  
  // Fetch Ichimoku signals from backend with improved logging
  const fetchIchimokuSignals = async () => {
    if (!isConnected) return;
    
    try {
      setIchimokuStatus('loading');
      console.log('[MarketMonitor] Fetching Ichimoku signals...');
      
      const response = await axios.get('http://localhost:5000/api/ichimoku-signals');
      
      if (response.data.success) {
        const signalsData = response.data.signals;
        setIchimokuSignals(signalsData);
        setIchimokuStatus('success');
        setIchimokuError(null);
        
        // Log the results
        const pairsReceived = Object.keys(signalsData).length;
        console.log(`[MarketMonitor] Ichimoku signals received for ${pairsReceived} pairs:`, signalsData);
        
        if (pairsReceived === 0) {
          console.warn('[MarketMonitor] No Ichimoku signals returned. Backend might still be gathering candles.');
        } else {
          toast.success(`Ichimoku signals updated for ${pairsReceived} pairs`);
        }
      } else {
        throw new Error(response.data.message || 'Unknown error in signal response');
      }
    } catch (error) {
      console.error('[MarketMonitor] Error fetching Ichimoku signals:', error);
      setIchimokuStatus('error');
      setIchimokuError(error instanceof Error ? error.message : 'Failed to fetch Ichimoku data');
      toast.error('Failed to fetch Ichimoku signals');
    }
  };
  
  // Set up interval to fetch data based on refreshRate
  useEffect(() => {
    if (!isConnected || dataMode !== 'rest') return;
    
    fetchOrderFlowData();
    const orderFlowInterval = setInterval(fetchOrderFlowData, refreshRate);
    
    return () => clearInterval(orderFlowInterval);
  }, [isConnected, refreshRate, selectedPair, dataMode]);
  
  // Set up interval to fetch Ichimoku signals with better logging
  useEffect(() => {
    if (!isConnected) return;
    
    console.log('[MarketMonitor] Setting up Ichimoku signals fetch interval');
    
    // Initial fetch
    fetchIchimokuSignals();
    
    // Set up interval for regular updates
    const signalsInterval = setInterval(() => {
      console.log('[MarketMonitor] Running scheduled Ichimoku signals update');
      fetchIchimokuSignals();
    }, 10000); // Every 10 seconds
    
    return () => {
      console.log('[MarketMonitor] Clearing Ichimoku signals interval');
      clearInterval(signalsInterval);
    };
  }, [isConnected]);
  
  // Clear data when disconnecting
  useEffect(() => {
    if (!isConnected) {
      setOrderBookData({ asks: [], bids: [] });
      setTradesData([]);
      setIchimokuSignals({});
      setIchimokuStatus('idle');
      setIchimokuError(null);
    }
  }, [isConnected]);

  return (
    <div className="grid gap-6">
      <div className="flex items-center">
        <BarChart className="h-6 w-6 mr-2" />
        <h1 className="text-2xl font-bold">Market Monitoring</h1>
      </div>
      
      <Alert>
        <AlertDescription>
          Configure market data sources and view real-time crypto prices. Connect to start receiving data.
        </AlertDescription>
      </Alert>
      
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Market Configuration</CardTitle>
            <CardDescription>
              Select trading pair and data sources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="trading-pair">Trading Pair</Label>
                <Select 
                  disabled={isConnected}
                  value={selectedPair} 
                  onValueChange={(value) => updatePair(value as TradingPair)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Trading Pair" />
                  </SelectTrigger>
                  <SelectContent>
                    {tradingPairs.map((pair) => (
                      <SelectItem key={pair} value={pair}>
                        {pair}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="data-mode">Data Mode</Label>
                <Select 
                  disabled={isConnected}
                  value={dataMode} 
                  onValueChange={(value) => updateDataMode(value as DataMode)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Data Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="refresh-rate">Refresh Rate: {refreshRate}ms</Label>
                </div>
                <Slider
                  disabled={isConnected}
                  value={[refreshRate]}
                  min={500}
                  max={10000}
                  step={500}
                  onValueChange={(values) => updateRefreshRate(values[0])}
                />
              </div>
              
              <Button 
                onClick={isConnected ? disconnectFromMarket : connectToMarket} 
                className="w-full"
                variant={isConnected ? "destructive" : "default"}
              >
                {isConnected ? "Disconnect" : "Connect to Market"}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Live Market Data</span>
              {isConnected && (
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : 'animate-spin-slow'} text-primary`} />
              )}
            </CardTitle>
            <CardDescription>
              Real-time {selectedPair} market information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isConnected ? (
              <div className="flex items-center justify-center h-40">
                <p className="text-muted-foreground">Connect to market to view live data</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-end">
                  <div className="text-4xl font-bold mr-2">
                    {formatCurrency(currentMarketData.price)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="trading-card">
                    <div className="data-label">24h Volume</div>
                    <div className="data-value">
                      {formatLargeNumber(currentMarketData.volume24h)} USD
                    </div>
                  </div>
                  
                  <div className="trading-card">
                    <div className="data-label">24h High</div>
                    <div className="data-value">
                      {formatCurrency(currentMarketData.high24h)}
                    </div>
                  </div>
                  
                  <div className="trading-card">
                    <div className="data-label">24h Low</div>
                    <div className="data-value">
                      {formatCurrency(currentMarketData.low24h)}
                    </div>
                  </div>
                  
                  <div className="trading-card">
                    <div className="data-label">Last Updated</div>
                    <div className="data-value">
                      {formatTime(currentMarketData.lastUpdated)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Ichimoku Signals Component with enhanced status info */}
      <IchimokuSignalsList 
        signals={ichimokuSignals}
        isConnected={isConnected}
        status={ichimokuStatus}
        error={ichimokuError}
      />
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChartBar className="h-4 w-4" />
              Order Book Depth
            </CardTitle>
            <CardDescription>
              Visualization of buy and sell orders at different price levels
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {!isConnected ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Connect to market to view order book</p>
              </div>
            ) : orderBookData.asks.length === 0 && orderBookData.bids.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading order book data...</p>
              </div>
            ) : (
              <OrderBookChart data={orderBookData} />
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Trade Volume History
            </CardTitle>
            <CardDescription>
              Recent trading volume by time
            </CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {!isConnected ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Connect to market to view trade history</p>
              </div>
            ) : tradesData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Loading trade history data...</p>
              </div>
            ) : (
              <VolumeTimeChart data={tradesData} />
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            Market Sentiment Analyzer
          </CardTitle>
          <CardDescription>
            Real-time market sentiment based on order flow
          </CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          {!isConnected ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Connect to market to view sentiment analysis</p>
            </div>
          ) : tradesData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Gathering data for sentiment analysis...</p>
            </div>
          ) : (
            <SentimentGauge value={marketSentiment} />
          )}
        </CardContent>
      </Card>
      
      <div className="text-xs text-muted-foreground">
        {lastFetchTime && (
          <div>Last data refresh: {lastFetchTime.toLocaleString()}</div>
        )}
      </div>
    </div>
  );
};

export default MarketMonitor;
