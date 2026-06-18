import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import dotenv from 'dotenv';

dotenv.config();

// Fix for Node ESM globals
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';
const PORT = 3000;

// Path to save participants
const PARTICIPANTS_FILE = path.resolve(__dirname, 'participants.json');

// Initialize participants file if it doesn't exist
if (!fs.existsSync(PARTICIPANTS_FILE)) {
  fs.writeFileSync(PARTICIPANTS_FILE, JSON.stringify([], null, 2), 'utf-8');
}

// Function to read participants
function readParticipants(): any[] {
  try {
    const data = fs.readFileSync(PARTICIPANTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading participants:', error);
    return [];
  }
}

// Function to save participants
function saveParticipants(participants: any[]) {
  try {
    fs.writeFileSync(PARTICIPANTS_FILE, JSON.stringify(participants, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving participants:', error);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Log requests
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API Route: Verify KeyAuth license key
  app.post('/api/verify-key', async (req, res) => {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ success: false, message: 'Please enter a ticket key.' });
    }

    try {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

      // KeyAuth Info from standard parameters
      const name = 'Laptop giveaway';
      const ownerid = '0380435173';
      const secret = '4eb9c6477e6e4bcd88cd97ac426d5810f44876baee57cbd5519fd1dbc8d8c861';
      const version = '1.0';
      const url = 'https://www.keyauth-manager.online/api/1.3/';

      console.log(`Initializing verification session`);

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
        },
        body: initParams,
      });

      if (!initResponse.ok) {
        throw new Error(`Init failed with status code ${initResponse.status}`);
      }

      const initData: any = await initResponse.json();
      console.log('Secure Init Response:', initData);

      if (!initData.success) {
        return res.status(400).json({ 
          success: false, 
          message: 'The ticket verification gateway is currently busy. Please verify your code is correct or try again in a few moments.',
          details: 'Unable to start verification session with authentication server.'
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
      const hwid = Buffer.from(`${ip}-${userAgent}`).toString('base64').substring(0, 32);
      licenseParams.append('hwid', hwid);

      console.log(`Verifying license key: ${key.substring(0, 4)}...`);

      const licenseResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: licenseParams,
      });

      if (!licenseResponse.ok) {
        throw new Error(`License check failed with status ${licenseResponse.status}`);
      }

      const licenseData: any = await licenseResponse.json();
      console.log('Secure Verification Response:', licenseData);

      if (licenseData.success) {
        // Check if this key has already registered a participant in our records
        const participants = readParticipants();
        const existingParticipant = participants.find(p => p.key === key);

        return res.json({
          success: true,
          message: 'Secure key verified successfully.',
          info: {
            username: licenseData.info?.username || key,
            ip: licenseData.info?.ip || ip,
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
  });

  // API Route: Submit Giveaway Registration
  app.post('/api/participate', async (req, res) => {
    const { key, name, email, discord, why } = req.body;

    if (!key || !name || !email || !why) {
      return res.status(400).json({ success: false, message: 'All required fields must be filled out.' });
    }

    try {
      const participants = readParticipants();

      // Ensure key hasn't registered already
      const alreadyExists = participants.some(p => p.key === key);
      if (alreadyExists) {
        return res.status(400).json({ 
          success: false, 
          message: 'This ticket key has already been registered for the giveaway.' 
        });
      }

      // Generate a dynamic, unique confirmation code
      const hash = Buffer.from(`${key}-${Date.now()}`).toString('base64').replace(/[^A-Z0-9]/gi, '').substring(0, 8).toUpperCase();
      const ticketId = `LPTR-X${hash.substring(0,4)}-Y${hash.substring(4,8)}`;

      const newParticipant = {
        ticketId,
        key,
        name,
        email,
        discord: discord || 'N/A',
        why,
        registerTime: new Date().toISOString(),
      };

      participants.push(newParticipant);
      saveParticipants(participants);

      res.json({
        success: true,
        message: 'Participation registered successfully!',
        ticket: newParticipant
      });
    } catch (error: any) {
      console.error('Error saving participation data:', error);
      res.status(500).json({ success: false, message: 'Failed to record registration.', error: error.message });
    }
  });

  // API Route: Get recent registered list for trust tracker (masking emails and keys for privacy)
  app.get('/api/participants', (req, res) => {
    try {
      const participants = readParticipants();
      
      // Mask identifiers of participants for professional layouts
      const maskedParticipants = participants.map(p => {
        const nameParts = p.name.split(' ');
        let maskedName = p.name;
        if (nameParts.length > 1) {
          maskedName = `${nameParts[0]} ${nameParts[nameParts.length - 1][0]}.***`;
        } else if (p.name.length > 2) {
          maskedName = `${p.name.substring(0, 3)}***`;
        } else {
          maskedName = `${p.name}***`;
        }

        return {
          ticketId: p.ticketId,
          name: maskedName,
          registerTime: p.registerTime,
          why: p.why.length > 60 ? `${p.why.substring(0, 60)}...` : p.why,
          discord: p.discord !== 'N/A' && p.discord.length > 2 
            ? `${p.discord.substring(0, 2)}***` 
            : 'N/A'
        };
      });

      // Sort recent first
      const sorted = maskedParticipants.reverse();
      res.json({ success: true, participants: sorted });
    } catch (error: any) {
      res.status(500).json({ success: false, participants: [] });
    }
  });

  // Vite Integration inside Express
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Serving compiled bundle
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server launched successfully at http://localhost:${PORT}`);
  });
}

startServer();
