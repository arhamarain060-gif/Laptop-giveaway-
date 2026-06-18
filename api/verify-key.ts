import { readParticipantsList } from './shared';

export default async function handler(req: any, res: any) {
  // CORS configuration for Vercel deployment
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ success: false, message: 'Please enter a ticket key.' });
  }

  try {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';

    // KeyAuth Info from standard parameters
    const name = 'Laptop giveaway';
    const ownerid = '0380435173';
    const secret = '4eb9c6477e6e4bcd88cd97ac426d5810f44876baee57cbd5519fd1dbc8d8c861';
    const version = '1.0';
    const url = 'https://www.keyauth-manager.online/api/1.3/';

    console.log(`Initializing verification session (Vercel serverless)`);

    // Helper to turn raw API messages into premium customer messages
    const getFriendlyErrorMessage = (rawMessage: string): string => {
      if (!rawMessage) return 'Invalid participation key. Please verify your code and try again.';
      const msg = rawMessage.toLowerCase();
      
      if (msg.includes('not found') || msg.includes('no_key') || msg.includes('invalid') || msg.includes('invalid_key')) {
        return 'The entered key is invalid. Please make sure you have typed it correctly or contact support.';
      }
      if (msg.includes('expired')) {
        return 'This participation code has expired and could not be activated.';
      }
      if (msg.includes('already') || msg.includes('used') || msg.includes('consumed') || msg.includes('maximum')) {
        return 'This participation code has already been consumed or registered.';
      }
      if (msg.includes('hwid') || msg.includes('hardware') || msg.includes('fingerprint') || msg.includes('mismatch')) {
        return 'Security mismatch: This ticket key is locked to a different device hardware profile.';
      }
      if (msg.includes('paused') || msg.includes('suspended')) {
        return 'This ticket is currently locked/paused by administration.';
      }
      return rawMessage;
    };

    // Step 1: Initialize Session
    const initParams = new URLSearchParams();
    initParams.append('type', 'init');
    initParams.append('name', name);
    initParams.append('ownerid', ownerid);
    initParams.append('secret', secret);
    initParams.append('version', version);

    const initResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      },
      body: initParams,
    });

    if (!initResponse.ok) {
      throw new Error(`Init failed with status code ${initResponse.status}`);
    }

    const initText = await initResponse.text();
    let initData: any;
    try {
      initData = JSON.parse(initText);
    } catch (parseErr) {
      console.error('Failed to parse init response as JSON:', initText);
      return res.status(502).json({
        success: false,
        message: 'Gatekeeper portal returned an invalid response. Please contact administration.',
        details: initText.substring(0, 300)
      });
    }

    console.log('Secure Init Response:', initData);

    if (!initData.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'The ticket verification gateway is currently busy. Please verify your code is correct or try again in a few moments.',
        details: initData.message || 'Unable to start verification session with authentication server.'
      });
    }

    const sessionid = initData.sessionid;

    // Step 2: Verify License
    const licenseParams = new URLSearchParams();
    licenseParams.append('type', 'license');
    licenseParams.append('key', key);
    licenseParams.append('sessionid', sessionid);
    licenseParams.append('name', name);
    licenseParams.append('ownerid', ownerid);
    licenseParams.append('version', version);
    
    // Compute simple client fingerprint / hardware id representation
    const userAgent = req.headers['user-agent'] || 'generic-web-client';
    const clientIp = Array.isArray(ip) ? ip[0] : String(ip);
    const hwid = Buffer.from(`${clientIp}-${userAgent}`).toString('base64').substring(0, 32);
    licenseParams.append('hwid', hwid);

    console.log(`Verifying license key: ${key.substring(0, 4)}...`);

    const licenseResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
      },
      body: licenseParams,
    });

    if (!licenseResponse.ok) {
      throw new Error(`License check failed with status ${licenseResponse.status}`);
    }

    const licenseText = await licenseResponse.text();
    let licenseData: any;
    try {
      licenseData = JSON.parse(licenseText);
    } catch (parseErr) {
      console.error('Failed to parse license response as JSON:', licenseText);
      return res.status(502).json({
        success: false,
        message: 'Authentication gateway returned an invalid verification format. Please try again.',
        details: licenseText.substring(0, 300)
      });
    }

    console.log('Secure Verification Response:', licenseData);

    if (licenseData.success) {
      // Check if this key has already registered a participant in our records
      const participants = readParticipantsList();
      const existingParticipant = participants.find(p => p.key === key);

      return res.json({
        success: true,
        message: 'Secure key verified successfully.',
        info: {
          username: licenseData.info?.username || key,
          ip: clientIp,
          subscriptions: licenseData.info?.subscriptions || [],
          alreadyRegistered: !!existingParticipant,
          registeredTicket: existingParticipant || null
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: getFriendlyErrorMessage(licenseData.message),
      });
    }

  } catch (error: any) {
    console.error('Error verifying activation key:', error);
    return res.status(500).json({
      success: false,
      message: 'The entered key is invalid. Please verify your code and try again.',
      error: error.message
    });
  }
}
