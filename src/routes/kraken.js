import express from 'express';
import cors from 'cors';
import axios from 'axios';
import WebSocket from 'ws';

const app = express();
app.use(cors());
app.use(express.json());

const ohlcStore = {};
const ichimokuSignals = {};

const candleCollectionStatus = {
  requiredCandles: 52,
  lastLogTime: Date.now(),
  logInterval: 60000
};

const tradingPairs = ['XBT/USD', 'ETH/USD', 'XRP/USD', 'ADA/USD', 'SOL/USD', 'BTC/USD'];

app.get('/api/ichimoku-signals', (req, res) => {
  try {
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

    res.status(200).json({
      success: true,
      signals: ichimokuSignals,
      debug: debugInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Backend] Error fetching Ichimoku signals:', error);
    res.status(500).json({ success: false, message: 'Error fetching Ichimoku signals', details: error?.message || 'Unknown error' });
  }
});

function logCandleStatus() {
  console.log('\n[Backend] CANDLE COLLECTION STATUS:');
  console.log('=================================');
  Object.keys(ohlcStore).forEach(pair => {
    const count = ohlcStore[pair]?.length || 0;
    const readablePair = pair.slice(0, 3) + '/' + pair.slice(3);
    const progress = Math.min(100, Math.round(count / candleCollectionStatus.requiredCandles * 100));
    const lastCandleTime = count > 0 ? new Date(ohlcStore[pair][count - 1].time * 1000).toISOString() : 'No candles';
    console.log(`${readablePair}: ${count}/${candleCollectionStatus.requiredCandles} candles (${progress}%) - Latest: ${lastCandleTime}`);
  });
  console.log('=================================\n');
}

function calculateIchimokuSignals(pair) {
  const candles = ohlcStore[pair];
  if (!candles || candles.length < 52) {
    const readablePair = pair.slice(0, 3) + '/' + pair.slice(3);
    console.log(`[Backend] Not enough candles for ${readablePair} to calculate Ichimoku (${candles?.length || 0}/52)`);
    return;
  }

  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);

  const tenkanSen = (Math.max(...highs.slice(-9)) + Math.min(...lows.slice(-9))) / 2;
  const kijunSen = (Math.max(...highs.slice(-26)) + Math.min(...lows.slice(-26))) / 2;
  const senkouSpanA = (tenkanSen + kijunSen) / 2;
  const senkouSpanB = (Math.max(...highs.slice(-52)) + Math.min(...lows.slice(-52))) / 2;
  const chikouSpan = candles[candles.length - 26]?.close || null;

  const currentPrice = candles[candles.length - 1].close;
  const latestCandleTime = new Date(candles[candles.length - 1].time * 1000);

  let signal = 'NEUTRAL';
  let reason = '';
  let confidence = 'low';

  const aboveCloud = currentPrice > Math.max(senkouSpanA, senkouSpanB);
  const belowCloud = currentPrice < Math.min(senkouSpanA, senkouSpanB);

  if (aboveCloud) {
    signal = 'BUY';
    reason = 'Price above cloud';
  } else if (belowCloud) {
    signal = 'SELL';
    reason = 'Price below cloud';
  } else {
    reason = 'Price inside cloud';
  }

  if (signal === 'BUY' && currentPrice > tenkanSen && tenkanSen > kijunSen) {
    confidence = chikouSpan && currentPrice > chikouSpan ? 'high' : 'medium';
  } else if (signal === 'SELL' && currentPrice < tenkanSen && tenkanSen < kijunSen) {
    confidence = chikouSpan && currentPrice < chikouSpan ? 'high' : 'medium';
  } else {
    confidence = 'low';
  }

  const readablePair = pair.slice(0, 3) + '/' + pair.slice(3);
  const previousSignal = ichimokuSignals[readablePair]?.signal;
  const signalChanged = previousSignal && previousSignal !== signal;

  ichimokuSignals[readablePair] = {
    pair: readablePair,
    signal,
    reason,
    confidence,
    price: currentPrice,
    tenkanSen,
    kijunSen,
    senkouSpanA,
    senkouSpanB,
    chikouSpan,
    timestamp: latestCandleTime.toISOString(),
    updated: new Date().toISOString()
  };

  console.log(`[Backend] Ichimoku signal for ${readablePair}: ${signal} (${confidence}) at ${currentPrice.toFixed(2)} USD (${reason})`);
  if (signalChanged) {
    console.log(`[Backend] ⚠️ SIGNAL CHANGED for ${readablePair}: ${previousSignal} → ${signal}`);
  }
}

async function fetchInitialOHLC(pair) {
  try {
    const res = await axios.get(`https://api.kraken.com/0/public/OHLC`, {
      params: {
        pair,
        interval: 240
      }
    });

    const resultKey = Object.keys(res.data.result).find(k => k !== 'last');
    const ohlcData = res.data.result[resultKey];

    const normalizedPair = pair.replace('/', '');
    ohlcStore[normalizedPair] = ohlcData.map(entry => ({
      time: parseInt(entry[0], 10),
      open: parseFloat(entry[1]),
      high: parseFloat(entry[2]),
      low: parseFloat(entry[3]),
      close: parseFloat(entry[4]),
      volume: parseFloat(entry[6])
    })).sort((a, b) => a.time - b.time).slice(-52);

    console.log(`[Bootstrap] Prefilled ${normalizedPair} with ${ohlcStore[normalizedPair].length} historical 4h candles`);
    calculateIchimokuSignals(normalizedPair);
  } catch (err) {
    console.error(`[Bootstrap] Failed to fetch OHLC for ${pair}:`, err.message);
  }
}

function initKrakenOHLCWebSocket() {
  const ws = new WebSocket('wss://ws.kraken.com');

  ws.on('open', () => {
    console.log('[Backend] WebSocket connection to Kraken opened');
    tradingPairs.forEach(pair => {
      const subscribeMsg = {
        name: "subscribe",
        reqid: Math.floor(Math.random() * 10000),
        pair: [pair],
        subscription: { name: "ohlc", interval: 240 }
      };
      ws.send(JSON.stringify(subscribeMsg));
      const normalizedPair = pair.replace('/', '');
      if (!ohlcStore[normalizedPair]) ohlcStore[normalizedPair] = [];
    });
    console.log(`[Backend] Subscribed to 4h OHLC streams.`);
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      if (Array.isArray(message) && message[2] === 'ohlc-240') {
        const ohlcData = message[1];
        const pair = message[3].replace('/', '');

        const candle = {
          time: parseInt(ohlcData[0], 10),
          open: parseFloat(ohlcData[1]),
          high: parseFloat(ohlcData[2]),
          low: parseFloat(ohlcData[3]),
          close: parseFloat(ohlcData[4]),
          volume: parseFloat(ohlcData[6])
        };

        const existingIndex = ohlcStore[pair]?.findIndex(c => c.time === candle.time);
        if (existingIndex >= 0) {
          ohlcStore[pair][existingIndex] = candle;
        } else {
          ohlcStore[pair].push(candle);
          ohlcStore[pair] = ohlcStore[pair].slice(-52);
        }

        ohlcStore[pair].sort((a, b) => a.time - b.time);
        calculateIchimokuSignals(pair);

        const now = Date.now();
        if (now - candleCollectionStatus.lastLogTime > candleCollectionStatus.logInterval) {
          logCandleStatus();
          candleCollectionStatus.lastLogTime = now;
        }
      }
    } catch (err) {
      console.error('[WebSocket] Error processing message:', err.message);
    }
  });

  ws.on('error', err => console.error('[WebSocket] Error:', err.message));
  ws.on('close', () => {
    console.log('[WebSocket] Closed, retrying in 5s...');
    setTimeout(initKrakenOHLCWebSocket, 5000);
  });

  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ ping: Date.now() }));
    }
  }, 30000);
}

// Fetch initial historical data first, then start WS
(async () => {
  for (const pair of tradingPairs) {
    await fetchInitialOHLC(pair);
  }
  initKrakenOHLCWebSocket();
  setInterval(logCandleStatus, 60000);
})();

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
