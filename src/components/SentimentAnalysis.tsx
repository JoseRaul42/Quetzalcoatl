
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, RefreshCw } from "lucide-react";
import { useSentiment } from "@/contexts/SentimentContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

const SentimentAnalysis: React.FC = () => {
  const {
    marketText,
    analysisPending,
    analyzedSentiment,
    lastAnalyzedText,
    updateMarketText,
    analyzeText
  } = useSentiment();
  
  const getSentimentColor = (sentiment: string | null) => {
    if (!sentiment) return 'bg-muted';
    switch (sentiment) {
      case 'positive': return 'bg-profit text-white';
      case 'negative': return 'bg-loss text-white';
      case 'neutral': return 'bg-neutral text-white';
      default: return 'bg-muted';
    }
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateMarketText(e.target.value);
  };
  
  const exampleTexts = [
    "Bitcoin price surges as institutional adoption increases. Major banks announce crypto custody services, signaling mainstream acceptance.",
    "Cryptocurrency markets crash as regulatory fears mount. Several countries announce plans to restrict crypto trading and mining operations.",
    "Mixed signals in the crypto market as trading volumes remain stable. Analysts are divided on near-term price predictions."
  ];
  
  const loadExampleText = (index: number) => {
    updateMarketText(exampleTexts[index]);
  };

  return (
    <div className="grid gap-6">
      <div className="flex items-center">
        <MessageSquare className="h-6 w-6 mr-2" />
        <h1 className="text-2xl font-bold">Sentiment Analysis</h1>
      </div>
      
      <Alert>
        <AlertDescription>
          Test LLaMA sentiment analysis on news or market commentary. Results will influence automated trading decisions.
        </AlertDescription>
      </Alert>
      
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Market News Analyzer</CardTitle>
              <CardDescription>
                Enter news or market commentary to analyze sentiment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="Paste market news or commentary here..."
                  className="min-h-[200px]"
                  value={marketText}
                  onChange={handleTextChange}
                />
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button onClick={() => analyzeText()} disabled={analysisPending || !marketText.trim()}>
                    {analysisPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                    Analyze Sentiment
                  </Button>
                  <Button variant="outline" onClick={() => loadExampleText(0)}>Example Positive</Button>
                  <Button variant="outline" onClick={() => loadExampleText(1)}>Example Negative</Button>
                  <Button variant="outline" onClick={() => loadExampleText(2)}>Example Neutral</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              LLaMA sentiment classification output
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!analyzedSentiment ? (
              <div className="min-h-[150px] flex items-center justify-center">
                <p className="text-muted-foreground">No sentiment analyzed yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`rounded-lg p-4 text-center ${getSentimentColor(analyzedSentiment)}`}>
                  <div className="text-2xl font-bold uppercase">
                    {analyzedSentiment}
                  </div>
                  <div className="text-sm">Sentiment Score</div>
                </div>
                
                <div className="rounded-lg border p-3">
                  <div className="text-sm">
                    <div className="font-semibold mb-1">Analyzed Text:</div>
                    <div className="text-muted-foreground">
                      {lastAnalyzedText.length > 150 
                        ? `${lastAnalyzedText.substring(0, 150)}...` 
                        : lastAnalyzedText}
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  <p>In production, detailed sentiment analysis metrics would be shown here, including confidence scores and key sentiment drivers detected by the LLM.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SentimentAnalysis;
