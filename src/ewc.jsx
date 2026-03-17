import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, X, MapPin, Briefcase, Quote, Instagram, Linkedin, Facebook, Shield, Swords, Sparkles, Compass, Wind, Flame, Bird, Star, Sun, Zap, Crown, Volume2, VolumeX } from 'lucide-react';
import { convertWorkbookArrayBuffer } from '../scripts/convert-ewc.js';

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
    if (segments[0] === 'nation') {
      if (segments[1] === 'warrior' && segments[2]) {
        return {
          view: 'nation',
          tribe: null,
          warriorId: Number(segments[2]),
        };
      }

      return { view: 'nation', tribe: null, warriorId: null };
    }

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
const nationHash = '#/nation';
const buildTribeHash = (tribe) => `#/tribes/${encodeURIComponent(tribe)}`;
const buildWarriorHash = (tribe, warriorId) => `#/tribes/${encodeURIComponent(tribe)}/warrior/${warriorId}`;
const buildNationWarriorHash = (warriorId) => `#/nation/warrior/${warriorId}`;
const routeSignature = (route) => `${route.view}::${route.tribe || ''}::${route.warriorId || ''}`;
const EXIT_DURATION_MS = 380;
const ENTER_DURATION_MS = 720;
const WELCOME_HOLD_DURATION_MS = 1200;
const WELCOME_REVEAL_DURATION_MS = 800;
const WARRIOR_ENTRY_RECOGNITION_MS = 460;
const AUDIO_TARGET_VOLUME = 0.2;
const AUDIO_MUTE_STORAGE_KEY = 'ewc-audio-muted';
const APP_UNLOCK_STORAGE_KEY = 'ewc-warrior-unlocked';
const NATION_SEARCH_DEBOUNCE_MS = 500;
const NATION_CARD_EXIT_MS = 220;
const NATION_CARD_ENTER_MS = 520;
const NATION_CARD_STAGGER_MS = 45;
const NATION_CARD_MAX_STAGGER_MS = 240;
const LOADING_SCREEN_EXIT_MS = 520;
const FALLBACK_PHOTO = '/ewc2025logo.jpg';
const GOOGLE_SHEET_XLSX_URL = 'https://docs.google.com/spreadsheets/d/1kt7QLwYrI2_tiuQ1dkr-llc2UQ8BBVSBvDIryJicmLY/export?format=xlsx&gid=1443822086';
const WARRIOR_PHRASES = [
  'act in spite of fear',
  'act inspite of fear',
  'am willing to do whatever it takes',
  'do everything at one hundred percent',
  'one hundred percent',
  'am willing to do what\'s hard',
  'do what\'s hard',
  'act in spite of my mood',
  'act inspite of my mood',
  'am bigger than any obstacle',
  'succeed in spite of anything',
  'never give up',
];
const STONE_SFX_VOLUME = 0.3;
const DUNGEON_SFX_VOLUME = 0.3;
const SFX_RETRIGGER_GAP_MS = 120;

const tribeVisuals = {
  'Destiny Warrior': { icon: Compass, accentClass: 'group-hover:text-amber-400' },
  'Flying Dragon': { icon: Wind, accentClass: 'group-hover:text-sky-400' },
  Phoenix: { icon: Flame, accentClass: 'group-hover:text-orange-400' },
  'Rising Eagles': { icon: Bird, accentClass: 'group-hover:text-stone-200' },
  'Rising Stars': { icon: Star, accentClass: 'group-hover:text-yellow-300' },
  'Rising Sun': { icon: Sun, accentClass: 'group-hover:text-red-400' },
  'Unstoppable Power': { icon: Zap, accentClass: 'group-hover:text-fuchsia-300' },
  'Golden Warrior': { icon: Crown, accentClass: 'group-hover:text-yellow-400' },
};

const getTribeVisual = (tribe) => tribeVisuals[tribe] || { icon: Shield, accentClass: 'group-hover:text-red-600' };

const buildTribeRows = (tribes) => {
  if (tribes.length === 8) {
    return [tribes.slice(0, 3), tribes.slice(3, 5), tribes.slice(5, 8)];
  }

  return [tribes];
};

const shouldAnimateRouteTransition = (currentRoute, nextRoute) => {
  const isModalOnlyChange =
    currentRoute.view === nextRoute.view &&
    ((currentRoute.view === 'roster' && currentRoute.tribe === nextRoute.tribe) ||
      currentRoute.view === 'nation');

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
      (item) => item.id === route.warriorId && (route.view === 'nation' || item.tribe === route.tribe)
    ) || null
  );
};

const buildWarriorSearchText = (warrior) => [
  warrior.fullName,
  warrior.warriorName,
  warrior.city,
  warrior.country,
  `${warrior.city || ''}, ${warrior.country || ''}`,
]
  .filter(Boolean)
  .join(' ')
  .toLowerCase();

const filterNationWarriors = (warriors, searchValue) => {
  const normalizedSearch = searchValue.trim().toLowerCase();

  return [...warriors]
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
    .filter((warrior) => {
      if (!normalizedSearch) {
        return true;
      }

      return buildWarriorSearchText(warrior).includes(normalizedSearch);
    });
};

const normalizeDetailList = (listValue, fallbackValue) => {
  if (Array.isArray(listValue)) {
    return listValue
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof fallbackValue !== 'string') {
    return [];
  }

  const normalizedFallback = fallbackValue.trim();

  if (!normalizedFallback) {
    return [];
  }

  if (normalizedFallback.includes('\n')) {
    return normalizedFallback
      .split(/\n+/)
      .map((item) => item.replace(/^[-*\d).\s]+/, '').trim())
      .filter(Boolean);
  }

  return normalizedFallback
    .split(',')
    .map((item) => item.replace(/^[-*\d).\s]+/, '').trim())
    .filter(Boolean);
};

const normalizeWarriorPhrase = (value) => value
  .toLowerCase()
  .replace(/100/g, 'one hundred')
  .replace(/%/g, ' percent ')
  .replace(/[^a-z\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const hasWarriorPhrase = (value) => {
  const normalizedValue = normalizeWarriorPhrase(value);

  return WARRIOR_PHRASES.some((phrase) => normalizedValue.includes(phrase));
};

const handleActivateOnKeyDown = (event, callback) => {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }

  event.preventDefault();
  callback();
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
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [warriorEntry, setWarriorEntry] = useState('');
  const [warriorEntryPhase, setWarriorEntryPhase] = useState('idle');
  const [nationSearch, setNationSearch] = useState('');
  const [debouncedNationSearch, setDebouncedNationSearch] = useState('');
  const [nationSearchAnimationKey, setNationSearchAnimationKey] = useState(0);
  const [displayedNationWarriors, setDisplayedNationWarriors] = useState([]);
  const [nationCardsPhase, setNationCardsPhase] = useState('idle');
  const [isWelcomingWarrior, setIsWelcomingWarrior] = useState(false);
  const [welcomePhase, setWelcomePhase] = useState('idle');
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [loadingScreenPhase, setLoadingScreenPhase] = useState('visible');
  const [hasUnlockedApp, setHasUnlockedApp] = useState(() => {
    try {
      return window.localStorage.getItem(APP_UNLOCK_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [isAudioMuted, setIsAudioMuted] = useState(() => {
    try {
      return window.localStorage.getItem(AUDIO_MUTE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const hasInitializedRoute = useRef(false);
  const activeRouteRef = useRef({ view: 'landing', tribe: null, warriorId: null });
  const activeRouteSignatureRef = useRef(routeSignature({ view: 'landing', tribe: null, warriorId: null }));
  const exitTimeoutRef = useRef(null);
  const enterTimeoutRef = useRef(null);
  const backgroundAudioRef = useRef(null);
  const stoneAudioRef = useRef(null);
  const dungeonAudioRef = useRef(null);
  const warriorEntryTimeoutRef = useRef(null);
  const welcomeRouteTimeoutRef = useRef(null);
  const welcomeRevealTimeoutRef = useRef(null);
  const welcomeCompleteTimeoutRef = useRef(null);
  const nationExitTimeoutRef = useRef(null);
  const nationEnterTimeoutRef = useRef(null);
  const loadingScreenTimeoutRef = useRef(null);
  const skipNextRouteTransitionRef = useRef(false);
  const lastStoneSfxAtRef = useRef(0);
  const lastDungeonSfxAtRef = useRef(0);

  const tribes = [...new Set(warriorsData.map((warrior) => warrior.tribe))].sort();

  const clearSceneTransitionTimeouts = () => {
    if (exitTimeoutRef.current) {
      clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = null;
    }

    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
  };

  const clearWelcomeTimeouts = () => {
    if (warriorEntryTimeoutRef.current) {
      clearTimeout(warriorEntryTimeoutRef.current);
      warriorEntryTimeoutRef.current = null;
    }

    if (welcomeRouteTimeoutRef.current) {
      clearTimeout(welcomeRouteTimeoutRef.current);
      welcomeRouteTimeoutRef.current = null;
    }

    if (welcomeRevealTimeoutRef.current) {
      clearTimeout(welcomeRevealTimeoutRef.current);
      welcomeRevealTimeoutRef.current = null;
    }

    if (welcomeCompleteTimeoutRef.current) {
      clearTimeout(welcomeCompleteTimeoutRef.current);
      welcomeCompleteTimeoutRef.current = null;
    }
  };

  const clearTransitionTimeouts = () => {
    clearSceneTransitionTimeouts();
    clearWelcomeTimeouts();
  };

  const clearNationCardTimeouts = () => {
    if (nationExitTimeoutRef.current) {
      clearTimeout(nationExitTimeoutRef.current);
      nationExitTimeoutRef.current = null;
    }

    if (nationEnterTimeoutRef.current) {
      clearTimeout(nationEnterTimeoutRef.current);
      nationEnterTimeoutRef.current = null;
    }
  };

  const clearLoadingScreenTimeout = () => {
    if (loadingScreenTimeoutRef.current) {
      clearTimeout(loadingScreenTimeoutRef.current);
      loadingScreenTimeoutRef.current = null;
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

  const playSfx = (audioRef, volume, lastPlayedAtRef) => {
    const audioElement = audioRef.current;

    if (!audioElement) {
      return;
    }

    const now = Date.now();

    if (now - lastPlayedAtRef.current < SFX_RETRIGGER_GAP_MS) {
      return;
    }

    lastPlayedAtRef.current = now;
    audioElement.volume = volume;
    audioElement.currentTime = 0;

    const playPromise = audioElement.play();

    if (playPromise?.catch) {
      playPromise.catch(() => {});
    }
  };

  const playStoneSfx = () => {
    playSfx(stoneAudioRef, STONE_SFX_VOLUME, lastStoneSfxAtRef);
  };

  const playDungeonSfx = () => {
    playSfx(dungeonAudioRef, DUNGEON_SFX_VOLUME, lastDungeonSfxAtRef);
  };

  const navigateToLanding = () => navigateToHash(landingHash);
  const navigateToTribes = () => navigateToHash(tribesHash);
  const navigateToNation = () => navigateToHash(nationHash);
  const navigateToTribe = (tribe) => navigateToHash(buildTribeHash(tribe));
  const navigateToWarrior = (warrior) => {
    if (view === 'nation') {
      navigateToHash(buildNationWarriorHash(warrior.id));
      return;
    }

    navigateToHash(buildWarriorHash(warrior.tribe, warrior.id));
  };
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const closeSelectedWarrior = () => {
    if (!selectedWarrior) {
      return;
    }

    if (view === 'nation') {
      navigateToNation();
      return;
    }

    navigateToTribe(selectedWarrior.tribe);
  };

  const isNationSearchPending = nationSearch !== debouncedNationSearch;

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    const updateScrollTopVisibility = () => {
      const revealThreshold = window.innerWidth < 640 ? 120 : 320;
      setShowScrollTop(window.scrollY > revealThreshold);
    };

    updateScrollTopVisibility();
    window.addEventListener('scroll', updateScrollTopVisibility, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateScrollTopVisibility);
    };
  }, []);

  useEffect(() => {
    const audioElement = backgroundAudioRef.current;

    if (!audioElement) {
      return undefined;
    }

    audioElement.volume = AUDIO_TARGET_VOLUME;

    let hasResolvedPlayback = false;

    const attemptPlayback = async () => {
      try {
        await audioElement.play();
        hasResolvedPlayback = true;
      } catch {
        hasResolvedPlayback = false;
      }
    };

    const handleFirstInteraction = () => {
      if (hasResolvedPlayback) {
        return;
      }

      attemptPlayback();
    };

    attemptPlayback();

    window.addEventListener('pointerdown', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    const audioElement = backgroundAudioRef.current;

    if (!audioElement) {
      return;
    }

    audioElement.muted = isAudioMuted;
  }, [isAudioMuted]);

  useEffect(() => {
    try {
      window.localStorage.setItem(AUDIO_MUTE_STORAGE_KEY, String(isAudioMuted));
    } catch {
      // Ignore storage failures and keep the in-memory preference.
    }
  }, [isAudioMuted]);

  useEffect(() => {
    try {
      window.localStorage.setItem(APP_UNLOCK_STORAGE_KEY, String(hasUnlockedApp));
    } catch {
      // Ignore storage failures and keep the in-memory preference.
    }
  }, [hasUnlockedApp]);

  useEffect(() => {
    const isModalOpen = Boolean(selectedWarrior);
    const isTransitioning = transitionPhase !== 'idle';
    const shouldLockDocument = isModalOpen || isTransitioning;

    if (!shouldLockDocument) {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      return undefined;
    }

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        closeSelectedWarrior();
      }
    };

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    if (isModalOpen && scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.paddingRight = '';
    }

    if (isModalOpen) {
      window.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      if (isModalOpen) {
        window.removeEventListener('keydown', handleEscapeKey);
      }
    };
  }, [selectedWarrior, transitionPhase, view]);

  useEffect(() => () => {
    clearTransitionTimeouts();
    clearNationCardTimeouts();
    clearLoadingScreenTimeout();
  }, []);

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      setDebouncedNationSearch(nationSearch);
    }, NATION_SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceTimeout);
    };
  }, [nationSearch]);

  useEffect(() => {
    const nextNationWarriors = filterNationWarriors(warriorsData, debouncedNationSearch);
    const hasDisplayedNationWarriors = displayedNationWarriors.length > 0;

    clearNationCardTimeouts();

    if (!hasDisplayedNationWarriors) {
      setDisplayedNationWarriors(nextNationWarriors);
      setNationCardsPhase('entering');

      nationEnterTimeoutRef.current = setTimeout(() => {
        setNationCardsPhase('idle');
        nationEnterTimeoutRef.current = null;
      }, NATION_CARD_ENTER_MS);

      return;
    }

    setNationCardsPhase('exiting');

    nationExitTimeoutRef.current = setTimeout(() => {
      requestAnimationFrame(() => {
        setDisplayedNationWarriors(nextNationWarriors);
        setNationSearchAnimationKey((currentValue) => currentValue + 1);
        setNationCardsPhase('entering');
      });

      nationExitTimeoutRef.current = null;

      nationEnterTimeoutRef.current = setTimeout(() => {
        setNationCardsPhase('idle');
        nationEnterTimeoutRef.current = null;
      }, NATION_CARD_ENTER_MS);
    }, NATION_CARD_EXIT_MS);
  }, [warriorsData, debouncedNationSearch]);

  useEffect(() => {
    let isMounted = true;

    const loadWarriors = async () => {
      try {
        const response = await fetch(GOOGLE_SHEET_XLSX_URL);

        if (!response.ok) {
          throw new Error(`Failed to load warriors data (${response.status})`);
        }

        const workbookBuffer = await response.arrayBuffer();
        const data = convertWorkbookArrayBuffer(workbookBuffer);
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
          setLoadingScreenPhase('exiting');
          clearLoadingScreenTimeout();
          loadingScreenTimeoutRef.current = setTimeout(() => {
            setShowLoadingScreen(false);
            setLoadingScreenPhase('idle');
            loadingScreenTimeoutRef.current = null;
          }, LOADING_SCREEN_EXIT_MS);
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
      let route = parseHashRoute(window.location.hash);

      if (!hasUnlockedApp && route.view !== 'landing') {
        route = { view: 'landing', tribe: null, warriorId: null };

        if (window.location.hash !== landingHash) {
          window.location.hash = landingHash;
        }
      }

      const nextSignature = routeSignature(route);
      const isModalOnlyChange = !shouldAnimateRouteTransition(activeRouteRef.current, route);

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

      if (skipNextRouteTransitionRef.current) {
        skipNextRouteTransitionRef.current = false;
        clearSceneTransitionTimeouts();
        setTransitionPhase('idle');
        applyRouteState(route);
        return;
      }

      if (isModalOnlyChange) {
        clearSceneTransitionTimeouts();
        setTransitionPhase('idle');
        applyRouteState(route);
        return;
      }

      clearSceneTransitionTimeouts();
      window.scrollTo({ top: 0, behavior: 'auto' });
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
      clearSceneTransitionTimeouts();
      window.removeEventListener('hashchange', syncRouteWithHash);
    };
  }, [warriorsData, hasUnlockedApp]);

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

  const startWarriorWelcome = () => {
    if (isWelcomingWarrior || warriorEntryTimeoutRef.current) {
      return;
    }

    setWarriorEntryPhase('recognized');

    warriorEntryTimeoutRef.current = setTimeout(() => {
      warriorEntryTimeoutRef.current = null;
      setWarriorEntryPhase('idle');
      setHasUnlockedApp(true);
      playStoneSfx();
      setIsWelcomingWarrior(true);
      setWelcomePhase('entering');
      setWarriorEntry('');
      skipNextRouteTransitionRef.current = true;

      clearSceneTransitionTimeouts();

      welcomeRouteTimeoutRef.current = setTimeout(() => {
        navigateToTribes();
        welcomeRouteTimeoutRef.current = null;
      }, WELCOME_HOLD_DURATION_MS);

      welcomeRevealTimeoutRef.current = setTimeout(() => {
        setWelcomePhase('revealing');
        welcomeRevealTimeoutRef.current = null;
      }, WELCOME_HOLD_DURATION_MS);

      welcomeCompleteTimeoutRef.current = setTimeout(() => {
        setIsWelcomingWarrior(false);
        setWelcomePhase('idle');
        welcomeCompleteTimeoutRef.current = null;
      }, WELCOME_HOLD_DURATION_MS + WELCOME_REVEAL_DURATION_MS);
    }, WARRIOR_ENTRY_RECOGNITION_MS);
  };

  const resetWarriorEntryRecognition = () => {
    if (warriorEntryTimeoutRef.current) {
      clearTimeout(warriorEntryTimeoutRef.current);
      warriorEntryTimeoutRef.current = null;
    }

    if (!isWelcomingWarrior) {
      setWarriorEntryPhase('idle');
    }
  };

  const renderLoadingState = (label = 'Loading warriors') => (
    <div className="relative mx-auto flex min-h-[24rem] w-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-red-900 blur-3xl opacity-20 animate-loading-glow"></div>
        <h3 className="relative z-10 text-[6rem] leading-none text-zinc-200 font-serif drop-shadow-[0_0_15px_rgba(139,0,0,0.5)] sm:text-[7.5rem]">
          ᚢ
        </h3>
      </div>

      <div className="mt-8 space-y-3">
        <p className="text-[0.62rem] uppercase tracking-[0.5em] text-zinc-500 sm:text-[0.7rem]">EWC 2025</p>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-zinc-200 sm:text-base">{label}</p>
      </div>
    </div>
  );

  const loadingOverlayClassName = loadingScreenPhase === 'exiting'
    ? 'pointer-events-none opacity-0 translate-y-3 scale-[0.985]'
    : 'opacity-100 translate-y-0 scale-100';

  const loadingContentClassName = showLoadingScreen
    ? 'opacity-0 translate-y-4'
    : 'opacity-100 translate-y-0';

  const renderLanding = () => (
    <div className={`flex flex-col items-center justify-center min-h-screen transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <div className="relative">
        {/* Glowing effect behind the rune */}
        <div className="absolute inset-0 bg-red-900 rounded-full blur-3xl opacity-20 transition-opacity duration-700 animate-pulse"></div>
        
        <h1 className="text-[8.5rem] sm:text-[12rem] md:text-[18rem] leading-none text-zinc-200 font-serif text-center relative z-10 drop-shadow-[0_0_15px_rgba(139,0,0,0.5)] transition-colors duration-500">
          ᚢ
        </h1>
      </div>
      
      <div className="mt-8 text-center z-10 space-y-4">
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold tracking-[0.18em] sm:tracking-[0.2em] text-zinc-100 uppercase">EWC 2025</h2>
        <p className="text-xs sm:text-sm md:text-base text-zinc-500 tracking-[0.28em] sm:tracking-widest italic">Enlighten Warrior Training Camp 2025</p>
      </div>

      <div className="mt-12 sm:mt-14 z-10 w-full max-w-md space-y-4 px-4 sm:px-6">
        <div className="relative overflow-visible">
          <div className={`pointer-events-none absolute inset-x-6 -top-4 h-16 rounded-full bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.4),rgba(127,29,29,0.14)_45%,transparent_78%)] blur-2xl transition-all duration-500 ${warriorEntryPhase === 'recognized' ? 'animate-warrior-entry-bleed opacity-100' : 'opacity-0'}`}></div>
          <div className={`pointer-events-none absolute inset-x-10 -bottom-6 h-20 rounded-full bg-[radial-gradient(circle_at_center,rgba(153,27,27,0.42),rgba(127,29,29,0.08)_52%,transparent_80%)] blur-3xl transition-all duration-500 ${warriorEntryPhase === 'recognized' ? 'animate-warrior-entry-pulse opacity-100' : 'opacity-0'}`}></div>
          <div className={`pointer-events-none absolute inset-x-0 top-1/2 h-24 -translate-y-1/2 bg-[linear-gradient(90deg,transparent_0%,rgba(239,68,68,0.1)_18%,rgba(153,27,27,0.3)_50%,rgba(239,68,68,0.1)_82%,transparent_100%)] blur-2xl transition-all duration-500 ${warriorEntryPhase === 'recognized' ? 'opacity-100' : 'opacity-0'}`}></div>

          <input
            type="text"
            value={warriorEntry}
            onChange={(event) => {
              const nextValue = event.target.value;

              setWarriorEntry(nextValue);

              if (hasWarriorPhrase(nextValue)) {
                startWarriorWelcome();
                return;
              }

              resetWarriorEntryRecognition();
            }}
            autoComplete="off"
            spellCheck="false"
            placeholder="I am a Warrior, I..."
            disabled={warriorEntryPhase === 'recognized'}
            className={`relative z-10 w-full rounded-xl border px-5 py-4 text-center text-sm uppercase tracking-[0.24em] text-zinc-100 outline-none transition-all duration-500 placeholder:text-zinc-600 disabled:cursor-not-allowed disabled:text-zinc-100 ${warriorEntryPhase === 'recognized' ? 'animate-warrior-entry-confirm border-red-500 bg-red-950/45 shadow-[0_0_0_1px_rgba(185,28,28,0.85),0_0_36px_rgba(127,29,29,0.34)]' : hasWarriorPhrase(warriorEntry) ? 'border-red-600 bg-red-950/20 shadow-[0_0_0_1px_rgba(153,27,27,0.65),0_0_28px_rgba(127,29,29,0.2)]' : 'border-zinc-800 bg-zinc-950/90'} focus:border-red-700 focus:bg-zinc-950 focus:shadow-[0_0_0_1px_rgba(127,29,29,0.7)]`}
          />
        </div>
      </div>
    </div>
  );

  const renderTribes = () => (
    <div className="min-h-screen pt-20 pb-16 px-4 sm:px-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center mt-3 mb-12 sm:mb-16">
        <h2 className="text-[1.7rem] sm:text-4xl font-bold tracking-[0.14em] sm:tracking-widest text-zinc-100 uppercase mb-4">Select Your Tribe</h2>
        <div className="w-24 h-1 bg-red-800 mx-auto opacity-50"></div>
        <button
          type="button"
          onClick={() => {
            playDungeonSfx();
            navigateToNation();
          }}
          className="mt-8 inline-flex items-center gap-2 rounded-full border border-red-800/80 bg-red-950/30 px-6 py-3 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-100 transition-all duration-300 hover:-translate-y-1 hover:border-red-600 hover:bg-red-950/55 hover:shadow-[0_16px_32px_rgba(120,18,18,0.22)]"
        >
          <Shield size={14} /> See All Nation
        </button>
      </div>

      <div className="relative min-h-[24rem]">
        {showLoadingScreen && (
          <div className={`absolute inset-x-0 top-0 z-20 transition-all duration-500 ease-out ${loadingOverlayClassName}`}>
            {renderLoadingState()}
          </div>
        )}

        {!isFetchingWarriors && fetchError && (
          <div className={`text-center text-red-500 tracking-wide transition-all duration-500 ease-out ${loadingContentClassName}`}>
            {fetchError}
          </div>
        )}

        {!isFetchingWarriors && !fetchError && (
          <div className={`transition-all duration-500 ease-out ${loadingContentClassName}`}>
            <>
              <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 sm:gap-6 xl:hidden">
            {tribes.map((tribe) => {
              const count = warriorsData.filter(w => w.tribe === tribe).length;
              const { icon: TribeIcon, accentClass } = getTribeVisual(tribe);

              return (
                <div 
                  key={tribe}
                  onClick={() => {
                    playDungeonSfx();
                    navigateToTribe(tribe);
                  }}
                  onKeyDown={(event) => handleActivateOnKeyDown(event, () => {
                    playDungeonSfx();
                    navigateToTribe(tribe);
                  })}
                  role="button"
                  tabIndex={0}
                  className="group relative min-h-[12.5rem] cursor-pointer overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/95 p-4 transition-all duration-500 hover:-translate-y-2 hover:border-red-800 hover:shadow-[0_24px_60px_rgba(80,12,12,0.22)] focus:outline-none focus-visible:border-red-700 focus-visible:ring-2 focus-visible:ring-red-700/70 sm:min-h-[17rem] sm:p-8"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-60"></div>
                  <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-red-950/20 blur-3xl transition-opacity duration-500 group-hover:opacity-100"></div>
                  
                  <div className="relative z-10 flex h-full flex-col items-center justify-center text-center space-y-3 sm:space-y-4">
                    <TribeIcon className={`h-9 w-9 text-zinc-700 transition-colors duration-500 sm:h-12 sm:w-12 ${accentClass}`} />
                    <h3 className="text-base font-bold text-zinc-200 tracking-wide uppercase sm:text-2xl sm:tracking-wider">{tribe}</h3>
                    <p className="text-zinc-500 tracking-[0.3em] text-xs uppercase">{count} Warriors</p>
                    <div className="pt-1 text-[0.55rem] uppercase tracking-[0.28em] text-zinc-600 transition-colors duration-500 group-hover:text-zinc-400 sm:pt-3 sm:text-[0.65rem] sm:tracking-[0.45em]">
                      Enter Tribe
                    </div>
                  </div>
                </div>
              );
            })}
              </div>

              <div className="mx-auto hidden max-w-6xl xl:flex xl:flex-col xl:gap-6">
            {buildTribeRows(tribes).map((row, rowIndex) => (
              <div
                key={`tribe-row-${rowIndex}`}
                className={`flex justify-center gap-6 ${row.length === 2 ? 'px-28' : ''}`}
              >
                {row.map((tribe) => {
                  const count = warriorsData.filter(w => w.tribe === tribe).length;
                  const { icon: TribeIcon, accentClass } = getTribeVisual(tribe);

                  return (
                    <div 
                      key={tribe}
                      onClick={() => {
                        playDungeonSfx();
                        navigateToTribe(tribe);
                      }}
                      onKeyDown={(event) => handleActivateOnKeyDown(event, () => {
                        playDungeonSfx();
                        navigateToTribe(tribe);
                      })}
                      role="button"
                      tabIndex={0}
                      className={`group relative min-h-[18rem] cursor-pointer overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/95 p-8 transition-all duration-500 hover:-translate-y-2 hover:border-red-800 hover:shadow-[0_24px_60px_rgba(80,12,12,0.22)] focus:outline-none focus-visible:border-red-700 focus-visible:ring-2 focus-visible:ring-red-700/70 ${row.length === 2 ? 'w-[22rem]' : 'w-[18rem]'}`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-red-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-60"></div>
                      <div className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-red-950/20 blur-3xl transition-opacity duration-500 group-hover:opacity-100"></div>
                      
                      <div className="relative z-10 flex h-full flex-col items-center justify-center text-center space-y-4">
                        <TribeIcon className={`h-12 w-12 text-zinc-700 transition-colors duration-500 ${accentClass}`} />
                        <h3 className="text-2xl font-bold text-zinc-200 tracking-wider uppercase">{tribe}</h3>
                        <p className="text-zinc-500 tracking-[0.3em] text-xs uppercase">{count} Warriors</p>
                        <div className="pt-3 text-[0.65rem] uppercase tracking-[0.45em] text-zinc-600 transition-colors duration-500 group-hover:text-zinc-400">
                          Enter Tribe
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
              </div>
            </>
          </div>
        )}
      </div>
    </div>
  );

  const renderRoster = () => {
    const tribeWarriors = warriorsData.filter(w => w.tribe === selectedTribe).sort((a, b) => a.sequenceNumber - b.sequenceNumber);

    return (
      <div className="min-h-screen pt-20 px-4 sm:px-6 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 sm:mb-16 border-b border-zinc-800 pb-8">
          <div>
            <button 
              onClick={() => {
                playStoneSfx();
                navigateToTribes();
              }}
              className="text-zinc-500 hover:text-red-500 flex items-center gap-2 tracking-widest text-xs uppercase mb-4 transition-colors"
            >
              <ChevronRight className="rotate-180" size={14} /> Back to Tribes
            </button>
            <h2 className="text-[1.7rem] sm:text-4xl font-bold tracking-[0.14em] sm:tracking-widest text-zinc-100 uppercase">{selectedTribe}</h2>
          </div>
          <div className="mt-4 md:mt-0 text-zinc-600 tracking-[0.22em] sm:tracking-widest uppercase text-[0.68rem] sm:text-sm">
            {tribeWarriors.length} Souls Forged
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pb-24 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
          {tribeWarriors.map((warrior) => (
            <div 
              key={warrior.id}
              onClick={() => {
                navigateToWarrior(warrior);
              }}
              onKeyDown={(event) => handleActivateOnKeyDown(event, () => {
                navigateToWarrior(warrior);
              })}
              role="button"
              tabIndex={0}
              className="group relative cursor-pointer overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition-all duration-500 hover:border-red-800 focus:outline-none focus-visible:border-red-700 focus-visible:ring-2 focus-visible:ring-red-700/70"
            >
              <div className="aspect-[4/5] overflow-hidden relative">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500 z-10"></div>
                <img 
                  src={getWarriorPhotoSrc(warrior)} 
                  alt={warrior.fullName} 
                  onError={() => handleWarriorImageError(warrior.id)}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className={`w-full h-full transition-all duration-700 ${isFallbackPhoto(warrior) ? 'object-contain p-4 bg-black/90 filter-none sm:p-10 group-hover:scale-105' : 'object-cover group-hover:scale-105 md:filter md:grayscale-[35%] md:saturate-75 md:brightness-90 md:group-hover:grayscale-0 md:group-hover:saturate-100 md:group-hover:brightness-100'}`}
                />
                <div className="absolute right-2 top-2 z-20 rounded bg-zinc-950/80 px-2 py-1 text-[0.65rem] font-mono text-zinc-300 backdrop-blur border border-zinc-700 sm:right-4 sm:top-4 sm:px-3 sm:text-xs">
                  #{warrior.sequenceNumber}
                </div>
              </div>
              
              <div className="relative min-h-[5.5rem] border-t border-zinc-800 p-2 overflow-hidden sm:min-h-[9.5rem] sm:p-5">
                <h3 className="line-clamp-2 text-[0.72rem] font-bold text-zinc-100 uppercase tracking-wide sm:text-xl">{warrior.fullName}</h3>
                <p className="mt-1 text-[0.58rem] tracking-[0.16em] text-red-600/80 uppercase sm:text-sm sm:tracking-widest">"{warrior.warriorName}"</p>
                <div className="absolute inset-x-2 bottom-2 rounded-md bg-zinc-900/96 opacity-0 translate-y-3 transition-all duration-400 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 sm:inset-x-5 sm:bottom-5">
                  <p className="text-[0.65rem] italic text-zinc-400 line-clamp-2 sm:text-sm">"{warrior.biggestLearning}"</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderNation = () => {
    return (
      <div className="min-h-screen pt-20 px-4 sm:px-6 pb-24 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="mb-10 border-b border-zinc-800 pb-8">
          <button
            onClick={() => {
              playStoneSfx();
              navigateToTribes();
            }}
            className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500 transition-colors hover:text-red-500"
          >
            <ChevronRight className="rotate-180" size={14} /> Back to Tribes
          </button>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-[1.7rem] sm:text-4xl font-bold tracking-[0.14em] sm:tracking-widest text-zinc-100 uppercase">All Warriors</h2>
              <p className="mt-3 max-w-2xl text-xs sm:text-sm tracking-[0.18em] sm:tracking-[0.2em] text-zinc-500 uppercase">
                Search by full name, warrior name, city, or country
              </p>
            </div>

            <div className="w-full max-w-xl">
              <div className="relative">
                <input
                  type="text"
                  value={nationSearch}
                  onChange={(event) => setNationSearch(event.target.value)}
                  autoComplete="off"
                  spellCheck="false"
                  placeholder="Search name, warrior name, city, country"
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/90 px-4 sm:px-5 py-4 pr-14 text-xs sm:text-sm uppercase tracking-[0.14em] sm:tracking-[0.18em] text-zinc-100 outline-none transition-all duration-300 placeholder:text-zinc-600 focus:border-red-700 focus:bg-zinc-950 focus:shadow-[0_0_0_1px_rgba(127,29,29,0.7)]"
                />
                {nationSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setNationSearch('');
                    }}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/90 text-zinc-400 transition-colors hover:border-red-800 hover:text-white"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2 text-xs uppercase tracking-[0.28em] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
            <span>{displayedNationWarriors.length} Warriors Shown</span>
            <span className={`transition-opacity duration-200 ${isNationSearchPending ? 'opacity-100 text-red-400' : 'opacity-0'}`} aria-live="polite">
              Updating Results...
            </span>
          </div>
        </div>

        <div className="relative min-h-[24rem]">
          {showLoadingScreen && (
            <div className={`absolute inset-x-0 top-0 z-20 transition-all duration-500 ease-out ${loadingOverlayClassName}`}>
              {renderLoadingState('Loading all warriors')}
            </div>
          )}

          {!isFetchingWarriors && fetchError && (
            <div className={`text-center tracking-wide text-red-500 transition-all duration-500 ease-out ${loadingContentClassName}`}>
              {fetchError}
            </div>
          )}

          {!isFetchingWarriors && !fetchError && displayedNationWarriors.length === 0 && nationCardsPhase !== 'exiting' && (
            <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/70 px-6 py-12 text-center transition-all duration-500 ease-out ${loadingContentClassName}`}>
              <p className="text-sm uppercase tracking-[0.26em] text-zinc-400">No warriors match that search.</p>
            </div>
          )}

          {!isFetchingWarriors && !fetchError && displayedNationWarriors.length > 0 && (
            <div className={`grid grid-cols-2 gap-4 transition-all duration-500 ease-out sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 ${loadingContentClassName}`}>
            {displayedNationWarriors.map((warrior, index) => (
              <div
                key={`${nationSearchAnimationKey}-${warrior.id}`}
                onClick={() => {
                  navigateToWarrior(warrior);
                }}
                onKeyDown={(event) => handleActivateOnKeyDown(event, () => {
                  navigateToWarrior(warrior);
                })}
                role="button"
                tabIndex={0}
                className={`group relative cursor-pointer overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition-all duration-500 hover:border-red-800 ${nationCardsPhase === 'exiting' ? 'animate-nation-card-out' : 'animate-nation-card-in'}`}
                style={{ animationDelay: nationCardsPhase === 'exiting' ? '0ms' : `${Math.min(index * NATION_CARD_STAGGER_MS, NATION_CARD_MAX_STAGGER_MS)}ms` }}
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <div className="absolute inset-0 z-10 bg-black/40 transition-colors duration-500 group-hover:bg-transparent"></div>
                  <img
                    src={getWarriorPhotoSrc(warrior)}
                    alt={warrior.fullName}
                    onError={() => handleWarriorImageError(warrior.id)}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className={`h-full w-full transition-all duration-700 ${isFallbackPhoto(warrior) ? 'object-contain bg-black/90 p-4 filter-none sm:p-10 group-hover:scale-105' : 'object-cover group-hover:scale-105 md:filter md:grayscale-[35%] md:saturate-75 md:brightness-90 md:group-hover:grayscale-0 md:group-hover:saturate-100 md:group-hover:brightness-100'}`}
                  />
                  <div className="absolute right-2 top-2 z-20 rounded border border-zinc-700 bg-zinc-950/80 px-2 py-1 text-[0.65rem] font-mono text-zinc-300 backdrop-blur sm:right-4 sm:top-4 sm:px-3 sm:text-xs">
                    #{warrior.sequenceNumber}
                  </div>
                  <div className="absolute left-2 top-2 z-20 rounded border border-red-900/45 bg-red-950/60 px-2 py-1 text-[0.5rem] uppercase tracking-[0.16em] text-zinc-100 backdrop-blur sm:left-4 sm:top-4 sm:text-[0.65rem]">
                    {warrior.tribe}
                  </div>
                </div>

                <div className="relative min-h-[6.8rem] overflow-hidden border-t border-zinc-800 p-3 sm:min-h-[10.5rem] sm:p-5">
                  <h3 className="line-clamp-2 text-[0.72rem] font-bold uppercase tracking-wide text-zinc-100 sm:text-xl">
                    {warrior.fullName}
                  </h3>
                  <p className="mt-1 text-[0.58rem] uppercase tracking-[0.16em] text-red-600/80 sm:text-sm sm:tracking-widest">
                    "{warrior.warriorName}"
                  </p>
                  <p className="mt-3 text-[0.6rem] uppercase tracking-[0.18em] text-zinc-500 sm:text-xs sm:tracking-[0.22em]">
                    {warrior.city}, {warrior.country}
                  </p>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderModal = () => {
    if (!selectedWarrior) return null;

    const supportItems = normalizeDetailList(
      selectedWarrior.supportNeededList,
      selectedWarrior.supportNeeded
    );
    const topGoalItems = normalizeDetailList(
      selectedWarrior.topGoalsList,
      selectedWarrior.topGoals
    );
    const supportDetails = selectedWarrior.supportDetails?.trim();

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
        <div 
          className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md"
          onClick={closeSelectedWarrior}
        ></div>
        
        <div className="modal-scroll relative bg-zinc-900 border border-zinc-800 w-full max-w-4xl max-h-[90vh] overflow-y-scroll rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
          
          <button 
            onClick={closeSelectedWarrior}
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

            {(supportItems.length > 0 || supportDetails) && (
              <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-5">
                <span className="text-zinc-500 flex items-center gap-2 text-xs uppercase tracking-widest">
                  <Shield size={14} /> Support Needed
                </span>

                {supportItems.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {supportItems.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-red-900/45 bg-red-950/30 px-3 py-1 text-[0.65rem] uppercase tracking-[0.16em] text-zinc-200 sm:text-[0.7rem]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {supportDetails && (
                  <p className="text-sm leading-relaxed text-zinc-400">{supportDetails}</p>
                )}
              </div>
            )}

            {topGoalItems.length > 0 && (
              <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-950/70 p-5">
                <span className="text-zinc-500 flex items-center gap-2 text-xs uppercase tracking-widest">
                  <Crown size={14} /> Top Goals
                </span>

                <div className="space-y-3">
                  {topGoalItems.map((goal, index) => (
                    <div
                      key={`${selectedWarrior.id}-goal-${index}`}
                      className="flex items-start gap-3 rounded-lg border border-zinc-800/80 bg-zinc-900/75 px-4 py-3"
                    >
                      <span className="mt-0.5 text-xs font-semibold tracking-[0.2em] text-red-400">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <p className="text-sm leading-relaxed text-zinc-300">{goal}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
      <audio ref={backgroundAudioRef} src="/background.mp3" autoPlay loop preload="auto" className="hidden" />
      <audio ref={stoneAudioRef} src="/stone.wav" preload="auto" className="hidden" />
      <audio ref={dungeonAudioRef} src="/dungeon.wav" preload="auto" className="hidden" />

      {view === 'landing' && (
        <button
          type="button"
          onClick={() => {
            setIsAudioMuted((currentValue) => !currentValue);
          }}
          aria-label={isAudioMuted ? 'Unmute background audio' : 'Mute background audio'}
          className="fixed right-4 top-4 z-[80] flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950/88 text-zinc-200 shadow-[0_16px_36px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all duration-300 hover:border-red-700 hover:text-white sm:right-6 sm:top-6 sm:h-12 sm:w-12"
        >
          {isAudioMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      )}

      {/* Top Navbar Component (appears after landing) */}
      {view !== 'landing' && (
        <nav className="fixed top-0 left-0 right-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center">
          <button
            type="button"
            className="group flex items-center gap-3"
            onClick={() => {
              if (hasUnlockedApp) {
                navigateToTribes();
                return;
              }

              navigateToLanding();
            }}
          >
            <span className="text-2xl font-serif text-red-700 group-hover:text-red-500 transition-colors drop-shadow-[0_0_5px_rgba(139,0,0,0.8)]">ᚢ</span>
            <span className="font-bold tracking-widest uppercase text-sm hidden sm:block">Yearbook</span>
          </button>
          <div className="flex items-center gap-2 sm:gap-4">
            {view !== 'nation' && (
              <button
                type="button"
                onClick={() => {
                  playDungeonSfx();
                  navigateToNation();
                }}
                className="hidden rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-zinc-300 transition-colors hover:border-red-800 hover:text-white md:block"
              >
                See All Nation
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsAudioMuted((currentValue) => !currentValue);
              }}
              aria-label={isAudioMuted ? 'Unmute background audio' : 'Mute background audio'}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/80 text-zinc-300 transition-colors hover:border-red-800 hover:text-white"
            >
              {isAudioMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <div className="text-[0.65rem] sm:text-xs tracking-[0.22em] sm:tracking-widest text-zinc-600 uppercase">
              EWC 2025
            </div>
          </div>
        </nav>
      )}

      <main className={`transition-transform transition-opacity duration-500 will-change-transform ${sceneClassName}`}>
        {view === 'landing' && renderLanding()}
        {view === 'tribes' && renderTribes()}
        {view === 'nation' && renderNation()}
        {view === 'roster' && renderRoster()}
      </main>

      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        className={`fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-red-700/80 bg-zinc-900/95 text-zinc-50 shadow-[0_18px_40px_rgba(120,18,18,0.35)] ring-1 ring-red-500/20 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-red-500 hover:bg-red-950/90 hover:text-white hover:shadow-[0_22px_44px_rgba(140,24,24,0.45)] sm:right-6 ${showScrollTop ? 'pointer-events-auto opacity-100 translate-y-0' : 'pointer-events-none opacity-0 translate-y-4'}`}
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
      >
        <ChevronRight size={20} className="-rotate-90" />
      </button>

      {isWelcomingWarrior && (
        <div className={`fixed inset-0 z-[70] flex items-center justify-center overflow-hidden bg-zinc-950 backdrop-blur-md ${welcomePhase === 'revealing' ? 'animate-welcome-reveal' : 'animate-welcome-screen'}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(92,16,16,0.18),rgba(10,10,10,0.98)_42%,rgba(0,0,0,1)_100%)]"></div>
          <div className={`relative flex flex-col items-center justify-center gap-4 px-8 text-center ${welcomePhase === 'revealing' ? 'animate-welcome-content-out' : 'animate-welcome-content'}`}>
            <span className="text-[5.5rem] leading-none text-stone-100/80 drop-shadow-[0_0_10px_rgba(254,242,242,0.16)]">ᚢ</span>
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-red-200/35 to-transparent"></div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.7em] text-stone-200/50">Welcome</p>
            <h3 className="text-2xl font-bold uppercase tracking-[0.24em] text-zinc-100 sm:text-3xl">Welcome Enlighten Warrior</h3>
          </div>
        </div>
      )}

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
          scrollbar-gutter: stable;
          scrollbar-color: rgba(120, 24, 24, 0.7) rgba(24, 24, 27, 0.95);
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
        @keyframes welcome-screen {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes welcome-content {
          0% { transform: translateY(16px) scale(0.985); opacity: 0; }
          35% { transform: translateY(0) scale(1.01); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes welcome-reveal {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(100%); opacity: 1; }
        }
        @keyframes welcome-content-out {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(56px) scale(0.985); opacity: 0; }
        }
        @keyframes warrior-entry-confirm {
          0% { transform: scale(1); box-shadow: 0 0 0 1px rgba(185, 28, 28, 0.45), 0 0 0 rgba(127, 29, 29, 0); }
          35% { transform: scale(1.015); box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.7), 0 0 24px rgba(127, 29, 29, 0.3); }
          100% { transform: scale(1); box-shadow: 0 0 0 1px rgba(185, 28, 28, 0.75), 0 0 30px rgba(127, 29, 29, 0.28); }
        }
        @keyframes warrior-entry-bleed {
          0% { opacity: 0; transform: translateY(8px) scaleX(0.82) scaleY(0.88); }
          35% { opacity: 1; transform: translateY(0) scaleX(1.08) scaleY(1.04); }
          100% { opacity: 0.78; transform: translateY(4px) scaleX(1.14) scaleY(1.1); }
        }
        @keyframes warrior-entry-pulse {
          0% { opacity: 0; transform: scale(0.92); }
          45% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 0.72; transform: scale(1.12); }
        }
        @keyframes nation-card-in {
          0% { opacity: 0; transform: translateY(20px) scale(0.985); filter: blur(8px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        @keyframes nation-card-out {
          0% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
          100% { opacity: 0; transform: translateY(-14px) scale(0.985); filter: blur(6px); }
        }
        @keyframes loading-glow {
          0%, 100% { opacity: 0.14; transform: scale(0.92); }
          50% { opacity: 0.28; transform: scale(1.05); }
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
        .animate-welcome-screen {
          animation: welcome-screen 360ms ease-out forwards;
        }
        .animate-welcome-content {
          animation: welcome-content 680ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .animate-welcome-reveal {
          animation: welcome-reveal ${WELCOME_REVEAL_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .animate-welcome-content-out {
          animation: welcome-content-out ${WELCOME_REVEAL_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .animate-warrior-entry-confirm {
          animation: warrior-entry-confirm ${WARRIOR_ENTRY_RECOGNITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .animate-warrior-entry-bleed {
          animation: warrior-entry-bleed ${WARRIOR_ENTRY_RECOGNITION_MS}ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .animate-warrior-entry-pulse {
          animation: warrior-entry-pulse ${WARRIOR_ENTRY_RECOGNITION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .animate-nation-card-in {
          animation: nation-card-in ${NATION_CARD_ENTER_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both;
          will-change: transform, opacity, filter;
        }
        .animate-nation-card-out {
          animation: nation-card-out ${NATION_CARD_EXIT_MS}ms cubic-bezier(0.4, 0, 1, 1) both;
          will-change: transform, opacity, filter;
        }
        .animate-loading-glow {
          animation: loading-glow 3.2s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}