
import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

// Test route (already exists)
app.post('/api/test-kraken', async (req, res) => {
  try {
    const response = await axios.get('https://api.kraken.com/0/public/Time', {
      headers: { 'Accept': 'application/json' }
    });

    if (response.status === 200) {
      console.log('[Backend] Kraken Public API /Time success:', response.data);
      res.status(200).json({ success: true, data: response.data });
    } else {
      console.error('[Backend] Kraken Public API /Time failed with status:', response.status);
      res.status(500).json({ success: false, message: 'Kraken API did not return 200' });
    }
  } catch (error) {
    console.error('[Backend] Error calling Kraken Public API:', error);
    res.status(500).json({ success: false, message: 'Kraken API error', details: error });
  }
});

// Enhanced route to pull trades + orderbook for order flow analysis
app.get('/api/kraken-orderflow', async (req, res) => {
  const { pair = 'BTCUSD', depthCount = 500 } = req.query;
  console.log(`[Backend] Requesting orderflow data for pair: ${pair}`);
  console.log('[Backend] Query Parameters:', req.query);

  try {
    // Fetch recent trades with more data (limit=100)
    const tradesResponse = await axios.get(`https://api.kraken.com/0/public/Trades?pair=${pair}&count=100`);
    const tradesResult = tradesResponse.data.result;
    const tradesKey = Object.keys(tradesResult).find(key => key !== 'last');
    const tradesData = tradesResult[tradesKey];

    // Fetch order book with more depth for better visualization
    const depthResponse = await axios.get(`https://api.kraken.com/0/public/Depth?pair=${pair}&count=${depthCount}`);
    const depthResult = depthResponse.data.result;
    const depthKey = Object.keys(depthResult)[0];
    const depthData = depthResult[depthKey];

    // Fetch ticker data for additional market info
    const tickerResponse = await axios.get(`https://api.kraken.com/0/public/Ticker?pair=${pair}`);
    const tickerResult = tickerResponse.data.result;
    const tickerKey = Object.keys(tickerResult)[0];
    const tickerData = tickerResult[tickerKey];

    // Process and enhance the data
    const enhancedData = {
      success: true,
      pair,
      krakenPair: tradesKey,
      fetchedAt: new Date().toISOString(),
      trades: tradesData,
      orderbook: depthData,
      ticker: {
        ask: parseFloat(tickerData?.a?.[0] || 0),
        bid: parseFloat(tickerData?.b?.[0] || 0),
        last: parseFloat(tickerData?.c?.[0] || 0),
        volume: parseFloat(tickerData?.v?.[1] || 0),
        volumeWeightedAvgPrice: parseFloat(tickerData?.p?.[1] || 0),
        high: parseFloat(tickerData?.h?.[1] || 0),
        low: parseFloat(tickerData?.l?.[1] || 0),
      },
      // Calculate basic order flow metrics
      metrics: {
        buyVolume: tradesData
          .filter(trade => trade[3] === 'b')
          .reduce((sum, trade) => sum + parseFloat(trade[1]), 0),
        sellVolume: tradesData
          .filter(trade => trade[3] === 's')
          .reduce((sum, trade) => sum + parseFloat(trade[1]), 0),
        bidWallsCount: depthData.bids
          .filter(bid => parseFloat(bid[1]) > 5)
          .length,
        askWallsCount: depthData.asks
          .filter(ask => parseFloat(ask[1]) > 5)
          .length,
      }
    };

    // Log summary of fetched data
    console.log(`[Backend] Fetched ${tradesData.length} trades and ${depthData.asks.length + depthData.bids.length} orderbook levels for ${pair}`);
    console.log('[Backend] Order flow metrics:', enhancedData.metrics);

    res.status(200).json(enhancedData);
  } catch (error) {
    console.error('[Backend] Error fetching Kraken orderflow data:', error?.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Kraken API error', 
      details: error?.response?.data || error.message,
      path: error?.request?.path || 'unknown'
    });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
