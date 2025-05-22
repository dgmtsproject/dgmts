import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const API_KEY = process.env.SYSCOM_API_KEY;
  const eventId = req.query.eventId;
  const format = req.query.format || 'ascii';

  if (!eventId) {
    return res.status(400).json({ error: 'eventId is required' });
  }

  try {
    const response = await fetch(
      `https://scs.syscom-instruments.com/public-api/v1/records/events/${eventId}/file?format=${format}`,
      {
        headers: {
          'x-scs-api-key': API_KEY || '',
          'Accept': 'text/plain' // For ASCII format
        }
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const content = await response.text();
    return res.status(200).send(content);
    
  } catch (error) {
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to fetch file" 
    });
  }
}