
import React, { createContext, useState, useContext } from 'react';
import { toast } from "sonner";
import { Sentiment } from './TradingContext';
import { useApi } from './ApiContext';
import axios from 'axios';

interface SentimentContextType {
  marketText: string;
  analysisPending: boolean;
  analyzedSentiment: Sentiment | null;
  lastAnalyzedText: string;
  updateMarketText: (text: string) => void;
  analyzeText: () => Promise<void>;
}

const SentimentContext = createContext<SentimentContextType | undefined>(undefined);

export const SentimentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [marketText, setMarketText] = useState<string>('');
  const [analysisPending, setAnalysisPending] = useState<boolean>(false);
  const [analyzedSentiment, setAnalyzedSentiment] = useState<Sentiment | null>(null);
  const [lastAnalyzedText, setLastAnalyzedText] = useState<string>('');
  const { llamaApiUrl, connectionStatus } = useApi();

  const updateMarketText = (text: string) => {
    setMarketText(text);
  };

  const analyzeText = async (): Promise<void> => {
    if (!marketText.trim()) {
      toast.error('Please enter a URL to scrape');
      return;
    }

    if (connectionStatus.llama !== 'connected') {
      toast.error('LLaMA API is not connected. Please configure and test the connection first.');
      return;
    }
  
    try {
      setAnalysisPending(true);
      toast.info('Scraping and analyzing URL...');
  
      const response = await fetch('http://localhost:1234/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: marketText }), // marketText now holds the URL
      });
  
      if (!response.ok) throw new Error('API error');
      const { sentiment, text } = await response.json();
  
      setAnalyzedSentiment(sentiment);
      setLastAnalyzedText(text);
  
      toast.success(`LLM says: ${sentiment.toUpperCase()} sentiment`);
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      toast.error('Failed to analyze sentiment');
    } finally {
      setAnalysisPending(false);
    }
  };

  return (
    <SentimentContext.Provider value={{
      marketText,
      analysisPending,
      analyzedSentiment,
      lastAnalyzedText,
      updateMarketText,
      analyzeText,
    }}>
      {children}
    </SentimentContext.Provider>
  );
};

export const useSentiment = (): SentimentContextType => {
  const context = useContext(SentimentContext);
  if (context === undefined) {
    throw new Error('useSentiment must be used within a SentimentProvider');
  }
  return context;
};
