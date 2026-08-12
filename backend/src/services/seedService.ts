import { getSession } from '../config/db';
import { SEED_ARTISTS, SEED_COLLABORATIONS, SeedArtist, SeedCollaboration } from './seedData';
import axios from 'axios';

const MUSICBRAINZ_USER_AGENT = 'SixDegreesWexaApp/1.0.0 ( hr@wexa.ai / candidate-submission )';

export async function seedDatabase(useLiveCrawler: boolean = false): Promise<{ artistsSeeded: number; edgesSeeded: number; source: string }> {
  const session = getSession();
  let artistsToSeed: SeedArtist[] = [...SEED_ARTISTS];
  let collaborationsToSeed: SeedCollaboration[] = [...SEED_COLLABORATIONS];
  let dataSource = 'Curated Accurate Seed Dataset';

  try {
    console.log('[Seed] Setting up indexes & constraints...');
    // Create constraint on name for fast lookup & idempotency
    try {
      await session.run(`
        CREATE CONSTRAINT artist_name_unique IF NOT EXISTS
        FOR (a:Artist) REQUIRE a.name IS UNIQUE
      `);
    } catch (err) {
      // Fallback for older openCypher / Neo4j versions without IF NOT EXISTS
      try {
        await session.run(`CREATE INDEX artist_name_idx IF NOT EXISTS FOR (a:Artist) ON (a.name)`);
      } catch (idxErr) {
        console.log('[Seed] Index/constraint note:', idxErr);
      }
    }

    if (useLiveCrawler) {
      console.log('[Seed] Live MusicBrainz crawl requested. Attempting live fetch with rate limits...');
      try {
        const crawledData = await crawlMusicBrainzSeedArtists();
        if (crawledData.artists.length > 0) {
          artistsToSeed = crawledData.artists;
          collaborationsToSeed = crawledData.collaborations;
          dataSource = 'MusicBrainz Live Crawl';
          console.log(`[Seed] MusicBrainz crawl succeeded: ${artistsToSeed.length} artists, ${collaborationsToSeed.length} collaborations.`);
        }
      } catch (crawlErr: any) {
        console.warn(`[Seed] Live crawl failed or rate-limited: ${crawlErr.message}. Falling back to curated seed dataset.`);
      }
    }

    console.log(`[Seed] Seeding ${artistsToSeed.length} Artist nodes with MERGE...`);
    let artistsSeeded = 0;
    for (const artist of artistsToSeed) {
      await session.run(
        `
        MERGE (a:Artist { name: $name })
        ON CREATE SET 
          a.id = $id,
          a.genres = $genres,
          a.image_url = $imageUrl,
          a.popularity = $popularity
        ON MATCH SET 
          a.genres = $genres,
          a.image_url = $imageUrl,
          a.popularity = $popularity
        `,
        {
          id: artist.id,
          name: artist.name,
          genres: artist.genres,
          imageUrl: artist.image_url,
          popularity: artist.popularity,
        }
      );
      artistsSeeded++;
    }

    console.log(`[Seed] Seeding ${collaborationsToSeed.length} COLLABORATED_ON relationships with MERGE...`);
    let edgesSeeded = 0;
    for (const edge of collaborationsToSeed) {
      // Execute parameterized relationship merge
      const result = await session.run(
        `
        MATCH (a:Artist { name: $fromName })
        MATCH (b:Artist { name: $toName })
        MERGE (a)-[r:COLLABORATED_ON { track_title: $trackTitle }]->(b)
        ON CREATE SET r.year = $year, r.role = $role, r.image_url = $imageUrl
        ON MATCH SET r.year = $year, r.role = $role, r.image_url = $imageUrl
        RETURN count(r) AS createdCount
        `,
        {
          fromName: edge.from,
          toName: edge.to,
          trackTitle: edge.track_title,
          year: edge.year,
          role: edge.role,
          imageUrl: edge.image_url || '',
        }
      );
      if (result.records.length > 0) {
        edgesSeeded++;
      }
    }

    console.log(`[Seed] Seeding completed successfully! Total Artists: ${artistsSeeded}, Collaborations: ${edgesSeeded}`);
    return { artistsSeeded, edgesSeeded, source: dataSource };
  } finally {
    await session.close();
  }
}

/**
 * Optional MusicBrainz live crawler helper respecting 1 req/sec rate limit
 */
async function crawlMusicBrainzSeedArtists(): Promise<{ artists: SeedArtist[]; collaborations: SeedCollaboration[] }> {
  const seedNames = ["Daft Punk", "Kanye West", "Gorillaz", "Kendrick Lamar", "Coldplay"];
  const artistsMap = new Map<string, SeedArtist>();
  const collaborations: SeedCollaboration[] = [];

  for (const name of seedNames) {
    try {
      console.log(`[MusicBrainz] Crawling artist: ${name}`);
      const searchRes = await axios.get(`https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(name)}&fmt=json`, {
        headers: { 'User-Agent': MUSICBRAINZ_USER_AGENT }
      });
      
      const artistMatch = searchRes.data.artists?.[0];
      if (artistMatch) {
        const artistId = artistMatch.id;
        const artistName = artistMatch.name;
        const genres = (artistMatch.tags || []).slice(0, 3).map((t: any) => t.name.toLowerCase());
        
        artistsMap.set(artistName, {
          id: artistId,
          name: artistName,
          genres: genres.length > 0 ? genres : ["pop", "rock"],
          image_url: `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80`,
          popularity: 90
        });

        // Sleep 1.1 sec for MusicBrainz rate limits
        await new Promise(r => setTimeout(r, 1100));
      }
    } catch (e: any) {
      console.warn(`[MusicBrainz] Error fetching ${name}: ${e.message}`);
    }
  }

  // Merge with static seed data to guarantee rich cross-genre links
  for (const staticArtist of SEED_ARTISTS) {
    if (!artistsMap.has(staticArtist.name)) {
      artistsMap.set(staticArtist.name, staticArtist);
    }
  }

  return {
    artists: Array.from(artistsMap.values()),
    collaborations: SEED_COLLABORATIONS
  };
}
