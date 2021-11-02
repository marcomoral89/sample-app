const express = require('express');
const app = express();
const axios = require('axios').default;
const basicAuth = require('express-basic-auth');
const port = 3000;
const bodyParser = require('body-parser');
var thinkificSub = '';

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// ENV VARIABLES
require('dotenv').config();
process.env.CLIENT_KEY;
process.env.CLIENT_SECRET;
process.env.ACCESS_TOKEN;
process.env.TOKEN_EXPIRY;
process.env.REFRESH_TOKEN;
process.env.NODE_ENV;

// ROUTE - HOME PAGE
app.get('/', (req, res) => {
  res.render('pages/index');
});

app.post('/', (req, res) => {
  var installSub = req.body.subdomain.split('.');
  res.redirect(`http://localhost:3000/install?subdomain=${installSub[0]}`);
});

// INSTALL URL
app.get('/install', (req, res) => {
  const subdomain = req.query.subdomain;
  // thinkificSub = `https://${subdomain}.thinkific.com`;
  thinkificSub = `https://${subdomain}.thinkific.com`;

  const redirect_uri = `http://localhost:${port}/authcodeflow`;

  // REDIRECT USER TO AUTH PAGE
  res.redirect(
    `https://${subdomain}.thinkific.com/oauth2/authorize?client_id=${process.env.CLIENT_KEY}&redirect_uri=${redirect_uri}&response_mode=query&response_type=code&scope=write:site_scripts`
  );
});

// REDIRECT URI/CALL BACK URL TO RETRIEVE ACCESS TOKEN
app.get('/authcodeflow', (req, res) => {
  // BODY PARAMETERS
  const json = JSON.stringify({
    grant_type: 'authorization_code',
    code: req.query.code,
  });

  // BASE64 ENCODE CLIENT_ID AND CLIENT KEY
  const authKey = Buffer.from(
    process.env.CLIENT_KEY + ':' + process.env.CLIENT_SECRET
  ).toString('base64');

  // POST REQUEST TO RETRIEVE ACCESS TOKEN
  axios
    .post(thinkificSub + '/oauth2/token', json, {
      headers: {
        Authorization: 'Basic ' + authKey,
        'Content-Type': 'application/json',
      },
    })
    .then((response) => {
      process.env.ACCESS_TOKEN = response.data.access_token;
      process.env.TOKEN_EXPIRY = response.data.expires_in;
      process.env.REFRESH_TOKEN = response.data.refresh_token;

      res.redirect('http://localhost:3000/app');

      console.log(process.env);

      // res.sendFile(__dirname + '/views/authcodeflow.html');
    })
    .catch((error) => res.send(error));
});

// APP URL
app.get('/app', (req, res) => {
  res.render('pages/app');
});

// API REQUEST ON POST
app.post('/app', (req, res) => {
  var method = req.body.method;
  var baseUrl = req.body.baseUrl;
  var bodyParams = req.body.bodyParams;
  axios({
    method: method,
    url: baseUrl,
    headers: {
      Authorization: 'Bearer ' + process.env.ACCESS_TOKEN,
      'Content-Type': 'application/json',
    },
    data: bodyParams,
  })
    .then((response) => {
      res.send(response.data);
    })
    .catch((error) => {
      var errorMessage = error.message;
      res.render('pages/error', {
        errorMessage: errorMessage,
      });
    });
});

// SERVER PORT
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
