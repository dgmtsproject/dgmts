import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {

    const { start, end, instrumentId } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'Both start and end parameters are required' });
    }
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(start as string) || 
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(end as string)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DDTHH:MM:SS' });
    }

    // Default to the original instrument ID (15092) if not specified
    const id = instrumentId || '15092';
    
    const apiUrl = `https://scs.syscom-instruments.com/public-api/v1/records/background/${id}/data?start=${start}&end=${end}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        "x-scs-api-key": process.env.SYSCOM_API_KEY || '',
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    res.status(200).json(data);
    
  } catch (error) {
    console.error('Error fetching background data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch background data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}