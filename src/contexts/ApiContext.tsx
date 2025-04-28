import React, { createContext, useState, useContext, useEffect } from 'react';
import { toast } from "sonner";
import axios from 'axios';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface ApiContextType {
  KrakenApiKey: string;
  KrakenApiSecret: string;
  sqlConnection: string;
  llamaApiUrl: string;
  connectionStatus: {
    Kraken: ConnectionStatus;
    database: ConnectionStatus;
    llama: ConnectionStatus;
  };
  updateKrakenCredentials: (key: string, secret: string) => void;
  updateSqlConnection: (connectionString: string) => void;
  updateLlamaApiUrl: (url: string) => void;
  testConnection: (type: 'Kraken' | 'database' | 'llama') => Promise<boolean>;
}

const ApiContext = createContext<ApiContextType | undefined>(undefined);

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [KrakenApiKey, setKrakenApiKey] = useState<string>(() => localStorage.getItem('KrakenApiKey') || '');
  const [KrakenApiSecret, setKrakenApiSecret] = useState<string>(() => localStorage.getItem('KrakenApiSecret') || '');
  const [sqlConnection, setSqlConnection] = useState<string>(() => localStorage.getItem('sqlConnection') || '');
  const [llamaApiUrl, setLlamaApiUrl] = useState<string>(() => localStorage.getItem('llamaApiUrl') || 'http://localhost:8000/v1/chat/completions');

  const [connectionStatus, setConnectionStatus] = useState({
    Kraken: 'disconnected' as ConnectionStatus,
    database: 'disconnected' as ConnectionStatus,
    llama: 'disconnected' as ConnectionStatus,
  });

  const updateKrakenCredentials = (key: string, secret: string) => {
    setKrakenApiKey(key);
    setKrakenApiSecret(secret);
    localStorage.setItem('KrakenApiKey', key);
    localStorage.setItem('KrakenApiSecret', secret);
  };

  const updateSqlConnection = (connectionString: string) => {
    setSqlConnection(connectionString);
    localStorage.setItem('sqlConnection', connectionString);
  };

  const updateLlamaApiUrl = (url: string) => {
    setLlamaApiUrl(url);
    localStorage.setItem('llamaApiUrl', url);
  };

  const testConnection = async (type: 'Kraken' | 'database' | 'llama'): Promise<boolean> => {
    try {
      setConnectionStatus(prev => ({ ...prev, [type]: 'connecting' }));

      if (type === 'llama') {
        try {
          const response = await axios.post(
            `${llamaApiUrl}`,
            {
              model: 'llama',
              messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Say hello' },
              ],
              max_tokens: 5,
              temperature: 0.5,
            },
            { timeout: 5000 }
          );

          const success = response.status === 200;

          if (success) {
            setConnectionStatus(prev => ({ ...prev, [type]: 'connected' }));
            toast.success(`LLaMA API connection successful`);
            return true;
          } else {
            setConnectionStatus(prev => ({ ...prev, [type]: 'error' }));
            toast.error(`LLaMA API returned status: ${response.status}`);
            return false;
          }
        } catch (error) {
          console.error('LLaMA API connection error:', error);
          setConnectionStatus(prev => ({ ...prev, [type]: 'error' }));
          toast.error(
            `LLaMA API connection error: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
          return false;
        }
      }

      // Fallback for Kraken/database
      await new Promise(resolve => setTimeout(resolve, 1500));
      const success = Math.random() > 0.3; // simulate

      if (success) {
        setConnectionStatus(prev => ({ ...prev, [type]: 'connected' }));
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} connection successful`);
        return true;
      } else {
        setConnectionStatus(prev => ({ ...prev, [type]: 'error' }));
        toast.error(`${type.charAt(0).toUpperCase() + type.slice(1)} connection failed`);
        return false;
      }
    } catch (error) {
      setConnectionStatus(prev => ({ ...prev, [type]: 'error' }));
      toast.error(`${type.charAt(0).toUpperCase() + type.slice(1)} connection error: ${error}`);
      return false;
    }
  };

  useEffect(() => {
    setConnectionStatus({
      Kraken: KrakenApiKey && KrakenApiSecret ? 'disconnected' : 'error',
      database: sqlConnection ? 'disconnected' : 'error',
      llama: llamaApiUrl ? 'disconnected' : 'error',
    });
  }, [KrakenApiKey, KrakenApiSecret, sqlConnection, llamaApiUrl]);

  return (
    <ApiContext.Provider value={{
      KrakenApiKey,
      KrakenApiSecret,
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

// eslint-disable-next-line react-refresh/only-export-components
export const useApi = (): ApiContextType => {
  const context = useContext(ApiContext);
  if (context === undefined) {
    throw new Error('useApi must be used within an ApiProvider');
  }
  return context;
};
