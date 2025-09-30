import type { VercelRequest, VercelResponse } from '@vercel/node';

interface SyscomDevice {
  id: number;
  name: string;
  serialNumber: number;
  active: boolean;
  lastCommunication: string;
  lastActiveStateChange: string;
  lastRecordPushed: string;
  firmwareVersion: string;
  model: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Only allow GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiUrl = 'https://scs.syscom-instruments.com/public-api/v1/devices';
    
    const response = await fetch(apiUrl, {
      headers: {
        "x-scs-api-key": process.env.SYSCOM_API_KEY || '',
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data: SyscomDevice[] = await response.json();

    // Debug: Log all models found
    const allModels = [...new Set(data.map(device => device.model))];
    console.log('All device models found:', allModels);

    // Filter only devices with model "rock" (case-insensitive)
    const rockDevices = data.filter(device => 
      device.model && device.model.toLowerCase() === 'rock'
    );

    console.log(`Found ${rockDevices.length} rock devices out of ${data.length} total devices`);

    res.status(200).json({
      devices: rockDevices,
      total: rockDevices.length,
      allModels: allModels // Include this for debugging
    });
    
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ 
      error: 'Failed to fetch devices',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
