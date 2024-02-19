const express = require('express');
const cors = require('cors');
const googleNewsScraper = require("../gns");
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json()); 
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api', async (req, res) => {
  try {
    let timer = 0;
    const interval = setInterval(() => {
      timer++
    }, 1);
    const articles = await googleNewsScraper({
      searchTerm: "The Oscars",
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
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

module.exports = app;