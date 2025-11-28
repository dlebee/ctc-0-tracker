// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 60*10 }); // 10 min TTL

export default async function handler(req, res) {

  const cache_key = '__OBSERVATIONS';

  if (cache.has(cache_key)) {
    return res.status(200).json(cache.get(cache_key));
  }

  const apiBaseUrl = `https://network.satnogs.org`;
  // CTC-0, CTC-1A, CTC-1B, CTC-1C sat_ids
  const satIds = [
    'VWXG-4101-0824-5480-8078', // CTC-0
    'OTUO-9494-3471-7180-4596', // CTC-1A
    'CDDD-0280-4973-5946-866',  // CTC-1B
    'IJQV-1195-2515-8742-0084'  // CTC-1C
  ];
  
  // Fetch good observations for all 3 satellites
  const goodPromises = satIds.map(satId => 
    fetch(`${apiBaseUrl}/api/observations?status=good&sat_id=${satId}`)
  );
  const badPromises = satIds.map(satId => 
    fetch(`${apiBaseUrl}/api/observations?status=bad&sat_id=${satId}`)
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
  } else {
    result = allGoodData;
  }

  // Sort by date (newest first)
  result.sort((a, b) => {
    const aParsed = new Date(a.start);
    const bParsed = new Date(b.start);
    return bParsed - aParsed;
  });

  cache.set(cache_key, result);
  res.status(200).json(result);
}
