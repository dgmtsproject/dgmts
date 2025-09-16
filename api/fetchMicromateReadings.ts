import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
) {
  try {
    const response = await fetch('https://imsite.dullesgeotechnical.com/api/micromate/readings', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Error fetching micromate readings:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to fetch micromate readings" 
    });
  }
}