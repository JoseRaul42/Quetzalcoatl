import express from 'express';
import cors from 'cors';
import axios from 'axios';
import WebSocket from 'ws';

const app = express();
app.use(cors());
app.use(express.json());

// Store for OHLC candles and Ichimoku calculations
const ohlcStore = {};
const ichimokuSignals = {};

// Debug variables for logging candle collection progress
const candleCollectionStatus = {
  requiredCandles: 52, // Minimum candles needed for calculations
  lastLogTime: Date.now(),
  logInterval: 60000 // Log status every minute
};

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

// New route to get Ichimoku Cloud signals with detailed status
app.get('/api/ichimoku-signals', (req, res) => {
  try {
    // Add debug information to the response
    const debugInfo = {};
    Object.keys(ohlcStore).forEach(pair => {
      debugInfo[pair] = {
        candles: ohlcStore[pair]?.length || 0,
        lastCandleTime: ohlcStore[pair]?.length > 0 
          ? new Date(ohlcStore[pair][ohlcStore[pair].length - 1].time * 1000).toISOString()
          : 'No candles',
        progress: `${Math.min(100, Math.round((ohlcStore[pair]?.length || 0) / candleCollectionStatus.requiredCandles * 100))}%`,
        hasSignal: !!ichimokuSignals[pair.slice(0, 3) + '/' + pair.slice(3)]
      };
    });

    // Return all calculated signals with debug info
    res.status(200).json({
      success: true,
      signals: ichimokuSignals,
      debug: debugInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Backend] Error fetching Ichimoku signals:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching Ichimoku signals', 
      details: error?.message || 'Unknown error'
    });
  }
});

// Initialize WebSocket connection to Kraken for OHLC data
function initKrakenOHLCWebSocket() {
  // Trading pairs to monitor (normalized for Kraken)
  const tradingPairs = [
    'XBT/USD',  // BTC/USD in Kraken
    'ETH/USD',
    'XRP/USD',
    'ADA/USD',
    'SOL/USD'
  ];
  
  const ws = new WebSocket('wss://ws.kraken.com');
  
  ws.on('open', () => {
    console.log('[Backend] WebSocket connection to Kraken opened');
    
    // Subscribe to 4h OHLC data for each pair
    tradingPairs.forEach(pair => {
      const subscribeMsg = {
        name: "subscribe",
        reqid: Math.floor(Math.random() * 10000),
        pair: [pair],
        subscription: {
          name: "ohlc",
          interval: 240  // 4 hour interval
        }
      };
      
      ws.send(JSON.stringify(subscribeMsg));
      console.log(`[Backend] Subscribed to ${pair} OHLC 4h data`);
      
      // Initialize store for this pair
      const normalizedPair = pair.replace('/', '');
      if (!ohlcStore[normalizedPair]) {
        ohlcStore[normalizedPair] = [];
      }
    });
    
    // Log initial status
    console.log(`[Backend] Candle collection started. Need ${candleCollectionStatus.requiredCandles} candles per pair for Ichimoku calculations.`);
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      // Handle OHLC data message
      if (Array.isArray(message) && message[2] === 'ohlc-240') {
        const ohlcData = message[1];
        const pair = message[3].replace('/', '');
        
        // Format of OHLC data: [time, open, high, low, close, vwap, volume, count]
        const candle = {
          time: parseInt(ohlcData[1]),
          open: parseFloat(ohlcData[2]),
          high: parseFloat(ohlcData[3]),
          low: parseFloat(ohlcData[4]),
          close: parseFloat(ohlcData[5]),
          volume: parseFloat(ohlcData[7])
        };
        
        // Check if we already have this candle
        const existingIndex = ohlcStore[pair]?.findIndex(c => c.time === candle.time);
        
        if (existingIndex >= 0) {
          // Update existing candle
          ohlcStore[pair][existingIndex] = candle;
          console.log(`[Backend] Updated existing ${pair} candle at time ${new Date(candle.time * 1000).toISOString()}`);
        } else {
          // Add new candle
          if (!ohlcStore[pair]) ohlcStore[pair] = [];
          ohlcStore[pair].push(candle);
          console.log(`[Backend] Received new ${pair} candle at time ${new Date(candle.time * 1000).toISOString()}`);
          
          // Keep only the last 52 candles (needed for calculations)
          if (ohlcStore[pair].length > 52) {
            ohlcStore[pair] = ohlcStore[pair].slice(-52);
          }
        }
        
        // Sort by time
        ohlcStore[pair].sort((a, b) => a.time - b.time);
        
        // Calculate Ichimoku signals 
        calculateIchimokuSignals(pair);
        
        // Periodically log candle collection status
        const now = Date.now();
        if (now - candleCollectionStatus.lastLogTime > candleCollectionStatus.logInterval) {
          logCandleStatus();
          candleCollectionStatus.lastLogTime = now;
        }
      }
    } catch (error) {
      console.error('[Backend] Error processing WebSocket message:', error);
    }
  });
  
  ws.on('error', (error) => {
    console.error('[Backend] WebSocket error:', error);
  });
  
  ws.on('close', () => {
    console.log('[Backend] WebSocket connection closed, attempting to reconnect...');
    setTimeout(initKrakenOHLCWebSocket, 5000); // Reconnect after 5 seconds
  });
  
  // Ping to keep connection alive
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ "ping": Date.now() }));
    }
  }, 30000);
}

// Helper function to log candle collection status
function logCandleStatus() {
  console.log('\n[Backend] CANDLE COLLECTION STATUS:');
  console.log('=================================');
  
  Object.keys(ohlcStore).forEach(pair => {
    const count = ohlcStore[pair]?.length || 0;
    const readablePair = pair.slice(0, 3) + '/' + pair.slice(3);
    const progress = Math.min(100, Math.round(count / candleCollectionStatus.requiredCandles * 100));
    const lastCandleTime = count > 0 ? new Date(ohlcStore[pair][count-1].time * 1000).toISOString() : 'No candles';
    
    console.log(`${readablePair}: ${count}/${candleCollectionStatus.requiredCandles} candles (${progress}%) - Latest: ${lastCandleTime}`);
  });
  
  console.log('=================================\n');
}

// Calculate Ichimoku Cloud signals with improved logging
function calculateIchimokuSignals(pair) {
  const candles = ohlcStore[pair];
  
  if (!candles || candles.length < 52) {
    const readablePair = pair.slice(0, 3) + '/' + pair.slice(3);
    console.log(`[Backend] Not enough candles for ${readablePair} to calculate Ichimoku (${candles?.length || 0}/52 - ${Math.round((candles?.length || 0) / 52 * 100)}%)`);
    return;
  }
  
  // Extract high and low arrays for calculations
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  
  // Calculate Tenkan-sen (Conversion Line): (9-period high + 9-period low)/2
  const tenkanSen = (Math.max(...highs.slice(-9)) + Math.min(...lows.slice(-9))) / 2;
  
  // Calculate Kijun-sen (Base Line): (26-period high + 26-period low)/2
  const kijunSen = (Math.max(...highs.slice(-26)) + Math.min(...lows.slice(-26))) / 2;
  
  // Calculate Senkou Span A (Leading Span A): (Tenkan-sen + Kijun-sen)/2
  const senkouSpanA = (tenkanSen + kijunSen) / 2;
  
  // Calculate Senkou Span B (Leading Span B): (52-period high + 52-period low)/2
  const senkouSpanB = (Math.max(...highs.slice(-52)) + Math.min(...lows.slice(-52))) / 2;
  
  // Get current price (latest close)
  const currentPrice = candles[candles.length - 1].close;
  const latestCandleTime = new Date(candles[candles.length - 1].time * 1000);
  
  // Determine signal based on price in relation to the cloud
  let signal = 'NEUTRAL';
  let reason = '';
  
  // BUY signal: Price is above the cloud (above both Senkou Span A and B)
  if (currentPrice > Math.max(senkouSpanA, senkouSpanB)) {
    signal = 'BUY';
    reason = 'Price above cloud';
  }
  // SELL signal: Price is below the cloud (below both Senkou Span A and B)
  else if (currentPrice < Math.min(senkouSpanA, senkouSpanB)) {
    signal = 'SELL';
    reason = 'Price below cloud';
  }
  // NEUTRAL: Price is inside the cloud
  else {
    signal = 'NEUTRAL';
    reason = 'Price inside cloud';
  }
  
  // Store the result
  const readablePair = pair.slice(0, 3) + '/' + pair.slice(3); // Convert BTCUSD to BTC/USD format
  
  // Check if the signal has changed
  const previousSignal = ichimokuSignals[readablePair]?.signal;
  const signalChanged = previousSignal && previousSignal !== signal;
  
  ichimokuSignals[readablePair] = {
    pair: readablePair,
    signal,
    reason,
    price: currentPrice,
    tenkanSen,
    kijunSen,
    senkouSpanA,
    senkouSpanB,
    timestamp: latestCandleTime.toISOString(),
    updated: new Date().toISOString()
  };
  
  // Log more detailed information
  console.log(`[Backend] Ichimoku signal for ${readablePair}: ${signal} at ${currentPrice.toFixed(2)} USD (${reason})`);
  
  if (signalChanged) {
    console.log(`[Backend] ⚠️ SIGNAL CHANGED for ${readablePair}: ${previousSignal} → ${signal}`);
  }
}

// Initialize Kraken WebSocket for OHLC data
initKrakenOHLCWebSocket();

// Log candle status periodically regardless of new data
setInterval(logCandleStatus, 60000); // Every minute

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
