// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 60*10 }); // 10 min TTL

export default async function handler(req, res) {

  const cache_key = '__OBSERVATIONS';

  if (cache.has(cache_key)) {
    return res.status(200).json(cache.get(cache_key));
  }

  const apiBaseUrl = `https://network.satnogs.org`;
  const noradIds = ['98482', '98481', '98480']; // CTC-1A, CTC-1B, CTC-1C
  
  // Fetch good observations for all 3 satellites
  const goodPromises = noradIds.map(id => 
    fetch(`${apiBaseUrl}/api/observations?status=good&satellite__norad_cat_id=${id}`)
  );
  const badPromises = noradIds.map(id => 
    fetch(`${apiBaseUrl}/api/observations?status=bad&satellite__norad_cat_id=${id}`)
  );
  
  const [goodResponses, badResponses] = await Promise.all([
    Promise.all(goodPromises),
    Promise.all(badPromises)
  ]);

  // Collect all good data
  let allGoodData = [];
  for (const response of goodResponses) {
    if (response.status == 200) {
      const data = await response.json();
      allGoodData = allGoodData.concat(data);
    }
  }

  // Collect all bad data
  let allBadData = [];
  for (const response of badResponses) {
    if (response.status == 200) {
      const data = await response.json();
      allBadData = allBadData.concat(data);
    }
  }

  let result;
  if (allBadData.length > 0) {
    result = allGoodData.concat(allBadData);
    result.sort((a, b) => {
      const aParsed = new Date(a.start);
      const bParsed = new Date(b.start);
      return bParsed - aParsed;
    });
  } else {
    result = allGoodData;
  }

  cache.set(cache_key, result);
  res.status(200).json(result);
}
