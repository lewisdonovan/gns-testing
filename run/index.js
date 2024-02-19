const googleNewsScraper = require("../index");

(async () => {
  let count = 0;
  const interval = setInterval(() => {
    count++
  }, 1);
  const articles = await googleNewsScraper({
    searchTerm: "Kim Kardashian",
    prettyURLs: true,
    getArticleContent: false, 
    queryVars: {
      hl:"en-US",
      gl:"US",
      ceid:"US:en"
    },
    timeframe: "5d",
    puppeteerArgs: [
      "--no-sandbox", 
      "--disable-setuid-sandbox"
    ], 
    useLambdaLayer: true, 
  });
  clearInterval(interval);
  console.log(articles);
  console.log(`FOUND ${articles.length} ARTICLES IN ${count/1000} SECONDS`);
})();
