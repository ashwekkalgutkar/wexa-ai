import * as https from 'https';
import * as http from 'http';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function checkUrl(url: string): Promise<{ status: number | string; type: string; acao: string }> {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http;
    const req = (lib as typeof https).get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'image/*,*/*',
        'Referer': 'https://en.wikipedia.org/',
      }
    }, (res) => {
      resolve({
        status: res.statusCode || 0,
        type: (res.headers['content-type'] || '').substring(0, 20),
        acao: res.headers['access-control-allow-origin'] || '-',
      });
      res.resume();
    });
    req.on('error', (e: Error) => resolve({ status: 'ERR:' + e.message.substring(0, 30), type: '', acao: '' }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ status: 'TIMEOUT', type: '', acao: '' }); });
  });
}

// All artist image URLs from seedData
const artistUrls: [string, string][] = [
  ['Kanye West', 'https://upload.wikimedia.org/wikipedia/commons/1/10/Kanye_West_at_the_Met_Gala_in_2019.jpg'],
  ['Daft Punk', 'https://upload.wikimedia.org/wikipedia/commons/a/ae/Daft_punk%21_%2814049777750%29.jpg'],
  ['Pharrell Williams', 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Pharrell_Williams.jpg'],
  ['Snoop Dogg', 'https://upload.wikimedia.org/wikipedia/commons/b/b4/Snoop_Dogg_2016.jpg'],
  ['Damon Albarn', 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Damon_Albarn_2014.jpg'],
  ['Gorillaz', 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Gorillaz_2017.jpg'],
  ['Noel Gallagher', 'https://upload.wikimedia.org/wikipedia/commons/3/36/Noel_Gallagher_2012.jpg'],
  ['Coldplay', 'https://upload.wikimedia.org/wikipedia/commons/2/22/Coldplay_2017.jpg'],
  ['BTS', 'https://upload.wikimedia.org/wikipedia/commons/0/07/BTS_for_Dispatch_%22Boy_With_Luv%22_MV_behind_the_scene_crop.jpg'],
  ['Kendrick Lamar', 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Kendrick_Lamar_2013.jpg'],
  ['Rihanna', 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Rihanna_2018.jpg'],
  ['Drake', 'https://upload.wikimedia.org/wikipedia/commons/1/18/Drake_in_2017.jpg'],
  ['Travis Scott', 'https://upload.wikimedia.org/wikipedia/commons/1/14/Travis_Scott_2019.jpg'],
  ['Jay-Z', 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Jay-Z_%22Answer_the_Call%22_2009.jpg'],
  ['Beyoncé', 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Beyonce.jpg'],
  ['Lady Gaga', 'https://upload.wikimedia.org/wikipedia/commons/3/32/Lady_Gaga_at_TIFF_2017.jpg'],
  ['Elton John', 'https://upload.wikimedia.org/wikipedia/commons/d/d1/Elton_John_2011.jpg'],
  ['Dua Lipa', 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Dua_Lipa_2020.jpg'],
  ['Miley Cyrus', 'https://upload.wikimedia.org/wikipedia/commons/7/74/Miley_Cyrus_2019.jpg'],
  ['Mark Ronson', 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Mark_Ronson_2015.jpg'],
  ['Bruno Mars', 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Bruno_Mars_2017.jpg'],
  ['Anderson .Paak', 'https://upload.wikimedia.org/wikipedia/commons/b/be/Anderson_.Paak_2019.jpg'],
  ['SZA', 'https://upload.wikimedia.org/wikipedia/commons/a/a2/SZA_2017.jpg'],
  ['Frank Ocean', 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Frank_Ocean_2017.jpg'],
  ['Tyler, The Creator', 'https://upload.wikimedia.org/wikipedia/commons/7/75/Tyler%2C_the_Creator_2019.jpg'],
  ['Earl Sweatshirt', 'https://upload.wikimedia.org/wikipedia/commons/1/12/Earl_Sweatshirt_2014.jpg'],
  ['Skrillex', 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Skrillex_2015.jpg'],
  ['Diplo', 'https://upload.wikimedia.org/wikipedia/commons/b/b9/Diplo_2015.jpg'],
  ['Justin Bieber', 'https://upload.wikimedia.org/wikipedia/commons/d/da/Justin_Bieber_in_2015.jpg'],
  ['Fred again..', 'https://upload.wikimedia.org/wikipedia/commons/0/07/Fred_Again_2022.jpg'],
  ['Brian Eno', 'https://upload.wikimedia.org/wikipedia/commons/1/10/Brian_Eno_2015.jpg'],
  ['David Bowie', 'https://upload.wikimedia.org/wikipedia/commons/e/e8/David-Bowie_Chicago_2014-09-23_FXP10441_%28cropped%29.jpg'],
  ['Queen', 'https://upload.wikimedia.org/wikipedia/commons/3/33/Queen_1977.jpg'],
  ['Trent Reznor', 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Trent_Reznor_2009.jpg'],
  ['Florence Welch', 'https://upload.wikimedia.org/wikipedia/commons/8/87/Florence_Welch_2018.jpg'],
  ['Jack Antonoff', 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Jack_Antonoff_2017.jpg'],
  ['Taylor Swift', 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Taylor_Swift_2018.jpg'],
  ['Bon Iver', 'https://upload.wikimedia.org/wikipedia/commons/9/90/Bon_Iver_2012.jpg'],
  ['Childish Gambino', 'https://upload.wikimedia.org/wikipedia/commons/6/69/Donald_Glover_2018.jpg'],
  ['21 Savage', 'https://upload.wikimedia.org/wikipedia/commons/4/4b/21_Savage_2018.jpg'],
  ['Ludwig Göransson', 'https://upload.wikimedia.org/wikipedia/commons/5/52/Ludwig_G%C3%B6ransson_2019.jpg'],
  ['A$AP Rocky', 'https://upload.wikimedia.org/wikipedia/commons/d/d4/A%24AP_Rocky_2019.jpg'],
  ['The Weeknd', 'https://upload.wikimedia.org/wikipedia/commons/a/a0/The_Weeknd_Cannes_2023.citation.jpg'],
  ['Charli xcx', 'https://upload.wikimedia.org/wikipedia/commons/8/88/Charli_XCX_2019.jpg'],
  ['Lorde', 'https://upload.wikimedia.org/wikipedia/commons/5/52/Lorde_2017.jpg'],
  ['Nile Rodgers', 'https://upload.wikimedia.org/wikipedia/commons/9/99/Nile_Rodgers_2014.jpg'],
  ['Kid Cudi', 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Kid_Cudi_2019.jpg'],
  ['Dr. Dre', 'https://upload.wikimedia.org/wikipedia/commons/1/1b/Dr_Dre_2011.jpg'],
  ['Grace Jones', 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Grace_Jones_2015.jpg'],
  ['Calvin Harris', 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Calvin_Harris_2012.jpg'],
  ['Ariana Grande', 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Ariana_Grande_at_Grammys_2020.png'],
  ['Kevin Parker', 'https://upload.wikimedia.org/wikipedia/commons/1/1d/Tame_Impala_2019.jpg'],
  ['Atticus Ross', 'https://upload.wikimedia.org/wikipedia/commons/1/13/Atticus_Ross_2011.jpg'],
];

(async () => {
  console.log('Checking artist portrait URLs (with Referer header, 400ms delay)...\n');
  let ok = 0, fail = 0;
  for (const [name, url] of artistUrls) {
    await sleep(400);
    const r = await checkUrl(url);
    const icon = (r.status === 200) ? '✓' : '✗';
    if (r.status === 200) ok++; else fail++;
    console.log(`${icon} ${String(r.status).padEnd(4)} CORS:${r.acao.padEnd(3)} ${name.padEnd(25)} ${url.split('/').pop()!.substring(0, 50)}`);
  }
  console.log(`\n=== RESULTS: ${ok} OK, ${fail} FAILED ===`);
})();
