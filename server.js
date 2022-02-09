require('./models/db');

const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const expressEjsLayouts = require('express-ejs-layouts');
const logger = require('morgan')

/***Controllers */
const UserController = require('./controllers/UserController');
const PostController = require('./controllers/PostController');
const ProfileController = require('./controllers/ProfileController');

const session = require('express-session');

//Store sessions
var MongoDBStore = require('connect-mongodb-session')(session);

var store = new MongoDBStore({
  uri: 'mongodb://localhost:27017/SamerApp',
  collection: 'usersSessions'
});

var app = express();


app.use(bodyParser.urlencoded({
  extended: true
}))


//Ejs setup
app.use(expressEjsLayouts)
app.set('views', path.resolve(__dirname, 'views'));
app.set('layout', './layouts/main');
app.set('view engine', 'ejs');

app.use(logger('dev'))

//Serve images and static files
app.use(express.static(__dirname + '/uploads'));

//Setup session cookie
app.use(session({
  name:'sessionCookie', 
  cookie : {secure:false, maxAge: 1000 * 60 * 60 * 24 * 7, httpOnly: true},
  store: store,
  secret: 'sessionsecretkeyishere',
  saveUninitialized: true,
  resave: false,
  secure: true
}));

/*
app.use((req, res, next) => {

  console.log(`${req.method}  http://localhost:5000${req.path}  ${req.ip} `);
  next();
})*/

app.listen(5000, () =>{
  console.log('Express server started at port : 5000');
})




app.use('/',  UserController.router);
app.use('/', PostController);
app.use('/', ProfileController);