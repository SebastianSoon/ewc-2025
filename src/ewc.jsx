import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, X, MapPin, Briefcase, Quote, Instagram, Linkedin, Facebook, Shield, Swords, Sparkles } from 'lucide-react';

const parseHashRoute = (hash) => {
  const segments = hash
    .replace(/^#/, '')
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));

  if (segments.length === 0) {
    return { view: 'landing', tribe: null, warriorId: null };
  }

  if (segments[0] !== 'tribes') {
    return { view: 'landing', tribe: null, warriorId: null };
  }

  if (segments.length === 1) {
    return { view: 'tribes', tribe: null, warriorId: null };
  }

  if (segments[2] === 'warrior' && segments[3]) {
    return {
      view: 'roster',
      tribe: segments[1],
      warriorId: Number(segments[3]),
    };
  }

  return { view: 'roster', tribe: segments[1], warriorId: null };
};

const landingHash = '#/';
const tribesHash = '#/tribes';
const buildTribeHash = (tribe) => `#/tribes/${encodeURIComponent(tribe)}`;
const buildWarriorHash = (tribe, warriorId) => `#/tribes/${encodeURIComponent(tribe)}/warrior/${warriorId}`;
const routeSignature = (route) => `${route.view}::${route.tribe || ''}::${route.warriorId || ''}`;
const EXIT_DURATION_MS = 1100;
const ENTER_DURATION_MS = 1900;
const FALLBACK_PHOTO = '/logo.png';

const shouldAnimateRouteTransition = (currentRoute, nextRoute) => {
  const isModalOnlyChange =
    currentRoute.view === 'roster' &&
    nextRoute.view === 'roster' &&
    currentRoute.tribe === nextRoute.tribe;

  return !isModalOnlyChange;
};

const extractDriveFileId = (url) => {
  if (!url || url === '#') {
    return null;
  }

  const openIdMatch = url.match(/[?&]id=([^&]+)/i);

  if (openIdMatch?.[1]) {
    return openIdMatch[1];
  }

  const filePathMatch = url.match(/\/file\/d\/([^/]+)/i);

  if (filePathMatch?.[1]) {
    return filePathMatch[1];
  }

  const ucMatch = url.match(/[?&]id=([^&]+)/i);

  if (ucMatch?.[1]) {
    return ucMatch[1];
  }

  return null;
};

const buildPhotoSources = (url) => {
  if (!url || url === '#') {
    return [FALLBACK_PHOTO];
  }

  const fileId = extractDriveFileId(url);

  if (!fileId) {
    return [url, FALLBACK_PHOTO];
  }

  return [
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
    `https://drive.usercontent.google.com/download?id=${fileId}&export=view&authuser=0`,
    `https://lh3.googleusercontent.com/d/${fileId}=w1600`,
    FALLBACK_PHOTO,
  ];
};

const resolveWarriorFromRoute = (route, warriorsData) => {
  if (!route.warriorId) {
    return null;
  }

  return (
    warriorsData.find(
      (item) => item.id === route.warriorId && item.tribe === route.tribe
    ) || null
  );
};

export default function App() {
  const [view, setView] = useState('landing'); // 'landing', 'tribes', 'roster'
  const [selectedTribe, setSelectedTribe] = useState(null);
  const [selectedWarrior, setSelectedWarrior] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [warriorsData, setWarriorsData] = useState([]);
  const [isFetchingWarriors, setIsFetchingWarriors] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [transitionPhase, setTransitionPhase] = useState('idle');
  const [photoSourceIndexes, setPhotoSourceIndexes] = useState({});

  const hasInitializedRoute = useRef(false);
  const activeRouteRef = useRef({ view: 'landing', tribe: null, warriorId: null });
  const activeRouteSignatureRef = useRef(routeSignature({ view: 'landing', tribe: null, warriorId: null }));
  const exitTimeoutRef = useRef(null);
  const enterTimeoutRef = useRef(null);

  const tribes = [...new Set(warriorsData.map((warrior) => warrior.tribe))].sort();

  const clearTransitionTimeouts = () => {
    if (exitTimeoutRef.current) {
      clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = null;
    }

    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
  };

  const applyRouteState = (route) => {
    setView(route.view);
    setSelectedTribe(route.tribe);
    setSelectedWarrior(resolveWarriorFromRoute(route, warriorsData));
    activeRouteRef.current = route;
    activeRouteSignatureRef.current = routeSignature(route);
  };

  const getWarriorPhotoSrc = (warrior) => {
    const photoIndex = photoSourceIndexes[warrior.id] || 0;
    return warrior.photoSources?.[photoIndex] || warrior.photo || FALLBACK_PHOTO;
  };

  const isFallbackPhoto = (warrior) => getWarriorPhotoSrc(warrior) === FALLBACK_PHOTO;

  const handleWarriorImageError = (warriorId) => {
    setPhotoSourceIndexes((currentIndexes) => {
      const warrior = warriorsData.find((item) => item.id === warriorId);

      if (!warrior?.photoSources?.length) {
        return currentIndexes;
      }

      const currentIndex = currentIndexes[warriorId] || 0;
      const nextIndex = Math.min(currentIndex + 1, warrior.photoSources.length - 1);

      if (nextIndex === currentIndex) {
        return currentIndexes;
      }

      return {
        ...currentIndexes,
        [warriorId]: nextIndex,
      };
    });
  };

  const navigateToHash = (hash) => {
    if (window.location.hash === hash) {
      return;
    }

    window.location.hash = hash;
  };

  const navigateToLanding = () => navigateToHash(landingHash);
  const navigateToTribes = () => navigateToHash(tribesHash);
  const navigateToTribe = (tribe) => navigateToHash(buildTribeHash(tribe));
  const navigateToWarrior = (warrior) => navigateToHash(buildWarriorHash(warrior.tribe, warrior.id));

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadWarriors = async () => {
      try {
        const response = await fetch('/ewc.json');

        if (!response.ok) {
          throw new Error(`Failed to load warriors data (${response.status})`);
        }

        const data = await response.json();
        const normalizedData = data.map((warrior) => ({
          ...warrior,
          photo: buildPhotoSources(warrior.photo)[0],
          photoSources: buildPhotoSources(warrior.photo),
        }));

        if (isMounted) {
          setWarriorsData(normalizedData);
          setPhotoSourceIndexes({});
          setFetchError(null);
        }
      } catch (error) {
        if (isMounted) {
          setFetchError(error.message || 'Failed to load warriors data.');
        }
      } finally {
        if (isMounted) {
          setIsFetchingWarriors(false);
        }
      }
    };

    loadWarriors();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const syncRouteWithHash = () => {
      const route = parseHashRoute(window.location.hash);
      const nextSignature = routeSignature(route);

      if (!hasInitializedRoute.current) {
        applyRouteState(route);
        hasInitializedRoute.current = true;
        return;
      }

      if (activeRouteSignatureRef.current === nextSignature) {
        if (route.warriorId) {
          setSelectedWarrior(resolveWarriorFromRoute(route, warriorsData));
        }
        return;
      }

      if (!shouldAnimateRouteTransition(activeRouteRef.current, route)) {
        clearTransitionTimeouts();
        setTransitionPhase('idle');
        applyRouteState(route);
        return;
      }

      clearTransitionTimeouts();
      setTransitionPhase('exiting');

      exitTimeoutRef.current = setTimeout(() => {
        applyRouteState(route);
        setTransitionPhase('entering');

        enterTimeoutRef.current = setTimeout(() => {
          setTransitionPhase('idle');
          enterTimeoutRef.current = null;
        }, ENTER_DURATION_MS);

        exitTimeoutRef.current = null;
      }, EXIT_DURATION_MS);
    };

    syncRouteWithHash();
    window.addEventListener('hashchange', syncRouteWithHash);

    return () => {
      clearTransitionTimeouts();
      window.removeEventListener('hashchange', syncRouteWithHash);
    };
  }, [warriorsData]);

  const sceneClassName = transitionPhase === 'exiting'
    ? 'animate-scene-exit'
    : transitionPhase === 'entering'
      ? 'animate-scene-enter'
      : 'opacity-100 translate-y-0 scale-100';

  const overlayClassName = transitionPhase === 'exiting'
    ? 'pointer-events-auto animate-warrior-curtain-in'
    : transitionPhase === 'entering'
      ? 'pointer-events-none animate-warrior-curtain-out'
      : 'pointer-events-none opacity-0';

  // --- VIEWS ---

  const renderLanding = () => (
    <div className={`flex flex-col items-center justify-center min-h-screen transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <div className="relative group cursor-pointer" onClick={navigateToTribes}>
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
        onClick={navigateToTribes}
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

      {isFetchingWarriors && (
        <div className="text-center text-zinc-500 tracking-widest uppercase text-sm">Loading warriors...</div>
      )}

      {!isFetchingWarriors && fetchError && (
        <div className="text-center text-red-500 tracking-wide">{fetchError}</div>
      )}

      {!isFetchingWarriors && !fetchError && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {tribes.map((tribe) => {
          const count = warriorsData.filter(w => w.tribe === tribe).length;
          return (
            <div 
              key={tribe}
              onClick={() => navigateToTribe(tribe)}
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
      )}
    </div>
  );

  const renderRoster = () => {
    const tribeWarriors = warriorsData.filter(w => w.tribe === selectedTribe).sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    return (
      <div className="min-h-screen pt-24 px-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col md:flex-row justify-between items-center mb-16 border-b border-zinc-800 pb-8">
          <div>
            <button 
              onClick={navigateToTribes}
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
              onClick={() => navigateToWarrior(warrior)}
              className="group relative bg-zinc-900 rounded-lg overflow-hidden cursor-pointer border border-zinc-800 hover:border-red-800 transition-all duration-500"
            >
              <div className="aspect-[4/5] overflow-hidden relative">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500 z-10"></div>
                <img 
                  src={getWarriorPhotoSrc(warrior)} 
                  alt={warrior.fullName} 
                  onError={() => handleWarriorImageError(warrior.id)}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className={`w-full h-full transition-all duration-700 ${isFallbackPhoto(warrior) ? 'object-contain p-10 bg-black/90 filter-none group-hover:scale-105' : 'object-cover filter grayscale group-hover:grayscale-0 group-hover:scale-105'}`}
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
          onClick={() => navigateToTribe(selectedWarrior.tribe)}
        ></div>
        
        <div className="modal-scroll relative bg-zinc-900 border border-zinc-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
          
          <button 
            onClick={() => navigateToTribe(selectedWarrior.tribe)}
            className="absolute top-4 right-4 z-20 bg-zinc-800/50 hover:bg-red-900/50 text-zinc-400 hover:text-zinc-100 p-2 rounded-full transition-colors backdrop-blur"
          >
            <X size={20} />
          </button>

          {/* Left Column - Image & Basics */}
          <div className="md:w-2/5 relative">
            <img 
              src={getWarriorPhotoSrc(selectedWarrior)} 
              alt={selectedWarrior.fullName} 
              onError={() => handleWarriorImageError(selectedWarrior.id)}
              referrerPolicy="no-referrer"
              loading="eager"
              className={`w-full h-64 md:h-full ${isFallbackPhoto(selectedWarrior) ? 'object-contain p-10 bg-black/90' : 'object-cover'}`}
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
            <div className="pt-6 border-t border-zinc-800">
              <div className="flex gap-4">
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

              <div className="mt-6 mb-3 rounded-lg border border-zinc-800 bg-zinc-950/70 px-4 py-4 text-center">
                <div className="mx-auto h-px w-20 bg-gradient-to-r from-transparent via-red-400/45 to-transparent"></div>
                <p className="mt-3 text-[0.65rem] uppercase tracking-[0.45em] text-zinc-500">Forged In</p>
                <p className="mt-2 text-sm uppercase tracking-[0.25em] text-zinc-200">{selectedWarrior.tribe}</p>
                <p className="mt-1 text-xs tracking-[0.2em] text-zinc-600">Warrior #{selectedWarrior.sequenceNumber}</p>
              </div>
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
            onClick={navigateToLanding}
          >
            <span className="text-2xl font-serif text-red-700 group-hover:text-red-500 transition-colors drop-shadow-[0_0_5px_rgba(139,0,0,0.8)]">ᚢ</span>
            <span className="font-bold tracking-widest uppercase text-sm hidden sm:block">Yearbook</span>
          </div>
          <div className="text-xs tracking-widest text-zinc-600 uppercase">
            EWC 2025
          </div>
        </nav>
      )}

      <main className={`transition-transform transition-opacity duration-500 will-change-transform ${sceneClassName}`}>
        {view === 'landing' && renderLanding()}
        {view === 'tribes' && renderTribes()}
        {view === 'roster' && renderRoster()}
      </main>

      {renderModal()}

      <div className={`fixed inset-0 z-[60] flex items-center justify-center overflow-hidden ${overlayClassName}`} aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(58,10,10,0.16),rgba(10,10,10,0.95)_42%,rgba(0,0,0,0.99)_100%)]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0.12)_24%,rgba(74,12,12,0.14)_50%,rgba(0,0,0,0.12)_76%,rgba(0,0,0,0.68)_100%)]"></div>
        <div className="absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 bg-[radial-gradient(circle_at_center,rgba(92,16,16,0.16),rgba(92,16,16,0.05)_34%,transparent_72%)] blur-3xl animate-warrior-smoke"></div>
        <div className="absolute left-1/2 top-1/2 h-[22rem] w-[2px] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-amber-100/35 to-transparent shadow-[0_0_12px_rgba(254,243,199,0.14)] animate-warrior-slash"></div>
        <div className="absolute left-1/2 top-1/2 h-[24rem] w-12 -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(180deg,transparent_0%,rgba(92,16,16,0.10)_18%,rgba(251,191,36,0.10)_50%,rgba(92,16,16,0.10)_82%,transparent_100%)] blur-xl opacity-60 animate-warrior-ember"></div>
        <div className="relative flex flex-col items-center justify-center gap-3 px-8 py-6 animate-warrior-rune">
          <span className="text-[5.25rem] leading-none text-stone-100/75 drop-shadow-[0_0_8px_rgba(254,242,242,0.10)]">ᚢ</span>
          <div className="h-px w-20 bg-gradient-to-r from-transparent via-red-200/25 to-transparent"></div>
          <span className="text-[0.58rem] font-semibold uppercase tracking-[0.7em] text-stone-200/45">Warrior</span>
        </div>
      </div>
      
      {/* Global CSS for some specific animations not natively in standard tailwind classes */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes subtle-pulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(1.05); }
        }
        .animate-pulse-slow {
          animation: subtle-pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .modal-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(120, 24, 24, 0.7) rgba(24, 24, 27, 0.95);
        }
        .modal-scroll::-webkit-scrollbar {
          width: 10px;
        }
        .modal-scroll::-webkit-scrollbar-track {
          background: rgba(24, 24, 27, 0.96);
          border-left: 1px solid rgba(63, 63, 70, 0.45);
        }
        .modal-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(113, 20, 20, 0.9), rgba(60, 10, 10, 0.95));
          border-radius: 999px;
          border: 2px solid rgba(24, 24, 27, 0.95);
        }
        .modal-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(140, 24, 24, 0.95), rgba(78, 12, 12, 0.98));
        }
        @keyframes scene-exit {
          0% { opacity: 1; transform: translateY(0) scale(1); filter: saturate(1) blur(0); }
          100% { opacity: 0; transform: translateY(12px) scale(0.992); filter: saturate(0.94) blur(3px); }
        }
        @keyframes scene-enter {
          0% { opacity: 0; transform: translateY(-8px) scale(1.006); filter: saturate(1.02) blur(4px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: saturate(1) blur(0); }
        }
        @keyframes warrior-curtain-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes warrior-curtain-out {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes warrior-smoke {
          0% { opacity: 0.08; transform: translateY(-50%) scaleX(0.94); }
          50% { opacity: 0.16; transform: translateY(-50%) scaleX(1.03); }
          100% { opacity: 0.1; transform: translateY(-50%) scaleX(1); }
        }
        @keyframes warrior-slash {
          0% { opacity: 0; transform: translate(-50%, -50%) scaleY(0.78); }
          35% { opacity: 0.48; transform: translate(-50%, -50%) scaleY(1.02); }
          100% { opacity: 0.22; transform: translate(-50%, -50%) scaleY(1); }
        }
        @keyframes warrior-ember {
          0% { opacity: 0.04; transform: translate(-50%, -50%) scaleY(0.88); }
          45% { opacity: 0.12; transform: translate(-50%, -50%) scaleY(1.01); }
          100% { opacity: 0.06; transform: translate(-50%, -50%) scaleY(1); }
        }
        @keyframes warrior-rune {
          0% { transform: translateY(8px) scale(0.97); opacity: 0; }
          45% { transform: translateY(0) scale(1.005); opacity: 0.72; }
          100% { transform: translateY(0) scale(1); opacity: 0.5; }
        }
        .animate-scene-exit {
          animation: scene-exit ${EXIT_DURATION_MS}ms cubic-bezier(0.45, 0, 0.2, 1) forwards;
        }
        .animate-scene-enter {
          animation: scene-enter ${ENTER_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-warrior-curtain-in {
          animation: warrior-curtain-in ${EXIT_DURATION_MS}ms ease-out forwards;
        }
        .animate-warrior-curtain-out {
          animation: warrior-curtain-out ${ENTER_DURATION_MS}ms ease-out forwards;
        }
        .animate-warrior-smoke {
          animation: warrior-smoke ${ENTER_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .animate-warrior-slash {
          animation: warrior-slash ${ENTER_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .animate-warrior-ember {
          animation: warrior-ember ${ENTER_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .animate-warrior-rune {
          animation: warrior-rune ${ENTER_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}} />
    </div>
  );
}