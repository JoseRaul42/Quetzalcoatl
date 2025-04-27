
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { BarChart, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { useTrading, TradingPair, DataMode } from "@/contexts/TradingContext";

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
  
  const tradingPairs = ['BTC/USD', 'ETH/USD', 'XRP/USD', 'ADA/USD', 'SOL/USD'];
  const dataModes = ['websocket', 'rest'];
  
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
  
  const getPriceChangeClass = () => {
    if (!currentMarketData.price) return 'text-neutral';
    const previousPrice = (currentMarketData.price || 0) - (Math.random() - 0.5) * 100; // Simulate previous price
    return previousPrice < currentMarketData.price ? 'text-profit' : 'text-loss';
  };

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
                <RefreshCw className="h-4 w-4 animate-spin-slow text-primary" />
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
                  <div className={`text-sm font-semibold ${getPriceChangeClass()}`}>
                    {Math.random() > 0.5 ? (
                      <TrendingUp className="inline h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="inline h-4 w-4 mr-1" />
                    )}
                    {(Math.random() * 5).toFixed(2)}%
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
      
      <Card>
        <CardHeader>
          <CardTitle>Market History</CardTitle>
          <CardDescription>
            Interactive price chart would appear here in the full implementation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-chart-bg p-4 rounded-lg h-64 flex items-center justify-center">
            <p className="text-muted-foreground">
              Price chart visualization (would be implemented with Recharts or a similar library)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketMonitor;
