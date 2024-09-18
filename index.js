require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const url = require('url');
const mongoose = require('mongoose');
const { debug } = require('console');
const res = require('express/lib/response');
mongoose.connect(process.env.DATABASE_CONNECTION_STRING, { useNewUrlParser: true, useUnifiedTopology: true });

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

const urlSchema = new mongoose.Schema ({
  url: {
    type: String,
    required: true
  },
  short_url: {
    type: Number,
    required: true
  }
})

const Url = mongoose.model('Url', urlSchema);

//version with done() Node convention
const findUrl = (url, done) => {
  Url.findOne({url: url}, (err, data) => {
    if (err) return done(err);
    done(null, data);
  })
}

const urlCount = (done) => {
  Url.countDocuments((err, urlCount) => {
    if (err) return done(err);
    done(null, urlCount);
  })
}

const saveUrl = (url, done) => {
  url.save(url, (err, data) => {
    if (err) return done(err);
    done(null, data);
  })
}   

const findUrlByShortUrl = async (shortUrl) => {
  try {
    return await Url.findOne({short_url: shortUrl});
  }
  catch (err) {
    console.error("Error finding document:", err);
    throw err;
  }
}

const sendUrl = (res, original_url, short_url) => {
  res.json({original_url: original_url, short_url: short_url});
}

app.use('/api/shorturl', bodyParser.urlencoded({extended: false}));
app.post('/api/shorturl', (req, res) => {
  console.log(">>>Input URL:", req.body.url);
  //check if the URL is valid, containing a host name
  if (url.parse(req.body.url).hostname) {
    //query DB to see if the URL is already in it
    findUrl(req.body.url, (err, data) => {
      //if the URL is not already in the database
      if (!data) {
        //count the number of documents in the database
        urlCount((err, urlCount) => {
          //use the document count to increase the next short_url by 1
            const url = new Url({url: req.body.url, short_url: urlCount + 1});
            //save the new document
            saveUrl(url, (err, data => {
              //send back the JSON with the newly saved URL
              console.log("url:", url);
              sendUrl(res, url.url, url.short_url);
            }))
        })
      } 
      //if the URL is already in the database, send back the JSON with the existing URL
      else { sendUrl(res, data.url, data.short_url); }
    })
  } else {
    res.json({error: "invalid url"});
  }
})

app.get('/api/shorturl/:shorturl', (req, res) => {
  findUrlByShortUrl(req.params.shorturl)
    .then(data => { 
      if (data) {
        res.redirect(data.url);
      } else {
        res.json({error:"No short URL found for the given input"}); 
      }
    })
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
