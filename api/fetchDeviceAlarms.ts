import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
){
    const API_KEY = process.env.SYSCOM_API_KEY;
    const  id  = 15092; 
    
    if (!id) {
        return res.status(400).json({ error: "Device ID is required" });
    }
    
    const API_URL = `https://scs.syscom-instruments.com/public-api/v1/devices/${id}/alarms`;
    
    try {
        const response = await fetch(API_URL, {
        headers: {
            "x-scs-api-key": API_KEY || "",
            "Accept": "application/json"
        }
        });
    
        if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
        }
    
        const data = await response.json();
        return res.status(200).json(data);
        
    } catch (error) {
        return res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to fetch device alarms" 
        });
    }
}