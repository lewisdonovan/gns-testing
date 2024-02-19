'use strict'

const chromium = require('@sparticuz/chromium-min');
const puppeteer = require('puppeteer-core')
const cheerio = require('cheerio');
const getPrettyUrl = require('./getPrettyUrl').default;
const buildQueryString = require('./buildQueryString').default;
const getArticleContent = require('./getArticleContent').default;

const googleNewsScraper = async (userConfig) => {

  const config = Object.assign({
    prettyURLs: true, 
    getArticleContent: false, 
    timeframe: "7d", 
    puppeteerArgs: [], 
    useLambdaLayer: false, 
  }, userConfig);

  const isProd = process.env.NODE_ENV === 'production';

  const queryString = config.queryVars ? buildQueryString(config.queryVars) : ''
  const url = `https://news.google.com/search?${queryString}&q=${config.searchTerm} when:${config.timeframe || '7d'}`
    console.log(`SCRAPING NEWS FROM: ${url}`);

  const browser = isProd
    ? await puppeteer.launch({
      args: [...chromium.args.concat(config.puppeteerArgs).filter(Boolean), '--hide-scrollbars', '--disable-web-security'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(
        `https://github.com/Sparticuz/chromium/releases/download/v116.0.0/chromium-v116.0.0-pack.tar`
      ),
      headless: 'new',
      ignoreHTTPSErrors: true, 
      ignoreDefaultArgs: ['--disable-extensions'], 
    }) 
    : await puppeteer.launch({
      args: config.puppeteerArgs.filter(Boolean), 
      headless: 'new',
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', 
      ignoreDefaultArgs: ['--disable-extensions'], 
    });

  const page = await browser.newPage()
  // page.setViewport({ width: 1366, height: 768 })
  page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36')
  page.setRequestInterception(true)
  page.on('request', request => {
    if (!request.isNavigationRequest()) {
      request.continue()
      return
    }
    const headers = request.headers()
    headers['Accept'] = 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3'
    headers['Accept-Encoding'] = 'gzip'
    headers['Accept-Language'] = 'en-US,en;q=0.9,es;q=0.8'
    headers['Upgrade-Insecure-Requests'] = 1
    headers['Referer'] = 'https://www.google.com/'
    request.continue({ headers })
  })
  await page.setCookie({
    name: "CONSENT",
    value: `YES+cb.${new Date().toISOString().split('T')[0].replace(/-/g,'')}-04-p0.en-GB+FX+667`,
    domain: ".google.com"
  });
  await page.goto(url, { waitUntil: 'networkidle2' });

  try {
    await page.$(`[aria-label="Reject all"]`);
    await Promise.all([
      page.click(`[aria-label="Reject all"]`), 
      page.waitForNavigation({waitUntil: 'networkidle2'})
    ]);
  } catch (err) {
    // console.log("ERROR REJECTING COOKIES:", err);
  }

  const content = await page.content();
  const $ = cheerio.load(content);

  const articles = $('article');
  let results = []
  let i = 0
  const urlChecklist = []

  $(articles).each(function() {
    const link = $(this).find('a[href^="./article"]').attr('href').replace('./', 'https://news.google.com/') || false
    link && urlChecklist.push(link);
    const srcset = $(this).find('figure').find('img').attr('srcset')?.split(' ');
    const image = srcset && srcset.length 
      ? srcset[srcset.length-2] 
      : $(this).find('figure').find('img').attr('src');
    const mainArticle = {
      "title": $(this).find('h4').text() || $(this).find('div > div + div > div a').text(),
      "link": link,
      "image": image?.startsWith("/") ? `https://news.google.com${image}` : image,
      "source": $(this).find('div[data-n-tid]').text() || false,
      "datetime": new Date($(this).find('div:last-child time').attr('datetime')) || false,
      "time": $(this).find('div:last-child time').text() || false,
    }
    results.push(mainArticle)
    i++
  });

  if (config.prettyURLs) {
    results = await Promise.all(results.map(article => {
      const url = getPrettyUrl(article.link);
      article.link = url;
      return article;
    }));
  }

  if (config.getArticleContent) {
    const filterWords = config.filterWords || [];
    results = await getArticleContent(results, browser, filterWords);
  }

  await page.close();
  await browser.close()

  return results.filter(result => result.title)

}

module.exports = googleNewsScraper;