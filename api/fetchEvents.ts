// /api/fetchEvents.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const API_KEY = process.env.VITE_SYSCOM_API_KEY;
  const API_URL = "https://scs.syscom-instruments.com/public-api/v1/records/events";

  if (!API_KEY) {
    res.status(500).json({ error: "API key is missing" });
    return;
  }

  try {
    const apiResponse = await fetch(API_URL, {
      headers: {
        "x-scs-api-key": API_KEY,
        "Accept": "application/json",
      } as Record<string, string>,
    });

    if (!apiResponse.ok) {
      throw new Error(`API Error: ${apiResponse.status}`);
    }

    const data = await apiResponse.json();
    res.status(200).json(data);
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message || "Failed to fetch data" 
    });
  }
}