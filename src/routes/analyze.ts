
// /routes/analyze.ts
import express from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import axios from 'axios';

puppeteer.use(StealthPlugin());

const router = express.Router();

router.post('/analyze', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    // First, attempt to scrape the content from the URL
    let scrapedText = '';
    try {
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      scrapedText = await page.evaluate(() => document.body.innerText);
      await browser.close();
    } catch (scrapeErr) {
      console.error('Error scraping URL:', scrapeErr);
      return res.status(500).json({ error: 'Failed to scrape content from URL' });
    }

    // Trim the text to ensure we don't overload the LLaMA API
    const trimmedText = scrapedText.substring(0, 3000); // Limit to 3000 characters

    // LLM Prompt
    const prompt = `Perform sentiment analysis on this financial market text and respond with only "positive", "neutral", or "negative": "${trimmedText}"`;

    try {
      // Send to local LLaMA.cpp server
      const response = await axios.post('http://localhost:8000/v1/chat/completions', {
        model: 'llama', // or whatever your local model is called
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2, // Lower temperature for more consistent results
        max_tokens: 50, // We only need a short response
      }, {
        timeout: 10000 // 10 seconds timeout
      });

      const sentimentRaw = response.data?.choices?.[0]?.message?.content.trim().toLowerCase();
      let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

      if (sentimentRaw.includes('positive')) sentiment = 'positive';
      else if (sentimentRaw.includes('negative')) sentiment = 'negative';

      return res.json({ 
        sentiment, 
        text: trimmedText,
        rawResponse: sentimentRaw // Include the raw response for debugging
      });
    } catch (llmErr) {
      console.error('Error communicating with LLaMA API:', llmErr);
      return res.status(500).json({ error: 'Failed to communicate with LLaMA API' });
    }
  } catch (err) {
    console.error('Error analyzing URL:', err);
    return res.status(500).json({ error: 'Failed to analyze content' });
  }
});

export default router;
