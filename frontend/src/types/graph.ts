export interface NodeData {
  id: string;
  name: string;
  genres: string[];
  image_url: string;
  popularity: number;
  degree?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export interface LinkData {
  source: string | NodeData;
  target: string | NodeData;
  track_title: string;
  year: number;
  role: string;
  image_url?: string;
}

export interface ShortestPathLink {
  track: string;
  year: number;
  role: string;
  image_url?: string;
}

export interface PathResult {
  chain: NodeData[];
  links: ShortestPathLink[];
  length: number;
}

export interface GenreBridge {
  artist: NodeData;
  connectedGenres: string[];
  diversityScore: number;
}

export interface DBStatus {
  tested: boolean;
  connected: boolean;
  error?: string | null;
  uri: string;
}
