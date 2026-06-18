import fs from 'fs';
import path from 'path';

export const PARTICIPANTS_FILE = '/tmp/participants.json';
export const SEED_FILE = path.resolve(process.cwd(), 'participants.json');

// Memory fallback to ensure app never loses state entirely during a running container session 
let inMemoryParticipants: any[] = [];
let loadedFromDisk = false;

export function readParticipantsList(): any[] {
  try {
    // If we already have memory cache and we cannot rely on disk, we can use the cache
    if (loadedFromDisk && inMemoryParticipants.length > 0) {
      // Still inspect if file changes on disk (for local dev)
    }

    // Initialize/sync /tmp with repo's seed participants if it doesn't exist
    if (!fs.existsSync(PARTICIPANTS_FILE)) {
      if (fs.existsSync(SEED_FILE)) {
        try {
          const seedData = fs.readFileSync(SEED_FILE, 'utf-8');
          fs.writeFileSync(PARTICIPANTS_FILE, seedData, 'utf-8');
          inMemoryParticipants = JSON.parse(seedData);
          loadedFromDisk = true;
        } catch (e) {
          // If we cannot write to /tmp, read from seed file as read-only
          const data = fs.readFileSync(SEED_FILE, 'utf-8');
          inMemoryParticipants = JSON.parse(data);
          loadedFromDisk = true;
          return inMemoryParticipants;
        }
      } else {
        try {
          fs.writeFileSync(PARTICIPANTS_FILE, JSON.stringify([], null, 2), 'utf-8');
        } catch (e) {
          // fallback to memory
          loadedFromDisk = true;
          return inMemoryParticipants;
        }
      }
    }

    const data = fs.readFileSync(PARTICIPANTS_FILE, 'utf-8');
    inMemoryParticipants = JSON.parse(data);
    loadedFromDisk = true;
    return inMemoryParticipants;
  } catch (error) {
    console.error('Error reading participants list:', error);
    return inMemoryParticipants;
  }
}

export function saveParticipantsList(participants: any[]): boolean {
  inMemoryParticipants = participants;
  loadedFromDisk = true;
  try {
    fs.writeFileSync(PARTICIPANTS_FILE, JSON.stringify(participants, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Error saving participants list to /tmp:', error);
    // If write failed, we still have it saved in inMemoryParticipants for active session
    return false;
  }
}
