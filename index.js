const express = require('express');
const cors = require('cors');
const googleNewsScraper = require("./gns");

const app = express();
app.use(cors());

app.get('/', async (req, res) => {
  try {
    let timer = 0;
    const interval = setInterval(() => {
      timer++
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
    res.json({
      articles, timer
    })
  } catch (err) {
    console.error(err);
    res.json({error: err});
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;