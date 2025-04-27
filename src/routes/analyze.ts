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
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const scrapedText = await page.evaluate(() => document.body.innerText);
    await browser.close();

    // LLM Prompt
    const prompt = `Perform sentiment analysis on this financial market text: "${scrapedText}"`;

    // Send to local LLaMA.cpp server
    const response = await axios.post('http://localhost:8000/v1/chat/completions', {
      model: 'llama', // or whatever your local model is called
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 100,
    });

    const sentimentRaw = response.data?.choices?.[0]?.message?.content.trim().toLowerCase();
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

    if (sentimentRaw.includes('positive')) sentiment = 'positive';
    else if (sentimentRaw.includes('negative')) sentiment = 'negative';

    return res.json({ sentiment, text: scrapedText });
  } catch (err) {
    console.error('Error analyzing URL:', err);
    return res.status(500).json({ error: 'Failed to analyze content' });
  }
});

export default router;
