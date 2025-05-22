import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  console.log('Starting fetchEventFile handler');
  console.log('Request query:', req.query);
  
  const API_KEY = process.env.SYSCOM_API_KEY;
  const eventId = req.query.eventId;
  const format = req.query.format || 'ascii';

  // Log environment variables (excluding sensitive data in production)
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    API_KEY_PRESENT: !!API_KEY,
    VERCEL_ENV: process.env.VERCEL_ENV
  });

  if (!eventId) {
    const errorMsg = 'eventId is required';
    console.error(errorMsg);
    return res.status(400).json({ error: errorMsg });
  }

  try {
    const apiUrl = `https://scs.syscom-instruments.com/public-api/v1/records/events/${eventId}/file?format=${format}`;
    console.log('Making request to:', apiUrl);
    
    const requestOptions = {
      headers: {
        'x-scs-api-key': API_KEY || '',
      }
    };
    console.log('Request options:', {
      ...requestOptions,
      headers: {
        ...requestOptions.headers,
        'x-scs-api-key': API_KEY ? '***REDACTED***' : 'MISSING'
      }
    });

    const response = await fetch(apiUrl, requestOptions);
    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unable to read error body');
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorBody
      });
      throw new Error(`API Error: ${response.status} - ${response.statusText}`);
    }

    const content = await response.text();
    console.log('Successfully fetched file content. Length:', content.length);
    
    return res.status(200).send(content);
    
  } catch (error) {
    console.error('Caught error:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : error
    });
    
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : "Failed to fetch file",
      // Only include stack in development
      stack: process.env.NODE_ENV === 'development' && error instanceof Error 
        ? error.stack 
        : undefined
    });
  }
}