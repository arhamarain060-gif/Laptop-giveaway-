import { readParticipantsList, saveParticipantsList } from './shared.js';

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

  const { key, name, email, discord, why } = req.body;

  if (!key || !name || !email || !why) {
    return res.status(400).json({ success: false, message: 'All required fields must be filled out.' });
  }

  try {
    const participants = readParticipantsList();

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
    saveParticipantsList(participants);

    return res.json({
      success: true,
      message: 'Participation registered successfully!',
      ticket: newParticipant
    });
  } catch (error: any) {
    console.error('Error saving participation data:', error);
    return res.status(500).json({ success: false, message: 'Failed to record registration.', error: error.message });
  }
}
