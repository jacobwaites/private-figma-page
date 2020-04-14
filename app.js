require('dotenv').config();
const path = require('path');
const express = require('express');
const app = express();
const cookieSession = require('cookie-session');
const bodyParser = require('body-parser');
const server = require('http').Server(app);
const handlebars = require("handlebars");
const fs = require("fs")

app.set('trust proxy', true);
app.disable('x-powered-by');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let admins = {}

admins[process.env.SITE_USERNAME] = {
    password: process.env.SITE_PASSWORD
}

app.use(cookieSession({
    name: 'session',
    secret: process.env.COOKIE_SECRET,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 4 * 7 * 24 * 60 * 60 * 1000 // 4 weeks
}));


// auth
// ---------------------------------------------------------- 
var isAuth = function (req, res, next) {
    let user = req.session.user;
    let password = req.session.password;
    if (user && password && admins[user] && admins[user].password === password) {
        next()
        return;
    }
    return res.redirect('/login')
}

app.get('/login', (req, res, next) => {
    fs.readFile(path.resolve(__dirname, 'public/auth.html'), 'utf-8', function (err, content) {
        var page = handlebars.compile(content.toString().trim());
        res.send(page({ error: false, title: process.env.SITE_TITLE }));
    });
});

app.post('/login', (req, res, next) => {
    let username = req.body.username;
    let password = req.body.password;
    console.log(req.body);

    if (username && password && admins[username] && admins[username].password === password) {
        req.session.user = username;
        req.session.password = password;
        return res.redirect('/')
    }
    fs.readFile(path.resolve(__dirname, 'public/auth.html'), 'utf-8', function (err, content) {
        var page = handlebars.compile(content.toString().trim());
        res.send(page({ error: 'Incorrect username or password', username: username, password: password, title: process.env.SITE_TITLE }));
    });
});

app.get('/logout', (req, res, next) => {
    req.session = null
    return res.redirect('/login')
});

// serve static
// ---------------------------------------------------------- 
app.use('/css', isAuth, express.static(path.join(__dirname, 'public/css')));
app.use('/img', isAuth, express.static(path.join(__dirname, 'public/img')));

app.get('/', isAuth, (req, res, next) => {
    fs.readFile(path.resolve(__dirname, 'public/index.html'), 'utf-8', function (err, content) {
        var page = handlebars.compile(content.toString().trim());
        res.send(page({ figma_url: process.env.FIGMA_URL, title: process.env.SITE_TITLE }));
    });
})

const port = process.env.PORT || 4000;

server.listen(port, () => {
    console.log(`server: listening on http://127.0.0.1:${port}`);
});
