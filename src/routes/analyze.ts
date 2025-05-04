import express from 'express';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { OpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

puppeteer.use(StealthPlugin());

const router = express.Router();

// ✅ Set up OpenAI-compatible client pointing to your local LLaMA server
const openai = new OpenAI({
  baseURL: 'http://localhost:8000/v1',
  apiKey: 'llama-local', // fake key — required but ignored by llama.cpp
});

// ✅ Properly typed message builder
const buildLLMMessages = (scrapedText: string): ChatCompletionMessageParam[] => {
  const date = new Date().toISOString().split('T')[0];
  const trimmedText = scrapedText.substring(0, 3000);

  return [
    {
      role: 'system',
      content: `Today's date is ${date}. You are a financial assistant tasked with evaluating the sentiment of news or articles. Your output must be one of: "positive", "neutral", or "negative".`,
    },
    {
      role: 'user',
      content: `Please analyze the following market text:\n"""${trimmedText}"""\nRespond only with the sentiment.`,
    }
  ];
};

router.post('/analyze', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
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

    const messages: ChatCompletionMessageParam[] = buildLLMMessages(scrapedText);

    try {
      const chatResponse = await openai.chat.completions.create({
        model: 'llama',
        messages,
        temperature: 0.2,
        max_tokens: 50,
      });

      const sentimentRaw = chatResponse.choices?.[0]?.message?.content?.trim().toLowerCase() || '';
      let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';

      if (sentimentRaw.includes('positive')) sentiment = 'positive';
      else if (sentimentRaw.includes('negative')) sentiment = 'negative';

      return res.json({
        sentiment,
        text: scrapedText.substring(0, 3000),
        rawResponse: sentimentRaw
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
