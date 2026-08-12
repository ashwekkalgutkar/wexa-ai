import { useQuery } from '@tanstack/react-query';
import {
  fetchDBStatus,
  fetchFullGraph,
  fetchShortestPath,
  fetchAllPaths,
  fetchArtistNeighborhood,
  fetchHubArtists,
  fetchGenreBridges,
  searchArtists,
} from '../services/api';
import { NodeData, LinkData, PathResult, GenreBridge, DBStatus } from '../types/graph';

// Query keys for caching & refetch management
export const queryKeys = {
  dbStatus: ['dbStatus'] as const,
  fullGraph: ['fullGraph'] as const,
  shortestPath: (a: string, b: string) => ['shortestPath', a, b] as const,
  allPaths: (a: string, b: string) => ['allPaths', a, b] as const,
  neighborhood: (name: string) => ['neighborhood', name] as const,
  hubs: ['hubs'] as const,
  bridges: ['bridges'] as const,
  search: (query: string) => ['search', query] as const,
};

export function useDBStatus() {
  return useQuery<DBStatus>({
    queryKey: queryKeys.dbStatus,
    queryFn: fetchDBStatus,
    staleTime: 60 * 1000,
    retry: 1,
  });
}

export function useFullGraph() {
  return useQuery<{ nodes: NodeData[]; links: LinkData[] }>({
    queryKey: queryKeys.fullGraph,
    queryFn: fetchFullGraph,
    staleTime: 5 * 60 * 1000,
  });
}

export function useShortestPath(artistA: string | null, artistB: string | null) {
  return useQuery<PathResult>({
    queryKey: queryKeys.shortestPath(artistA || '', artistB || ''),
    queryFn: () => fetchShortestPath(artistA!, artistB!),
    enabled: Boolean(artistA && artistB),
    staleTime: 10 * 60 * 1000,
  });
}

export function useAllPaths(artistA: string | null, artistB: string | null) {
  return useQuery<PathResult[]>({
    queryKey: queryKeys.allPaths(artistA || '', artistB || ''),
    queryFn: () => fetchAllPaths(artistA!, artistB!),
    enabled: Boolean(artistA && artistB),
    staleTime: 10 * 60 * 1000,
  });
}

export function useArtistNeighborhood(name: string | null) {
  return useQuery<{ artist: NodeData; neighbors: NodeData[]; links: LinkData[] }>({
    queryKey: queryKeys.neighborhood(name || ''),
    queryFn: () => fetchArtistNeighborhood(name!),
    enabled: Boolean(name),
    staleTime: 5 * 60 * 1000,
  });
}

export function useHubArtists(isOpen: boolean = true) {
  return useQuery<NodeData[]>({
    queryKey: queryKeys.hubs,
    queryFn: fetchHubArtists,
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });
}

export function useGenreBridges(isOpen: boolean = true) {
  return useQuery<GenreBridge[]>({
    queryKey: queryKeys.bridges,
    queryFn: fetchGenreBridges,
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });
}

export function useArtistSearch(query: string) {
  return useQuery<NodeData[]>({
    queryKey: queryKeys.search(query),
    queryFn: () => searchArtists(query),
    enabled: Boolean(query.trim()),
    staleTime: 60 * 1000,
  });
}
