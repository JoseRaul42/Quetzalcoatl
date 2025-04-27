
import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from "sonner";
import axios from 'axios';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ApiContextType {
  krakenApiKey: string;
  krakenApiSecret: string;
  sqlConnection: string;
  llamaApiUrl: string;
  connectionStatus: {
    kraken: ConnectionStatus;
    database: ConnectionStatus;
    llama: ConnectionStatus;
  };
  updateKrakenCredentials: (key: string, secret: string) => void;
  updateSqlConnection: (connectionString: string) => void;
  updateLlamaApiUrl: (url: string) => void;
  testConnection: (type: 'kraken' | 'database' | 'llama') => Promise<boolean>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [krakenApiKey, setKrakenApiKey] = useState<string>(() => {
    return localStorage.getItem('krakenApiKey') || '';
  });
  
  const [krakenApiSecret, setKrakenApiSecret] = useState<string>(() => {
    return localStorage.getItem('krakenApiSecret') || '';
  });
  
  const [sqlConnection, setSqlConnection] = useState<string>(() => {
    return localStorage.getItem('sqlConnection') || '';
  });
  
  const [llamaApiUrl, setLlamaApiUrl] = useState<string>(() => {
    return localStorage.getItem('llamaApiUrl') || 'http://localhost:8000/v1/chat';
  });
  
  const [connectionStatus, setConnectionStatus] = useState({
    kraken: 'disconnected' as ConnectionStatus,
    database: 'disconnected' as ConnectionStatus,
    llama: 'disconnected' as ConnectionStatus,
  });

  const updateKrakenCredentials = (key: string, secret: string) => {
    setKrakenApiKey(key);
    setKrakenApiSecret(secret);
    localStorage.setItem('krakenApiKey', key);
    localStorage.setItem('krakenApiSecret', secret);
  };

  const updateSqlConnection = (connectionString: string) => {
    setSqlConnection(connectionString);
    localStorage.setItem('sqlConnection', connectionString);
  };

  const updateLlamaApiUrl = (url: string) => {
    setLlamaApiUrl(url);
    localStorage.setItem('llamaApiUrl', url);
  };

  const testConnection = async (type: 'kraken' | 'database' | 'llama'): Promise<boolean> => {
    try {
      setConnectionStatus(prev => ({ ...prev, [type]: 'connecting' }));
      
      if (type === 'llama') {
        // Test actual LLaMA API connection
        try {
          // Send a simple health check request to the LLaMA API
          const response = await axios.get(
            new URL('/v1/health', llamaApiUrl).toString(), 
            { timeout: 5000 }
          );
          
          const success = response.status === 200;
          
          if (success) {
            setConnectionStatus(prev => ({ ...prev, [type]: 'connected' }));
            toast.success(`LLaMA API connection successful`);
            return true;
          } else {
            setConnectionStatus(prev => ({ ...prev, [type]: 'error' }));
            toast.error(`LLaMA API connection failed: ${response.status}`);
            return false;
          }
        } catch (error) {
          console.error('LLaMA API connection error:', error);
          setConnectionStatus(prev => ({ ...prev, [type]: 'error' }));
          toast.error(`LLaMA API connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return false;
        }
      } else {
        // Simulated connection test for other connections - would be replaced with actual API calls
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const success = Math.random() > 0.3; // Simulate success/failure
        
        if (success) {
          setConnectionStatus(prev => ({ ...prev, [type]: 'connected' }));
          toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} connection successful`);
          return true;
        } else {
          setConnectionStatus(prev => ({ ...prev, [type]: 'error' }));
          toast.error(`${type.charAt(0).toUpperCase() + type.slice(1)} connection failed`);
          return false;
        }
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, [type]: 'error' }));
      toast.error(`${type.charAt(0).toUpperCase() + type.slice(1)} connection error: ${error}`);
      return false;
    }
  };

  useEffect(() => {
    // Reset statuses when credentials change
    setConnectionStatus({
      kraken: krakenApiKey && krakenApiSecret ? 'disconnected' : 'error',
      database: sqlConnection ? 'disconnected' : 'error',
      llama: llamaApiUrl ? 'disconnected' : 'error',
    });
  }, [krakenApiKey, krakenApiSecret, sqlConnection, llamaApiUrl]);

  return (
    <ApiContext.Provider value={{
      krakenApiKey,
      krakenApiSecret,
      sqlConnection,
      llamaApiUrl,
      connectionStatus,
      updateKrakenCredentials,
      updateSqlConnection,
      updateLlamaApiUrl,
      testConnection,
    }}>
      {children}
    </ApiContext.Provider>
  );
};

export const useApi = (): ApiContextType => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};
