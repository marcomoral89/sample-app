const express = require('express');
const app = express();
const axios = require('axios').default;
const basicAuth = require('express-basic-auth');
const port = 3000;
const bodyParser = require('body-parser');
var thinkificSub = '';
var accessToken = '';
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
require('dotenv').config();
process.env.USER_ID;
process.env.USER_KEY;
process.env.NODE_ENV;

// ROUTE - HOME PAGE
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// INSTALL URL
app.get('/install', (req, res) => {
  const subdomain = req.query.subdomain;
  thinkificSub = `https://${subdomain}.thinkific.com`;
  const redirect_uri = `http://localhost:${port}/authcodeflow`;

  // REDIRECT USER TO AUTH URL
  res.redirect(
    `https://${subdomain}.thinkific.com/oauth2/authorize?client_id=${process.env.USER_ID}&redirect_uri=${redirect_uri}&response_mode=query&response_type=code&scope=write:site_scripts`
  );
});

// REDIRECT URI/CALL BACK URL TO RETRIEVE CCESS TOKEN
app.get('/authcodeflow', (req, res) => {
  // BODY PARAMETERS
  const json = JSON.stringify({
    grant_type: 'authorization_code',
    code: req.query.code,
  });

  // BASE64 ENCODE CLIENT_ID AND CLIENT KEY
  const authKey = Buffer.from(
    process.env.USER_ID + ':' + process.env.USER_KEY
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
      res.send('Access Token = ' + 'Bearer ' + process.env.ACCESS_TOKEN);
    })
    .catch((error) => res.send(error));
});

// app.get('/integrations', (req, res) => {
//   res.sendFile(__dirname + '/views/integrations.html');
// });

// app.post('/integrations', (req, res) => {
//   console.log(req.body.authFlow);
//   res.send('thank you for the post');
// });

// SERVER PORT
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
