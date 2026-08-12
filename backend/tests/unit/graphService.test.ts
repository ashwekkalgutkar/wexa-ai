import {
  getShortestPath,
  getArtistNeighborhood,
  getHubArtists,
  getGenreBridges,
  searchArtists,
} from '../../src/services/graphService';

describe('Graph Service Unit Tests (Offline Fallback & Query Handling)', () => {
  it('should find shortest path between Kanye West and Daft Punk', async () => {
    const result = await getShortestPath('Kanye West', 'Daft Punk');
    expect(result).toBeDefined();
    expect(result.chain.length).toBeGreaterThanOrEqual(2);
    expect(result.chain[0].name.toLowerCase()).toBe('kanye west');
    expect(result.chain[result.chain.length - 1].name.toLowerCase()).toBe('daft punk');
    expect(result.links.length).toBe(result.chain.length - 1);
  });

  it('should throw explicit error when no path exists or artist is invalid', async () => {
    await expect(getShortestPath('NonExistentArtistXYZ123', 'Daft Punk')).rejects.toThrow(
      /No collaboration path found|not found/
    );
  });

  it('should retrieve artist 1-hop neighborhood for Daft Punk', async () => {
    const neighborhood = await getArtistNeighborhood('Daft Punk');
    expect(neighborhood.artist.name).toBe('Daft Punk');
    expect(neighborhood.neighbors.length).toBeGreaterThan(0);
    expect(neighborhood.links.length).toEqual(neighborhood.neighbors.length);
  });

  it('should calculate degree centrality for hub artists', async () => {
    const hubs = await getHubArtists(5);
    expect(hubs.length).toBe(5);
    expect(hubs[0].degree).toBeGreaterThanOrEqual(hubs[1].degree || 0);
  });

  it('should return cross-genre bridge artists with diversity scores', async () => {
    const bridges = await getGenreBridges(5);
    expect(bridges.length).toBeGreaterThan(0);
    expect(bridges[0].diversityScore).toBeGreaterThanOrEqual(2);
  });

  it('should return matching artist search results for query', async () => {
    const searchRes = await searchArtists('Kanye', 5);
    expect(searchRes.length).toBeGreaterThan(0);
    expect(searchRes[0].name).toContain('Kanye');
  });
});
