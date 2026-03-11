const CANVAS_RATIOS = {
    square: { w: 1080, h: 1080 },
    landscape: { w: 1920, h: 1080 },
    portrait: { w: 1080, h: 1920 },
    banner: { w: 1200, h: 630 }
};

let canvas;
let virtualFormat = { w: 1080, h: 1080 }; // Default
let isMobile = window.innerWidth < 768;

// History State Management
const MAX_HISTORY = 50;
let historyStack = [];
let redoStack = [];
let isHistoryAction = false;

// Arrow Connection State
let isArrowMode = false;
let firstArrowTarget = null;
let connections = []; // Array of objects { from: objId, to: objId, line: fabObj }

// Font List configuration
const fontsList = [
    "Caveat", "Caveat Brush", "Kalam", "Patrick Hand", "Permanent Marker", "Indie Flower", 
    "Shadows Into Light", "Dancing Script", "Pacifico", "Satisfy", "Amatic SC", "Gloria Hallelujah", 
    "Rock Salt", "Architects Daughter", "Coming Soon", "Handlee", "Gochi Hand", "Reenie Beanie", 
    "Just Another Hand", "Covered By Your Grace", "Bebas Neue", "Anton", "Oswald", "Righteous", 
    "Audiowide", "Orbitron", "Fredoka", "Lilita One", "Cinzel", "Cinzel Decorative", 
    "Cormorant Garamond", "Playfair Display", "IM Fell English", "Libre Baskerville", 
    "Montserrat", "Raleway", "Nunito", "Quicksand", "Poppins"
];

const PRESET_SOLID_BGS = ['#000000', '#3e2723', '#ffffff', '#fdfbf7', '#001f3f', '#013220'];
const PRESET_GRAD_BGS = [
    { name: 'Dark Gold', css: 'linear-gradient(45deg, #221a00, #D4AF37)', type: 'linear', coords: { x1: 0, y1: 0, x2: 1, y2: 1 }, colorStops: [{offset: 0, color: '#221a00'}, {offset: 1, color: '#D4AF37'}] },
    { name: 'Cosmic', css: 'linear-gradient(45deg, #0f0c29, #302b63, #24243e)', type: 'linear', coords: { x1: 0, y1: 0, x2: 1, y2: 1 }, colorStops: [{offset: 0, color: '#0f0c29'}, {offset: 0.5, color: '#302b63'}, {offset: 1, color: '#24243e'}] },
    { name: 'Electric', css: 'linear-gradient(45deg, #1CB5E0, #000046)', type: 'linear', coords: { x1: 0, y1: 0, x2: 1, y2: 1 }, colorStops: [{offset: 0, color: '#1CB5E0'}, {offset: 1, color: '#000046'}] }
];

document.addEventListener("DOMContentLoaded", () => {
    initUI();
    initFonts();
    initBgPalettes();
    loadAssets();
    
    // Modal Listeners
    document.querySelectorAll('.ratio-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const w = parseInt(btn.dataset.width);
            const h = parseInt(btn.dataset.height);
            startStudio(w, h);
        });
    });

    document.getElementById('btn_custom_ratio').addEventListener('click', () => {
        const w = parseInt(document.getElementById('custom_w').value) || 800;
        const h = parseInt(document.getElementById('custom_h').value) || 600;
        startStudio(w, h);
    });

    window.addEventListener('resize', handleResize);
});

function initUI() {
    // Navigation routing
    const switchTab = (targetId, tabName) => {
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        
        const panel = document.getElementById(targetId);
        if(panel) panel.classList.add('active');
        
        // Mobile sheets handling
        if (isMobile) {
            document.getElementById('mobile_tabs').style.display = 'none';
            if (targetId === 'panel_props') {
                document.getElementById('right_sidebar').classList.add('sheet-open');
                document.getElementById('left_sidebar').classList.remove('sheet-open');
            } else {
                if (tabName && document.getElementById('mobile_tools_title')) {
                    document.getElementById('mobile_tools_title').innerText = tabName.toUpperCase();
                }
                document.getElementById('right_sidebar').classList.remove('sheet-open');
                document.getElementById('left_sidebar').classList.add('sheet-open');
            }
        }
    };

    document.querySelectorAll('.nav-tab[data-target]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll(`.nav-tab[data-target="${btn.dataset.target}"]`).forEach(t => t.classList.add('active'));
            switchTab(btn.dataset.target, btn.innerText.trim());
        });
    });

    // Close sheets for both sidebars on mobile
    document.querySelectorAll('.close-sheet').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('right_sidebar').classList.remove('sheet-open');
            document.getElementById('left_sidebar').classList.remove('sheet-open');
            // Remove active states from tabs so they can be clicked again
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            if(isMobile) document.getElementById('mobile_tabs').style.display = 'flex';
        });
    });

    // Sub tabs
    document.querySelectorAll('.sub-tab').forEach(t => {
        t.addEventListener('click', () => {
            t.parentElement.querySelectorAll('.sub-tab').forEach(btn => btn.classList.remove('active'));
            t.classList.add('active');
            const targetId = t.dataset.sub;
            t.parentElement.parentElement.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Export Binding
    document.getElementById('btn_top_export').addEventListener('click', exportCanvas);
    document.getElementById('btn_mobile_export').addEventListener('click', exportCanvas);

    // Tools
    document.getElementById('btn_add_heading')?.addEventListener('click', () => addText('h1'));
    document.getElementById('btn_add_subheading')?.addEventListener('click', () => addText('h2'));
    document.getElementById('btn_add_body')?.addEventListener('click', () => addText('body'));
    document.getElementById('btn_ratio_change').addEventListener('click', () => document.getElementById('startup_modal').classList.remove('hidden'));

    // Layers & History
    document.getElementById('btn_undo').addEventListener('click', undo);
    document.getElementById('btn_redo').addEventListener('click', redo);
    document.getElementById('btn_bring_front').addEventListener('click', () => bringLayer('front'));
    document.getElementById('btn_send_back').addEventListener('click', () => bringLayer('back'));
    document.getElementById('btn_delete').addEventListener('click', deleteSelected);
    document.getElementById('btn_duplicate')?.addEventListener('click', duplicateSelected);
    
    document.getElementById('btn_group').addEventListener('click', toggleGroup);

    // Arrow tool init
    document.getElementById('btn_add_arrow').addEventListener('click', function() {
        isArrowMode = !isArrowMode;
        showToast(isArrowMode ? "Arrow Mode: Tap two elements to connect" : "Arrow Mode Disabled");
        if(isArrowMode) {
            this.classList.add('active');
            this.style.background = 'var(--bg-dark)';
            this.style.color = 'var(--primary-gold)';
            this.style.border = '1px solid var(--primary-gold)';
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            firstArrowTarget = null;
        } else {
            this.classList.remove('active');
            this.style.background = '';
            this.style.color = '';
            this.style.border = '';
        }
    });
    
    document.getElementById('btn_add_rect')?.addEventListener('click', () => addShape('rect'));
    document.getElementById('btn_add_circle')?.addEventListener('click', () => addShape('circle'));
    document.getElementById('btn_add_diamond')?.addEventListener('click', () => addShape('diamond'));
    document.getElementById('btn_add_triangle')?.addEventListener('click', () => addShape('triangle'));
    document.getElementById('btn_add_hexagon')?.addEventListener('click', () => addShape('hexagon'));
    document.getElementById('btn_add_star')?.addEventListener('click', () => addShape('star'));
    
    document.getElementById('btn_add_free_arrow')?.addEventListener('click', addFreeArrow);

    // Color Swatches Init
    updateRecentColorsUI();
    document.querySelectorAll('input[type="color"]').forEach(input => {
        input.addEventListener('change', (e) => {
            if(e.target.value) {
                 recentColors.add(e.target.value);
                 updateRecentColorsUI();
            }
        });
    });

    // Property Bindings
    bindPropertiesPanel();
}

function startStudio(w, h) {
    virtualFormat.w = w;
    virtualFormat.h = h;
    document.getElementById('startup_modal').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    
    if(!canvas) {
        initFabric();
    }
    
    resizeCanvas(true);
    saveHistory(); // Initial state
}

function initFabric() {
    canvas = new fabric.Canvas('c', {
        preserveObjectStacking: true,
        selectionColor: 'rgba(212, 175, 55, 0.3)',
        selectionBorderColor: '#D4AF37',
        selectionLineWidth: 2
    });

    // Custom Corner styling for mobile friendliness (min 44px targets physically, adjust control visual)
    fabric.Object.prototype.set({
        transparentCorners: false,
        cornerColor: '#D4AF37',
        cornerStrokeColor: '#0a0500',
        borderColor: '#D4AF37',
        cornerSize: isMobile ? 24 : 12,
        padding: 10,
        cornerStyle: 'circle'
    });

    // Custom Rotation icon just above the element
    const rotateImg = new Image();
    rotateImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%230a0500' d='M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0020 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 004 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z'/%3E%3C/svg%3E";
    
    if(fabric.Object.prototype.controls && fabric.Object.prototype.controls.mtr) {
        fabric.Object.prototype.controls.mtr.cursorStyle = 'grab';
        fabric.Object.prototype.controls.mtr.render = function(ctx, left, top, styleOverride, fabricObject) {
            const size = isMobile ? 32 : 24;
            ctx.save();
            ctx.translate(left, top);
            ctx.beginPath();
            ctx.arc(0, 0, size/2, 0, 2 * Math.PI, false);
            ctx.fillStyle = '#D4AF37';
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#0a0500';
            ctx.stroke();
            if(rotateImg.complete) {
                // Draw the icon centered
                ctx.drawImage(rotateImg, -size/2 + 2, -size/2 + 2, size - 4, size - 4);
            }
            ctx.restore();
        }
    }

    // Arrow mode connection handler
    canvas.on('mouse:down', function(options) {
        if(isArrowMode && options.target) {
            if(!firstArrowTarget) {
                firstArrowTarget = options.target;
                if(!firstArrowTarget.id) firstArrowTarget.id = 'obj_' + Date.now();
                showToast("Now tap second element to complete arrow");
            } else {
                if(firstArrowTarget !== options.target) {
                    if(!options.target.id) options.target.id = 'obj_' + Date.now();
                    drawConnection(firstArrowTarget, options.target);
                }
                isArrowMode = false;
                firstArrowTarget = null;
                showToast("Connected!");
            }
        }
    });

    canvas.on('selection:created', updatePropsPanel);
    canvas.on('selection:updated', updatePropsPanel);
    canvas.on('selection:cleared', updatePropsPanel);

    // History & Prop Sync
    canvas.on('object:modified', () => { updatePropsPanel(); saveHistory(); });
    canvas.on('object:added', () => { if(!isHistoryAction) saveHistory(); });
    canvas.on('object:removed', () => { if(!isHistoryAction) saveHistory(); });
    
    canvas.on('selection:created', (e) => { updateConnections(); updatePropsPanel(); });
    canvas.on('selection:updated', (e) => { updateConnections(); updatePropsPanel(); });
    canvas.on('selection:cleared', (e) => { updateConnections(); updatePropsPanel(); });

    canvas.on('object:moving', (e) => {
        updateConnections();
        if (!e.target.isControlPoint && !e.target.isArrowAnchor) {
            snapCenter(e.target);
        }
    });

    canvas.on('object:scaling', updateConnections);
    canvas.on('mouse:up', () => clearSnapGuides());

    // --- PC Zoom & Pan ---
    canvas.on('mouse:wheel', function(opt) {
        var delta = opt.e.deltaY;
        var zoom = canvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.05) zoom = 0.05;
        canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
        opt.e.preventDefault();
        opt.e.stopPropagation();
    });

    let isPanning = false;
    let lastPosX, lastPosY;
    canvas.on('mouse:down', function(opt) {
        var evt = opt.e;
        if (evt.altKey || evt.button === 1 || window.isSpaceKeyDown) {
            isPanning = true;
            canvas.selection = false;
            lastPosX = evt.clientX || (evt.touches ? evt.touches[0].clientX : 0);
            lastPosY = evt.clientY || (evt.touches ? evt.touches[0].clientY : 0);
        }
    });
    canvas.on('mouse:move', function(opt) {
        if (isPanning) {
            var e = opt.e;
            var vpt = canvas.viewportTransform;
            var clientX = e.clientX || (e.touches ? e.touches[0].clientX : lastPosX);
            var clientY = e.clientY || (e.touches ? e.touches[0].clientY : lastPosY);
            vpt[4] += clientX - lastPosX;
            vpt[5] += clientY - lastPosY;
            canvas.requestRenderAll();
            lastPosX = clientX;
            lastPosY = clientY;
        }
    });
    canvas.on('mouse:up', function(opt) {
        if (isPanning) {
            canvas.setViewportTransform(canvas.viewportTransform);
            isPanning = false;
            canvas.selection = true;
        }
    });

    // --- Mobile Pinch to Zoom & Pan ---
    let touchHandler = { isPinching: false, initialDist: 0, initialZoom: 1, lastCenter: null };
    canvas.upperCanvasEl.addEventListener('touchstart', function(e) {
        if (e.touches.length === 2) {
            touchHandler.isPinching = true;
            let dx = e.touches[0].clientX - e.touches[1].clientX;
            let dy = e.touches[0].clientY - e.touches[1].clientY;
            touchHandler.initialDist = Math.sqrt(dx * dx + dy * dy);
            touchHandler.initialZoom = canvas.getZoom();
            touchHandler.lastCenter = {
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2
            };
        }
    }, {passive: false});

    canvas.upperCanvasEl.addEventListener('touchmove', function(e) {
        if (touchHandler.isPinching && e.touches.length === 2) {
            e.preventDefault();
            e.stopPropagation();
            let dx = e.touches[0].clientX - e.touches[1].clientX;
            let dy = e.touches[0].clientY - e.touches[1].clientY;
            let dist = Math.sqrt(dx * dx + dy * dy);
            
            let zoom = touchHandler.initialZoom * (dist / touchHandler.initialDist);
            if (zoom > 20) zoom = 20;
            if (zoom < 0.05) zoom = 0.05;

            let centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            let centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            
            let rect = canvas.upperCanvasEl.getBoundingClientRect();
            let point = { x: centerX - rect.left, y: centerY - rect.top };
            
            canvas.zoomToPoint(point, zoom);
            
            let vpt = canvas.viewportTransform;
            vpt[4] += centerX - touchHandler.lastCenter.x;
            vpt[5] += centerY - touchHandler.lastCenter.y;
            canvas.requestRenderAll();
            
            touchHandler.lastCenter = { x: centerX, y: centerY };
        }
    }, {passive: false});

    canvas.upperCanvasEl.addEventListener('touchend', function(e) {
        if (e.touches.length < 2) {
            touchHandler.isPinching = false;
            touchHandler.lastCenter = null;
        }
    });
}

function handleResize() {
    isMobile = window.innerWidth < 768;
    if(canvas) resizeCanvas(false);
}

function resizeCanvas(reset) {
    const parent = document.getElementById('canvas_container');
    const panelW = document.getElementById('workspace_inner').clientWidth;
    const panelH = document.getElementById('workspace_inner').clientHeight;

    const scale = Math.min(
        (panelW - 40) / virtualFormat.w,
        (panelH - 40) / virtualFormat.h
    );

    const actualW = virtualFormat.w * scale;
    const actualH = virtualFormat.h * scale;

    parent.style.width = actualW + 'px';
    parent.style.height = actualH + 'px';

    canvas.setDimensions({ width: actualW, height: actualH });
    canvas.setZoom(scale);

    if(reset) {
        canvas.clear();
        canvas.setBackgroundColor('rgba(255,255,255,0)', canvas.renderAll.bind(canvas));
        connections = [];
        historyStack = [];
        redoStack = [];
    }
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.remove('hidden');
    t.style.opacity = 1;
    setTimeout(() => {
        t.style.opacity = 0;
        setTimeout(() => t.classList.add('hidden'), 300);
    }, 2500);
}

// ============================
// TOOLS & ASSETS
// ============================

async function loadAssets() {
    try {
        const res = await fetch('/api/assets');
        const data = await res.json();
        const grid = document.getElementById('brand_assets_grid');
        grid.innerHTML = '';
        
        Object.keys(data).forEach(cat => {
            data[cat].forEach(item => {
                const div = document.createElement('div');
                div.className = 'asset-item';
                div.style.backgroundColor = item.color; // Using placeholder colors
                div.innerHTML = `<span>${item.name}</span>`;
                div.onclick = () => addPlaceholderAsset(item);
                grid.appendChild(div);
            });
        });
    } catch(err) {
        console.error("Asset load error", err);
    }
}

function addPlaceholderAsset(item) {
    const rect = new fabric.Rect({
        left: virtualFormat.w/2 - 150,
        top: virtualFormat.h/2 - 150,
        fill: item.color,
        width: 300,
        height: 300,
        rx: 20, ry: 20,
        shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.5)', blur: 20, offsetX: 5, offsetY: 5 })
    });
    // Store metadata for identification
    rect.set('brandMetadata', item);
    canvas.add(rect);
    canvas.setActiveObject(rect);
}

document.getElementById('upload_my_asset').addEventListener('change', function(e) {
    if(!e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = function(f) {
        const url = f.target.result;
        fabric.Image.fromURL(url, function(img) {
            img.scaleToWidth(virtualFormat.w * 0.4);
            img.set({ left: virtualFormat.w/2 - (img.getScaledWidth()/2), top: virtualFormat.h/2 - (img.getScaledHeight()/2) });
            canvas.add(img);
            canvas.setActiveObject(img);
            
            // Add to My Assets preview
            const grid = document.getElementById('my_assets_grid');
            const div = document.createElement('div');
            div.className = 'asset-item';
            div.style.backgroundImage = `url(${url})`;
            div.onclick = () => {
                fabric.Image.fromURL(url, (addImg) => {
                    addImg.scaleToWidth(virtualFormat.w * 0.4);
                    addImg.set({ left: virtualFormat.w/2 - (addImg.getScaledWidth()/2), top: virtualFormat.h/2 - (addImg.getScaledHeight()/2) });
                    canvas.add(addImg);
                });
            };
            grid.appendChild(div);
        });
    };
    reader.readAsDataURL(e.target.files[0]);
});

function getContrastColor() {
    let bg = canvas.backgroundColor;
    if (!bg || typeof bg !== 'string' || bg === 'transparent' || bg.includes('rgba(255,255,255,0)')) return '#000000';
    let r = 255, g = 255, b = 255;
    if (bg.startsWith('#')) {
        let hex = bg.slice(1);
        if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
        r = parseInt(hex.slice(0, 2), 16) || 0; g = parseInt(hex.slice(2, 4), 16) || 0; b = parseInt(hex.slice(4, 6), 16) || 0;
    } else if (bg.startsWith('rgb')) {
        let match = bg.match(/\d+/g);
        if (match) { r = parseInt(match[0]); g = parseInt(match[1]); b = parseInt(match[2]); }
    } else { return '#ffffff'; }
    return ((0.299 * r + 0.587 * g + 0.114 * b) / 255) > 0.5 ? '#000000' : '#ffffff';
}

function addText(type = 'body') {
    let textStr = 'Double tap to edit';
    let fontSize = 40;
    let fontWeight = 'normal';
    
    if (type === 'h1') { textStr = 'HEADING'; fontSize = 100; fontWeight = 'bold'; }
    else if (type === 'h2') { textStr = 'Subheading'; fontSize = 70; fontWeight = 'normal'; }
    else { textStr = 'Body Text'; fontSize = 40; }

    const text = new fabric.IText(textStr, {
        left: virtualFormat.w/2,
        top: virtualFormat.h/2,
        originX: 'center',
        originY: 'center',
        fontFamily: 'Caveat',
        fill: getContrastColor(),
        fontSize: fontSize,
        fontWeight: fontWeight,
        textAlign: 'center'
    });
    text.id = 'obj_' + Date.now();
    canvas.add(text);
    canvas.setActiveObject(text);
    
    if(isMobile) {
        document.getElementById('right_sidebar').classList.add('sheet-open');
        document.querySelector('.nav-tab[data-target="panel_props"]').click();
    }
}

function initFonts() {
    const list = document.getElementById('font_list');
    fontsList.forEach(f => {
        const div = document.createElement('div');
        div.className = 'font-item';
        div.style.fontFamily = `'${f}', sans-serif`;
        div.innerText = f;
        div.onclick = () => {
            const active = canvas.getActiveObject();
            if(active && active.isType('i-text')) {
                active.set("fontFamily", f);
                canvas.requestRenderAll();
                saveHistory();
            }
        };
        list.appendChild(div);
    });
    
    document.getElementById('font_search_input').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        Array.from(list.children).forEach(el => {
            el.style.display = el.innerText.toLowerCase().includes(val) ? 'block' : 'none';
        });
    });
}

function initBgPalettes() {
    const solGrid = document.getElementById('bg_solid_grid');
    PRESET_SOLID_BGS.forEach(c => {
        const div = document.createElement('div');
        div.className = 'color-item';
        div.style.backgroundColor = c;
        div.onclick = () => {
            canvas.setBackgroundColor(c, canvas.renderAll.bind(canvas));
            saveHistory();
        };
        solGrid.appendChild(div);
    });

    const gradGrid = document.getElementById('bg_grad_grid');
    PRESET_GRAD_BGS.forEach(g => {
        const div = document.createElement('div');
        div.className = 'gradient-item';
        div.style.background = g.css;
        div.onclick = () => {
            const grad = new fabric.Gradient({
                type: g.type, coords: { x1: 0, y1: 0, x2: virtualFormat.w, y2: virtualFormat.h }, colorStops: g.colorStops
            });
            canvas.setBackgroundColor(grad, canvas.renderAll.bind(canvas));
            saveHistory();
        };
        gradGrid.appendChild(div);
    });

    document.getElementById('bg_image_upload').addEventListener('change', (e) => {
        if(!e.target.files[0]) return;
        const reader = new FileReader();
        reader.onload = (f) => {
            fabric.Image.fromURL(f.target.result, (img) => {
                // Scale to cover
                const scale = Math.max(virtualFormat.w / img.width, virtualFormat.h / img.height);
                img.set({ scaleX: scale, scaleY: scale, originX: 'center', originY: 'center', left: virtualFormat.w/2, top: virtualFormat.h/2 });
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
                saveHistory();
            });
        };
        reader.readAsDataURL(e.target.files[0]);
    });
    
    document.getElementById('btn_remove_bg').addEventListener('click', () => {
        canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));
        canvas.setBackgroundColor('rgba(0,0,0,0)', canvas.renderAll.bind(canvas));
        saveHistory();
    });
}


// ============================
// PROPERTIES PANEL
// ============================
function updatePropsPanel() {
    const active = canvas.getActiveObject();
    const empty = document.getElementById('properties_empty');
    const editor = document.getElementById('properties_editor');
    
    if(!active) {
        empty.classList.remove('hidden');
        editor.classList.add('hidden');
        return;
    }
    
    empty.classList.add('hidden');
    editor.classList.remove('hidden');

    // Populate transform values
    document.getElementById('prop_x').value = Math.round(active.left);
    document.getElementById('prop_y').value = Math.round(active.top);
    document.getElementById('prop_w').value = Math.round(active.getScaledWidth());
    document.getElementById('prop_h').value = Math.round(active.getScaledHeight());
    document.getElementById('prop_angle').value = Math.round(active.angle);
    document.getElementById('prop_opacity_slider').value = Math.round((active.opacity !== undefined ? active.opacity : 1) * 100);
    document.getElementById('prop_opacity_num').value = Math.round((active.opacity !== undefined ? active.opacity : 1) * 100);

    // Shadows & Effects
    if(active.shadow) {
        document.getElementById('prop_shadow_color').value = active.shadow.color || '#000000';
        document.getElementById('prop_shadow_blur').value = Math.round(active.shadow.blur || 0);
        document.getElementById('prop_shadow_offset_x').value = Math.round(active.shadow.offsetX || 0);
        document.getElementById('prop_shadow_offset_y').value = Math.round(active.shadow.offsetY || 0);
    } else {
        document.getElementById('prop_shadow_color').value = '#000000';
        document.getElementById('prop_shadow_blur').value = 10;
        document.getElementById('prop_shadow_offset_x').value = 5;
        document.getElementById('prop_shadow_offset_y').value = 5;
    }

    // Shapes props
    const shapeGroup = document.getElementById('shape_properties');
    if(active.type === 'rect' || active.type === 'ellipse' || active.type === 'circle' || active.type === 'polygon' || active.type === 'triangle') {
        shapeGroup.classList.remove('hidden');
        document.getElementById('prop_shape_fill').value = active.fill === 'transparent' ? '#000000' : (active.fill || '#000000');
    } else {
        shapeGroup.classList.add('hidden');
    }

    // Text props
    const textGroup = document.getElementById('text_properties');
    if(active.isType('i-text')) {
        textGroup.classList.remove('hidden');
        document.getElementById('prop_fontsize_slider').value = active.fontSize;
        document.getElementById('prop_fontsize_num').value = active.fontSize;
        document.getElementById('prop_textcolor').value = active.fill || '#000000';
        document.getElementById('prop_textbg').value = active.textBackgroundColor || '#000000';
        document.getElementById('prop_charspacing').value = active.charSpacing;
        document.getElementById('prop_lineheight').value = active.lineHeight;
        
        document.getElementById('btn_text_bold').classList.toggle('active', active.fontWeight === 'bold');
        document.getElementById('btn_text_italic').classList.toggle('active', active.fontStyle === 'italic');
        document.getElementById('btn_text_underline').classList.toggle('active', active.underline);
        
        document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
        if(active.textAlign) document.getElementById(`btn_align_${active.textAlign}`).classList.add('active');
    } else {
        textGroup.classList.add('hidden');
    }
    
    // Line/Arrow Props
    const arrowGroup = document.getElementById('arrow_properties');
    if(active.isArrowLine || active.isControlPoint || active.isArrowAnchor || active.isArrowHead) { 
        arrowGroup.classList.remove('hidden');
        document.getElementById('prop_arrow_color').value = active.isArrowLine ? active.stroke : (active.fill || active.stroke);
        if(active.isArrowLine) document.getElementById('prop_arrow_width').value = active.strokeWidth;
    } else {
        arrowGroup.classList.add('hidden');
    }
}

function bindPropertiesPanel() {
    const bindVal = (id, prop, isNum=true, isScale=false) => {
        const el = document.getElementById(id);
        if(!el) return;
        el.addEventListener('input', () => {
            const active = canvas.getActiveObject();
            if(!active) return;
            
            let val = el.value;
            if(isNum) val = parseFloat(val);
            
            if(id === 'prop_opacity') val = val/100;
            
            if(isScale) {
                // Handling w/h manually to update scaling
                if(id==='prop_w') active.scaleToWidth(val);
                if(id==='prop_h') active.scaleToHeight(val);
            } else {
                active.set(prop, val);
            }
            canvas.requestRenderAll();
        });
        el.addEventListener('change',()=> saveHistory());
    };

    bindVal('prop_x', 'left');
    bindVal('prop_y', 'top');
    bindVal('prop_w', null, true, true);
    bindVal('prop_h', null, true, true);
    bindVal('prop_angle', 'angle');
    
    // Opacity Sync
    ['slider', 'num'].forEach(type => {
        document.getElementById(`prop_opacity_${type}`)?.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            document.getElementById('prop_opacity_slider').value = v;
            document.getElementById('prop_opacity_num').value = v;
            const a = canvas.getActiveObject();
            if(a) { a.set('opacity', v / 100); canvas.requestRenderAll(); }
        });
        document.getElementById(`prop_opacity_${type}`)?.addEventListener('change', saveHistory);
    });
    
    // Shadows
    const applyShadow = () => {
         const a = canvas.getActiveObject();
         if(!a) return;
         a.set('shadow', new fabric.Shadow({
              color: document.getElementById('prop_shadow_color').value,
              blur: parseFloat(document.getElementById('prop_shadow_blur').value) || 0,
              offsetX: parseFloat(document.getElementById('prop_shadow_offset_x').value) || 0,
              offsetY: parseFloat(document.getElementById('prop_shadow_offset_y').value) || 0,
         }));
         canvas.requestRenderAll();
    };
    document.getElementById('prop_shadow_color')?.addEventListener('input', applyShadow);
    document.getElementById('prop_shadow_blur')?.addEventListener('input', applyShadow);
    document.getElementById('prop_shadow_offset_x')?.addEventListener('input', applyShadow);
    document.getElementById('prop_shadow_offset_y')?.addEventListener('input', applyShadow);
    
    ['prop_shadow_color', 'prop_shadow_blur', 'prop_shadow_offset_x', 'prop_shadow_offset_y'].forEach(id => {
         document.getElementById(id)?.addEventListener('change', saveHistory);
    });
    
    document.getElementById('btn_clear_shadow')?.addEventListener('click', () => {
         const a = canvas.getActiveObject();
         if(a) { a.set('shadow', null); canvas.requestRenderAll(); saveHistory(); }
    });

    document.getElementById('btn_flip_x').addEventListener('click', () => {
        const a = canvas.getActiveObject();
        if(a) { a.set('flipX', !a.flipX); canvas.requestRenderAll(); saveHistory(); }
    });
    document.getElementById('btn_flip_y').addEventListener('click', () => {
        const a = canvas.getActiveObject();
        if(a) { a.set('flipY', !a.flipY); canvas.requestRenderAll(); saveHistory(); }
    });

    // Shape Fill and Stroke Binding
    document.getElementById('prop_shape_fill')?.addEventListener('input', (e) => {
        const a = canvas.getActiveObject();
        if(a) { a.set('fill', e.target.value); canvas.requestRenderAll(); }
    });
    document.getElementById('prop_shape_fill')?.addEventListener('change',()=> saveHistory());
    document.getElementById('btn_clear_shape_fill')?.addEventListener('click', () => {
        const a = canvas.getActiveObject();
        if(a) { a.set('fill', 'transparent'); canvas.requestRenderAll(); saveHistory(); }
    });
    
    document.getElementById('prop_shape_stroke')?.addEventListener('input', (e) => {
        const a = canvas.getActiveObject();
        if(a) { a.set('stroke', e.target.value); canvas.requestRenderAll(); }
    });
    document.getElementById('prop_shape_stroke')?.addEventListener('change',()=> saveHistory());

    // Text Binding
    ['slider', 'num'].forEach(type => {
        document.getElementById(`prop_fontsize_${type}`).addEventListener('input', (e) => {
            const v = e.target.value;
            document.getElementById('prop_fontsize_slider').value = v;
            document.getElementById('prop_fontsize_num').value = v;
            const a = canvas.getActiveObject();
            if(a && a.isType('i-text')) { a.set('fontSize', parseFloat(v)); canvas.requestRenderAll(); }
        });
        document.getElementById(`prop_fontsize_${type}`).addEventListener('change', saveHistory);
    });

    document.getElementById('prop_textcolor').addEventListener('input', (e) => {
        const a = canvas.getActiveObject();
        if(a && a.isType('i-text')) { a.set('fill', e.target.value); canvas.requestRenderAll(); }
    });
    document.getElementById('prop_textcolor').addEventListener('change', saveHistory);

    document.getElementById('prop_textbg').addEventListener('input', (e) => {
        const a = canvas.getActiveObject();
        if(a && a.isType('i-text')) { a.set('textBackgroundColor', e.target.value); canvas.requestRenderAll(); }
    });
    document.getElementById('btn_clear_textbg').addEventListener('click', () => {
        const a = canvas.getActiveObject();
        if(a && a.isType('i-text')) { a.set('textBackgroundColor', ''); canvas.requestRenderAll(); saveHistory(); }
    });

    document.getElementById('prop_charspacing').addEventListener('input', (e) => {
        const a = canvas.getActiveObject();
        if(a && a.isType('i-text')) { a.set('charSpacing', parseFloat(e.target.value)); canvas.requestRenderAll(); }
    });
    document.getElementById('prop_lineheight').addEventListener('input', (e) => {
        const a = canvas.getActiveObject();
        if(a && a.isType('i-text')) { a.set('lineHeight', parseFloat(e.target.value)); canvas.requestRenderAll(); }
    });

    ['bold', 'italic', 'underline'].forEach(style => {
        document.getElementById(`btn_text_${style}`).addEventListener('click', function() {
            const a = canvas.getActiveObject();
            if(a && a.isType('i-text')) {
                if(style==='bold') a.set('fontWeight', a.fontWeight === 'bold' ? 'normal' : 'bold');
                if(style==='italic') a.set('fontStyle', a.fontStyle === 'italic' ? 'normal' : 'italic');
                if(style==='underline') a.set('underline', !a.underline);
                this.classList.toggle('active');
                canvas.requestRenderAll();
                saveHistory();
            }
        });
    });

    ['left', 'center', 'right'].forEach(align => {
        document.getElementById(`btn_align_${align}`).addEventListener('click', function() {
            const a = canvas.getActiveObject();
            if(a && a.isType('i-text')) {
                a.set('textAlign', align);
                document.querySelectorAll('.align-btn').forEach(b=>b.classList.remove('active'));
                this.classList.add('active');
                canvas.requestRenderAll();
                saveHistory();
            }
        });
    });
    
    // Arrow bindings
    document.getElementById('prop_arrow_color')?.addEventListener('input', (e) => {
        const a = canvas.getActiveObject();
        if(!a) return;
        
        let targets = [];
        if (a.connId) targets.push(a.connId);
        else if (a.isArrowAnchor) {
             connections.forEach(c => { if(c.fromId === a.id || c.toId === a.id) targets.push(c.lineId); });
        }
        
        targets.forEach(id => {
            canvas.getObjects().forEach(o => {
                 if(o.connId === id) {
                      if(o.isArrowLine) o.set('stroke', e.target.value);
                      else o.set('fill', e.target.value);
                 }
            });
            // Make sure if it's a free arrow, the end circles turn color too!
            connections.forEach(c => {
                 if (c.lineId === id) {
                      canvas.getObjects().forEach(o => {
                           if ((o.id === c.fromId || o.id === c.toId) && o.isArrowAnchor) {
                                o.set('fill', e.target.value);
                           }
                      });
                 }
            });
        });
        canvas.requestRenderAll();
    });
    
    document.getElementById('prop_arrow_width')?.addEventListener('input', (e) => {
        const a = canvas.getActiveObject();
        if(!a) return;
        
        let targets = [];
        if (a.connId) targets.push(a.connId);
        else if (a.isArrowAnchor) {
             connections.forEach(c => { if(c.fromId === a.id || c.toId === a.id) targets.push(c.lineId); });
        }
        
        targets.forEach(id => {
            canvas.getObjects().forEach(o => {
                 if(o.connId === id && o.isArrowLine) o.set('strokeWidth', parseInt(e.target.value));
            });
        });
        canvas.requestRenderAll();
        updateConnections(); // Recompute edges
    });
}

// ============================
// FLOWCHART SHAPES & ARROW CONNECTION LOGIC
// ============================
function getStarPoints(outerR, innerR, numPoints) {
    let res = [];
    let angle = Math.PI / numPoints;
    for (let i = 0; i < 2 * numPoints; i++) {
        let r = (i % 2 === 0) ? outerR : innerR;
        res.push({ x: r * Math.sin(i * angle), y: -r * Math.cos(i * angle) });
    }
    return res;
}

function getHexagonPoints(r) {
    let res = [];
    for (let i = 0; i < 6; i++) {
        let angle = i * Math.PI / 3;
        res.push({ x: r * Math.sin(angle), y: -r * Math.cos(angle) });
    }
    return res;
}

function addShape(type) {
    let shape;
    const center = { x: virtualFormat.w/2, y: virtualFormat.h/2 };
    const col = getContrastColor();
    const opts = {
        left: center.x, top: center.y, originX: 'center', originY: 'center',
        fill: 'transparent', stroke: col, strokeWidth: 4, width: 250, height: 180, rx: 15, ry: 15
    };
    if(type === 'rect') shape = new fabric.Rect(opts);
    if(type === 'circle') shape = new fabric.Ellipse({ ...opts, rx: 120, ry: 120 });
    if(type === 'diamond') shape = new fabric.Rect({ ...opts, width: 160, height: 160, angle: 45 });
    if(type === 'triangle') shape = new fabric.Triangle({ ...opts, width: 200, height: 200, rx: 0, ry: 0 });
    if(type === 'hexagon') shape = new fabric.Polygon(getHexagonPoints(120), { ...opts, width: null, height: null, rx: 0, ry: 0 });
    if(type === 'star') shape = new fabric.Polygon(getStarPoints(120, 50, 5), { ...opts, width: null, height: null, rx: 0, ry: 0 });
    
    shape.id = 'obj_' + Date.now();
    canvas.add(shape);
    canvas.setActiveObject(shape);
    
    if(isMobile) {
        document.getElementById('right_sidebar').classList.add('sheet-open');
        document.querySelector('.nav-tab[data-target="panel_props"]').click();
    }
    saveHistory();
}

function addFreeArrow() {
    const center = { x: virtualFormat.w/2, y: virtualFormat.h/2 };
    const col = getContrastColor();
    
    const obj1 = new fabric.Circle({ left: center.x - 120, top: center.y, radius: 10, fill: col, originX: 'center', originY: 'center', hasBorders: false, hasControls: false });
    const obj2 = new fabric.Circle({ left: center.x + 120, top: center.y, radius: 10, fill: col, originX: 'center', originY: 'center', hasBorders: false, hasControls: false });
    
    obj1.id = 'obj_' + Date.now() + '_tail';
    obj2.id = 'obj_' + Date.now() + '_tip';
    obj1.set('isArrowAnchor', true);
    obj2.set('isArrowAnchor', true);
    
    canvas.add(obj1, obj2);
    drawConnection(obj1, obj2);
    
    const conn = connections[connections.length - 1];
    conn.cpOffsetX = 0;
    conn.cpOffsetY = -60;
    
    canvas.setActiveObject(obj2);
    updateConnections();
    
    if(isMobile) {
        document.getElementById('right_sidebar').classList.add('sheet-open');
        document.querySelector('.nav-tab[data-target="panel_props"]').click();
    }
}

function drawConnection(obj1, obj2) {
    const col = getContrastColor();
    const cp = new fabric.Circle({
        radius: 12, fill: col, originX: 'center', originY: 'center', 
        hasBorders: false, hasControls: false, opacity: 0
    });
    const line = new fabric.Path(`M 0 0 Q 0 0 0 0`, { 
        fill: '', stroke: col, strokeWidth: 5, 
        selectable: true, hasControls: false, lockMovementX: true, lockMovementY: true, objectCaching: false 
    });
    const head = new fabric.Triangle({ 
        width: 18, height: 18, fill: col, originX: 'center', originY: 'center', 
        selectable: true, hasControls: false, lockMovementX: true, lockMovementY: true, objectCaching: false 
    });

    const connId = `conn_${Date.now()}`;
    cp.set({ 'isControlPoint': true, 'connId': connId });
    line.set({ 'isArrowLine': true, 'connId': connId });
    head.set({ 'isArrowHead': true, 'connId': connId });

    canvas.add(line, head, cp);
    line.sendToBack(); head.sendToBack(); cp.bringForward();

    connections.push({ fromId: obj1.id, toId: obj2.id, lineId: connId, line: line, head: head, cp: cp, cpOffsetX: 0, cpOffsetY: 0 });
    updateConnections();
    saveHistory();
}

function getPerimeterPoint(obj, center, otherCenter) {
    let dx = otherCenter.x - center.x;
    let dy = otherCenter.y - center.y;
    let distance = Math.hypot(dx, dy);
    if(distance === 0) return center;
    let angle = Math.atan2(dy, dx) - (obj.angle || 0) * Math.PI / 180;
    
    let r = 0;
    if (obj.type === 'ellipse' || obj.type === 'circle') {
        let rx = obj.getScaledWidth() / 2;
        let ry = obj.getScaledHeight() / 2;
        let absCos = Math.abs(Math.cos(angle));
        let absSin = Math.abs(Math.sin(angle));
        r = (rx * ry) / Math.sqrt(rx*rx * absSin*absSin + ry*ry * absCos*absCos);
    } else {
        let w = obj.getScaledWidth() / 2;
        let h = obj.getScaledHeight() / 2;
        let absCos = Math.abs(Math.cos(angle));
        let absSin = Math.abs(Math.sin(angle));
        if (w * absSin > h * absCos) r = h / absSin;
        else r = w / absCos;
    }
    
    return {
        x: center.x + r * Math.cos(Math.atan2(dy, dx)),
        y: center.y + r * Math.sin(Math.atan2(dy, dx))
    };
}

function updateConnections() {
    if(connections.length === 0) return;
    
    const active = canvas.getActiveObject();

    connections.forEach(c => {
        let obj1 = null; let obj2 = null; let line = null; let head = null; let cp = null;
        canvas.getObjects().forEach(o => {
            if(o.id === c.fromId) obj1 = o;
            if(o.id === c.toId) obj2 = o;
            if(o.connId === c.lineId && o.isArrowLine) line = o;
            if(o.connId === c.lineId && o.isArrowHead) head = o;
            if(o.connId === c.lineId && o.isControlPoint) cp = o;
        });

        line = line || c.line; head = head || c.head; cp = cp || c.cp;

        if(obj1 && obj2 && line && head && cp) {
            const p1 = obj1.getCenterPoint();
            const p2 = obj2.getCenterPoint();
            
            const mpX = (p1.x + p2.x)/2;
            const mpY = (p1.y + p2.y)/2;
            
            if(active !== cp) {
                 cp.set({ left: mpX + (c.cpOffsetX || 0), top: mpY + (c.cpOffsetY || 0) });
                 cp.setCoords();
            } else {
                 c.cpOffsetX = cp.left - mpX;
                 c.cpOffsetY = cp.top - mpY;
            }
            
            const startPt = obj1.isArrowAnchor ? p1 : getPerimeterPoint(obj1, p1, {x: cp.left, y: cp.top});
            const endPt = obj2.isArrowAnchor ? p2 : getPerimeterPoint(obj2, p2, {x: cp.left, y: cp.top});
            
            const dx = endPt.x - cp.left;
            const dy = endPt.y - cp.top;
            const dist = Math.hypot(dx, dy);
            
            if (dist > 15) {
                const sX = startPt.x;
                const sY = startPt.y;
                let eX = endPt.x - (dx/dist)*12;
                let eY = endPt.y - (dy/dist)*12;
                
                // For proper Fabric.js rendering of curved paths, we need to create a new path entirely 
                // when points change significantly, preserving properties.
                const newPathData = `M ${sX} ${sY} Q ${cp.left} ${cp.top} ${eX} ${eY}`;
                
                if(!line._myPath || line._myPath !== newPathData) {
                     const clonedLine = new fabric.Path(newPathData, {
                          fill: '', stroke: line.stroke || '#D4AF37', strokeWidth: line.strokeWidth || 5,
                          selectable: false, evented: false, isArrowLine: true, connId: line.connId
                     });
                     
                     canvas.insertAt(clonedLine, canvas.getObjects().indexOf(line));
                     canvas.remove(line);
                     
                     // Update memory reference
                     if(obj1.isArrowAnchor) c.line = clonedLine; 
                     else connections.find(cx => cx.lineId === line.connId).line = clonedLine;
                     line = clonedLine;
                     line._myPath = newPathData;
                }
                
                line.set({ opacity: 1 });
                
                // Calculate angle based on bezier derivation at t=1 (the end)
                // Tangent vector components at t=1: dx = eX - cp.left, dy = eY - cp.top
                let angle = Math.atan2(eY - cp.top, eX - cp.left) * 180 / Math.PI;
                head.set({ left: eX, top: eY, angle: angle + 90, opacity: 1 });
            } else {
                line.set({ opacity: 0 });
                head.set({ opacity: 0 });
            }
            
            // Interaction States Check
            const inFocus = active === obj1 || active === obj2 || active === cp || active === line;
            if(inFocus) {
                cp.set({ opacity: 0.5 });
                cp.bringToFront();
                if(obj1.isArrowAnchor) obj1.set({ opacity: 0.8 }).bringToFront();
                if(obj2.isArrowAnchor) obj2.set({ opacity: 0.8 }).bringToFront();
            } else {
                cp.set({ opacity: 0 });
                if(obj1.isArrowAnchor) obj1.set({ opacity: 0.2 });
                if(obj2.isArrowAnchor) obj2.set({ opacity: 0.2 });
            }
            
            canvas.requestRenderAll();
        }
    });
}

// ============================
// HELPERS, LAYERS, SNAP, HISTORY
// ============================

let vLine, hLine;
let smartGuides = [];
const recentColors = new Set(['#D4AF37', '#8B6914', '#FFE566', '#0a0500', '#ffffff', '#000000']);

function updateRecentColorsUI() {
    const containers = document.querySelectorAll('.recent-colors-container');
    const colorArray = Array.from(recentColors).slice(-12); // keep last 12
    
    containers.forEach(container => {
        container.innerHTML = '';
        const targetId = container.getAttribute('data-target');
        if(!targetId) return;
        
        colorArray.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.title = color;
            swatch.onclick = () => {
                const input = document.getElementById(targetId);
                if(input) {
                    input.value = color;
                    input.dispatchEvent(new Event('input', {bubbles:true}));
                    input.dispatchEvent(new Event('change', {bubbles:true}));
                }
            };
            container.appendChild(swatch);
        });
    });
}

function snapCenter(obj) {
    const threshold = 10; // px trigger distance
    const center = obj.getCenterPoint();
    const cvsCenterV = virtualFormat.w / 2;
    const cvsCenterH = virtualFormat.h / 2;

    let snapX = false, snapY = false;
    
    clearSnapGuides();

    // Canvas Center Snapping
    if (Math.abs(center.x - cvsCenterV) < threshold) {
        let originOffset = obj.originX === 'center' ? 0 : obj.getScaledWidth()/2;
        obj.set({ left: cvsCenterV - originOffset });
        vLine = new fabric.Line([cvsCenterV, 0, cvsCenterV, virtualFormat.h], { stroke: '#D4AF37', strokeWidth: 2, selectable: false, evented: false, strokeDashArray: [10,5] });
        canvas.add(vLine);
        snapX = true;
    }
    
    if (Math.abs(center.y - cvsCenterH) < threshold) {
        let originOffset = obj.originY === 'center' ? 0 : obj.getScaledHeight()/2;
        obj.set('top', cvsCenterH - originOffset);
        hLine = new fabric.Line([0, cvsCenterH, virtualFormat.w, cvsCenterH], { stroke: '#D4AF37', strokeWidth: 2, selectable: false, evented: false, strokeDashArray: [10,5] });
        canvas.add(hLine);
        snapY = true;
    }
    
    // Smart Snapping to other objects
    canvas.getObjects().forEach(target => {
        if(target === obj || target === vLine || target === hLine || target.isControlPoint || target.isArrowLine || target.isArrowHead || target.isArrowAnchor || target.id === 'guide') return;
        
        const targetCenter = target.getCenterPoint();
        
        if(!snapX && Math.abs(center.x - targetCenter.x) < threshold) {
            let originOffset = obj.originX === 'center' ? 0 : obj.getScaledWidth()/2;
            obj.set({ left: targetCenter.x - originOffset });
            const line = new fabric.Line([targetCenter.x, 0, targetCenter.x, virtualFormat.h], { stroke: '#FFE566', strokeWidth: 1, selectable: false, evented: false, strokeDashArray: [5,5], id: 'guide' });
            canvas.add(line);
            smartGuides.push(line);
            snapX = true;
        }

        if(!snapY && Math.abs(center.y - targetCenter.y) < threshold) {
            let originOffset = obj.originY === 'center' ? 0 : obj.getScaledHeight()/2;
            obj.set({ top: targetCenter.y - originOffset });
            const line = new fabric.Line([0, targetCenter.y, virtualFormat.w, targetCenter.y], { stroke: '#FFE566', strokeWidth: 1, selectable: false, evented: false, strokeDashArray: [5,5], id: 'guide' });
            canvas.add(line);
            smartGuides.push(line);
            snapY = true;
        }
    });
}

function clearLine(lineObj) {
    if(lineObj) canvas.remove(lineObj);
}
function clearSnapGuides() {
    clearLine(vLine); clearLine(hLine);
    vLine = null; hLine = null;
    smartGuides.forEach(g => canvas.remove(g));
    smartGuides = [];
    canvas.requestRenderAll();
}

function deleteSelected() {
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
        canvas.discardActiveObject();
        activeObjects.forEach((object) => canvas.remove(object));
        saveHistory();
    }
}

function duplicateSelected() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    activeObj.clone(function (cloned) {
        canvas.discardActiveObject();
        cloned.set({
            left: cloned.left + 50,
            top: cloned.top + 50,
            evented: true,
        });

        if (cloned.type === 'activeSelection') {
            cloned.canvas = canvas;
            cloned.forEachObject(function (obj) {
                // Remove id so it doesn't collide, let it regen or be nameless
                obj.id = 'obj_' + Date.now() + Math.random();
                canvas.add(obj);
            });
            cloned.setCoords();
        } else {
            cloned.id = 'obj_' + Date.now() + Math.random();
            canvas.add(cloned);
        }

        canvas.setActiveObject(cloned);
        canvas.requestRenderAll();
        saveHistory();
    });
}

// Global Keyboard bindings (Ctrl+Z, Ctrl+Y, Delete, Ctrl+D, Space to Pan)
document.addEventListener('keydown', (e) => {
    if(e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') window.isSpaceKeyDown = true;
    if(e.ctrlKey && e.key === 'z') { e.preventDefault(); undo(); }
    if(e.ctrlKey && e.key === 'y') { e.preventDefault(); redo(); }
    if(e.ctrlKey && e.key === 'd') { e.preventDefault(); duplicateSelected(); }
    if(e.key === 'Delete' || e.key === 'Backspace') {
        const t = e.target.tagName.toLowerCase();
        if(t !== 'input' && t !== 'textarea') deleteSelected();
    }
});
document.addEventListener('keyup', (e) => {
    if(e.code === 'Space') window.isSpaceKeyDown = false;
});

function toggleGroup() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;
    
    if (activeObj.type === 'activeSelection') {
        activeObj.toGroup();
    } else if (activeObj.type === 'group') {
        activeObj.toActiveSelection();
    }
    canvas.requestRenderAll();
    saveHistory();
}

function bringLayer(dir) {
    const obj = canvas.getActiveObject();
    if(!obj) return;
    if(dir === 'front') obj.bringForward();
    else if(dir === 'back') obj.sendBackwards();
    canvas.requestRenderAll();
    saveHistory();
}

// State History
function saveHistory() {
    if(isHistoryAction) return;
    if(historyStack.length >= MAX_HISTORY) historyStack.shift();
    historyStack.push(JSON.stringify(canvas));
    redoStack = []; // Clear redo stack on new action
}

function loadHistory(stateJson) {
    isHistoryAction = true;
    canvas.loadFromJSON(stateJson, () => {
        canvas.requestRenderAll();
        isHistoryAction = false;
        updatePropsPanel();
        
        // Relink arrow logic references by ID after deserialization
        // In real advanced app, we map IDs back to connections.
    });
}

function undo() {
    if(historyStack.length <= 1) return;
    redoStack.push(historyStack.pop());
    const prevState = historyStack[historyStack.length - 1];
    loadHistory(prevState);
}

function redo() {
    if(redoStack.length === 0) return;
    const nextState = redoStack.pop();
    historyStack.push(nextState);
    loadHistory(nextState);
}


// ============================
// EXPORT
// ============================
function exportCanvas() {
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    
    // Create high-res unscaled export data
    const exportData = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1 / canvas.getZoom() // counteract zoom to get virtual logic 1:1 format size
    });

    const timestamp = Date.now();
    const ratioStr = `${virtualFormat.w}x${virtualFormat.h}`;
    const filename = `prismax-${ratioStr}-${timestamp}.png`;

    if (isMobile && navigator.share) {
        // Convert base64 to File object using modern fetch approach
        fetch(exportData)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], filename, { type: 'image/png' });
                navigator.share({
                    title: 'PrismaX Design',
                    files: [file]
                }).catch(console.error);
            });
    } else {
        const link = document.createElement('a');
        link.download = filename;
        link.href = exportData;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    showToast("Export Successful!");
}
