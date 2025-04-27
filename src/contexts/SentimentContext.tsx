
import React, { createContext, useState, useContext } from 'react';
import { toast } from "sonner";
import { Sentiment } from './TradingContext';

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

  const updateMarketText = (text: string) => {
    setMarketText(text);
  };

  const analyzeText = async (): Promise<void> => {
    if (!marketText.trim()) {
      toast.error('Please enter text to analyze');
      return;
    }

    try {
      setAnalysisPending(true);
      toast.info('Analyzing market sentiment...');
      
      // Simulate calling the LLM API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate different sentiment outcomes for demonstration
      const sentiments: Sentiment[] = ['positive', 'neutral', 'negative'];
      const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
      
      setAnalyzedSentiment(randomSentiment);
      setLastAnalyzedText(marketText);
      
      toast.success(`Analysis complete: ${randomSentiment.toUpperCase()} sentiment detected`);
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
