import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as nodemailer from 'nodemailer';

// Define the expected request body shape
interface EmailRequest {
  eventId: number;
  level: 'alert' | 'warning' | 'shutdown';
  peakValue: number;
  recipients: string[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    const { eventId, level, peakValue, recipients }: EmailRequest = req.body;
    
    if (!eventId || !level || !peakValue || !recipients || !Array.isArray(recipients)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients provided' });
    }

    // Create reusable transporter object using Gmail SMTP
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    // Email content configuration
    const levelTitles = {
      alert: 'Alert Value Reached',
      warning: 'Warning Value Reached',
      shutdown: 'Shutdown Value Reached',
    };

    const subject = `Seismograph ${levelTitles[level]} - Event #${eventId}`;
    const textContent = `
      Seismograph Event Notification
      --------------------------
      Event ID: ${eventId}
      Level: ${levelTitles[level]}
      Peak Value: ${peakValue}
      Time: ${new Date().toISOString()}
      
      This event has exceeded the ${level} threshold.
      Please review the monitoring system for details.
    `;

    const htmlContent = `
      <h1>Seismograph Event Notification</h1>
      <h2 style="color: ${
        level === 'shutdown' ? '#d32f2f' : 
        level === 'warning' ? '#ffa000' : '#1976d2'
      };">${levelTitles[level]} Level</h2>
      <p><strong>Event ID:</strong> ${eventId}</p>
      <p><strong>Peak Value:</strong> ${peakValue}</p>
      <p><strong>Time:</strong> ${new Date().toISOString()}</p>
      <p>This event has exceeded the ${level} threshold.</p>
      <p>Please review the monitoring system for details.</p>
    `;

    // Send mail with defined transport object
    const info = await transporter.sendMail({
      from: `"DGMTS Monitoring System" <${process.env.MAIL_USERNAME}>`,
      to: recipients.join(', '),
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log('Message sent: %s', info.messageId);
    return res.status(200).json({ 
      success: true,
      message: 'Email notification sent',
      messageId: info.messageId 
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}