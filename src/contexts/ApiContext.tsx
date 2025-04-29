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
  const [KrakenApiKey, setKrakenApiKey] = useState<string>(() => 
    import.meta.env.VITE_KRAKEN_API_KEY || localStorage.getItem('KrakenApiKey') || ''
  );
  const [KrakenApiSecret, setKrakenApiSecret] = useState<string>(() => 
    import.meta.env.VITE_KRAKEN_PRIVATE_KEY || localStorage.getItem('KrakenApiSecret') || ''
  );
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

      if (type === 'Kraken') {
        try {
          console.log('[Kraken Test] Sending request to backend route http://localhost:5000/api/kraken-test...');
          const response = await axios.post('http://localhost:5000/api/test-kraken');

      
          console.log('[Kraken Test] Response from backend:', response.data);
      
          if (response.data.success) {
            toast.success('Kraken API connection successful');
            setConnectionStatus(prev => ({ ...prev, Kraken: 'connected' }));
            return true;
          } else {
            console.error('[Kraken Test] Backend returned failure:', response.data);
            throw new Error('Backend returned failure');
          }
        } catch (error) {
          console.error('[Kraken Test] Backend call failed:', error);
          toast.error(`Kraken API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setConnectionStatus(prev => ({ ...prev, Kraken: 'error' }));
          return false;
        }
      }
      

      if (type === 'llama') {
        try {
          const response = await axios.post(
            llamaApiUrl,
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
            setConnectionStatus(prev => ({ ...prev, llama: 'connected' }));
            toast.success('LLaMA API connection successful');
            return true;
          } else {
            setConnectionStatus(prev => ({ ...prev, llama: 'error' }));
            toast.error(`LLaMA API returned status: ${response.status}`);
            return false;
          }
        } catch (error) {
          console.error('LLaMA API connection error:', error);
          setConnectionStatus(prev => ({ ...prev, llama: 'error' }));
          toast.error(`LLaMA API connection error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return false;
        }
      }

      // Fallback for database simulation
      await new Promise(resolve => setTimeout(resolve, 1500));
      const success = Math.random() > 0.3;

      if (success) {
        setConnectionStatus(prev => ({ ...prev, database: 'connected' }));
        toast.success('Database connection successful');
        return true;
      } else {
        setConnectionStatus(prev => ({ ...prev, database: 'error' }));
        toast.error('Database connection failed');
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
