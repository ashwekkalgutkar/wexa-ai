import * as fs from 'fs';
import * as https from 'https';
import { SEED_COLLABORATIONS } from './src/services/seedData';

function searchiTunes(term: string): Promise<string | null> {
  return new Promise((resolve) => {
    const url = 'https://itunes.apple.com/search?term=' + encodeURIComponent(term) + '&entity=song&limit=1';
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.results && json.results.length > 0) {
            resolve(json.results[0].artworkUrl100.replace('100x100', '300x300'));
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  const collabs = SEED_COLLABORATIONS;
  let code = 'export const SEED_COLLABORATIONS: SeedCollaboration[] = [\n';
  
  for (let i = 0; i < collabs.length; i++) {
    const c = collabs[i];
    const searchTerm = c.from + ' ' + c.track_title;
    let cover = await searchiTunes(searchTerm);
    if (!cover) {
        cover = await searchiTunes(c.track_title);
    }
    
    code += `  { from: "${c.from}", to: "${c.to}", track_title: "${c.track_title.replace(/"/g, '\\"')}", year: ${c.year}, role: "${c.role}", image_url: ${cover ? '"' + cover + '"' : '""'} },\n`;
    
    await new Promise(r => setTimeout(r, 250));
  }
  code += '];\n';
  
  fs.writeFileSync('new_collabs.ts', code);
  console.log('Done writing new_collabs.ts');
})();
