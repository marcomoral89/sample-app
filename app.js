const express = require('express');
const app = express();
const axios = require('axios').default;
const basicAuth = require('express-basic-auth');
const port = process.env.PORT || 8080;
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

app.use(cookieParser());

var thinkificSub = '';
var tokenValidation;

// ENV VARIABLES
require('dotenv').config();
process.env.CLIENT_KEY;
process.env.CLIENT_SECRET;
process.env.ACCESS_TOKEN;
process.env.NODE_ENV;

//INDEX
app.get('/', (req, res) => {
  if (req.cookies.token == null) {
    tokenValidation = false;
    res.render('pages/index', {
      tokenValidation: tokenValidation,
    });
  } else {
    tokenValidation = true;
    res.render('pages/index', {
      tokenValidation: tokenValidation,
    });
  }
});

app.post('/', (req, res) => {
  var installSub = req.body.subdomain.split('.');
  res.redirect(`http://localhost:${port}/install?subdomain=${installSub[0]}`);
});

// INSTALL URL
app.get('/install', (req, res) => {
  const subdomain = req.query.subdomain;
  const redirect_uri = `http://localhost:${port}/authcodeflow`;
  thinkificSub = `https://${subdomain}.thinkific.com`;

  res.redirect(
    `https://${subdomain}.thinkific.com/oauth2/authorize?client_id=${process.env.CLIENT_KEY}&redirect_uri=${redirect_uri}&response_mode=query&response_type=code`
  );
});

// CALL BACK URL
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
      // process.env.ACCESS_TOKEN = response.data.access_token;
      process.env.REFRESH_TOKEN = response.data.refresh_token;
      return (
        res.cookie('token', response.data.access_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        }),
        // res.cookie('refreshToken', response.data.refresh_token, {
        //   httpOnly: true,
        //   secure: process.env.NODE_ENV === 'production',
        // }),
        res.redirect(`http://localhost:${port}/app`)
      );
    })
    .catch((error) => res.send(error));
});

// APP URL
app.get('/app', (req, res) => {
  console.log('access token ' + req.cookies.token);
  console.log('refresh token ' + process.env.REFRESH_TOKEN);
  // console.log('refresh token ' + req.cookies.refreshToken);

  if (req.cookies.token == null) {
    tokenValidation = false;
    res.render('pages/app', {
      tokenValidation: tokenValidation,
    });
  } else {
    tokenValidation = true;
    res.render('pages/app', {
      tokenValidation: tokenValidation,
    });
  }
});

// API REQUEST ON POST
app.post('/app', (req, res) => {
  var method = req.body.method;
  var baseUrl = req.body.baseUrl;
  var bodyParams = req.body.bodyParams;

  // BASE64 ENCODE CLIENT_ID AND CLIENT KEY
  const authKey = Buffer.from(
    process.env.CLIENT_KEY + ':' + process.env.CLIENT_SECRET
  ).toString('base64');

  // REFRESH ACCESS TOKEN
  const refreshToken = async () => {
    try {
      const resp = await axios({
        method: 'post',
        url: thinkificSub + '/oauth2/token',
        headers: {
          Authorization: 'Basic ' + authKey,
          'Content-Type': 'application/json',
        },
        data: {
          grant_type: 'refresh_token',
          refresh_token: req.cookies.refreshToken,
        },
      });
      res.cookie('token', response.data.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
      res.cookie('refreshToken', response.data.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
    } catch (error) {
      console.log(error);
    }
  };

  // MAKE THE API CALL
  const sendRequest = async () => {
    try {
      const resp = await axios({
        method: method,
        url: baseUrl,
        headers: {
          Authorization: 'Bearer ' + req.cookies.token,
          'Content-Type': 'application/json',
        },
        data: bodyParams,
      });
      var respData = resp.data.items;
      // console.log(bodyParams);
      res.render('pages/response', {
        respData: respData,
      });
    } catch (error) {
      var errorMessage = error.message;
      if (errorMessage.includes('401')) {
        // console.log(error);
        res.render('pages/error', {
          errorMessage: errorMessage,
        });
      } else {
        res.render('pages/error', {
          errorMessage: errorMessage,
        });
      }
    }
  };
  sendRequest();
});

app.get('/token', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

// SERVER PORT
app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
