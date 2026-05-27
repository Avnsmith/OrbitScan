'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTelemetryStore } from '@/store/telemetryStore';
import { useTelemetryWebSocket } from '@/hooks/useTelemetryWebSocket';
import { 
  Search, 
  Satellite, 
  Cpu, 
  ShieldCheck, 
  Activity, 
  Wifi, 
  AlertTriangle, 
  TrendingUp, 
  Info, 
  X, 
  Database,
  ArrowRight,
  RefreshCw,
  Clock,
  Compass
} from 'lucide-react';

export default function MissionControlDashboard() {
  // Initialize WebSocket connection & load REST snapshots
  useTelemetryWebSocket();

  const {
    artifacts,
    relays,
    logs,
    metrics,
    isConnected,
    searchQuery,
    setSearchQuery,
    selectedArtifact,
    selectedArtifactLoading,
    setSelectedArtifact,
    loadArtifactDetails
  } = useTelemetryStore();

  const [activeTab, setActiveTab] = useState<'all' | 'verified' | 'pending'>('all');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const latencyRef = useRef(metrics.averageResponseLatency);

  // Phase 3: Hydration state mount checking
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update latency ref to allow continuous canvas loop without tearing down RAF (Phase 4)
  useEffect(() => {
    latencyRef.current = metrics.averageResponseLatency;
  }, [metrics.averageResponseLatency]);

  // Auto scroll logs console to bottom on new items
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  // Phase 4: Stable 60fps Waveform Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || 400;
      canvas.height = 140;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid background
      ctx.strokeStyle = 'rgba(28, 35, 48, 0.4)';
      ctx.lineWidth = 0.5;
      const gridSize = 20;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Read average latency from mutable ref to avoid dependency restarts
      const avgLat = latencyRef.current;
      const amplitude1 = 15 + (avgLat % 10);
      const amplitude2 = 8 + (avgLat % 5);
      
      // Wave 1 - Stable Continuous Waveform
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.85)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + 
          Math.sin(x * 0.015 + phase) * amplitude1 + 
          Math.sin(x * 0.035 - phase * 1.5) * amplitude2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Wave 2 - Secondary Telemetry Harmonic
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(82, 123, 160, 0.4)';
      ctx.lineWidth = 1.0;
      for (let x = 0; x < canvas.width; x++) {
        const y = canvas.height / 2 + 
          Math.cos(x * 0.02 + phase * 0.8) * (amplitude1 * 0.6) + 
          Math.sin(x * 0.045 + phase * 1.2) * (amplitude2 * 0.5);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Horizontal scanner center bar
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      phase += 0.03;
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []); // Run strictly once, continuous RAF loop

  // Filtering artifacts
  const filteredArtifacts = artifacts.filter((a) => {
    if (activeTab === 'verified' && a.verificationStatus !== 'VERIFIED') return false;
    if (activeTab === 'pending' && a.verificationStatus !== 'PENDING') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.id.toLowerCase().includes(q) ||
        a.entropyHash.toLowerCase().includes(q) ||
        a.relayId.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col telemetry-grid min-h-screen bg-graphite-950 text-slate-100 pb-8 font-sans">
      
      {/* Top Status & Brand Strip */}
      <header className="border-b border-graphite-800 bg-graphite-900/90 backdrop-blur px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="bg-graphite-800 border border-graphite-700 p-2 rounded flex items-center justify-center text-orbital-cyan">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-bold uppercase tracking-[0.2em] font-mono text-slate-100 flex items-center gap-2">
              OrbitScan <span className="text-orbital-cyan text-[10px] border border-orbital-cyan/30 px-1 rounded bg-orbital-cyan/10">v1.2</span>
            </h1>
            <p className="text-[10px] text-steel-blue font-mono tracking-wider">SPACECOMPUTER ORBITAL SYSTEM INTEGRITY ENVIRONMENT</p>
          </div>
        </div>

        {/* Live Search */}
        <div className="hidden md:flex items-center relative w-1/3">
          <Search className="w-4 h-4 text-graphite-400 absolute left-3" />
          <input
            type="text"
            placeholder="SEARCH ATTESTATION PAYLOADS, ID, RELAY..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-graphite-950 border border-graphite-800 rounded px-9 py-1.5 text-xs text-slate-100 font-mono placeholder-graphite-600 focus:outline-none focus:border-orbital-cyan/50 transition-all uppercase"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 text-graphite-400 hover:text-slate-100">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Connection status dot */}
        <div className="flex items-center space-x-4">
          <div className="hidden lg:flex flex-col text-right font-mono text-[9px] text-graphite-400">
            <span>FEED INGESTION RATE: {(metrics.totalRequests > 0) ? '1.2 Hz' : '0.0 Hz'}</span>
            <span>SIGNAL DEGRADATION: 0.002%</span>
          </div>
          <div className="flex items-center space-x-2 border border-graphite-850 px-3 py-1 rounded bg-graphite-950/60">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-telemetry-green shadow-[0_0_8px_rgba(0,229,117,0.7)]' : 'bg-telemetry-red animate-ping'}`} />
            <span className="text-[10px] font-mono font-semibold tracking-wider text-slate-300">
              {isConnected ? 'ONLINE: TELEMETRY STREAMING' : 'OFFLINE: RECONNECTING'}
            </span>
          </div>
        </div>
      </header>

      {/* Phase 2: Simulator Disclosure Notice */}
      {showBanner && (
        <div className="bg-graphite-900/90 border-b border-orbital-cyan/20 px-6 py-2.5 flex items-center justify-between text-[11px] font-mono text-orbital-cyan/95 z-30">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-orbital-cyan animate-pulse inline-block" />
            <span>⚠️ SYSTEM WARNING: OrbitScan operates in telemetry simulation mode. Real-time downlink ingestion processes are simulated via BullMQ queues and PostgreSQL/Redis pipelines.</span>
          </div>
          <button 
            onClick={() => setShowBanner(false)} 
            className="hover:text-slate-100 hover:bg-orbital-cyan/20 transition-all cursor-pointer text-[10px] border border-orbital-cyan/30 px-2 py-0.5 rounded bg-orbital-cyan/5 font-bold"
          >
            DISMISS
          </button>
        </div>
      )}

      <main className="flex-1 px-6 max-w-[1700px] w-full mx-auto mt-6 grid grid-cols-12 gap-6">
        
        {/* Core Metrics Widgets Section */}
        <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Total Entropy */}
          <div className="bg-graphite-900/60 border border-graphite-800/80 p-4 rounded flex flex-col relative overflow-hidden glass-panel">
            <div className="absolute top-0 right-0 p-2 opacity-5">
              <Database className="w-16 h-16 text-orbital-cyan" />
            </div>
            <span className="text-[10px] text-steel-blue font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-orbital-cyan" /> Total Entropy Ingested
            </span>
            <span className="text-xl font-bold font-mono text-orbital-cyan mt-2 glow-cyan">
              {metrics.totalEntropyGenerated.toLocaleString()} <span className="text-xs text-steel-blue font-normal">BITS</span>
            </span>
            <span className="text-[9px] text-graphite-400 font-mono mt-1">Verified digital signature attestation</span>
          </div>

          {/* Active Relays */}
          <div className="bg-graphite-900/60 border border-graphite-800/80 p-4 rounded flex flex-col relative overflow-hidden glass-panel">
            <div className="absolute top-0 right-0 p-2 opacity-5">
              <Satellite className="w-16 h-16 text-orbital-cyan" />
            </div>
            <span className="text-[10px] text-steel-blue font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Satellite className="w-3.5 h-3.5 text-orbital-cyan" /> Active Telemetry Relays
            </span>
            <span className="text-xl font-bold font-mono text-slate-100 mt-2">
              {metrics.activeEntropyRelays} <span className="text-xs text-graphite-400 font-normal">/ {relays.length}</span>
            </span>
            <span className="text-[9px] text-telemetry-green font-mono mt-1 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-telemetry-green inline-block" /> SNR Link Margin Stable
            </span>
          </div>

          {/* Average Latency */}
          <div className="bg-graphite-900/60 border border-graphite-800/80 p-4 rounded flex flex-col relative overflow-hidden glass-panel">
            <div className="absolute top-0 right-0 p-2 opacity-5">
              <Activity className="w-16 h-16 text-orbital-cyan" />
            </div>
            <span className="text-[10px] text-steel-blue font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-orbital-cyan" /> Average Downlink Latency
            </span>
            <span className="text-xl font-bold font-mono text-slate-100 mt-2">
              {metrics.averageResponseLatency} <span className="text-xs text-graphite-400 font-normal">MS</span>
            </span>
            <span className="text-[9px] text-graphite-400 font-mono mt-1">Cross-orbital downlink</span>
          </div>

          {/* Verified Rate */}
          <div className="bg-graphite-900/60 border border-graphite-800/80 p-4 rounded flex flex-col relative overflow-hidden glass-panel">
            <div className="absolute top-0 right-0 p-2 opacity-5">
              <ShieldCheck className="w-16 h-16 text-orbital-cyan" />
            </div>
            <span className="text-[10px] text-steel-blue font-mono uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-orbital-cyan" /> Signature Verification Rate
            </span>
            <span className="text-xl font-bold font-mono text-telemetry-green mt-2">
              {metrics.verifiedEntropyRate}%
            </span>
            <span className="text-[9px] text-slate-400 font-mono mt-1 flex items-center gap-1">
              Verified: {metrics.totalVerified} <span className="text-graphite-500">/ {metrics.totalRequests} reqs</span>
            </span>
          </div>

          {/* Ingestion Status Ticker */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 bg-graphite-900/60 border border-graphite-800/80 p-4 rounded flex flex-col justify-center glass-panel">
            <span className="text-[9px] text-steel-blue font-mono uppercase tracking-widest">INGESTION PIPELINES</span>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2.5 h-2.5 rounded-full bg-telemetry-green animate-pulse" />
              <span className="text-xs font-mono font-bold text-slate-200 uppercase">BullMQ WORKER ACTIVE</span>
            </div>
            <p className="text-[9px] text-graphite-400 font-mono mt-1">Redis & Telemetry Queues Stable</p>
          </div>
        </div>

        {/* Visual Panels: Radar Downlink map + Waveform */}
        <div className="col-span-12 lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* SVG Orbital Comm Map */}
          <div className="bg-graphite-900/60 border border-graphite-800/80 rounded p-4 flex flex-col glass-panel telemetry-radar-sweep h-[240px]">
            <div className="flex justify-between items-center border-b border-graphite-800 pb-2 mb-3">
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
                <Satellite className="w-3.5 h-3.5 text-orbital-cyan" /> ORBITAL RELAY SECTOR MAP
              </span>
              <span className="text-[9px] font-mono text-steel-blue">DOWNLINK: ACTIVE</span>
            </div>
            <div className="flex-1 flex items-center justify-center relative overflow-hidden">
              {/* Polar Grid Visual */}
              <div className="absolute w-[160px] h-[160px] border border-graphite-800/60 rounded-full" />
              <div className="absolute w-[100px] h-[100px] border border-graphite-800/60 rounded-full" />
              <div className="absolute w-[40px] h-[40px] border border-graphite-800/60 rounded-full" />
              
              {/* Radar sweep lines */}
              <div className="absolute w-full h-[1px] bg-graphite-800/20" />
              <div className="absolute w-[1px] h-full bg-graphite-800/20" />

              {/* Space Station Center */}
              <div className="w-2.5 h-2.5 bg-orbital-cyan rounded-full z-10 shadow-[0_0_8px_#00f0ff]" />
              <span className="absolute text-[8px] font-mono text-orbital-cyan mt-6">BASE-1</span>

              {/* Dynamic Orbital Satellites */}
              {relays.map((relay, index) => {
                const angles = { 'RLY-A1': 0.5, 'RLY-B2': 1.8, 'RLY-H3': 3.6, 'RLY-N4': 4.9, 'RLY-Z5': 5.8 };
                const rad = { 'RLY-A1': 70, 'RLY-B2': 55, 'RLY-H3': 75, 'RLY-N4': 60, 'RLY-Z5': 78 };
                const angle = angles[relay.id as keyof typeof angles] || (index * 1.2);
                const radius = rad[relay.id as keyof typeof rad] || 60;

                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                return (
                  <div
                    key={relay.id}
                    className="absolute z-10 flex flex-col items-center group cursor-pointer"
                    style={{ transform: `translate(${x}px, ${y}px)` }}
                  >
                    <span className={`w-2 h-2 rounded-full ${
                      relay.status === 'ACTIVE' ? 'bg-telemetry-green shadow-[0_0_6px_#00e575]' : 
                      relay.status === 'DEGRADED' ? 'bg-telemetry-amber shadow-[0_0_6px_#ffb900]' : 'bg-telemetry-red'
                    }`} />
                    
                    {/* Beam connecting to base */}
                    {relay.status !== 'OFFLINE' && (
                      <svg className="absolute top-1 left-1 overflow-visible pointer-events-none opacity-30" style={{ transform: 'translate(-50%, -50%)' }}>
                        <line 
                          x1={0} 
                          y1={0} 
                          x2={-x} 
                          y2={-y} 
                          stroke={relay.status === 'DEGRADED' ? '#ffb900' : '#00f0ff'} 
                          strokeWidth="0.5" 
                          strokeDasharray="2 3"
                        />
                      </svg>
                    )}

                    <span className="text-[8px] font-mono font-bold mt-1 text-slate-300 hidden md:block bg-graphite-950/80 px-1 border border-graphite-850 rounded">
                      {relay.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Entropy Waveform Panel */}
          <div className="bg-graphite-900/60 border border-graphite-800/80 rounded p-4 flex flex-col glass-panel h-[240px]">
            <div className="flex justify-between items-center border-b border-graphite-800 pb-2 mb-3">
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-orbital-cyan animate-pulse" /> LIVE TELEMETRY WAVEFORM
              </span>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-orbital-cyan rounded-full animate-ping" />
                <span className="text-[9px] font-mono text-steel-blue">VERIFIED LINK SPECTRAL STREAM</span>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <canvas ref={canvasRef} className="w-full bg-graphite-950 border border-graphite-850 rounded" />
              <div className="flex justify-between items-center mt-3 text-[9px] font-mono text-graphite-400">
                <span>STABILITY INDEX: 99.88%</span>
                <span>SAMPLE: 1024/s</span>
                <span>HARMONIC GAIN: 1.05x</span>
              </div>
            </div>
          </div>

        </div>

        {/* Real-time Telemetry Terminal Logs Console */}
        <div className="col-span-12 lg:col-span-5">
          <div className="bg-graphite-900/60 border border-graphite-800/80 rounded p-4 flex flex-col glass-panel h-[240px] font-mono">
            <div className="flex justify-between items-center border-b border-graphite-800 pb-2 mb-2">
              <span className="text-[10px] font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-orbital-cyan animate-pulse" /> REAL-TIME EVENT STREAM
              </span>
              <span className="text-[9px] text-steel-blue">BUFFER: {logs.length} / 100 Logs</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-2 text-[10px] leading-relaxed scrollbar-thin">
              {logs.map((log) => {
                let categoryColor = 'text-orbital-cyan';
                let tag = '[SYSTEM]';

                if (log.category === 'entropy') {
                  if (log.message.includes('VERIFIED')) {
                    categoryColor = 'text-telemetry-green';
                    tag = '[INTEGRITY]';
                  } else {
                    categoryColor = 'text-orbital-cyan';
                    tag = '[ATTESTATION]';
                  }
                } else if (log.category === 'relay') {
                  categoryColor = 'text-telemetry-amber';
                  tag = '[RELAY]';
                }

                // Phase 3: Hydration safe check for date strings
                const timestamp = isMounted 
                  ? new Date(log.timestamp).toLocaleTimeString()
                  : '...';

                return (
                  <div key={log.id} className="border-b border-graphite-900/30 pb-0.5 last:border-b-0 hover:bg-graphite-850/30 px-1 rounded transition-colors">
                    <span className="text-graphite-600">[{timestamp}] </span>
                    <span className={`${categoryColor} font-bold mr-1.5`}>{tag}</span>
                    <span className="text-slate-300">{log.message}</span>
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        {/* Dynamic Explorer Table Section */}
        <div className="col-span-12 grid grid-cols-12 gap-6">
          
          {/* Main Table Grid */}
          <div className="col-span-12 xl:col-span-8 bg-graphite-900/60 border border-graphite-800/80 rounded p-5 glass-panel">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-graphite-800 pb-4 mb-4">
              <div>
                <h2 className="text-sm font-bold font-mono tracking-wider text-slate-200">INDEXED TELEMETRY ATTESTATIONS</h2>
                <p className="text-[10px] text-steel-blue mt-1 font-mono uppercase">LATEST RECORDED TELEMETRY ATTESTATIONS FROM PAYLOAD FEED</p>
              </div>

              {/* Tabs */}
              <div className="flex bg-graphite-950 border border-graphite-850 p-0.5 rounded font-mono text-[9px]">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded uppercase font-bold transition-all ${activeTab === 'all' ? 'bg-graphite-800 text-orbital-cyan' : 'text-graphite-400 hover:text-slate-200'}`}
                >
                  ALL PAYLOADS
                </button>
                <button
                  onClick={() => setActiveTab('verified')}
                  className={`px-3 py-1.5 rounded uppercase font-bold transition-all ${activeTab === 'verified' ? 'bg-graphite-800 text-telemetry-green' : 'text-graphite-400 hover:text-slate-200'}`}
                >
                  VERIFIED
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1.5 rounded uppercase font-bold transition-all ${activeTab === 'pending' ? 'bg-graphite-800 text-telemetry-amber' : 'text-graphite-400 hover:text-slate-200'}`}
                >
                  PENDING
                </button>
              </div>
            </div>

            {/* High Density Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] font-mono text-left">
                <thead>
                  <tr className="border-b border-graphite-800 text-steel-blue text-[10px] tracking-wider uppercase">
                    <th className="py-2.5 px-3">Payload ID</th>
                    <th className="py-2.5 px-3">Entropy Hash</th>
                    <th className="py-2.5 px-3">Size (Bits)</th>
                    <th className="py-2.5 px-3">Relay ID</th>
                    <th className="py-2.5 px-3">Provenance Source</th>
                    <th className="py-2.5 px-3">Attestation State</th>
                    <th className="py-2.5 px-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite-850/40">
                  {filteredArtifacts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-graphite-400 text-xs italic">
                        NO TELEMETRY ATTESTATIONS INGESTED MATCHING QUERY
                      </td>
                    </tr>
                  ) : (
                    filteredArtifacts.map((art) => {
                      const isSelected = selectedArtifact?.id === art.id;
                      return (
                        <tr
                          key={art.id}
                          onClick={() => loadArtifactDetails(art.id)}
                          className={`hover:bg-graphite-850/50 cursor-pointer transition-all ${isSelected ? 'bg-graphite-850 border-l-2 border-l-orbital-cyan' : ''}`}
                        >
                          <td className="py-3 px-3 font-bold text-slate-200 hover:text-orbital-cyan transition-colors">
                            {art.id}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-400 font-mono">
                                {art.entropyHash.slice(0, 10)}...{art.entropyHash.slice(-8)}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-orbital-cyan font-semibold">
                            {art.entropyBits}
                          </td>
                          <td className="py-3 px-3 text-slate-300 font-mono">
                            {art.relayId}
                          </td>
                          <td className="py-3 px-3 text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 uppercase">{art.source.replace(/_/g, ' ')}</span>
                              {art.source === 'LIVE_DRAND_BEACON' ? (
                                <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" title="Verifiable Live Beacon Source"></span>
                              ) : (
                                <span className="inline-block w-1.5 h-1.5 bg-amber-500/80 rounded-full" title="Telemetry Simulator Source"></span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                              art.verificationStatus === 'VERIFIED' ? 'bg-telemetry-green/10 text-telemetry-green border border-telemetry-green/30' :
                              'bg-telemetry-amber/10 text-telemetry-amber border border-telemetry-amber/30 animate-pulse'
                            }`}>
                              {art.verificationStatus}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-graphite-400 text-[10px]">
                            {isMounted ? new Date(art.createdAt).toLocaleTimeString() : '...'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dynamic Side Detail Panel */}
          <div className="col-span-12 xl:col-span-4 bg-graphite-900/60 border border-graphite-800/80 rounded p-5 glass-panel flex flex-col min-h-[300px]">
            {selectedArtifact ? (
              <div className="flex flex-col h-full font-mono">
                {/* Detail Header */}
                <div className="flex justify-between items-start border-b border-graphite-800 pb-3 mb-4">
                  <div>
                    <span className="text-[8px] bg-orbital-cyan/10 text-orbital-cyan border border-orbital-cyan/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                      TELEMETRY ATTESTATION DETAILS
                    </span>
                    <h3 className="text-sm font-bold text-slate-200 mt-2 flex items-center gap-1.5">
                      Payload ID: {selectedArtifact.id}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setSelectedArtifact(null)}
                    className="text-graphite-400 hover:text-slate-100 p-1 bg-graphite-950/60 rounded border border-graphite-850 hover:border-graphite-700 transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Detail Metrics Fields */}
                <div className="space-y-4 flex-1 text-[11px] leading-relaxed">
                  
                  {/* Verification box */}
                  <div className={`p-3 rounded border flex flex-col justify-center ${
                    selectedArtifact.verificationStatus === 'VERIFIED' ? 'bg-telemetry-green/5 border-telemetry-green/20 text-telemetry-green' :
                    'bg-telemetry-amber/5 border-telemetry-amber/20 text-telemetry-amber animate-pulse'
                  }`}>
                    <span className="text-[9px] uppercase tracking-wider font-semibold opacity-60">ATTESTATION STATUS</span>
                    <span className="text-xs font-extrabold uppercase mt-1 flex items-center gap-1.5 tracking-widest">
                      {selectedArtifact.verificationStatus === 'VERIFIED' ? (
                        <>🛡️ INTEGRITY VERIFIED</>
                      ) : (
                        <>⏳ AWAITING INTEGRITY ATTESTATION</>
                      )}
                    </span>
                  </div>

                  {/* Latency and Signal box */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-graphite-950 border border-graphite-850/80 p-2.5 rounded">
                      <span className="text-[9px] text-steel-blue block">SIGNAL SNR</span>
                      <span className="text-xs font-bold text-slate-200 mt-1 block">
                        {(selectedArtifact.signalIntegrity ? selectedArtifact.signalIntegrity * 100 : 95).toFixed(0)}%
                      </span>
                    </div>
                    <div className="bg-graphite-950 border border-graphite-850/80 p-2.5 rounded">
                      <span className="text-[9px] text-steel-blue block">DOWNLINK LAT</span>
                      <span className="text-xs font-bold text-slate-200 mt-1 block">
                        {selectedArtifact.latency}ms
                      </span>
                    </div>
                  </div>

                  {/* Hash Value Container */}
                  <div className="bg-graphite-950 border border-graphite-850/80 p-3 rounded flex flex-col">
                    <span className="text-[9px] text-steel-blue">RAW TELEMETRY HASH</span>
                    <span className="text-[10px] text-orbital-cyan font-bold break-all mt-1 bg-graphite-900/50 p-2 border border-graphite-850/50 rounded select-all font-mono leading-normal">
                      {selectedArtifact.entropyHash}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedArtifact.entropyHash, 'hash')}
                      className="text-[9px] text-graphite-400 hover:text-orbital-cyan self-end mt-1.5 flex items-center gap-1 hover:underline"
                    >
                      {copySuccess === 'hash' ? 'COPIED!' : 'COPY FULL HASH'}
                    </button>
                  </div>

                  {/* Relay Details */}
                  <div className="border border-graphite-800 rounded bg-graphite-950/40 p-3 space-y-2">
                    <span className="text-[9px] text-steel-blue uppercase block border-b border-graphite-800/60 pb-1 font-bold">RELAY METADATA</span>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-graphite-500">Origin Relay:</span>
                      <span className="font-semibold text-slate-200">{selectedArtifact.relayName} ({selectedArtifact.relayId})</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-graphite-500">Telemetry Source:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200 uppercase">{selectedArtifact.source.replace(/_/g, ' ')}</span>
                        {selectedArtifact.source === 'LIVE_DRAND_BEACON' ? (
                          <span className="px-1 py-0.5 text-[8px] bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 rounded uppercase font-bold tracking-wider animate-pulse flex items-center gap-1">
                            <span className="w-1 h-1 bg-emerald-400 rounded-full"></span>
                            LIVE BEACON
                          </span>
                        ) : (
                          <span className="px-1 py-0.5 text-[8px] bg-amber-950/80 text-amber-500 border border-amber-800/80 rounded uppercase font-bold tracking-wider flex items-center gap-1">
                            <span className="w-1 h-1 bg-amber-500 rounded-full"></span>
                            SIMULATED
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-graphite-500">Payload bits size:</span>
                      <span className="font-semibold text-orbital-cyan">{selectedArtifact.entropyBits} BITS</span>
                    </div>
                  </div>

                  {/* Attestation Certificate */}
                  {selectedArtifact.verificationProof && (
                    <div className="border border-graphite-800 rounded bg-graphite-950/40 p-3 space-y-2">
                      <span className="text-[9px] text-steel-blue uppercase block border-b border-graphite-800/60 pb-1 font-bold">INTEGRITY ATTESTATION</span>
                      <div className="flex flex-col text-[10px] space-y-1">
                        <span className="text-graphite-500">Signature Attestation Hash:</span>
                        <span className="text-[9px] text-slate-400 bg-graphite-950 p-1 border border-graphite-850 rounded truncate font-mono">
                          {selectedArtifact.verificationProof.signature}
                        </span>
                      </div>
                      {selectedArtifact.verificationProof.attestationRoot && (
                        <div className="flex flex-col text-[10px] space-y-1">
                          <span className="text-graphite-500">Attestation Merkle Root:</span>
                          <span className="text-[9px] text-slate-400 bg-graphite-950 p-1 border border-graphite-850 rounded truncate font-mono">
                            {selectedArtifact.verificationProof.attestationRoot}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-[10px] pt-1">
                        <span className="text-graphite-500">Attestation Confidence:</span>
                        <span className="font-semibold text-telemetry-green">{selectedArtifact.verificationProof.attestationScore}% Verified</span>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-dashed border-graphite-800 rounded">
                <Info className="w-8 h-8 text-graphite-600 mb-3" />
                <h4 className="text-xs font-bold text-slate-300 font-mono tracking-wider">NO PAYLOAD SELECTED</h4>
                <p className="text-[10px] text-graphite-500 mt-1 font-mono max-w-[200px]">
                  Click on any entry in the explorer table to inspect raw attestation bits, signatures, and downlink vectors.
                </p>
              </div>
            )}
          </div>

        </div>

      </main>
      
      {/* Footer */}
      <footer className="mt-12 border-t border-graphite-850 pt-4 px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-graphite-600 font-mono text-[9px]">
        <span>SPACECOMPUTER CONSOLE SYSTEM // ORBITSCAN INFRASTRUCTURE V1.2.0</span>
        <div className="flex gap-4">
          <span className="text-steel-blue hover:text-orbital-cyan cursor-pointer transition-colors">API INDEX</span>
          <span>//</span>
          <span className="text-steel-blue hover:text-orbital-cyan cursor-pointer transition-colors">INGESTION CONSOLE SPEC</span>
          <span>//</span>
          <span className="text-steel-blue hover:text-orbital-cyan cursor-pointer transition-colors">INFRASTRUCTURE UPTIME: 99.98%</span>
        </div>
      </footer>
    </div>
  );
}
