// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

export default async function handler(req, res) {
  const apiBaseUrl = `https://network.satnogs.org`;
  const fullUrl = `${apiBaseUrl}/api/observations/?id=&status=good&satellite__norad_cat_id=98728`;
  const response = await fetch(fullUrl);

  if (response.status == 200) {
    res.status(200).json(await response.json());
  } else {
    res.status(response.status);
  }
}
