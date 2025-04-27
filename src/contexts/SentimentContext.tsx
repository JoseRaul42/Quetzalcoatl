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
      toast.error('Please enter text to analyze');
      return;
    }

    if (connectionStatus.llama !== 'connected') {
      toast.error('LLaMA API is not connected. Please configure and test the connection first.');
      return;
    }
  
    try {
      setAnalysisPending(true);
      toast.info('Analyzing text...');
      
      console.log('Sending text to analyze:', marketText);
  
      const response = await fetch('http://localhost:1234/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: "You are a market sentiment analyzer. You must respond with ONLY ONE of these exact words: 'positive', 'negative', or 'neutral'."
            },
            {
              role: "user",
              content: marketText
            }
          ],
          temperature: 0.1,
          max_tokens: 10
        }),
      });
  
      if (!response.ok) {
        console.error('API response not ok:', response.status, response.statusText);
        throw new Error('API response was not ok');
      }
  
      const data = await response.json();
      console.log('Received response:', data);
      
      const sentimentResponse = data.choices[0].message.content.toLowerCase().trim();
      console.log('Parsed sentiment:', sentimentResponse);
      
      // Validate that we got one of our expected sentiments
      const validSentiments: Sentiment[] = ['positive', 'negative', 'neutral'];
      const sentiment = validSentiments.includes(sentimentResponse as Sentiment) 
        ? sentimentResponse as Sentiment 
        : 'neutral';
  
      setAnalyzedSentiment(sentiment);
      setLastAnalyzedText(marketText);
  
      toast.success(`Analysis complete: ${sentiment.toUpperCase()} sentiment detected`);
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      toast.error('Failed to analyze sentiment. Please check if the LLaMA server is running.');
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
