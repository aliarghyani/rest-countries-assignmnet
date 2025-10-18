export const sampleCountries: any[] = [
  {
    name: { common: 'Poland' },
    flags: { png: 'https://flagcdn.com/w320/pl.png', alt: 'Flag of Poland' },
    population: 37950802,
    region: 'Europe',
    capital: ['Warsaw'],
    cca3: 'POL',
    borders: ['DEU']
  },
  {
    name: { common: 'Germany' },
    flags: { png: 'https://flagcdn.com/w320/de.png', alt: 'Flag of Germany' },
    population: 83240525,
    region: 'Europe',
    capital: ['Berlin'],
    cca3: 'DEU'
  },
  {
    name: { common: 'Brazil' },
    flags: { png: 'https://flagcdn.com/w320/br.png', alt: 'Flag of Brazil' },
    population: 203062512,
    region: 'Americas',
    capital: ['Brasília'],
    cca3: 'BRA'
  },
  {
    name: { common: 'Japan' },
    flags: { png: 'https://flagcdn.com/w320/jp.png', alt: 'Flag of Japan' },
    population: 125710000,
    region: 'Asia',
    capital: ['Tokyo'],
    cca3: 'JPN'
  }
];

export const json = (data: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(data)
});

export const mockRestCountries = async (page: import('@playwright/test').Page) => {
  const base = 'https://restcountries.com/v3.1';

  await page.route(`${base}/all*`, async route => {
    await route.fulfill(json(sampleCountries));
  });

  await page.route(new RegExp(`${base}/name/([^/?#]+)`), async route => {
    const url = new URL(route.request().url());
    const q = decodeURIComponent(url.pathname.split('/').pop() || '').toLowerCase();
    const result = sampleCountries.filter(c => c.name.common.toLowerCase().includes(q));
    await route.fulfill(json(result));
  });

  await page.route(new RegExp(`${base}/alpha$`), async route => {
    const url = new URL(route.request().url());
    const codes = (url.searchParams.get('codes') || '').split(',').map(c => c.trim().toUpperCase());
    const result = sampleCountries.filter(c => codes.includes((c.cca3 || '').toUpperCase()));
    await route.fulfill(json(result));
  });

  await page.route(new RegExp(`${base}/alpha/([A-Za-z]{2,3})`), async route => {
    const code = route.request().url().split('/').pop()!.toUpperCase();
    const result = sampleCountries.find(c => (c.cca3 || '').toUpperCase() === code);
    await route.fulfill(json(result ? [result] : []));
  });
};
