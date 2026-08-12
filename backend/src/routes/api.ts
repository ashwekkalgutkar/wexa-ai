import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getFullGraph,
  getArtistNeighborhood,
  getShortestPath,
  getAllPaths,
  getHubArtists,
  getGenreBridges,
  searchArtists,
} from '../services/graphService';
import { getDBStatus, testConnection } from '../config/db';
import { seedDatabase } from '../services/seedService';

const router = Router();

// Zod Schemas for API Input Validation
const PathQuerySchema = z.object({
  artistA: z.string().min(1, 'artistA is required'),
  artistB: z.string().min(1, 'artistB is required'),
});

const AllPathsQuerySchema = z.object({
  artistA: z.string().min(1, 'artistA is required'),
  artistB: z.string().min(1, 'artistB is required'),
  maxHops: z.string().optional(),
});

const ArtistParamSchema = z.object({
  name: z.string().min(1, 'Artist name parameter is required'),
});

/**
 * Health & DB Status endpoint
 */
router.get('/status', async (_req: Request, res: Response) => {
  const status = getDBStatus();
  if (!status.tested) {
    await testConnection();
  }
  res.json(getDBStatus());
});

/**
 * Get entire network graph
 */
router.get('/graph', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 300;
    const graphData = await getFullGraph(limit);
    res.json(graphData);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve graph data', detail: err.message });
  }
});

/**
 * Search artists for live autocomplete
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    if (!query.trim()) {
      return res.json([]);
    }
    const results = await searchArtists(query, 10);
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: 'Search failed', detail: err.message });
  }
});

/**
 * Get Shortest Path between two artists
 */
router.get('/path', async (req: Request, res: Response) => {
  try {
    const validated = PathQuerySchema.parse(req.query);
    const pathResult = await getShortestPath(validated.artistA, validated.artistB);
    res.json(pathResult);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', issues: err.issues });
    }
    res.status(404).json({ error: err.message || 'No collaboration path found.' });
  }
});

/**
 * Get Alternate Paths (all paths up to 4 hops)
 */
router.get('/paths/all', async (req: Request, res: Response) => {
  try {
    const validated = AllPathsQuerySchema.parse(req.query);
    const max = validated.maxHops ? parseInt(validated.maxHops) : 4;
    const paths = await getAllPaths(validated.artistA, validated.artistB, max);
    if (paths.length === 0) {
      return res.status(404).json({ error: `No collaboration path found between "${validated.artistA}" and "${validated.artistB}".` });
    }
    res.json(paths);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', issues: err.issues });
    }
    res.status(500).json({ error: 'Failed to find alternate paths', detail: err.message });
  }
});

/**
 * Get single artist 1-hop neighborhood
 */
router.get('/artist/:name', async (req: Request, res: Response) => {
  try {
    const validated = ArtistParamSchema.parse(req.params);
    const neighborhood = await getArtistNeighborhood(validated.name);
    res.json(neighborhood);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Error', issues: err.issues });
    }
    res.status(404).json({ error: err.message || 'Artist not found.' });
  }
});

/**
 * Get top hub artists (degree centrality)
 */
router.get('/hubs', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const hubs = await getHubArtists(limit);
    res.json(hubs);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve hub artists', detail: err.message });
  }
});

/**
 * Get genre bridges (cross-genre structural connectors)
 */
router.get('/bridges', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 8;
    const bridges = await getGenreBridges(limit);
    res.json(bridges);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve genre bridges', detail: err.message });
  }
});

/**
 * Trigger manual re-seeding
 */
router.post('/seed', async (req: Request, res: Response) => {
  try {
    const useLive = req.body?.live === true;
    const result = await seedDatabase(useLive);
    res.json({ message: 'Database seeded successfully', ...result });
  } catch (err: any) {
    res.status(500).json({ error: 'Seeding failed', detail: err.message });
  }
});

export default router;
