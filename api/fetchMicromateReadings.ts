import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  try {
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      return res.status(200).end();
    }

    const device = req.query.device as string | undefined;
    const fromdatetime = req.query.fromdatetime as string | undefined;
    const todatetime = req.query.todatetime as string | undefined;

    let apiUrl = 'https://imsite.dullesgeotechnical.com/api/micromate/readings';
    if (device) {
      apiUrl = `https://imsite.dullesgeotechnical.com/api/micromate/${device}/readings`;
    }

    const params = new URLSearchParams();
    if (fromdatetime) {
      params.append('fromdatetime', fromdatetime);
    }
    if (todatetime) {
      params.append('todatetime', todatetime);
    }
    const query = params.toString();
    if (query) {
      apiUrl = `${apiUrl}?${query}`;
    }

    const response = await fetch(apiUrl, {
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
    
    // Set CORS headers even on error
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to fetch micromate readings" 
    });
  }
}