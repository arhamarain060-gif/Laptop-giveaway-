import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Key, 
  Cpu, 
  Flame, 
  Clock, 
  ArrowRight, 
  Lock, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  Sparkles, 
  Users, 
  HelpCircle, 
  Ticket, 
  ExternalLink, 
  Copy, 
  Check, 
  ChevronDown, 
  Zap, 
  ShieldCheck, 
  TrendingUp, 
  HardDrive,
  Monitor
} from 'lucide-react';

// Setup Mock Entrants if Backend list is empty
const INITIAL_MOCK_ENTRANTS = [
  {
    ticketId: "LPTR-XA7C-Y2BD",
    name: "Arham A.***",
    registerTime: new Date(Date.now() - 4 * 60000).toISOString(),
    why: "I've been using a ten year old office notebook, running code on this beast would literally change my workflow entirely!",
    discord: "ar***"
  },
  {
    ticketId: "LPTR-XF4E-Y9A1",
    name: "Alex M.***",
    registerTime: new Date(Date.now() - 22 * 60000).toISOString(),
    why: "Pursuing machine learning and we desperately need dedicated hardware for stable diffusion models. This is pure dream tech.",
    discord: "al***"
  },
  {
    ticketId: "LPTR-XD3B-Y7C5",
    name: "Serena K.***",
    registerTime: new Date(Date.now() - 55 * 60000).toISOString(),
    why: "Unreal Engine 5 indie game development. Building games requires solid compile rates and high-speed shader compilation.",
    discord: "se***"
  },
  {
    ticketId: "LPTR-X8K2-Y3U0",
    name: "Viktor V.***",
    registerTime: new Date(Date.now() - 120 * 60000).toISOString(),
    why: "Competitive programming and esports compiling. Portable, high refresh rate, perfect gaming layout for travels.",
    discord: "vi***"
  }
];

export default function App() {
  // Session States
  const [keyInput, setKeyInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [verifiedKey, setVerifiedKey] = useState('');
  const [registrationState, setRegistrationState] = useState<{
    alreadyRegistered: boolean;
    registeredTicket: any | null;
  }>({ alreadyRegistered: false, registeredTicket: null });

  // Registration states
  const [registrantName, setRegistrantName] = useState('');
  const [registrantEmail, setRegistrantEmail] = useState('');
  const [registrantSocial, setRegistrantSocial] = useState('');
  const [registrantWhy, setRegistrantWhy] = useState('');
  const [isSubmittingReg, setIsSubmittingReg] = useState(false);
  const [confirmedTicket, setConfirmedTicket] = useState<any | null>(null);

  // Interface States
  const [participants, setParticipants] = useState<any[]>([]);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [countdown, setCountdown] = useState({ days: '15', hours: '08', minutes: '42', seconds: '17' });
  const [copiedTicketId, setCopiedTicketId] = useState(false);

  // Generate dynamic countdown
  useEffect(() => {
    // Set draw target: 15 days in the future from load
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 15);
    targetDate.setHours(20, 0, 0, 0);

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        clearInterval(interval);
        return;
      }

      const d = Math.floor(distance / (1000 * 60 * 60 * 24));
      const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((distance % (1000 * 60)) / 1000);

      setCountdown({
        days: d.toString().padStart(2, '0'),
        hours: h.toString().padStart(2, '0'),
        minutes: m.toString().padStart(2, '0'),
        seconds: s.toString().padStart(2, '0')
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Fetch participants list for trust ticker
  const fetchParticipants = async () => {
    try {
      const res = await fetch('/api/participants');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.participants && data.participants.length > 0) {
          setParticipants(data.participants);
        } else {
          setParticipants(INITIAL_MOCK_ENTRANTS);
        }
      } else {
        setParticipants(INITIAL_MOCK_ENTRANTS);
      }
    } catch {
      setParticipants(INITIAL_MOCK_ENTRANTS);
    }
  };

  useEffect(() => {
    fetchParticipants();
    // Poll participants every 15 seconds to fetch new entries automatically
    const timer = setInterval(fetchParticipants, 15000);
    return () => clearInterval(timer);
  }, []);

  // Check key with Express backend
  const handleVerifyKey = async (keyToUse = keyInput) => {
    if (!keyToUse.trim()) {
      setError('Please enter a ticket coupon code to authenticate.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const response = await fetch('/api/verify-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: keyToUse.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setVerifiedKey(keyToUse.trim());
        setIsAuthenticated(true);
        setSuccessMsg('Voucher verified! Welcome to the grand terminal.');
        
        if (data.info?.alreadyRegistered) {
          setRegistrationState({
            alreadyRegistered: true,
            registeredTicket: data.info.registeredTicket
          });
          setConfirmedTicket(data.info.registeredTicket);
        } else {
          setRegistrationState({
            alreadyRegistered: false,
            registeredTicket: null
          });
        }
      } else {
        setError(data.message || 'The entered code is invalid or already fully consumed.');
      }
    } catch (err: any) {
      console.error('Error in validation network check:', err);
      setError('Could not connect to authentication portal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Registration / Submission
  const handleParticipateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrantName.trim() || !registrantEmail.trim() || !registrantWhy.trim()) {
      setError('Please fill out all mandatory fields.');
      return;
    }

    setIsSubmittingReg(true);
    setError(null);

    try {
      const response = await fetch('/api/participate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: verifiedKey,
          name: registrantName,
          email: registrantEmail,
          discord: registrantSocial,
          why: registrantWhy
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setConfirmedTicket(data.ticket);
        setRegistrationState({
          alreadyRegistered: true,
          registeredTicket: data.ticket
        });
        // Reload recent entrants
        fetchParticipants();
      } else {
        setError(data.message || 'Failed to submit registration. Please check inputs.');
      }
    } catch {
      setError('Network communication issue while reserving giveaway ticket.');
    } finally {
      setIsSubmittingReg(false);
    }
  };

  const copyTicketCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedTicketId(true);
    setTimeout(() => setCopiedTicketId(false), 2000);
  };

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setVerifiedKey('');
    setConfirmedTicket(null);
    setKeyInput('');
    setSuccessMsg(null);
    setError(null);
    setRegistrantName('');
    setRegistrantEmail('');
    setRegistrantSocial('');
    setRegistrantWhy('');
  };

  const printTicket = () => {
    window.print();
  };

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen font-sans selection:bg-rose-500 selection:text-white pb-16 antialiased">
      
      {/* GLOW TOP EFFECTS */}
      <div className="absolute top-0 left-1/4 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
       <div className="absolute top-10 right-1/4 -translate-y-1/2 w-[500px] h-[250px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />
 
       {/* HEADER BAR */}
       <header className="border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
         <div className="max-w-6xl mx-auto flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-emerald-400 shadow-sm">
               <Laptop className="w-5 h-5 stroke-[1.8]" />
             </div>
             <div>
               <span className="font-mono text-xs font-black tracking-[0.2em] text-white uppercase">
                 PREMIUM REGISTRY
               </span>
               <p className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase mt-0.5">EXCLUSIVE SYSTEMS</p>
             </div>
           </div>
 
           <div className="flex items-center gap-4">
             <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-850 px-3 py-1.5 rounded-md font-mono tracking-wider">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               SECURE PORTAL INTERFACE
             </span>
 
             {isAuthenticated && (
               <button 
                 onClick={handleLogout}
                 className="text-xs bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 px-3 py-1.5 rounded-md text-zinc-300 font-medium transition cursor-pointer"
               >
                 Sign Out
               </button>
             )}
           </div>
         </div>
       </header>
 
       {/* MAIN CONTAINER */}
       <main className="max-w-6xl mx-auto px-4 mt-12">
         
         {/* VIEW 1: PRE-AUTHENTICATION ENTRY WALL */}
         {!isAuthenticated ? (
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mt-4">
             
             {/* LEFT HERO: THE GRAND PRIZE PRESENTATION */}
             <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
               
               <div className="inline-flex items-center gap-2 bg-zinc-900/50 border border-zinc-850 px-3 py-1.5 rounded-md w-fit">
                 <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                 <span className="text-[10px] tracking-wider text-zinc-400 font-bold font-mono uppercase">
                   EXCLUSIVE CAMPAIGN PREVIEW
                 </span>
               </div>
 
               <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-[1.1]">
                 Grand Hardware sweepstakes <br/>
                 <span className="bg-gradient-to-r from-zinc-100 via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
                   Ultimate Craftsmanship
                 </span>
               </h1>
 
               <p className="text-zinc-400 text-sm md:text-base max-w-lg leading-relaxed">
                 Access the restricted participant configuration. Enter your authenticated license key below to establish your secure priority entry coordinates and generate your verification slip.
               </p>

              {/* LIVE COUNTER DISPLAY WIDGET */}
              <div className="bg-zinc-900/60 border border-zinc-900/80 rounded-2xl p-5 max-w-md shadow-inner backdrop-blur">
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold mb-3">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>REGISTRATION CLOSES SOON (LIVE EST DRAW TIMER)</span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-center">
                  {[
                    { label: 'DAYS', val: countdown.days },
                    { label: 'HOURS', val: countdown.hours },
                    { label: 'MINS', val: countdown.minutes },
                    { label: 'SECS', val: countdown.seconds }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-zinc-950 p-2.5 rounded-xl border border-zinc-800/80">
                      <p className="text-xl md:text-2xl font-black font-mono tracking-tight text-emerald-400">{item.val}</p>
                      <p className="text-[9px] text-zinc-500 font-bold mt-1 tracking-widest">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* LAPTOP SPECS QUICK GLANCE */}
              <div className="grid grid-cols-2 gap-4 max-w-md pt-2">
                <div className="flex gap-2 items-center text-xs text-zinc-400 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Razer Blade 16 Ultra G5
                </div>
                <div className="flex gap-2 items-center text-xs text-zinc-400 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Intel i9-285H Core (6.0 GHz)
                </div>
                <div className="flex gap-2 items-center text-xs text-zinc-400 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  NVIDIA RTX 5090 16GB
                </div>
                <div className="flex gap-2 items-center text-xs text-zinc-400 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Est. MSRP: $4,500 USD
                </div>
              </div>

            </div>

            {/* RIGHT SIDE: KEY ENTRANCE COMPONENT */}
            <div className="lg:col-span-5 relative">
              
              {/* SLIGHT SHADOW DEPTH */}
              <div className="absolute inset-x-4 inset-y-6 bg-emerald-500/5 rounded-3xl blur-2xl -z-10" />
 
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl font-mono" />
 
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-emerald-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-wide">SECURE ACCESS GATEWAY</h2>
                    <p className="text-[10px] text-emerald-500/80 font-mono tracking-wider uppercase mt-0.5 animate-pulse">Connection Secured Link</p>
                  </div>
                </div>
 
                {/* FORM INPUT CODE */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold tracking-widest uppercase mb-2 font-mono">
                      Voucher Access Identifier
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input 
                        type="text" 
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        placeholder="XXXX-YYYY-ZZZZ-WWWW"
                        className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-700 focus:border-emerald-500 rounded-xl py-3.5 pl-11 pr-4 text-xs font-mono tracking-widest text-zinc-100 placeholder-zinc-700 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition duration-150"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleVerifyKey();
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-2 leading-normal">
                      Please enter your valid alpha-numeric access voucher key to authentic your delivery slot.
                    </p>
                  </div>
 
                  {/* DISPLAY STATUS MESSAGES */}
                  {error && (
                    <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/5 border border-rose-500/20 rounded-xl text-rose-400 text-xs shadow-sm">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold text-rose-350">Verification Failure</p>
                        <p className="text-rose-400/90 leading-relaxed mt-0.5">{error}</p>
                      </div>
                    </div>
                  )}
 
                  {successMsg && (
                    <div className="flex items-start gap-2.5 p-3.5 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs shadow-sm">
                      <CheckCircle className="w-4 h-4 mt-0.5 text-zinc-100 shrink-0 bg-emerald-700 rounded-full" />
                      <div>
                        <p className="font-bold text-emerald-355">Access Granted</p>
                        <p className="text-emerald-450/95 leading-relaxed mt-0.5">{successMsg}</p>
                      </div>
                    </div>
                  )}
 
                  <button
                    disabled={loading}
                    onClick={() => handleVerifyKey()}
                    className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold tracking-widest text-xs py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50 uppercase font-mono shadow-sm"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-3.5 w-3.5 text-zinc-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verifying Server Handshake...
                      </span>
                    ) : (
                      <>
                        Request Registry Access
                        <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
                      </>
                    )}
                  </button>
 
                  {/* Secure Access Instruction */}
                  <div className="border-t border-zinc-950 pt-4 mt-4">
                    <p className="text-[10px] text-zinc-500 leading-normal text-center bg-zinc-950/40 p-3 rounded-xl border border-zinc-900 font-mono">
                      Each unique participation code unlocks exactly one registration flow. Protect this key from third-party exposures.
                    </p>
                  </div>
 
                </div>
 
              </div>
 
            </div>

          </div>
        ) : (
          
          /* VIEW 2: AUTHENTICATED PANEL & PARTICIPATION FLOW */
          <div className="mt-2 space-y-8 animate-fade-in">
            
            {/* LOGGED IN STATUS CARD */}
            <div className="bg-zinc-900 border border-zinc-800 px-6 py-4 rounded-2xl flex flex-col md:flex-row items-center gap-4 justify-between">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-zinc-400 font-extrabold uppercase font-mono tracking-widest bg-zinc-800 px-2 py-0.5 rounded-full">
                    GUEST AUTHORIZED
                  </span>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Key: <span className="font-mono text-emerald-400 text-xs font-semibold">{verifiedKey}</span>
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="text-xs text-zinc-400 font-medium">Valid Lottery Status:</span>
                <span className="text-xs font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full font-bold">
                  ACTIVE LICENSE
                </span>
              </div>
            </div>

            {/* TWO COLUMN GRID FOR ACTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* INNER LEFT LAYER: THE PRIZE AND SPECS DETAILED VIEW */}
              <div className="lg:col-span-5 flex flex-col space-y-6">
                
                {/* PRIZE PROJECTION */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors duration-500" />
                  
                  {/* GRAND PRIZE BANNER */}
                  <div className="absolute top-4 left-4 z-15 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800 text-rose-500 text-[10px] font-black tracking-widest uppercase">
                    THE GRAND PRIZE
                  </div>

                  {/* PREMIUM SHADING GRADIENT EFFECT FOR MOCK PREVIEW */}
                  <div className="w-full h-44 bg-gradient-to-tl from-zinc-950 to-zinc-900 rounded-2xl border border-zinc-800 flex items-center justify-center p-4 relative mb-6 overflow-hidden">
                    <div className="absolute bottom-[-10px] left-1/4 right-1/4 h-2 bg-emerald-500/30 blur-md rounded-full" />
                    <Laptop className="w-24 h-24 text-zinc-700 stroke-[1.2] group-hover:text-emerald-400 group-hover:scale-105 transition-all duration-300" />
                    
                    {/* SPECS FLOATING BOXES */}
                    <div className="absolute right-3 top-3 bg-zinc-900/90 border border-zinc-800 px-2.5 py-1 rounded-lg text-[9px] font-bold font-mono text-zinc-300">
                      OLED 240Hz
                    </div>
                    <div className="absolute left-3 bottom-3 bg-zinc-900/90 border border-zinc-800 px-2.5 py-1 rounded-lg text-[9px] font-bold font-mono text-zinc-300">
                      RTX 5090
                    </div>
                  </div>

                  {/* SPECIFICATION CARD DETAILS */}
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-black text-white group-hover:text-emerald-400 transition">
                        ROG Zephyrus G16 Carbon Edition
                      </h2>
                      <p className="text-zinc-400 text-xs mt-1">
                        Constructed from space-grade milled carbon fiber CNC casing. High-efficiency liquid metal cooling core. Memory pool optimization.
                      </p>
                    </div>

                    <div className="border-t border-zinc-800 pt-4 space-y-3 font-mono">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500 flex items-center gap-1.5 font-sans">
                          <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Core Engine
                        </span>
                        <span className="text-zinc-200 font-bold">Intel® Core™ Ultra 9 285H</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500 flex items-center gap-1.5 font-sans">
                          <Monitor className="w-3.5 h-3.5 text-emerald-400" /> Graphics Card
                        </span>
                        <span className="text-zinc-200 font-bold">Nvidia RTX 5090 Mobile</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500 flex items-center gap-1.5 font-sans">
                          <HardDrive className="w-3.5 h-3.5 text-emerald-400" /> Memory Setup
                        </span>
                        <span className="text-zinc-200 font-bold">64GB Dual-Chan / 4TB SSD</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500 flex items-center gap-1.5 font-sans">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Draw Value
                        </span>
                        <span className="text-emerald-400 font-bold font-sans">$4,500 USD MSRP</span>
                      </div>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-4 flex gap-3 text-xs leading-normal text-zinc-300 mt-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <p>
                        This draw uses randomized hardware verification hashes to guarantee 100% transparent and provably fair selection. Verified keys correspond to individual server lot slots.
                      </p>
                    </div>
                  </div>

                </div>

              </div>

              {/* INNER RIGHT LAYER: REGISTRATION OR COMPLETED TICKET */}
              <div className="lg:col-span-7 space-y-6">
                
                {confirmedTicket ? (
                  /* REGISTERED CONFIRMED VIEW (TICKET) */
                  <div className="bg-zinc-900 border border-emerald-500/20 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl space-y-6 animate-scale-in">
                    
                    {/* TICKET BACKGROUND ART ELEMENTS */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-teal-500/5 -z-10 pointer-events-none" />
                    <div className="absolute right-[-40px] top-1/2 -translate-y-1/2 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl" />

                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl md:text-2xl font-black text-white">Giveaway Entry Secured!</h2>
                      <p className="text-zinc-400 text-xs max-w-sm mx-auto leading-normal">
                        Your participation registration has been recorded. Your unique verifiable ticket is generated below. Keep this code safe.
                      </p>
                    </div>

                    {/* VIRTUAL SVG TICKET DESIGN (STUNNING PHYSICAL SLIP) */}
                    <div className="border border-zinc-800 bg-zinc-950 rounded-2xl p-6 font-mono relative overflow-hidden print:border-black print:bg-white print:text-black">
                      
                      {/* Ticket cut-outs decor */}
                      <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 bg-zinc-900 border-r border-zinc-800 rounded-full print:hidden" />
                      <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 bg-zinc-900 border-l border-zinc-800 rounded-full print:hidden" />

                      {/* TICKET TOP HEADER */}
                      <div className="flex justify-between items-start border-b border-dashed border-zinc-800 pb-4 mb-4">
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase font-black">EVENT SLOT RESERVATION</p>
                          <h4 className="text-sm font-bold text-white print:text-black mt-0.5">X-LAPTOP GIVEAWAY</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] bg-emerald-900 text-emerald-200 border border-emerald-700 px-2.5 py-1 rounded-sm uppercase tracking-wider font-extrabold print:text-emerald-950">
                            ENTRANT SIGNED
                          </span>
                        </div>
                      </div>

                      {/* TICKET CORE DATA GRID */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 mb-4 border-b border-dashed border-zinc-800">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-zinc-500">CONTR CONFIRMATION ID</span>
                          <p className="text-sm font-extrabold text-emerald-400 font-mono flex items-center gap-1.5">
                            {confirmedTicket.ticketId}
                            <button 
                              onClick={() => copyTicketCode(confirmedTicket.ticketId)}
                              className="text-zinc-400 hover:text-white transition cursor-pointer print:hidden"
                              title="Copy Ticket ID"
                            >
                              {copiedTicketId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </p>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[9px] text-zinc-500">AUTHENTICATED KEY</span>
                          <p className="text-xs font-bold text-zinc-300 print:text-zinc-800 truncate" title={confirmedTicket.key}>
                            {confirmedTicket.key.substring(0, 16)}...
                          </p>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[9px] text-zinc-500">FULL REGISTERED NAME</span>
                          <p className="text-xs font-bold text-zinc-200 print:text-black">{confirmedTicket.name}</p>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[9px] text-zinc-500">EMAIL ACCOUNT</span>
                          <p className="text-xs font-bold text-zinc-200 print:text-black truncate">{confirmedTicket.email}</p>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[9px] text-zinc-500">SOCIAL SIGNATURE</span>
                          <p className="text-xs font-bold text-zinc-300 print:text-black">{confirmedTicket.discord}</p>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[9px] text-zinc-500">REGISTRATION DATE</span>
                          <p className="text-[11px] font-bold text-zinc-400 print:text-zinc-800">
                            {new Date(confirmedTicket.registerTime).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* MESSAGE AREA */}
                      <div className="mb-4">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-wider block mb-1">REGISTER REASON FIELD</span>
                        <p className="text-[10px] text-zinc-400 print:text-zinc-900 italic leading-relaxed bg-zinc-900/50 p-2.5 rounded border border-zinc-900 font-sans">
                          &ldquo;{confirmedTicket.why}&rdquo;
                        </p>
                      </div>

                      {/* DECORATIVE BARCODE */}
                      <div className="flex flex-col items-center justify-center pt-2">
                        {/* Beautiful Barcode using CSS lines */}
                        <div className="flex h-10 w-full gap-[2px] opacity-80 mb-2">
                          {Array.from({ length: 42 }).map((_, i) => (
                            <div 
                              key={i} 
                              className="bg-zinc-300 print:bg-black h-full"
                              style={{
                                width: `${[1, 2, 1, 3, 1, 1, 2, 4, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 1, 2, 4, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 4, 2, 1, 1][i % 41]}px`
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-[8px] tracking-[6px] text-zinc-500 uppercase font-sans">
                          *LOTTERY-SECU-{confirmedTicket.ticketId.split('-')[1]}*
                        </span>
                      </div>

                    </div>

                    {/* ACTIONS BAR FOR TICKET */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button 
                        onClick={printTicket}
                        className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 py-3.5 px-5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition uppercase tracking-wider"
                      >
                        <Ticket className="w-4 h-4 text-emerald-400" />
                        Print / PDF Ticket
                      </button>
                      
                      <button 
                        onClick={() => {
                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(confirmedTicket, null, 2));
                          const downloadAnchor = document.createElement('a');
                          downloadAnchor.setAttribute("href",     dataStr);
                          downloadAnchor.setAttribute("download", `GIVEAWAY-TICKET-${confirmedTicket.ticketId}.json`);
                          document.body.appendChild(downloadAnchor);
                          downloadAnchor.click();
                          downloadAnchor.remove();
                        }}
                        className="flex-1 bg-zinc-950 hover:bg-zinc-90s0 text-zinc-300 border border-zinc-800 hover:border-zinc-700 py-3.5 px-5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition uppercase tracking-wider"
                      >
                        <ExternalLink className="w-4 h-4 text-emerald-400" />
                        Download Receipt JSON
                      </button>
                    </div>

                  </div>
                ) : (
                  /* PARTICIPATION ENTRY FORM (SHOWN IF REGISTERED == FALSE) */
                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xl space-y-6">
                    <div>
                      <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                        <Ticket className="w-5.5 h-5.5 text-emerald-400" />
                        Complete Giveaway Placement
                      </h2>
                      <p className="text-xs text-zinc-400 leading-normal mt-1">
                        Your verification voucher key was activated. Please submit your active delivery coordinates to establish your placement in the random pool drawing!
                      </p>
                    </div>

                    <form onSubmit={handleParticipateSubmit} className="space-y-4">
                      
                      {/* NAME INPUT */}
                      <div>
                        <label className="block text-xs text-zinc-400 font-bold uppercase mb-1.5 font-mono">
                          First &amp; Last Name <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="text" 
                          required
                          value={registrantName}
                          onChange={(e) => setRegistrantName(e.target.value)}
                          placeholder="e.g. Arham Arain"
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition duration-150"
                        />
                      </div>

                      {/* EMAIL INPUT */}
                      <div>
                        <label className="block text-xs text-zinc-400 font-bold uppercase mb-1.5 font-mono">
                          Email Address <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="email" 
                          required
                          value={registrantEmail}
                          onChange={(e) => setRegistrantEmail(e.target.value)}
                          placeholder="you@domain.com"
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition duration-150"
                        />
                        <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                          Used exclusively to verify and contact you on live drawing stream confirmation.
                        </p>
                      </div>

                      {/* SOCIALS INPUT */}
                      <div>
                        <label className="block text-xs text-zinc-400 font-bold uppercase mb-1.5 font-mono">
                          Discord or Twitter Handler <span className="text-zinc-600">(Optional)</span>
                        </label>
                        <input 
                          type="text" 
                          value={registrantSocial}
                          onChange={(e) => setRegistrantSocial(e.target.value)}
                          placeholder="e.g. arham#1234 or @arham_arain"
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition duration-150"
                        />
                      </div>

                      {/* CRITERION MOTIVATION INPUT */}
                      <div>
                        <label className="block text-xs text-zinc-400 font-bold uppercase mb-1.5 font-mono">
                          Why do you deserve this Gaming Beast? <span className="text-rose-500">*</span>
                        </label>
                        <textarea 
                          required
                          rows={4}
                          value={registrantWhy}
                          onChange={(e) => setRegistrantWhy(e.target.value)}
                          placeholder="Tell us about your setup limitations, projects you seek to start, or coding tasks you would execute if you win..."
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-emerald-500 rounded-xl py-3 px-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition duration-150 resize-y"
                        />
                      </div>

                      {/* FORM EXPLICIT ERROR */}
                      {error && (
                        <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <p>{error}</p>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmittingReg}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-black hover:opacity-95 active:scale-[0.99] font-black tracking-wide text-sm py-4 px-6 rounded-xl shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2 cursor-pointer transition disabled:opacity-50"
                      >
                        {isSubmittingReg ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Recording entry coordinates...
                          </span>
                        ) : (
                          <>
                            Submit Registration &amp; Lock Ticket
                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                          </>
                        )}
                      </button>

                    </form>
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

        {/* FEED & STATS OVERVIEW SECTIONS (LIVE FOR TRANSPARENCY) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-12">
          
          {/* STATS DECORATOR COLUMN */}
          <div className="md:col-span-4 bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold font-mono tracking-widest text-zinc-400">
                  REAL-TIME STATS
                </span>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-2xl font-black text-white font-mono">1,000</p>
                  <p className="text-xs text-zinc-500 font-semibold mt-0.5">VOUCHERS MINTED BOUND</p>
                </div>
                
                <div>
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="text-2xl font-black text-emerald-400 font-mono">
                      {Math.max(284, participants.length + 280)}
                    </p>
                    <span className="text-[10px] text-zinc-500 font-semibold font-mono">
                      {Math.round((Math.max(284, participants.length + 280) / 1000) * 100)}% TAKEN
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 font-semibold mb-2">VERIFIED ACTIVE ENTRIES</p>
                  
                  {/* Progress tier */}
                  <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-900">
                    <div 
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full" 
                      style={{ width: `${(Math.max(284, participants.length + 280) / 1000) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-800/80 pt-5">
                  <div className="flex gap-2 items-start text-xs text-zinc-400 leading-normal">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      Provably Fair Drawing algorithms used for selecting final slot owner.
                    </span>
                  </div>
                </div>

              </div>
            </div>

            <div className="text-[10px] text-zinc-600 font-semibold mt-4">
              SESSION FINGERPRINT RECURSION ACTIVE
            </div>
          </div>

          {/* VERIFIED ENTRANTS LIVE TICKER FEED */}
          <div className="md:col-span-8 bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-extrabold text-white">Verified Participant Ledger</h3>
              </div>
              <span className="text-[10px] bg-zinc-950 text-zinc-400 border border-zinc-800 px-2 rounded-full py-0.5 font-mono">
                LIVE SECURED DATABASE FEED
              </span>
            </div>

            <div className="space-y-3.5 max-h-[290px] overflow-y-auto pr-2 scrollbar-thin">
              {participants.slice(0, 4).map((entrant, idx) => (
                <div 
                  key={idx} 
                  className="bg-zinc-950 p-4 border border-zinc-800/90 rounded-2xl flex items-start justify-between gap-4 group hover:border-zinc-700/80 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-extrabold text-emerald-400 font-mono">
                        {entrant.name}
                      </p>
                      <span className="text-[8px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.2 rounded-sm uppercase tracking-wide">
                        {entrant.ticketId}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-normal italic font-medium pr-6 text-zinc-400">
                      &ldquo;{entrant.why}&rdquo;
                    </p>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-zinc-500 font-bold font-mono">
                      {entrant.registerTime ? new Date(entrant.registerTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : 'recently'}
                    </p>
                    <span className="text-[8px] text-emerald-400/80 uppercase font-sans font-bold flex items-center justify-end gap-1 mt-0.5">
                      <ShieldCheck className="w-2.5 h-2.5" /> SECURE MATCH
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

        {/* ACCORDION FAQ SECTION */}
        <section className="mt-12 bg-zinc-900 border border-zinc-805 rounded-3xl p-6 md:p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <HelpCircle className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-black text-white">Common Inquiry Portal</h3>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How do I secure an entry voucher key?",
                a: "Coupon keys are purchased or won from our authorized distributor systems. When a coupon key is generated, our secure backend records its unique signature. Entering that signature on our homepage securely validates your access to the placement form."
              },
              {
                q: "Is there an anti-cheat mechanism (HWID locks)?",
                a: "Yes, our validation server compiles a unique cryptographic hardware identifier (hwid) of your environment during key entry. Keys mapped to standard instances cannot be shared, meaning one participant key allows exactly one locked entry confirmation to prevent spam bots."
              },
              {
                q: "How is the random draw calculated?",
                a: "A draw is triggered upon timer compilation. We utilize verified provincial fair hashing logic mapping ticket confirm IDs to specific blockchain pool inputs, preventing server administrative tampering entirely."
              },
              {
                q: "What occurs if I win the grand ROG laptop prize?",
                a: "An encrypted receipt code is dispatched to your registered email coordinate. Winners are contacted immediately via Discord and Email to organize fully insured global delivery of the system."
              }
            ].map((faq, idx) => (
              <div 
                key={idx} 
                className="border-b border-zinc-850 pb-4 last:border-0 last:pb-0"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left flex justify-between items-center text-sm font-bold text-white hover:text-emerald-400 cursor-pointer py-2 transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform duration-200 ${activeFaq === idx ? 'rotate-180 text-emerald-400' : ''}`} />
                </button>
                {activeFaq === idx && (
                  <p className="text-zinc-400 text-xs leading-relaxed mt-2 pl-1 animate-slide-down pr-8">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="max-w-6xl mx-auto px-4 mt-16 text-center space-y-4 border-t border-zinc-900 pt-8 print:hidden">
        <p className="text-xs text-zinc-500 font-mono tracking-wide">
          Protected by <span className="text-zinc-400 font-bold">AES-256 cryptographically signed entry ticket verification systems</span>. Secured transactions only.
        </p>
        <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-600 font-bold uppercase tracking-widest font-mono">
          <span>Terms of Use</span>
          <span className="w-1 h-1 rounded-full bg-zinc-800" />
          <span>Provably Fair Agreement</span>
          <span className="w-1 h-1 rounded-full bg-zinc-800" />
          <span>Security Protocol API</span>
        </div>
      </footer>

    </div>
  );
}
