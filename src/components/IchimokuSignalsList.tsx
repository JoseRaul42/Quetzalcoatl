
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CircleCheck, CircleX, Circle, RefreshCw, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface IchimokuSignal {
  pair: string;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
  price: number;
  tenkanSen: number;
  kijunSen: number;
  senkouSpanA: number;
  senkouSpanB: number;
  timestamp: string;
  updated: string;
}

interface IchimokuSignalsListProps {
  signals: Record<string, IchimokuSignal>;
  isConnected: boolean;
  status?: 'idle' | 'loading' | 'success' | 'error';
  error?: string | null;
}

const IchimokuSignalsList: React.FC<IchimokuSignalsListProps> = ({ 
  signals,
  isConnected,
  status = 'idle',
  error = null
}) => {
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString();
    } catch (e) {
      return 'Invalid date';
    }
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };
  
  // Updated signal icons with enhanced deuteranopia-friendly design
  const getSignalIcon = (signal: string) => {
    switch (signal) {
      case 'BUY':
        return <CircleCheck className="h-4 w-4 text-blue-500" />; // Enhanced blue
      case 'SELL':
        return <CircleX className="h-4 w-4 text-orange-500" />; // Enhanced orange
      default:
        return <Circle className="h-4 w-4 text-gray-500" />; // Neutral gray
    }
  };
  
  // Updated signal badges with enhanced deuteranopia-friendly colors
  const getSignalBadge = (signal: string) => {
    switch (signal) {
      case 'BUY':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-400">
            BUY
          </Badge>
        );
      case 'SELL':
        return (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-400">
            SELL
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-200 border border-gray-400">
            NEUTRAL
          </Badge>
        );
    }
  };

  // Render the appropriate content based on connection and status
  const renderContent = () => {
    if (!isConnected) {
      return (
        <div className="flex items-center justify-center p-6">
          <AlertCircle className="h-5 w-5 mr-2 text-muted-foreground" />
          <p className="text-muted-foreground">Connect to market to view signals</p>
        </div>
      );
    }
    
    if (status === 'error' && error) {
      return (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error fetching Ichimoku signals: {error}
            </AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button variant="outline" size="sm" className="mt-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Check server status
            </Button>
          </div>
        </div>
      );
    }
    
    if (status === 'loading' && Object.keys(signals).length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-6 space-y-2">
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
          <p className="text-muted-foreground">Fetching Ichimoku signals...</p>
        </div>
      );
    }
    
    if (Object.keys(signals).length === 0) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-center p-6">
            <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
            <p className="text-muted-foreground">
              Gathering candle data for Ichimoku analysis... 
              <span className="block text-xs mt-1">
                (This may take several minutes to collect enough 4H candles)
              </span>
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        {Object.values(signals).map((signal) => (
          <div 
            key={signal.pair} 
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {getSignalIcon(signal.signal)}
              <div>
                <h4 className="font-medium">{signal.pair}</h4>
                <p className="text-sm text-muted-foreground">
                  Updated {formatTime(signal.timestamp)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {formatCurrency(signal.price)}
              </span>
              {getSignalBadge(signal.signal)}
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Ichimoku Cloud Signals (4H)
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground ml-1" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="p-2 max-w-xs">
                    <p className="text-sm font-medium">Signal Legend:</p>
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <CircleCheck className="h-3 w-3 text-blue-500" />
                        <span className="text-xs">Blue: BUY signal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CircleX className="h-3 w-3 text-orange-500" />
                        <span className="text-xs">Orange: SELL signal</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Circle className="h-3 w-3 text-gray-500" />
                        <span className="text-xs">Gray: NEUTRAL signal</span>
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
          <CardDescription>
            Real-time breakout signals based on Ichimoku Cloud analysis
          </CardDescription>
        </div>
        {status === 'loading' && (
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
        )}
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default IchimokuSignalsList;
