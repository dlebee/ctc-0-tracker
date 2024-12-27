// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 60*10 }); // 10 min TTL

export default async function handler(req, res) {

  const cache_key = '__OBSERVATIONS';

  if (cache.has(cache_key)) {
    return res.status(200).json(cache.get(cache_key));
  }

  const apiBaseUrl = `https://network.satnogs.org`;
  //const fullUrl = `${apiBaseUrl}/api/observations?status=good&satellite__norad_cat_id=98728`;
  const fullUrl = `${apiBaseUrl}/api/observations?&satellite__norad_cat_id=98728`;
  const response = await fetch(fullUrl);

  if (response.status == 200) {
    const json = await response.json();
    cache.set(cache_key, json);
    res.status(200).json(json);
  } else {
    console.log('failed for reason', response.statusText, await response.text());
    res.status(response.status);
  }
}
