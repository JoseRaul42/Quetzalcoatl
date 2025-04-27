
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Terminal, AlertTriangle } from "lucide-react";
import { useTrading, Sentiment } from "@/contexts/TradingContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

const TradingStrategy: React.FC = () => {
  const {
    tradeRules,
    autoTrading,
    paperTrading,
    verboseLogging,
    updateTradeRules,
    toggleAutoTrading,
    togglePaperTrading,
    toggleVerboseLogging,
  } = useTrading();
  
  const sentiments: Sentiment[] = ['positive', 'neutral', 'negative'];
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      updateTradeRules({ volumeThreshold: value });
    }
  };
  
  const handleMaxUsdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      updateTradeRules({ maxUsdPerTrade: value });
    }
  };
  
  const handleMinUsdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      updateTradeRules({ minUsdThreshold: value });
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center">
        <Terminal className="h-6 w-6 mr-2" />
        <h1 className="text-2xl font-bold">Trading Strategy</h1>
      </div>
      
      {autoTrading && !paperTrading && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Warning: Live trading is enabled. Real funds will be used for trades.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Rule Configuration</CardTitle>
            <CardDescription>
              Set up your automated trading rules
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="volume-threshold">Volume Threshold (USD)</Label>
                <Input
                  id="volume-threshold"
                  type="number"
                  min="0"
                  value={tradeRules.volumeThreshold}
                  onChange={handleVolumeChange}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 24h trading volume to trigger a trade
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sentiment">Required Sentiment</Label>
                <Select
                  value={tradeRules.sentiment}
                  onValueChange={(value) => updateTradeRules({ sentiment: value as Sentiment })}
                >
                  <SelectTrigger id="sentiment">
                    <SelectValue placeholder="Select sentiment" />
                  </SelectTrigger>
                  <SelectContent>
                    {sentiments.map((sentiment) => (
                      <SelectItem key={sentiment} value={sentiment}>
                        {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  LLM sentiment required to execute a trade
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max-usd">Maximum USD per Trade</Label>
                <Input
                  id="max-usd"
                  type="number"
                  min="0"
                  value={tradeRules.maxUsdPerTrade}
                  onChange={handleMaxUsdChange}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum USD amount for any single trade
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="min-usd">Minimum USD Threshold</Label>
                <Input
                  id="min-usd"
                  type="number"
                  min="0"
                  value={tradeRules.minUsdThreshold}
                  onChange={handleMinUsdChange}
                />
                <p className="text-xs text-muted-foreground">
                  Don't execute trades below this USD amount
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="portfolio-percent">Portfolio % to Trade: {tradeRules.portfolioPercentage}%</Label>
                </div>
                <Slider
                  id="portfolio-percent"
                  value={[tradeRules.portfolioPercentage]}
                  min={1}
                  max={100}
                  step={1}
                  onValueChange={(values) => updateTradeRules({ portfolioPercentage: values[0] })}
                />
                <p className="text-xs text-muted-foreground">
                  Percentage of portfolio to allocate per trade
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Trading Controls</CardTitle>
            <CardDescription>
              Enable or disable automated trading features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-trading" className="text-base">Automated Trading</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable bot to execute trades automatically
                  </p>
                </div>
                <Switch
                  id="auto-trading"
                  checked={autoTrading}
                  onCheckedChange={toggleAutoTrading}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="paper-trading" className="text-base">Paper Trading Mode</Label>
                  <p className="text-xs text-muted-foreground">
                    Simulate trades without using real funds
                  </p>
                </div>
                <Switch
                  id="paper-trading"
                  checked={paperTrading}
                  onCheckedChange={togglePaperTrading}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="verbose-logging" className="text-base">Verbose Logging</Label>
                  <p className="text-xs text-muted-foreground">
                    Show detailed logs in console and UI
                  </p>
                </div>
                <Switch
                  id="verbose-logging"
                  checked={verboseLogging}
                  onCheckedChange={toggleVerboseLogging}
                />
              </div>
              
              <div className="pt-4">
                <Button 
                  className={`w-full ${autoTrading ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                  onClick={toggleAutoTrading}
                >
                  {autoTrading ? 'Stop Auto Trading' : 'Start Auto Trading'}
                </Button>
              </div>
              
              <div className="rounded-lg border p-3 bg-secondary">
                <div className="text-sm">
                  <span className="font-semibold">Current Strategy:</span> Buy/sell {tradeRules.portfolioPercentage}% of portfolio when volume exceeds ${tradeRules.volumeThreshold.toLocaleString()} and sentiment is {tradeRules.sentiment}. Min trade: ${tradeRules.minUsdThreshold}, Max trade: ${tradeRules.maxUsdPerTrade}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TradingStrategy;
