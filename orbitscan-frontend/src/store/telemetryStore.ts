import { create } from 'zustand';

import { Artifact, Relay, TelemetryLog, Metrics } from '@orbitscan/shared-types';

interface TelemetryState {
  artifacts: Artifact[];
  relays: Relay[];
  logs: TelemetryLog[];
  metrics: Metrics;
  isConnected: boolean;
  searchQuery: string;
  selectedArtifact: Artifact | null;
  selectedArtifactLoading: boolean;

  // Actions
  setConnected: (connected: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedArtifact: (artifact: Artifact | null) => void;
  loadInitialData: () => Promise<void>;
  loadArtifactDetails: (id: string) => Promise<void>;
  
  // Real-time Event Processors
  processRelayUpdate: (relay: Relay) => void;
  processEntropyGenerated: (event: any) => void;
  processArtifactCreated: (artifact: Artifact) => void;
  processVerificationCompleted: (event: any) => void;
  processTelemetryLog: (log: TelemetryLog) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_HEADERS = {
  'x-api-key': process.env.NEXT_PUBLIC_API_KEY || 'ORBIT_DEV_KEY_2026',
  'Content-Type': 'application/json',
};

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  artifacts: [],
  relays: [],
  logs: [],
  metrics: {
    totalEntropyGenerated: 0,
    activeEntropyRelays: 5,
    averageResponseLatency: 48,
    verifiedEntropyRate: 100,
    totalRequests: 0,
    totalVerified: 0,
  },
  isConnected: false,
  searchQuery: '',
  selectedArtifact: null,
  selectedArtifactLoading: false,

  setConnected: (connected) => set({ isConnected: connected }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedArtifact: (artifact) => set({ selectedArtifact: artifact }),

  loadInitialData: async () => {
    try {
      const [artifactsRes, relaysRes, logsRes, metricsRes] = await Promise.all([
        fetch(`${API_BASE}/artifacts?limit=30`, { headers: API_HEADERS }).then(r => r.json()),
        fetch(`${API_BASE}/relays`, { headers: API_HEADERS }).then(r => r.json()),
        fetch(`${API_BASE}/telemetry/live?limit=50`, { headers: API_HEADERS }).then(r => r.json()),
        fetch(`${API_BASE}/metrics`, { headers: API_HEADERS }).then(r => r.json()),
      ]);

      set({
        artifacts: artifactsRes,
        relays: relaysRes,
        logs: logsRes,
        metrics: metricsRes,
      });
    } catch (error) {
      console.error('Failed to load initial OrbitScan telemetry:', error);
    }
  },

  loadArtifactDetails: async (id) => {
    set({ selectedArtifactLoading: true });
    try {
      const res = await fetch(`${API_BASE}/artifact/${id}`, { headers: API_HEADERS });
      if (res.ok) {
        const details = await res.json();
        set({ selectedArtifact: details });
      } else {
        set({ selectedArtifact: null });
      }
    } catch (error) {
      console.error(`Failed to fetch artifact ${id}:`, error);
      set({ selectedArtifact: null });
    } finally {
      set({ selectedArtifactLoading: false });
    }
  },

  // Real-time Event handlers
  processRelayUpdate: (updatedRelay) => {
    set((state) => {
      const index = state.relays.findIndex((r) => r.id === updatedRelay.id);
      let updatedRelays = [...state.relays];
      if (index !== -1) {
        updatedRelays[index] = { ...updatedRelays[index], ...updatedRelay };
      } else {
        updatedRelays.push(updatedRelay);
      }

      const activeCount = updatedRelays.filter((r) => r.status === 'ACTIVE').length;
      const nonOffline = updatedRelays.filter((r) => r.status !== 'OFFLINE');
      const avgLatency = nonOffline.length
        ? Math.round(nonOffline.reduce((acc, r) => acc + r.latency, 0) / nonOffline.length)
        : state.metrics.averageResponseLatency;

      return {
        relays: updatedRelays,
        metrics: {
          ...state.metrics,
          activeEntropyRelays: activeCount,
          averageResponseLatency: avgLatency,
        },
      };
    });
  },

  processEntropyGenerated: (event) => {
    set((state) => ({
      metrics: {
        ...state.metrics,
        totalRequests: state.metrics.totalRequests + 1,
        verifiedEntropyRate: Number(
          (
            (state.metrics.totalVerified / (state.metrics.totalRequests + 1)) *
            100
          ).toFixed(2)
        ),
      },
    }));
  },

  processArtifactCreated: (newArtifact) => {
    set((state) => {
      const exists = state.artifacts.some((a) => a.id === newArtifact.id);
      if (exists) return {};
      
      const updatedArtifacts = [newArtifact, ...state.artifacts].slice(0, 50);
      return { artifacts: updatedArtifacts };
    });
  },

  processVerificationCompleted: (event) => {
    set((state) => {
      const updatedArtifacts = state.artifacts.map((a) => {
        if (a.id === event.id || a.entropyHash === event.entropyHash) {
          return { ...a, verificationStatus: 'VERIFIED' };
        }
        return a;
      });

      let selected = state.selectedArtifact;
      if (selected && (selected.id === event.id || selected.entropyHash === event.entropyHash)) {
        selected = {
          ...selected,
          verificationStatus: 'VERIFIED',
          verificationProof: selected.verificationProof
            ? {
                ...selected.verificationProof,
                signature: event.proof,
              }
            : undefined,
        };
      }

      const totalVerified = state.metrics.totalVerified + 1;
      const totalEntropy = state.metrics.totalEntropyGenerated + (event.entropyHash.length > 70 ? 512 : 256);
      
      return {
        artifacts: updatedArtifacts,
        selected,
        metrics: {
          ...state.metrics,
          totalVerified,
          totalEntropyGenerated: totalEntropy,
          verifiedEntropyRate: Number(
            ((totalVerified / Math.max(1, state.metrics.totalRequests)) * 100).toFixed(2)
          ),
        },
      };
    });
  },

  // Phase 5: Memory-efficient capped mutation buffer logic (no massive slicing)
  processTelemetryLog: (newLog) => {
    set((state) => {
      const currentLogs = state.logs;
      if (currentLogs.length >= 100) {
        const nextLogs = [newLog, ...currentLogs];
        nextLogs.pop(); // Drop last item directly
        return { logs: nextLogs };
      }
      return { logs: [newLog, ...currentLogs] };
    });
  },
}));
