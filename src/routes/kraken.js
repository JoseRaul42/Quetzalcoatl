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

// ✅ NEW: Route to pull trades + orderbook for order flow analysis
app.get('/api/kraken-orderflow', async (req, res) => {
  const { pair = 'BTCUSD', depthCount = 25 } = req.query;
  console.log(`[Backend] Requesting orderflow data for pair: ${pair}`);
  console.log('[Backend] Query Parameters:', req.query);

  try {
    // Fetch recent trades
    const tradesResponse = await axios.get(`https://api.kraken.com/0/public/Trades?pair=${pair}`);
    const tradesResult = tradesResponse.data.result;
    const tradesKey = Object.keys(tradesResult).find(key => key !== 'last');
    const tradesData = tradesResult[tradesKey];

    // Fetch order book depth
    const depthResponse = await axios.get(`https://api.kraken.com/0/public/Depth?pair=${pair}&count=${depthCount}`);
    const depthResult = depthResponse.data.result;
    const depthKey = Object.keys(depthResult)[0];
    const depthData = depthResult[depthKey];

    // Log fetched data
    console.log(`[Backend] Trades Data for ${pair}:`, tradesData);
    console.log(`[Backend] Order Book Depth Data for ${pair}:`, depthData);

    res.status(200).json({
      success: true,
      pair,
      krakenPair: tradesKey,
      fetchedAt: new Date().toISOString(),
      trades: tradesData,
      orderbook: depthData
    });
  } catch (error) {
    console.error('[Backend] Error fetching Kraken orderflow data:', error?.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Kraken API error', details: error?.response?.data || error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
