const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json());

// Enable CORS for all assets
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Configure static files with explicit CORS for the assets folder
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets'), {
    setHeaders: (res, path) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

// Assets dynamic scanning
app.get('/api/assets', (req, res) => {
    const assetsDir = path.join(__dirname, 'public', 'assets');
    const result = {};

    console.log(`[API] Checking directory: ${assetsDir}`);

    if (!fs.existsSync(assetsDir)) {
        console.error(`[API] Root assets directory NOT FOUND: ${assetsDir}`);
        return res.json({});
    }

    try {
        const categories = fs.readdirSync(assetsDir).filter(f => {
            return fs.statSync(path.join(assetsDir, f)).isDirectory();
        });

        console.log(`[API] Discovery - Found folders: ${categories.join(', ')}`);

        categories.forEach(cat => {
            const catDir = path.join(assetsDir, cat);
            const files = fs.readdirSync(catDir)
                .filter(file => /\.(png|jpg|jpeg|svg|webp)$/i.test(file));
            
            console.log(`[API] Processing category "${cat}": Found ${files.length} images`);
            
            result[cat.toLowerCase()] = files.map(file => ({
                id: file,
                name: file.split('.')[0],
                path: `/assets/${cat}/${file}`
            }));
        });
    } catch (err) {
        console.error(`[API] FATAL: Error during asset scanning:`, err);
    }

    res.json(result);
});

// Catch-all route to serve index.html - MOVED TO END
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API not found' });
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`PrismaX Brand Studio running on port ${PORT}`);
    });
}

module.exports = app;
