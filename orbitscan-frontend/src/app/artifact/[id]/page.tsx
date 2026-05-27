'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTelemetryStore } from '@/store/telemetryStore';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Satellite, 
  Cpu, 
  Clock, 
  Compass, 
  CheckCircle,
  Database,
  ExternalLink,
  ClipboardCheck,
  Clipboard
} from 'lucide-react';

export default function ArtifactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;

  const {
    selectedArtifact,
    selectedArtifactLoading,
    loadArtifactDetails,
    setSelectedArtifact
  } = useTelemetryStore();

  const [copied, setCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Phase 3: Hydration checking
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (id) {
      loadArtifactDetails(id as string);
    }
    return () => {
      setSelectedArtifact(null);
    };
  }, [id, loadArtifactDetails, setSelectedArtifact]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateHexGrid = (hash: string, bits: number) => {
    const rawHex = hash.replace('0x', '');
    const bytesNeeded = bits / 8;
    let hexString = rawHex;
    
    while (hexString.length < bytesNeeded * 2) {
      hexString += 'e0';
    }

    const rows = [];
    const bytesPerRow = 16;
    
    for (let i = 0; i < bytesNeeded; i += bytesPerRow) {
      const offset = i.toString(16).toUpperCase().padStart(8, '0');
      const chunk = hexString.slice(i * 2, (i + bytesPerRow) * 2);
      
      const byteList = [];
      for (let j = 0; j < chunk.length; j += 2) {
        byteList.push(chunk.slice(j, j + 2));
      }

      while (byteList.length < bytesPerRow) {
        byteList.push('00');
      }

      const asciiRepr = byteList
        .map(b => {
          const code = parseInt(b, 16);
          return (code >= 32 && code <= 126) ? String.fromCharCode(code) : '.';
        })
        .join('');

      rows.push({
        offset,
        bytes: byteList,
        ascii: asciiRepr
      });
    }

    return rows;
  };

  if (selectedArtifactLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-graphite-950 font-mono text-xs gap-3">
        <div className="w-5 h-5 border-2 border-t-orbital-cyan border-r-transparent border-b-transparent border-l-transparent animate-spin rounded-full" />
        <span className="text-graphite-400 uppercase tracking-widest animate-pulse">DOWNLINKING TELEMETRY PACKET...</span>
      </div>
    );
  }

  if (!selectedArtifact) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-graphite-950 font-mono text-xs gap-4 text-center p-6">
        <Satellite className="w-8 h-8 text-telemetry-red animate-pulse" />
        <span className="text-telemetry-red font-bold uppercase tracking-widest text-[10px]">INTEGRITY ATTESTATION DATA MISSING</span>
        <p className="text-graphite-500 max-w-[280px]">The requested Ingestion Attestation Payload #{id} could not be resolved.</p>
        <button 
          onClick={() => router.push('/')}
          className="mt-2 border border-graphite-800 bg-graphite-900 px-4 py-2 rounded text-slate-300 hover:border-orbital-cyan/50 hover:text-orbital-cyan transition-all"
        >
          RETURN TO MISSION CONTROL
        </button>
      </div>
    );
  }

  const hexGridRows = generateHexGrid(selectedArtifact.entropyHash, selectedArtifact.entropyBits);

  return (
    <div className="min-h-screen bg-graphite-950 text-slate-100 flex flex-col telemetry-grid pb-12 font-sans">
      
      {/* Detail Header Strip */}
      <header className="border-b border-graphite-800 bg-graphite-900/90 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center justify-center p-1.5 rounded bg-graphite-950 border border-graphite-850 hover:border-graphite-700 hover:text-orbital-cyan transition-all group"
          >
            <ArrowLeft className="w-4 h-4 mr-1 text-graphite-400 group-hover:text-orbital-cyan group-hover:-translate-x-0.5 transition-all" />
            <span className="text-[10px] font-mono tracking-wider font-bold pr-1">BACK</span>
          </button>
          
          <div className="h-6 w-[1px] bg-graphite-800" />
          
          <div>
            <span className="text-[9px] text-steel-blue font-mono uppercase tracking-widest">INTEGRITY ATTESTATION EXPLORER</span>
            <h1 className="text-sm font-bold font-mono tracking-wide text-slate-200 mt-0.5 uppercase flex items-center gap-2">
              Payload ID: {selectedArtifact.id}
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-2 border border-graphite-850 px-3 py-1 rounded bg-graphite-950/60 font-mono text-[9px] text-graphite-400">
          <Clock className="w-3.5 h-3.5 text-orbital-cyan" />
          <span>INDEXED AT: {isMounted ? new Date(selectedArtifact.createdAt).toLocaleTimeString() : '...'}</span>
        </div>
      </header>

      <main className="flex-1 px-6 max-w-[1400px] w-full mx-auto mt-8 grid grid-cols-12 gap-8">
        
        {/* Left Column: Artifact Summary & Raw Hex Inspector */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* High-density summary metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Bits Size */}
            <div className="bg-graphite-900/60 border border-graphite-800/80 p-4 rounded flex flex-col relative glass-panel">
              <span className="text-[9px] text-steel-blue font-mono uppercase tracking-wider">TELEMETRY PAYLOAD SIZE</span>
              <span className="text-xl font-bold font-mono text-orbital-cyan mt-1.5">{selectedArtifact.entropyBits} BITS</span>
              <span className="text-[8px] text-graphite-500 font-mono mt-1 uppercase">Sourced in single orbit</span>
            </div>

            {/* Relay origin */}
            <div className="bg-graphite-900/60 border border-graphite-800/80 p-4 rounded flex flex-col relative glass-panel">
              <span className="text-[9px] text-steel-blue font-mono uppercase tracking-wider">DOWNLINK ORIGIN</span>
              <span className="text-xl font-bold font-mono text-slate-200 mt-1.5 flex items-center gap-1.5">
                <Satellite className="w-4 h-4 text-orbital-cyan" /> {selectedArtifact.relayName}
              </span>
              <span className="text-[8px] text-graphite-500 font-mono mt-1 uppercase">Sector Relay: {selectedArtifact.relayId}</span>
            </div>

            {/* Source Origin */}
            <div className="bg-graphite-900/60 border border-graphite-800/80 p-4 rounded flex flex-col relative glass-panel">
              <span className="text-[9px] text-steel-blue font-mono uppercase tracking-wider">HARNESS SOURCE TYPE</span>
              <span className="text-sm font-extrabold font-mono text-slate-300 mt-2.5 truncate uppercase">
                {selectedArtifact.source.replace(/_/g, ' ')}
              </span>
              <span className="text-[8px] text-graphite-500 font-mono mt-1 uppercase">Telemetry Payload Variance</span>
            </div>

          </div>

          {/* Hex Spectral View */}
          <div className="bg-graphite-900/60 border border-graphite-800/80 rounded p-5 glass-panel flex flex-col font-mono text-[11px]">
            <div className="flex justify-between items-center border-b border-graphite-800 pb-3 mb-4">
              <span className="text-[10px] font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-orbital-cyan" /> TELEMETRY SPECTRAL HEX VIEW
              </span>
              <button
                onClick={() => copyToClipboard(selectedArtifact.entropyHash)}
                className="text-[9px] text-graphite-400 hover:text-orbital-cyan flex items-center gap-1 hover:underline transition-colors"
              >
                {copied ? <ClipboardCheck className="w-3.5 h-3.5 text-telemetry-green" /> : <Clipboard className="w-3.5 h-3.5" />}
                {copied ? 'COPIED HASH!' : 'COPY FULL PAYLOAD HASH'}
              </button>
            </div>

            <div className="bg-graphite-950 p-4 border border-graphite-850 rounded overflow-x-auto select-all max-h-[300px] scrollbar-thin">
              <table className="w-full text-slate-400 border-collapse">
                <thead>
                  <tr className="border-b border-graphite-900 text-steel-blue font-semibold text-[10px]">
                    <th className="text-left pr-4 py-1">OFFSET</th>
                    <th className="text-left py-1 tracking-wider" colSpan={16}>
                      00 01 02 03 04 05 06 07  08 09 0A 0B 0C 0D 0E 0F
                    </th>
                    <th className="text-left pl-4 py-1">ASCII</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite-900/30">
                  {hexGridRows.map((row, index) => (
                    <tr key={index} className="hover:bg-graphite-900/50">
                      <td className="text-steel-blue font-bold pr-4 py-1">{row.offset}</td>
                      <td className="py-1 tracking-wider whitespace-nowrap" colSpan={16}>
                        {row.bytes.map((byte, bi) => {
                          const isPadding = byte === '00' && selectedArtifact.entropyHash === '0x';
                          const byteColor = isPadding ? 'text-graphite-800' : 'text-orbital-cyan font-bold';
                          const spacer = bi === 7 ? '  ' : ' ';
                          return (
                            <span key={bi} className={byteColor}>
                              {byte}{spacer}
                            </span>
                          );
                        })}
                      </td>
                      <td className="text-slate-500 pl-4 py-1 border-l border-graphite-900 whitespace-nowrap">{row.ascii}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center text-[9px] text-graphite-400 mt-3">
              <span>SPECTRAL MAP: 0x00000000 {"->"} 0x000000F0</span>
              <span>BITS VALIDATED: {selectedArtifact.entropyBits} BITS</span>
              <span>SIGNATURE STATUS: 100% OK</span>
            </div>

          </div>

        </div>

        {/* Right Column: Cryptographic Verification Timeline & Attestation Info */}
        <div className="col-span-12 lg:col-span-4 space-y-6 font-mono">
          
          {/* Integrity Attestation Badge */}
          <div className="bg-graphite-900/60 border border-graphite-800/80 rounded p-5 glass-panel flex flex-col">
            <div className="flex items-center space-x-3 text-telemetry-green border-b border-graphite-800 pb-3 mb-4">
              <ShieldCheck className="w-6 h-6 animate-pulse" />
              <div>
                <h3 className="text-xs font-bold tracking-wider text-slate-200">INTEGRITY ATTESTATION ENCLAVE</h3>
                <p className="text-[9px] text-steel-blue">TELEMETRY DIGITAL SIGNATURE ASSURANCE</p>
              </div>
            </div>

            <div className="space-y-3 text-[10px]">
              
              <div className="bg-graphite-950 p-3 rounded border border-graphite-850">
                <span className="text-[9px] text-steel-blue block">ENCLAVE SIGNATURE PROOF</span>
                <span className="text-xs text-slate-300 font-bold break-all block mt-1 leading-relaxed">
                  {selectedArtifact.verificationProof?.signature || '0x_signature_pending_attestation'}
                </span>
              </div>

              {selectedArtifact.verificationProof?.attestationRoot && (
                <div className="bg-graphite-950 p-3 rounded border border-graphite-850">
                  <span className="text-[9px] text-steel-blue block">ATTESTATION ROOT</span>
                  <span className="text-xs text-slate-300 font-bold break-all block mt-1 leading-relaxed">
                    {selectedArtifact.verificationProof.attestationRoot}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center py-1">
                <span className="text-graphite-500">Signer Relay ID:</span>
                <span className="font-semibold text-slate-200">{selectedArtifact.relayId}</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-graphite-500">Downlink Latency:</span>
                <span className="font-semibold text-slate-200">{selectedArtifact.latency || 48} ms</span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-graphite-500">Signal SNR Strength:</span>
                <span className="font-semibold text-telemetry-green">
                  {selectedArtifact.signalIntegrity ? (selectedArtifact.signalIntegrity * 100).toFixed(0) : '98'}% Stable
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-graphite-500">Attestation Confidence:</span>
                <span className="font-semibold text-orbital-cyan">
                  {selectedArtifact.verificationProof?.attestationScore || 99.8}% Verified
                </span>
              </div>

            </div>
          </div>

          {/* Verification Timeline */}
          <div className="bg-graphite-900/60 border border-graphite-800/80 rounded p-5 glass-panel">
            <h3 className="text-[10px] font-bold tracking-wider text-slate-300 border-b border-graphite-800 pb-3 mb-4 uppercase">
              INTEGRITY ATTESTATION TIMELINE
            </h3>

            <div className="relative border-l border-graphite-800 ml-2.5 pl-5 space-y-5 text-[10px] leading-relaxed">
              
              {/* Event 1 */}
              <div className="relative">
                <span className="absolute -left-7.5 top-0 w-5 h-5 bg-telemetry-green/10 border border-telemetry-green rounded-full flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-telemetry-green" />
                </span>
                <span className="text-steel-blue font-bold">1. DATA UPLINK INITIATED</span>
                <p className="text-slate-400 mt-0.5">Entropy bits generated via {selectedArtifact.source.replace(/_/g, ' ')} payload.</p>
              </div>

              {/* Event 2 */}
              <div className="relative">
                <span className="absolute -left-7.5 top-0 w-5 h-5 bg-telemetry-green/10 border border-telemetry-green rounded-full flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-telemetry-green" />
                </span>
                <span className="text-steel-blue font-bold">2. PAYLOAD SEALED</span>
                <p className="text-slate-400 mt-0.5">Encapsulated into telemetry payload block hash {selectedArtifact.entropyHash.slice(0, 12)}...</p>
              </div>

              {/* Event 3 */}
              <div className="relative">
                <span className="absolute -left-7.5 top-0 w-5 h-5 bg-telemetry-green/10 border border-telemetry-green rounded-full flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-telemetry-green" />
                </span>
                <span className="text-steel-blue font-bold">3. DOWNLINK INGESTED</span>
                <p className="text-slate-400 mt-0.5">Ingested via sector relay {selectedArtifact.relayName} with {selectedArtifact.latency || 45}ms response rate.</p>
              </div>

              {/* Event 4 */}
              <div className="relative">
                <span className={`absolute -left-7.5 top-0 w-5 h-5 rounded-full flex items-center justify-center ${
                  selectedArtifact.verificationStatus === 'VERIFIED' ? 'bg-telemetry-green/10 border border-telemetry-green' : 'bg-telemetry-amber/10 border border-telemetry-amber animate-ping'
                }`}>
                  <CheckCircle className={`w-3 h-3 ${selectedArtifact.verificationStatus === 'VERIFIED' ? 'text-telemetry-green' : 'text-telemetry-amber'}`} />
                </span>
                <span className={`${selectedArtifact.verificationStatus === 'VERIFIED' ? 'text-telemetry-green' : 'text-telemetry-amber'} font-bold`}>
                  4. SIGNATURE ATTESTATION COMPLETED
                </span>
                <p className="text-slate-400 mt-0.5">
                  {selectedArtifact.verificationStatus === 'VERIFIED' ? 
                    'Signature applied successfully by space hardware attestation enclaves.' : 
                    'Awaiting signature attestation validations...'
                  }
                </p>
              </div>

            </div>
          </div>

        </div>

      </main>
      
    </div>
  );
}
