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

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
    const participants = readParticipantsList();
    
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
    const sorted = [...maskedParticipants].reverse();
    return res.json({ success: true, participants: sorted });
  } catch (error: any) {
    console.error('Error listing participants:', error);
    return res.status(500).json({ success: false, participants: [] });
  }
}
