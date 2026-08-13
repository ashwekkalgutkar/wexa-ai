import { NodeData, LinkData, PathResult, GenreBridge, DBStatus } from '../types/graph';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

export async function fetchDBStatus(): Promise<DBStatus> {
  const res = await fetch(`${API_BASE}/status`);
  if (!res.ok) throw new Error('Status request failed');
  return res.json();
}

export async function fetchFullGraph(): Promise<{ nodes: NodeData[]; links: LinkData[] }> {
  const res = await fetch(`${API_BASE}/graph`);
  if (!res.ok) throw new Error('Failed to load graph network');
  return res.json();
}

export async function searchArtists(query: string): Promise<NodeData[]> {
  if (!query.trim()) return [];
  const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchShortestPath(artistA: string, artistB: string): Promise<PathResult> {
  const res = await fetch(
    `${API_BASE}/path?artistA=${encodeURIComponent(artistA)}&artistB=${encodeURIComponent(artistB)}`
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `No path found between ${artistA} and ${artistB}`);
  }
  return res.json();
}

export async function fetchAllPaths(artistA: string, artistB: string): Promise<PathResult[]> {
  const res = await fetch(
    `${API_BASE}/paths/all?artistA=${encodeURIComponent(artistA)}&artistB=${encodeURIComponent(artistB)}`
  );
  if (!res.ok) return [];
  return res.json();
}

export async function fetchArtistNeighborhood(name: string): Promise<{ artist: NodeData; neighbors: NodeData[]; links: LinkData[] }> {
  const res = await fetch(`${API_BASE}/artist/${encodeURIComponent(name)}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Artist "${name}" not found.`);
  }
  return res.json();
}

export async function fetchHubArtists(): Promise<NodeData[]> {
  const res = await fetch(`${API_BASE}/hubs?limit=10`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchGenreBridges(): Promise<GenreBridge[]> {
  const res = await fetch(`${API_BASE}/bridges?limit=8`);
  if (!res.ok) return [];
  return res.json();
}
