// app/page.js

"use client";
import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';

const Home = () => {
  return (
    <div>
      <Head>
        <title>Teachable Machine Prediction</title>
        <meta name="description" content="Teachable Machine model prediction with webcam" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="mx-auto max-w-6xl p-4">
        <div className="mb-4 flex flex-col gap-2">
          <h1 className="text-xl">DENGSHI GEOQUEST</h1>
          <p className="text-xs text-gray-700">Guess the hotspot in Dhaka. Press MAKE GUESS when ready.</p>
        </div>

        <GeoGuessr />
      </main>

      <footer className="py-6 text-center text-xs text-gray-500">&copy; 2025 Dengshi</footer>
    </div>
  );
};

export default Home;

// --- GeoGuessr-style component ---
function GeoGuessr() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const guessMarkerRef = useRef(null);
  const actualMarkerRef = useRef(null);
  const lineRef = useRef(null);

  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [roundScore, setRoundScore] = useState(0);
  const [guessLatLng, setGuessLatLng] = useState(null);
  const [actualLatLng, setActualLatLng] = useState(null);
  const [status, setStatus] = useState('Click on the map to place your guess.');
  const [lives, setLives] = useState(5);
  const [badges, setBadges] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [nameCommitted, setNameCommitted] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [hasGuessed, setHasGuessed] = useState(false);
  const audioCtxRef = useRef(null);

  const maxRounds = 5;

  // Dhaka city approximate bounds
  const DHAKA_BOUNDS = {
    south: 23.65,
    north: 23.90,
    west: 90.30,
    east: 90.55,
  };

  const randomDhakaLatLng = () => {
    const lat = DHAKA_BOUNDS.south + Math.random() * (DHAKA_BOUNDS.north - DHAKA_BOUNDS.south);
    const lng = DHAKA_BOUNDS.west + Math.random() * (DHAKA_BOUNDS.east - DHAKA_BOUNDS.west);
    return { lat, lng };
  };

  const initRound = () => {
    const target = randomDhakaLatLng();
    setActualLatLng(target);
    setGuessLatLng(null);
    setRoundScore(0);
    setStatus('Click on the map to place your guess.');
    setHasGuessed(false);

    // Clear markers/lines if exist
    if (guessMarkerRef.current) {
      guessMarkerRef.current.remove();
      guessMarkerRef.current = null;
    }
    if (actualMarkerRef.current) {
      actualMarkerRef.current.remove();
      actualMarkerRef.current = null;
    }
    if (lineRef.current) {
      lineRef.current.remove();
      lineRef.current = null;
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([23.8103, 90.4125], 12);
    }
  };

  // Load Leaflet dynamically if needed and initialize the map
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ensureLeaflet = () => new Promise((resolve) => {
      if (window.L) return resolve();
      const head = document.head;
      const existingCss = document.querySelector('link[data-leaflet]');
      const existingJs = document.querySelector('script[data-leaflet]');
      if (!existingCss) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.setAttribute('data-leaflet', 'true');
        head.appendChild(link);
      }
      if (window.L) return resolve();
      if (!existingJs) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.defer = true;
        script.setAttribute('data-leaflet', 'true');
        script.onload = () => resolve();
        head.appendChild(script);
      } else {
        existingJs.addEventListener('load', () => resolve());
      }
    });

    const initMap = () => {
      if (mapInstanceRef.current || !mapRef.current) return;
      const L = window.L;
      mapInstanceRef.current = L.map(mapRef.current, {
        maxBounds: [
          [23.60, 90.20],
          [24.00, 90.70],
        ],
        maxBoundsViscosity: 1.0,
      }).setView([23.8103, 90.4125], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapInstanceRef.current);

      mapInstanceRef.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        setGuessLatLng({ lat, lng });
        if (guessMarkerRef.current) {
          guessMarkerRef.current.setLatLng([lat, lng]);
        } else {
          guessMarkerRef.current = L.marker([lat, lng], { title: 'Your Guess' }).addTo(mapInstanceRef.current);
        }
      });
    };

    ensureLeaflet().then(() => {
      initMap();
      initRound();
      const stored = localStorage.getItem('dengshi_leaderboard');
      if (stored) {
        try { setLeaderboard(JSON.parse(stored)); } catch {}
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toRad = (value) => (value * Math.PI) / 180;
  const haversineKm = (a, b) => {
    const R = 6371; // km
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinDLat = Math.sin(dLat / 2);
    const sinDLon = Math.sin(dLon / 2);
    const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
    return R * c;
  };

  const scoreForDistance = (km) => {
    // Exponential decay: close guesses get near 5000, far guesses approach 0
    const score = 5000 * Math.exp(-km / 200);
    return Math.max(0, Math.round(score));
  };

  const handleMakeGuess = () => {
    if (hasGuessed) {
      setStatus('You already guessed. Go to NEXT ROUND.');
      return;
    }
    if (!guessLatLng || !actualLatLng || !mapInstanceRef.current) {
      setStatus('Place a guess on the map first.');
      return;
    }
    const L = window.L;
    const km = haversineKm(guessLatLng, actualLatLng);
    const scored = scoreForDistance(km);
    setRoundScore(scored);
    setTotalScore((s) => s + scored);
    setStatus(`Distance: ${km.toFixed(1)} km • Round score: ${scored}`);
    setHasGuessed(true);

    // SFX: success or fail blip
    playBeep(scored >= 3500 ? 880 : 220, 0.12);

    // Rewards: extra life for strong round, badges for feats
    if (scored >= 3500) {
      setLives((lv) => Math.min(5, lv + 1));
    } else {
      setLives((lv) => Math.max(0, lv - 1));
    }
    if (km < 1) {
      setBadges((b) => (b.includes('Sharpshooter') ? b : [...b, 'Sharpshooter']));
    }

    // Show actual location and a line between points
    if (actualMarkerRef.current) {
      actualMarkerRef.current.setLatLng([actualLatLng.lat, actualLatLng.lng]);
    } else {
      actualMarkerRef.current = L.marker([actualLatLng.lat, actualLatLng.lng], { title: 'Actual' }).addTo(
        mapInstanceRef.current
      );
    }

    if (lineRef.current) {
      lineRef.current.setLatLngs([
        [guessLatLng.lat, guessLatLng.lng],
        [actualLatLng.lat, actualLatLng.lng],
      ]);
    } else {
      lineRef.current = L.polyline(
        [
          [guessLatLng.lat, guessLatLng.lng],
          [actualLatLng.lat, actualLatLng.lng],
        ],
        { color: 'red' }
      ).addTo(mapInstanceRef.current);
    }
  };

  const handleNextRound = () => {
    if (round >= maxRounds) {
      const final = totalScore; // already accumulated when guessing
      const newBadges = [...badges];
      if (final >= 20000 && !newBadges.includes('Gold')) newBadges.push('Gold');
      else if (final >= 10000 && !newBadges.includes('Silver')) newBadges.push('Silver');
      else if (final >= 5000 && !newBadges.includes('Bronze')) newBadges.push('Bronze');
      setBadges(newBadges);
      setStatus(`Game over. Total score: ${final}`);
      if (nameCommitted && playerName) {
        const entry = { name: playerName, score: final, date: new Date().toISOString() };
        const updated = [...leaderboard, entry]
          .sort((a, b) => b.score - a.score)
          .slice(0, 10);
        setLeaderboard(updated);
        try { localStorage.setItem('dengshi_leaderboard', JSON.stringify(updated)); } catch {}
      }
      playBeep(660, 0.15);
      playBeep(990, 0.15, 0.12);
      return;
    }
    setRound((r) => r + 1);
    initRound();
  };

  const handleReset = () => {
    setRound(1);
    setTotalScore(0);
    initRound();
    playBeep(440, 0.1);
  };

  // --- simple WebAudio beeps ---
  const playBeep = (freq, duration, delay = 0) => {
    if (typeof window === 'undefined') return;
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      try { audioCtxRef.current = new AudioContext(); } catch { return; }
    }
    const ctx = audioCtxRef.current;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + duration + 0.02);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-3 flex items-center justify-between gap-4 pixel-panel p-3">
        <div className="text-xs">
          ROUND {round}/{maxRounds}  |  SCORE {totalScore}
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-32 border-2 border-black bg-white">
            <div
              className="h-full bg-red-500"
              style={{ width: `${(lives / 5) * 100}%` }}
            />
          </div>
          <span className="text-[10px]">LIVES {lives}/5</span>
        </div>
        <div>
          {!nameCommitted ? (
            <div className="inline-flex items-center gap-2">
              <input
                type="text"
                placeholder="NAME"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="border-2 border-black bg-white px-2 py-1 text-xs"
              />
              <button
                onClick={() => setNameCommitted(!!playerName)}
                disabled={!playerName}
                className="pixel-btn text-xs disabled:opacity-50"
              >SAVE</button>
            </div>
          ) : (
            <span className="text-xs">PLAYER {playerName}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2 pixel-panel p-2">
          <div ref={mapRef} className="h-[500px] w-full border-2 border-black" />
          <div className="mt-3 flex gap-2">
            <button onClick={handleMakeGuess} className="pixel-btn">MAKE GUESS</button>
            <button onClick={handleNextRound} className="pixel-btn">NEXT ROUND</button>
            <button onClick={handleReset} className="pixel-btn">RESET</button>
          </div>
          <div className="mt-2 text-xs">{status}</div>
        </div>
        <div className="pixel-panel p-3">
          <div className="mb-4">
            <div className="text-xs">BADGES</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {badges.length === 0 ? (
                <span className="text-xs text-gray-700">NONE YET</span>
              ) : (
                badges.map((b) => (
                  <span key={b} className="pixel-badge text-xs">{b}</span>
                ))
              )}
            </div>
          </div>
          <div>
            <div className="text-xs">LEADERBOARD (TOP 10)</div>
            <ol className="mt-2 list-decimal pl-5 text-xs">
              {leaderboard.length === 0 ? (
                <li className="text-gray-700">NO ENTRIES</li>
              ) : (
                leaderboard.map((e, i) => (
                  <li key={`${e.name}-${e.date}-${i}`}>{e.name} — {e.score}</li>
                ))
              )}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
