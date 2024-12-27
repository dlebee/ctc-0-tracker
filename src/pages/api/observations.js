// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 60*10 }); // 10 min TTL

export default async function handler(req, res) {

  const cache_key = '__OBSERVATIONS';

  if (cache.has(cache_key)) {
    return res.status(200).json(cache.get(cache_key));
  }

  const apiBaseUrl = `https://network.satnogs.org`;
  const goodUrl = `${apiBaseUrl}/api/observations?status=good&satellite__norad_cat_id=98728`;
  const badUrl = `${apiBaseUrl}/api/observations?status=bad&satellite__norad_cat_id=98728`;
  const responseGood = await fetch(goodUrl);
  const responseBad = await fetch(badUrl);
  
  if (responseGood.status != 200) {
    res.status(response.status);
    return;
  }

  // get good data.
  const goodData = await responseGood.json();

  let result;
  if (responseBad.status == 200) {
    const badData = await responseBad.json();
    result = goodData.concat(badData);
    result.sort((a, b) => {
      const aParsed = new Date(a.start);
      const bParsed = new Date(b.start);
      return bParsed - aParsed;
    })
  } else {
    result = goodData;
  }

  cache.set(cache_key, result);
  res.status(200).json(result);
}
