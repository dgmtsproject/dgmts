// api/fetchEvents.ts
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
) {
  const API_KEY = process.env.SYSCOM_API_KEY; // MUST match Vercel env var name
  const API_URL = "https://scs.syscom-instruments.com/public-api/v1/records/events?itemsPerPage=50";

  try {
    // Use native fetch (Node 18+)
    const response = await fetch(API_URL, {
      headers: {
        "x-scs-api-key": API_KEY || "", // Fallback to empty string if undefined
        "Accept": "application/json"
      }
    });

    const data = await response.json();
    return res.status(200).json(data);
    
  } catch (error) {
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to fetch data" 
    });
  }
}