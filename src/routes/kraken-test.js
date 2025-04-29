import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/test-kraken', async (req, res) => {
  try {
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://api.kraken.com/0/public/Time',
      headers: { 
        'Accept': 'application/json'
      }
    };

    const response = await axios.request(config);

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

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// TODO: i dont know why this is in .ts just make it .js to be able to launch with node