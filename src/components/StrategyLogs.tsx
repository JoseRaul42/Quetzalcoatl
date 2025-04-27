
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Clock, Download } from "lucide-react";
import { useTrading, TradeLog } from "@/contexts/TradingContext";

const StrategyLogs: React.FC = () => {
  const { tradeLogs } = useTrading();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  const formatDate = (date: Date) => {
    return date.toLocaleString();
  };
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };
  
  const getSentimentClass = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-profit';
      case 'negative': return 'text-loss';
      case 'neutral': return 'text-neutral';
      default: return '';
    }
  };
  
  const getActionClass = (action: string) => {
    switch (action) {
      case 'buy': return 'text-profit';
      case 'sell': return 'text-loss';
      case 'hold': return 'text-neutral';
      default: return '';
    }
  };
  
  const totalPages = Math.ceil(tradeLogs.length / pageSize);
  const paginatedLogs = tradeLogs.slice((page - 1) * pageSize, page * pageSize);
  
  const handleExport = () => {
    // In a real implementation, this would generate a CSV file of log data
    console.log('Exporting trade logs...');
    const csvContent = 'data:text/csv;charset=utf-8,' + 
      'Timestamp,Pair,Volume,Sentiment,Action,Amount,PaperMode\n' +
      tradeLogs.map(log => {
        return `${log.timestamp.toISOString()},${log.pair},${log.volumeChecked},${log.sentiment},${log.action},${log.usdAmount},${log.paperMode}`;
      }).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trade_logs_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Clock className="h-6 w-6 mr-2" />
          <h1 className="text-2xl font-bold">Strategy Logs</h1>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={tradeLogs.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
          <CardDescription>
            Logs of all trading decisions and executions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tradeLogs.length === 0 ? (
            <div className="min-h-[200px] flex items-center justify-center">
              <p className="text-muted-foreground">No trade logs yet. Start auto-trading to see activity.</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Pair</TableHead>
                      <TableHead>Volume</TableHead>
                      <TableHead>Sentiment</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Mode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{formatDate(log.timestamp)}</TableCell>
                        <TableCell>{log.pair}</TableCell>
                        <TableCell>${(log.volumeChecked / 1000000).toFixed(2)}M</TableCell>
                        <TableCell className={getSentimentClass(log.sentiment)}>
                          {log.sentiment.charAt(0).toUpperCase() + log.sentiment.slice(1)}
                        </TableCell>
                        <TableCell className={getActionClass(log.action)}>
                          {log.action.toUpperCase()}
                        </TableCell>
                        <TableCell>{formatCurrency(log.usdAmount)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${log.paperMode ? 'bg-blue-500/20 text-blue-500' : 'bg-red-500/20 text-red-500'}`}>
                            {log.paperMode ? 'Paper' : 'Live'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, tradeLogs.length)} of {tradeLogs.length} logs
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>System Logs</CardTitle>
          <CardDescription>
            Application events and system notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-secondary rounded-lg p-4 text-sm font-mono h-[150px] overflow-y-auto">
            <div className="text-green-500">[INFO] System started at {new Date().toLocaleString()}</div>
            <div className="text-yellow-500">[WARN] Kraken API connection latency: 150ms</div>
            <div className="text-blue-500">[INFO] Monitoring BTC/USD with WebSocket streaming</div>
            <div className="text-green-500">[INFO] LLaMA sentiment analysis service connected</div>
            <div className="text-blue-500">[INFO] Paper trading mode activated</div>
            {tradeLogs.length > 0 && (
              <>
                <div className="text-green-500">[INFO] Trade executed: {tradeLogs[0].action.toUpperCase()} ${tradeLogs[0].usdAmount.toFixed(2)} of {tradeLogs[0].pair}</div>
                <div className="text-blue-500">[INFO] Sentiment analysis: {tradeLogs[0].sentiment.toUpperCase()}</div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StrategyLogs;
