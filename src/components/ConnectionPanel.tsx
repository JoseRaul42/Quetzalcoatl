import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useApi } from "@/contexts/ApiContext";
import { Settings, Database, Terminal, RefreshCw, MessageSquare } from "lucide-react";

const ConnectionPanel: React.FC = () => {
  const { 
    krakenApiKey, 
    krakenApiSecret, 
    sqlConnection, 
    llamaApiUrl,
    connectionStatus,
    updateKrakenCredentials,
    updateSqlConnection,
    updateLlamaApiUrl,
    testConnection
  } = useApi();
  
  const [apiKey, setApiKey] = useState(krakenApiKey);
  const [apiSecret, setApiSecret] = useState(krakenApiSecret);
  const [sqlConnectionStr, setSqlConnectionStr] = useState(sqlConnection);
  const [llamaUrl, setLlamaUrl] = useState(llamaApiUrl);
  
  const handleSaveKraken = () => {
    updateKrakenCredentials(apiKey, apiSecret);
  };
  
  const handleSaveSql = () => {
    updateSqlConnection(sqlConnectionStr);
  };
  
  const handleSaveLlama = () => {
    updateLlamaApiUrl(llamaUrl);
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-500';
      case 'connecting': return 'text-yellow-500 animate-pulse';
      case 'error': return 'text-red-500';
      default: return 'text-neutral';
    }
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center">
        <Settings className="h-6 w-6 mr-2" />
        <h1 className="text-2xl font-bold">Connection Settings</h1>
      </div>
      
      <Alert>
        <AlertTitle>Connection Configuration</AlertTitle>
        <AlertDescription>
          Enter your API credentials and connection details below. All data is stored locally in your browser.
        </AlertDescription>
      </Alert>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Terminal className="h-5 w-5 mr-2" />
              Kraken API Configuration
            </CardTitle>
            <CardDescription>
              Configure your Kraken API access for trading operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input 
                  id="api-key"
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Kraken API key"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="api-secret">API Secret</Label>
                <Input 
                  id="api-secret"
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter your Kraken API secret"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={handleSaveKraken} className="flex-1">
                  Save Credentials
                </Button>
                <Button 
                  onClick={() => testConnection('kraken')}
                  variant="outline" 
                  className="flex items-center"
                  disabled={connectionStatus.kraken === 'connecting'}
                >
                  {connectionStatus.kraken === 'connecting' && (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Test
                </Button>
              </div>
              
              <div className="text-sm font-medium">
                Status: <span className={getStatusColor(connectionStatus.kraken)}>
                  {connectionStatus.kraken.charAt(0).toUpperCase() + connectionStatus.kraken.slice(1)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              SQL Server Connection
            </CardTitle>
            <CardDescription>
              Configure your database connection for logging trades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sql-connection">Connection String</Label>
                <Input 
                  id="sql-connection"
                  type="text"
                  value={sqlConnectionStr}
                  onChange={(e) => setSqlConnectionStr(e.target.value)}
                  placeholder="hostname,database,username,password"
                />
                <p className="text-xs text-muted-foreground">
                  Format: hostname,database,username,password
                </p>
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={handleSaveSql} className="flex-1">
                  Save Connection
                </Button>
                <Button 
                  onClick={() => testConnection('database')}
                  variant="outline" 
                  className="flex items-center"
                  disabled={connectionStatus.database === 'connecting'}
                >
                  {connectionStatus.database === 'connecting' && (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Test
                </Button>
              </div>
              
              <div className="text-sm font-medium">
                Status: <span className={getStatusColor(connectionStatus.database)}>
                  {connectionStatus.database.charAt(0).toUpperCase() + connectionStatus.database.slice(1)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              LLaMA API Connection
            </CardTitle>
            <CardDescription>
              Configure connection to local LLaMA.cpp server for sentiment analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="llama-url">LLaMA API URL</Label>
                <Input 
                  id="llama-url"
                  type="text"
                  value={llamaUrl}
                  onChange={(e) => setLlamaUrl(e.target.value)}
                  placeholder="http://localhost:8000/v1/chat"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={handleSaveLlama} className="flex-1">
                  Save LLaMA URL
                </Button>
                <Button 
                  onClick={() => testConnection('llama')}
                  variant="outline" 
                  className="flex items-center"
                  disabled={connectionStatus.llama === 'connecting'}
                >
                  {connectionStatus.llama === 'connecting' && (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Test
                </Button>
              </div>
              
              <div className="text-sm font-medium">
                Status: <span className={getStatusColor(connectionStatus.llama)}>
                  {connectionStatus.llama.charAt(0).toUpperCase() + connectionStatus.llama.slice(1)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConnectionPanel;
