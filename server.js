const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Assets generic structure as requested
app.get('/api/assets', (req, res) => {
    // Return sample folder structure with placeholder colors to act as assets
    const assets = {
        logos: [
            { id: 'logo1', name: 'Primary Logo', type: 'placeholder', color: '#D4AF37' },
            { id: 'logo2', name: 'Secondary Logo', type: 'placeholder', color: '#8B6914' }
        ],
        badges: [
            { id: 'badge_reactive', name: 'Reactive', type: 'placeholder', color: '#ff4b4b' },
            { id: 'badge_assistive', name: 'Assistive', type: 'placeholder', color: '#4b88ff' },
            { id: 'badge_proactive', name: 'Proactive', type: 'placeholder', color: '#4bff4b' },
            { id: 'badge_exploratory', name: 'Exploratory', type: 'placeholder', color: '#ffb74b' },
            { id: 'badge_stabilized', name: 'Stabilized', type: 'placeholder', color: '#b74bff' },
            { id: 'badge_navigational', name: 'Navigational', type: 'placeholder', color: '#4bffb7' },
            { id: 'badge_groundbreaker', name: 'Groundbreaker', type: 'placeholder', color: '#ff4bb7' }
        ],
        overlays: [
            { id: 'overlay1', name: 'Gold Dust', type: 'placeholder', color: 'rgba(212, 175, 55, 0.5)' },
            { id: 'overlay2', name: 'Dark Vignette', type: 'placeholder', color: 'rgba(10, 5, 0, 0.5)' }
        ],
        stickers: [
            { id: 'sticker1', name: 'Prisma Star', type: 'placeholder', color: '#FFE566' },
            { id: 'sticker2', name: 'Prisma Arrow', type: 'placeholder', color: '#D4AF37' }
        ]
    };

    res.json(assets);
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`PrismaX Brand Studio running on port ${PORT}`);
    });
}

module.exports = app;
