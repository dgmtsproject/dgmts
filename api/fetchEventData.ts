import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  const apiKey = process.env.SYSCOM_API_KEY;

  if (!id) {
    return res.status(400).json({ error: 'Event ID is required' });
  }

  try {
    if (!apiKey) {
      return res.status(500).json({ error: 'API key is missing' });
    }

    const response = await fetch(`https://scs.syscom-instruments.com/public-api/v1/records/events/${id}/data`, {
      headers: {
        "x-scs-api-key": apiKey,
      } as Record<string, string>,
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching event data:', error);
    res.status(500).json({ error: 'Failed to fetch event data' });
  }
}