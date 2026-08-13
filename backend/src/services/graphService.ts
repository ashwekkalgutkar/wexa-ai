import { Session } from 'neo4j-driver';
import { getSession, getDBStatus } from '../config/db';
import { SEED_ARTISTS, SEED_COLLABORATIONS } from './seedData';

export interface GraphNode {
  id: string;
  name: string;
  genres: string[];
  image_url: string;
  popularity: number;
  degree?: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  track_title: string;
  year: number;
  role: string;
  image_url?: string;
}

export interface ShortestPathResult {
  chain: GraphNode[];
  links: { track: string; year: number; role: string; image_url?: string }[];
  length: number;
}

export interface GenreBridgeResult {
  artist: GraphNode;
  connectedGenres: string[];
  diversityScore: number;
}

/**
 * 1. Get entire Graph (or up to limit) for full network rendering
 */
export async function getFullGraph(limit: number = 200): Promise<{ nodes: GraphNode[]; links: GraphEdge[] }> {
  let session: Session | null = null;
  try {
    const status = getDBStatus();
    if (!status.connected) {
      return getOfflineGraph();
    }

    session = getSession();
    const result = await session.run(
      `
      MATCH (a:Artist)-[r:COLLABORATED_ON]-(b:Artist)
      WITH a, r, b
      LIMIT $limit
      RETURN 
        a.id AS a_id, a.name AS a_name, a.genres AS a_genres, a.image_url AS a_image, a.popularity AS a_pop,
        b.id AS b_id, b.name AS b_name, b.genres AS b_genres, b.image_url AS b_image, b.popularity AS b_pop,
        r.track_title AS track, r.year AS year, r.role AS role, r.image_url AS track_image
      `,
      { limit: neo4jInteger(limit) }
    );

    const nodesMap = new Map<string, GraphNode>();
    const links: GraphEdge[] = [];
    const seenLinks = new Set<string>();

    for (const rec of result.records) {
      const aName = rec.get('a_name');
      const bName = rec.get('b_name');
      
      if (!nodesMap.has(aName)) {
        nodesMap.set(aName, {
          id: rec.get('a_id') || aName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: aName,
          genres: rec.get('a_genres') || [],
          image_url: rec.get('a_image') || '',
          popularity: toNum(rec.get('a_pop'), 85),
        });
      }

      if (!nodesMap.has(bName)) {
        nodesMap.set(bName, {
          id: rec.get('b_id') || bName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: bName,
          genres: rec.get('b_genres') || [],
          image_url: rec.get('b_image') || '',
          popularity: toNum(rec.get('b_pop'), 85),
        });
      }

      const pairKey = [aName, bName].sort().join(':::') + ':::' + rec.get('track');
      if (!seenLinks.has(pairKey)) {
        seenLinks.add(pairKey);
        links.push({
          from: aName,
          to: bName,
          track_title: rec.get('track'),
          year: toNum(rec.get('year'), 2020),
          role: rec.get('role') || 'featured',
          image_url: rec.get('track_image') || '',
        });
      }
    }

    return { nodes: Array.from(nodesMap.values()), links };
  } catch (err) {
    console.error('[Cypher Error] getFullGraph failed, falling back to cached seed dataset:', err);
    return getOfflineGraph();
  } finally {
    if (session) {
      try { await session.close(); } catch (_) {}
    }
  }
}

/**
 * 2. Get 1-hop neighborhood for a single artist
 */
export async function getArtistNeighborhood(artistName: string): Promise<{ artist: GraphNode; neighbors: GraphNode[]; links: GraphEdge[] }> {
  let session: Session | null = null;
  try {
    const status = getDBStatus();
    if (!status.connected) {
      return getOfflineArtistNeighborhood(artistName);
    }

    session = getSession();
    const result = await session.run(
      `
      MATCH (a:Artist)-[r:COLLABORATED_ON]-(other:Artist)
      WHERE toLower(a.name) = toLower($artistName) OR toLower(a.id) = toLower($artistName)
      RETURN 
        a.id AS a_id, a.name AS a_name, a.genres AS a_genres, a.image_url AS a_image, a.popularity AS a_pop,
        other.id AS o_id, other.name AS o_name, other.genres AS o_genres, other.image_url AS o_image, other.popularity AS o_pop,
        r.track_title AS track, r.year AS year, r.role AS role, r.image_url AS track_image
      `,
      { artistName }
    );

    if (result.records.length === 0) {
      throw new Error(`Artist "${artistName}" not found in database.`);
    }

    const firstRec = result.records[0];
    const artistNode: GraphNode = {
      id: firstRec.get('a_id') || artistName,
      name: firstRec.get('a_name'),
      genres: firstRec.get('a_genres') || [],
      image_url: firstRec.get('a_image') || '',
      popularity: toNum(firstRec.get('a_pop'), 90),
    };

    const neighborsMap = new Map<string, GraphNode>();
    const links: GraphEdge[] = [];

    for (const rec of result.records) {
      const oName = rec.get('o_name');
      if (!neighborsMap.has(oName)) {
        neighborsMap.set(oName, {
          id: rec.get('o_id') || oName,
          name: oName,
          genres: rec.get('o_genres') || [],
          image_url: rec.get('o_image') || '',
          popularity: toNum(rec.get('o_pop'), 85),
        });
      }
      links.push({
        from: artistNode.name,
        to: oName,
        track_title: rec.get('track'),
        year: toNum(rec.get('year'), 2020),
        role: rec.get('role') || 'featured',
        image_url: rec.get('track_image') || '',
      });
    }

    artistNode.degree = neighborsMap.size;

    return { artist: artistNode, neighbors: Array.from(neighborsMap.values()), links };
  } catch (err: any) {
    if (err.message && err.message.includes('not found')) throw err;
    console.error(`[Cypher Error] getArtistNeighborhood for ${artistName} failed:`, err);
    return getOfflineArtistNeighborhood(artistName);
  } finally {
    if (session) {
      try { await session.close(); } catch (_) {}
    }
  }
}

/**
 * 3. Shortest Collaboration Path (Cypher shortestPath)
 */
export async function getShortestPath(artistA: string, artistB: string): Promise<ShortestPathResult> {
  let session: Session | null = null;
  try {
    const status = getDBStatus();
    if (!status.connected) {
      return getOfflineShortestPath(artistA, artistB);
    }

    session = getSession();
    const result = await session.run(
      `
      MATCH p = shortestPath((a:Artist)-[:COLLABORATED_ON*1..6]-(b:Artist))
      WHERE toLower(a.name) = toLower($nameA) AND toLower(b.name) = toLower($nameB)
      RETURN 
        [n IN nodes(p) | { id: n.id, name: n.name, genres: n.genres, image_url: n.image_url, popularity: n.popularity }] AS chain,
        [r IN relationships(p) | { track: r.track_title, year: r.year, role: r.role, image_url: r.image_url }] AS links
      `,
      { nameA: artistA, nameB: artistB }
    );

    if (result.records.length === 0) {
      throw new Error(`No collaboration path found between "${artistA}" and "${artistB}".`);
    }

    const rec = result.records[0];
    const chainRaw = rec.get('chain');
    const linksRaw = rec.get('links');

    const chain: GraphNode[] = chainRaw.map((n: any) => ({
      id: n.id || n.name,
      name: n.name,
      genres: n.genres || [],
      image_url: n.image_url || '',
      popularity: toNum(n.popularity, 85),
    }));

    const links = linksRaw.map((l: any) => ({
      track: l.track || 'Collaborative Track',
      year: toNum(l.year, 2020),
      role: l.role || 'featured',
      image_url: l.image_url || '',
    }));

    return { chain, links, length: links.length };
  } catch (err: any) {
    if (err.message && (err.message.includes('No collaboration path') || err.message.includes('not found'))) throw err;
    console.error(`[Cypher Error] getShortestPath between ${artistA} and ${artistB} failed:`, err);
    return getOfflineShortestPath(artistA, artistB);
  } finally {
    if (session) {
      try { await session.close(); } catch (_) {}
    }
  }
}

/**
 * 4. Alternate paths query (all paths up to 4 hops)
 */
export async function getAllPaths(artistA: string, artistB: string, maxHops: number = 4): Promise<ShortestPathResult[]> {
  let session: Session | null = null;
  try {
    const status = getDBStatus();
    if (!status.connected) {
      const shortest = await getOfflineShortestPath(artistA, artistB);
      return [shortest];
    }

    session = getSession();
    const cypher = `
      MATCH p = (a:Artist)-[:COLLABORATED_ON*1..5]-(b:Artist)
      WHERE toLower(a.name) = toLower($nameA) AND toLower(b.name) = toLower($nameB)
      RETURN 
        [n IN nodes(p) | { id: n.id, name: n.name, genres: n.genres, image_url: n.image_url, popularity: n.popularity }] AS chain,
        [r IN relationships(p) | { track: r.track_title, year: r.year, role: r.role, image_url: r.image_url }] AS links,
        length(p) AS hopCount
      ORDER BY hopCount ASC
      LIMIT 5
    `;
    const result = await session.run(cypher, { nameA: artistA, nameB: artistB });

    const paths: ShortestPathResult[] = [];
    const seenChains = new Set<string>();

    for (const rec of result.records) {
      const chainRaw = rec.get('chain');
      const linksRaw = rec.get('links');
      const namesStr = chainRaw.map((c: any) => c.name).join('->');
      
      if (seenChains.has(namesStr)) continue;
      seenChains.add(namesStr);

      const chain: GraphNode[] = chainRaw.map((n: any) => ({
        id: n.id || n.name,
        name: n.name,
        genres: n.genres || [],
        image_url: n.image_url || '',
        popularity: toNum(n.popularity, 85),
      }));

      const links = linksRaw.map((l: any) => ({
        track: l.track || 'Collaborative Track',
        year: toNum(l.year, 2020),
        role: l.role || 'featured',
        image_url: l.image_url || '',
      }));

      paths.push({ chain, links, length: links.length });
    }

    return paths;
  } catch (err) {
    console.error('[Cypher Error] getAllPaths failed:', err);
    return [];
  } finally {
    if (session) {
      try { await session.close(); } catch (_) {}
    }
  }
}

/**
 * 5. Most-connected Hub Artists (Degree Centrality)
 */
export async function getHubArtists(limit: number = 10): Promise<GraphNode[]> {
  let session: Session | null = null;
  try {
    const status = getDBStatus();
    if (!status.connected) {
      return getOfflineHubs(limit);
    }

    session = getSession();
    const result = await session.run(
      `
      MATCH (a:Artist)-[:COLLABORATED_ON]-(other:Artist)
      RETURN 
        a.id AS id, a.name AS name, a.genres AS genres, a.image_url AS image_url, a.popularity AS popularity,
        count(DISTINCT other) AS degree
      ORDER BY degree DESC
      LIMIT $limit
      `,
      { limit: neo4jInteger(limit) }
    );

    return result.records.map((rec: any) => ({
      id: rec.get('id') || rec.get('name'),
      name: rec.get('name'),
      genres: rec.get('genres') || [],
      image_url: rec.get('image_url') || '',
      popularity: toNum(rec.get('popularity'), 90),
      degree: toNum(rec.get('degree'), 0),
    }));
  } catch (err) {
    console.error('[Cypher Error] getHubArtists failed:', err);
    return getOfflineHubs(limit);
  } finally {
    if (session) {
      try { await session.close(); } catch (_) {}
    }
  }
}

/**
 * 6. Genre Bridge Query (Artists spanning distinct genres)
 */
export async function getGenreBridges(limit: number = 8): Promise<GenreBridgeResult[]> {
  let session: Session | null = null;
  try {
    const status = getDBStatus();
    if (!status.connected) {
      return getOfflineGenreBridges(limit);
    }

    session = getSession();
    const result = await session.run(
      `
      MATCH (a:Artist)-[:COLLABORATED_ON]-(b:Artist)
      UNWIND a.genres AS ownGenre
      UNWIND b.genres AS connectedGenre
      WITH a, ownGenre, connectedGenre
      WHERE ownGenre <> connectedGenre
      WITH 
        a,
        a.id AS id, a.name AS name, a.genres AS genres, a.image_url AS image_url, a.popularity AS popularity,
        collect(DISTINCT connectedGenre) AS connectedGenres
      WHERE size(connectedGenres) >= 2
      RETURN 
        id, name, genres, image_url, popularity,
        connectedGenres,
        size(connectedGenres) AS diversityScore
      ORDER BY diversityScore DESC
      LIMIT $limit
      `,
      { limit: neo4jInteger(limit) }
    );

    return result.records.map((rec: any) => ({
      artist: {
        id: rec.get('id') || rec.get('name'),
        name: rec.get('name'),
        genres: rec.get('genres') || [],
        image_url: rec.get('image_url') || '',
        popularity: toNum(rec.get('popularity'), 85),
      },
      connectedGenres: rec.get('connectedGenres') || [],
      diversityScore: toNum(rec.get('diversityScore'), 0),
    }));
  } catch (err) {
    console.error('[Cypher Error] getGenreBridges failed:', err);
    return getOfflineGenreBridges(limit);
  } finally {
    if (session) {
      try { await session.close(); } catch (_) {}
    }
  }
}

/**
 * Search Artists for autocomplete
 */
export async function searchArtists(query: string, limit: number = 10): Promise<GraphNode[]> {
  let session: Session | null = null;
  try {
    const status = getDBStatus();
    if (!status.connected) {
      const q = query.toLowerCase();
      return SEED_ARTISTS
        .filter(a => a.name.toLowerCase().includes(q) || a.genres.some(g => g.toLowerCase().includes(q)))
        .slice(0, limit);
    }

    session = getSession();
    const result = await session.run(
      `
      MATCH (a:Artist)
      WHERE toLower(a.name) CONTAINS toLower($query) 
         OR ANY(g IN a.genres WHERE toLower(g) CONTAINS toLower($query))
      RETURN a.id AS id, a.name AS name, a.genres AS genres, a.image_url AS image_url, a.popularity AS popularity
      ORDER BY a.popularity DESC
      LIMIT $limit
      `,
      { query, limit: neo4jInteger(limit) }
    );

    return result.records.map((rec: any) => ({
      id: rec.get('id') || rec.get('name'),
      name: rec.get('name'),
      genres: rec.get('genres') || [],
      image_url: rec.get('image_url') || '',
      popularity: toNum(rec.get('popularity'), 80),
    }));
  } catch (err) {
    console.error('[Cypher Error] searchArtists failed:', err);
    const q = query.toLowerCase();
    return SEED_ARTISTS.filter(a => a.name.toLowerCase().includes(q)).slice(0, limit);
  } finally {
    if (session) {
      try { await session.close(); } catch (_) {}
    }
  }
}

function neo4jInteger(val: number) {
  return val;
}

function toNum(val: any, fallback: number): number {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return val;
  if (typeof val.toNumber === 'function') return val.toNumber();
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? fallback : parsed;
}

// ------------------------------------------------------------------
// Offline / Seed Fallback Engine (Guarantees app functionality offline)
// ------------------------------------------------------------------
function getOfflineGraph(): { nodes: GraphNode[]; links: GraphEdge[] } {
  const nodes = SEED_ARTISTS;
  const links = SEED_COLLABORATIONS;
  return { nodes, links };
}

function getOfflineArtistNeighborhood(name: string) {
  const artist = SEED_ARTISTS.find(a => a.name.toLowerCase() === name.toLowerCase() || a.id.toLowerCase() === name.toLowerCase());
  if (!artist) throw new Error(`Artist "${name}" not found.`);

  const edges = SEED_COLLABORATIONS.filter(c => c.from.toLowerCase() === artist.name.toLowerCase() || c.to.toLowerCase() === artist.name.toLowerCase());
  const neighborNames = new Set<string>();
  const links: GraphEdge[] = [];

  for (const e of edges) {
    const partner = e.from.toLowerCase() === artist.name.toLowerCase() ? e.to : e.from;
    neighborNames.add(partner);
    links.push({
      from: artist.name,
      to: partner,
      track_title: e.track_title,
      year: e.year,
      role: e.role,
      image_url: e.image_url || '',
    });
  }

  const neighbors = SEED_ARTISTS.filter(a => neighborNames.has(a.name));
  return { artist: { ...artist, degree: neighbors.length }, neighbors, links };
}

function getOfflineShortestPath(artistA: string, artistB: string): ShortestPathResult {
  const nameA = SEED_ARTISTS.find(a => a.name.toLowerCase() === artistA.toLowerCase())?.name || artistA;
  const nameB = SEED_ARTISTS.find(a => a.name.toLowerCase() === artistB.toLowerCase())?.name || artistB;

  const adj = new Map<string, Array<{ neighbor: string; track: string; year: number; role: string; image_url?: string }>>();
  for (const a of SEED_ARTISTS) adj.set(a.name, []);
  for (const c of SEED_COLLABORATIONS) {
    if (!adj.has(c.from)) adj.set(c.from, []);
    if (!adj.has(c.to)) adj.set(c.to, []);
    adj.get(c.from)!.push({ neighbor: c.to, track: c.track_title, year: c.year, role: c.role, image_url: c.image_url });
    adj.get(c.to)!.push({ neighbor: c.from, track: c.track_title, year: c.year, role: c.role, image_url: c.image_url });
  }

  const queue: Array<{ current: string; path: string[]; edges: any[] }> = [{ current: nameA, path: [nameA], edges: [] }];
  const visited = new Set<string>([nameA]);

  while (queue.length > 0) {
    const { current, path, edges } = queue.shift()!;

    if (current.toLowerCase() === nameB.toLowerCase()) {
      const chainNodes = path.map(name => SEED_ARTISTS.find(a => a.name === name) || {
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name,
        genres: ["music"],
        image_url: "",
        popularity: 85
      });
      return { chain: chainNodes, links: edges, length: edges.length };
    }

    const neighbors = adj.get(current) || [];
    for (const edge of neighbors) {
      if (!visited.has(edge.neighbor)) {
        visited.add(edge.neighbor);
        queue.push({
          current: edge.neighbor,
          path: [...path, edge.neighbor],
          edges: [...edges, { track: edge.track, year: edge.year, role: edge.role, image_url: edge.image_url }]
        });
      }
    }
  }

  throw new Error(`No collaboration path found between "${artistA}" and "${artistB}".`);
}

function getOfflineHubs(limit: number): GraphNode[] {
  const counts = new Map<string, number>();
  for (const c of SEED_COLLABORATIONS) {
    counts.set(c.from, (counts.get(c.from) || 0) + 1);
    counts.set(c.to, (counts.get(c.to) || 0) + 1);
  }

  return SEED_ARTISTS.map(a => ({
    ...a,
    degree: counts.get(a.name) || 0
  }))
    .sort((a, b) => (b.degree || 0) - (a.degree || 0))
    .slice(0, limit);
}

function getOfflineGenreBridges(limit: number): GenreBridgeResult[] {
  const bridgeMap = new Map<string, Set<string>>();
  for (const c of SEED_COLLABORATIONS) {
    const artistAObj = SEED_ARTISTS.find(a => a.name === c.from);
    const artistBObj = SEED_ARTISTS.find(a => a.name === c.to);

    if (artistAObj && artistBObj) {
      if (!bridgeMap.has(artistAObj.name)) bridgeMap.set(artistAObj.name, new Set());
      if (!bridgeMap.has(artistBObj.name)) bridgeMap.set(artistBObj.name, new Set());

      artistBObj.genres.forEach(g => bridgeMap.get(artistAObj.name)!.add(g));
      artistAObj.genres.forEach(g => bridgeMap.get(artistBObj.name)!.add(g));
    }
  }

  const results: GenreBridgeResult[] = [];
  for (const [artistName, genresSet] of bridgeMap.entries()) {
    const artistObj = SEED_ARTISTS.find(a => a.name === artistName);
    if (artistObj) {
      results.push({
        artist: artistObj,
        connectedGenres: Array.from(genresSet),
        diversityScore: genresSet.size,
      });
    }
  }

  return results.sort((a, b) => b.diversityScore - a.diversityScore).slice(0, limit);
}
