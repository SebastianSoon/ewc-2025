import React, { useState, useEffect } from 'react';
import { ChevronRight, X, MapPin, Briefcase, Quote, Instagram, Linkedin, Facebook, Shield, Swords, Sparkles } from 'lucide-react';

// --- MOCK DATA (Replace this with your JSON export later) ---
const warriorsData = [
  {
    id: 1,
    fullName: "Alex Mercer",
    nickname: "Lex",
    warriorName: "Ironclad",
    tribe: "Tribe 1",
    sequenceNumber: 12,
    city: "Kuala Lumpur",
    country: "Malaysia",
    languages: "English, Malay, Mandarin",
    profession: "Software Architect",
    industry: "Technology",
    coreCompetencies: "System Design, Leadership, Problem Solving",
    biggestLearning: "Fear is just a compass pointing towards the direction I need to grow.",
    favoriteMoment: "The final breakthrough exercise on Day 4. The energy in the room was unbelievable.",
    wordsOfEncouragement: "Never forget the fire we built. Keep pushing, Tribe 1!",
    funFact: "I can solve a Rubik's cube in under 30 seconds blindfolded.",
    valueAdd: "Building digital infrastructures to help small businesses scale.",
    socials: { ig: "#", li: "#", fb: "#" },
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=500&q=80"
  },
  {
    id: 2,
    fullName: "Sarah Chen",
    nickname: "Sarah",
    warriorName: "Valkyrie",
    tribe: "Tribe 1",
    sequenceNumber: 4,
    city: "Singapore",
    country: "Singapore",
    languages: "English, Mandarin",
    profession: "Marketing Director",
    industry: "E-commerce",
    coreCompetencies: "Brand Strategy, Public Speaking",
    biggestLearning: "My inner critic is loud, but my inner warrior is stronger. Action cures fear.",
    favoriteMoment: "When our tribe had to carry the literal weight for each other. True brotherhood.",
    wordsOfEncouragement: "We are forged in the fire. I believe in every single one of you.",
    funFact: "I've summited Mount Kilimanjaro.",
    valueAdd: "Connecting people with the products that genuinely improve their lives.",
    socials: { ig: "#", li: "#" },
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?fit=crop&w=500&q=80"
  },
  {
    id: 3,
    fullName: "David Raj",
    nickname: "Dave",
    warriorName: "Titan",
    tribe: "Tribe 2",
    sequenceNumber: 22,
    city: "Penang",
    country: "Malaysia",
    languages: "English, Tamil, Malay",
    profession: "Fitness Coach & Entrepreneur",
    industry: "Health & Wellness",
    coreCompetencies: "Resilience, Coaching, Discipline",
    biggestLearning: "How you do anything is how you do everything.",
    favoriteMoment: "The morning energy routines. Changed how I start my day completely.",
    wordsOfEncouragement: "Keep the momentum going, Warriors. The real camp starts now.",
    funFact: "I used to be a professional classical musician before getting into fitness.",
    valueAdd: "Empowering people to take back control of their physical and mental health.",
    socials: { ig: "#" },
    photo: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?fit=crop&w=500&q=80"
  }
];

// Extract unique tribes from data
const tribes = [...new Set(warriorsData.map(w => w.tribe))].sort();

export default function App() {
  const [view, setView] = useState('landing'); // 'landing', 'tribes', 'roster'
  const [selectedTribe, setSelectedTribe] = useState(null);
  const [selectedWarrior, setSelectedWarrior] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // --- VIEWS ---

  const renderLanding = () => (
    <div className={`flex flex-col items-center justify-center min-h-screen transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <div className="relative group cursor-pointer" onClick={() => setView('tribes')}>
        {/* Glowing effect behind the rune */}
        <div className="absolute inset-0 bg-red-900 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-700 animate-pulse"></div>
        
        <h1 className="text-[12rem] md:text-[18rem] leading-none text-zinc-200 font-serif text-center relative z-10 drop-shadow-[0_0_15px_rgba(139,0,0,0.5)] group-hover:text-red-700 transition-colors duration-500">
          ᚢ
        </h1>
      </div>
      
      <div className="mt-8 text-center z-10 space-y-4">
        <h2 className="text-3xl md:text-5xl font-bold tracking-[0.2em] text-zinc-100 uppercase">EWC 2025</h2>
        <p className="text-zinc-500 tracking-widest text-sm md:text-base italic">"Act in spite of fear."</p>
      </div>

      <button 
        onClick={() => setView('tribes')}
        className="mt-16 z-10 flex items-center gap-2 px-8 py-3 border border-zinc-800 text-zinc-400 hover:text-red-500 hover:border-red-800 hover:bg-red-950/20 transition-all duration-300 rounded uppercase tracking-widest text-sm"
      >
        Enter The Yearbook <ChevronRight size={16} />
      </button>
    </div>
  );

  const renderTribes = () => (
    <div className="min-h-screen pt-24 px-6 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mb-16">
        <h2 className="text-4xl font-bold tracking-widest text-zinc-100 uppercase mb-4">Select Your Tribe</h2>
        <div className="w-24 h-1 bg-red-800 mx-auto opacity-50"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tribes.map((tribe) => {
          const count = warriorsData.filter(w => w.tribe === tribe).length;
          return (
            <div 
              key={tribe}
              onClick={() => {
                setSelectedTribe(tribe);
                setView('roster');
              }}
              className="group relative bg-zinc-900 border border-zinc-800 p-8 rounded-lg cursor-pointer hover:border-red-800 hover:-translate-y-2 transition-all duration-500 overflow-hidden"
            >
              {/* Background gradient on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                <Shield className="w-12 h-12 text-zinc-700 group-hover:text-red-600 transition-colors duration-500" />
                <h3 className="text-2xl font-bold text-zinc-200 tracking-wider uppercase">{tribe}</h3>
                <p className="text-zinc-500 tracking-widest text-sm">{count} Warriors</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderRoster = () => {
    const tribeWarriors = warriorsData.filter(w => w.tribe === selectedTribe).sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    return (
      <div className="min-h-screen pt-24 px-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 border-b border-zinc-800 pb-8">
          <div>
            <button 
              onClick={() => setView('tribes')}
              className="text-zinc-500 hover:text-red-500 flex items-center gap-2 tracking-widest text-xs uppercase mb-4 transition-colors"
            >
              <ChevronRight className="rotate-180" size={14} /> Back to Tribes
            </button>
            <h2 className="text-4xl font-bold tracking-widest text-zinc-100 uppercase">{selectedTribe}</h2>
          </div>
          <div className="mt-4 md:mt-0 text-zinc-600 tracking-widest uppercase text-sm">
            {tribeWarriors.length} Souls Forged
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
          {tribeWarriors.map((warrior) => (
            <div 
              key={warrior.id}
              onClick={() => setSelectedWarrior(warrior)}
              className="group relative bg-zinc-900 rounded-lg overflow-hidden cursor-pointer border border-zinc-800 hover:border-red-800 transition-all duration-500"
            >
              <div className="aspect-[4/5] overflow-hidden relative">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500 z-10"></div>
                <img 
                  src={warrior.photo} 
                  alt={warrior.fullName} 
                  className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                />
                <div className="absolute top-4 right-4 z-20 bg-zinc-950/80 backdrop-blur border border-zinc-700 px-3 py-1 rounded text-xs font-mono text-zinc-300">
                  #{warrior.sequenceNumber}
                </div>
              </div>
              
              <div className="p-5 border-t border-zinc-800">
                <h3 className="text-xl font-bold text-zinc-100 uppercase tracking-wide">{warrior.fullName}</h3>
                <p className="text-red-600/80 text-sm tracking-widest uppercase mt-1">"{warrior.warriorName}"</p>
                <div className="mt-4 h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 group-hover:mt-4 transition-all duration-500 overflow-hidden">
                  <p className="text-zinc-400 text-sm line-clamp-2 italic">"{warrior.biggestLearning}"</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!selectedWarrior) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
        <div 
          className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md"
          onClick={() => setSelectedWarrior(null)}
        ></div>
        
        <div className="relative bg-zinc-900 border border-zinc-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
          
          <button 
            onClick={() => setSelectedWarrior(null)}
            className="absolute top-4 right-4 z-20 bg-zinc-800/50 hover:bg-red-900/50 text-zinc-400 hover:text-zinc-100 p-2 rounded-full transition-colors backdrop-blur"
          >
            <X size={20} />
          </button>

          {/* Left Column - Image & Basics */}
          <div className="md:w-2/5 relative">
            <img 
              src={selectedWarrior.photo} 
              alt={selectedWarrior.fullName} 
              className="w-full h-64 md:h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent md:hidden"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6 md:hidden">
              <h2 className="text-3xl font-bold text-white uppercase">{selectedWarrior.fullName}</h2>
              <p className="text-red-500 tracking-widest uppercase text-sm mt-1">"{selectedWarrior.warriorName}"</p>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="md:w-3/5 p-6 md:p-8 flex flex-col gap-8 text-zinc-300">
            <div className="hidden md:block border-b border-zinc-800 pb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-4xl font-bold text-white uppercase tracking-wide">{selectedWarrior.fullName}</h2>
                  <p className="text-red-500 tracking-widest uppercase text-sm mt-2">"{selectedWarrior.warriorName}" • {selectedWarrior.tribe} #{selectedWarrior.sequenceNumber}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <span className="text-zinc-500 flex items-center gap-2"><MapPin size={14}/> Base</span>
                <p>{selectedWarrior.city}, {selectedWarrior.country}</p>
              </div>
              <div className="space-y-1">
                <span className="text-zinc-500 flex items-center gap-2"><Briefcase size={14}/> Profession</span>
                <p>{selectedWarrior.profession}</p>
                <p className="text-zinc-500 text-xs">{selectedWarrior.industry}</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <span className="text-zinc-500 flex items-center gap-2"><Swords size={14}/> Core Competencies</span>
                <p>{selectedWarrior.coreCompetencies}</p>
              </div>
            </div>

            <div className="bg-zinc-950 p-6 border-l-2 border-red-800 rounded-r-lg space-y-4">
              <div>
                <span className="text-red-800 font-bold tracking-widest uppercase text-xs mb-2 block">Biggest Learning</span>
                <p className="text-zinc-200 italic">"{selectedWarrior.biggestLearning}"</p>
              </div>
              {selectedWarrior.favoriteMoment && (
                <div className="pt-4 border-t border-zinc-800/50">
                  <span className="text-zinc-600 font-bold tracking-widest uppercase text-xs mb-2 block">Favorite Moment</span>
                  <p className="text-zinc-400 text-sm">{selectedWarrior.favoriteMoment}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              {selectedWarrior.funFact && (
                <div>
                  <span className="text-zinc-500 flex items-center gap-2 text-xs uppercase tracking-widest mb-1"><Sparkles size={14}/> Fun Fact</span>
                  <p className="text-sm">{selectedWarrior.funFact}</p>
                </div>
              )}
              {selectedWarrior.wordsOfEncouragement && (
                <div>
                  <span className="text-zinc-500 flex items-center gap-2 text-xs uppercase tracking-widest mb-1"><Quote size={14}/> To the Tribe</span>
                  <p className="text-sm">"{selectedWarrior.wordsOfEncouragement}"</p>
                </div>
              )}
            </div>

            {/* Social Links */}
            <div className="pt-6 border-t border-zinc-800 flex gap-4">
              {selectedWarrior.socials?.ig && (
                <a href={selectedWarrior.socials.ig} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                  <Instagram size={20} />
                </a>
              )}
              {selectedWarrior.socials?.li && (
                <a href={selectedWarrior.socials.li} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                  <Linkedin size={20} />
                </a>
              )}
              {selectedWarrior.socials?.fb && (
                <a href={selectedWarrior.socials.fb} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-white transition-colors">
                  <Facebook size={20} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-red-900/50 selection:text-white overflow-x-hidden">
      {/* Top Navbar Component (appears after landing) */}
      {view !== 'landing' && (
        <nav className="fixed top-0 left-0 right-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 px-6 py-4 flex justify-between items-center">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setView('landing')}
          >
            <span className="text-2xl font-serif text-red-700 group-hover:text-red-500 transition-colors drop-shadow-[0_0_5px_rgba(139,0,0,0.8)]">ᚢ</span>
            <span className="font-bold tracking-widest uppercase text-sm hidden sm:block">Yearbook</span>
          </div>
          <div className="text-xs tracking-widest text-zinc-600 uppercase">
            EWC 2025
          </div>
        </nav>
      )}

      <main>
        {view === 'landing' && renderLanding()}
        {view === 'tribes' && renderTribes()}
        {view === 'roster' && renderRoster()}
      </main>

      {renderModal()}
      
      {/* Global CSS for some specific animations not natively in standard tailwind classes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes subtle-pulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.05); }
        }
        .animate-pulse-slow {
          animation: subtle-pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}} />
    </div>
  );
}