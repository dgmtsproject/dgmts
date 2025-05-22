// api/fetchEvents.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const API_KEY = process.env.SYSCOM_API_KEY;
  const API_URL = "https://scs.syscom-instruments.com/public-api/v1/records/events";

  try {
    const response = await fetch(API_URL, {
      headers: {
        "x-scs-api-key": API_KEY || "",
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