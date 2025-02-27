const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const helmet = require('helmet');

app.use(helmet());

app.use(compression({
    level: 6,
    threshold: 100 * 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100, 
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use(limiter);

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.set('view engine', 'ejs');
app.set('trust proxy', 1);

app.post('/player/login/dashboard', (req, res) => {
    let userData = {};
    try {
        const rawData = req.body.data;
        const dataLines = rawData.split('\\n');
        dataLines.forEach(line => {
            const [key, value] = line.split('|');
            if (key && value) {
                userData[key] = value;
            }
        });
        if (userData.username && userData.password) {
            return res.redirect('/player/growid/login/validate');
        }
    } catch (error) {
        console.error(`Error processing data: ${error.message}`);
        return res.status(400).send('Bad Request');
    }
    res.render('dashboard', { data: userData });
});

app.post('/player/growid/login/validate', (req, res) => {
    const { _token, growId, password } = req.body;
    if (!_token || !growId || !password) {
        return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    const token = Buffer.from(`_token=${_token}&growId=${growId}&password=${password}`).toString('base64');
    res.json({
        status: 'success',
        message: 'Account validated successfully.',
        token: token,
        accountType: 'growtopia'
    });
});

app.use('/player/*', (req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
});

app.get('/', (req, res) => {
    res.send('Welcome to the API');
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(8080, () => {
    console.log('Server is running on port 8080');
});
