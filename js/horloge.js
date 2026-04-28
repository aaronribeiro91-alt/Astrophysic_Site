/**
 * L'Horloge Cosmique - Logic
 * 13.8 Ga compressés en 24h
 */

// Key Events Data
const COSMIC_EVENTS = [
    {
        id: 'big-bang',
        time: 0, 
        title: 'Le Big Bang',
        era: 'Il y a 13,8 milliards d\'années',
        desc: 'L\'instant initial où l\'espace, le temps et la matière ont été créés. L\'Univers commence son expansion brutale.',
        fact: 'À ce moment exact, la température était de 10^32 degrés Celsius.',
        category: 'cosmology'
    },
    {
        id: 'first-stars',
        time: 626, 
        title: 'Premières Étoiles',
        era: 'Il y a 13,7 milliards d\'années',
        desc: 'Après l\'Âge Sombre, la gravité rassemble les premiers nuages d\'hydrogène pour former les premières étoiles massives.',
        fact: 'Ces étoiles étaient bien plus grosses et brillantes que notre Soleil actuel.',
        category: 'cosmology'
    },
    {
        id: 'first-galaxies',
        time: 7512, 
        title: 'Premières Galaxies',
        era: 'Il y a 12,6 milliards d\'années',
        desc: 'Les groupes d\'étoiles commencent à s\'organiser en structures massives liées par la gravité.',
        fact: 'La Voie Lactée commencera sa formation peu après.',
        category: 'cosmology'
    },
    {
        id: 'milky-way',
        time: 30000, 
        title: 'La Voie Lactée Moderne',
        era: 'Il y a ~9 milliards d\'années',
        desc: 'Notre galaxie prend sa forme spirale caractéristique après plusieurs collisions avec d\'autres galaxies plus petites.',
        fact: 'Elle contient environ 200 à 400 milliards d\'étoiles.',
        category: 'cosmology'
    },
    {
        id: 'sun-formation',
        time: 57600, 
        title: 'Naissance du Soleil',
        era: 'Il y a 4,6 milliards d\'années',
        desc: 'Une nébuleuse s\'effondre pour former notre étoile. Le disque protoplanétaire commence à se structurer.',
        fact: 'Le Soleil représente 99,8% de la masse totale du Système Solaire.',
        category: 'earth'
    },
    {
        id: 'earth-formation',
        time: 58080, 
        title: 'Formation de la Terre',
        era: 'Il y a 4,54 milliards d\'années',
        desc: 'Les poussières et roches s\'agglomèrent. Peu après, une collision géante créera la Lune.',
        fact: 'À ses débuts, la Terre était un océan de magma en fusion.',
        category: 'earth'
    },
    {
        id: 'life-begin',
        time: 62700, 
        title: 'Premières Traces de Vie',
        era: 'Il y a 3,8 milliards d\'années',
        desc: 'Apparition des premiers organismes unicellulaires dans les océans primitifs.',
        fact: 'La vie est apparue presque dès que la Terre est devenue habitable.',
        category: 'biology'
    },
    {
        id: 'dinosaurs',
        time: 84960, 
        title: 'Règne des Dinosaures',
        era: 'Il y a 230 millions d\'années',
        desc: 'Les dinosaures dominent la Terre pendant plus de 160 millions d\'années.',
        fact: 'Les oiseaux sont les seuls descendants directs des dinosaures encore vivants.',
        category: 'biology'
    },
    {
        id: 'asteroid',
        time: 85980, 
        title: 'L\'Impact de Chicxulub',
        era: 'Il y a 66 millions d\'années',
        desc: 'Un astéroïde de 10km frappe le Mexique actuel, provoquant l\'extinction des dinosaures non-aviaires.',
        fact: 'Cela a permis aux mammifères de se développer et de dominer à leur tour.',
        category: 'biology'
    },
    {
        id: 'homo-sapiens',
        time: 86398.1, 
        title: 'L\'Homme Moderne',
        era: 'Il y a 300 000 ans',
        desc: 'Apparition d\'Homo Sapiens en Afrique. Début de la conscience, du langage et de l\'art.',
        fact: 'Nous partageons 99,9% de notre ADN avec tous les autres humains.',
        category: 'humanity'
    },
    {
        id: 'civilization',
        time: 86399.9, 
        title: 'L\'Histoire Enregistrée',
        era: 'Il y a 10 000 ans',
        desc: 'Invention de l\'agriculture, de l\'écriture et début des premières grandes civilisations.',
        fact: 'Tout ce que vous apprenez à l\'école tient dans ce dernier millième de seconde.',
        category: 'humanity'
    }
];

// State
let currentTime = 0;
let isPlaying = false;
let playInterval = null;

// Elements
const clockSvg = document.getElementById('cosmic-clock');
const hourMarkersGrp = document.getElementById('hour-markers');
const eventMarkersGrp = document.getElementById('event-markers');
const hourHand = document.getElementById('hour-hand');
const secondHand = document.getElementById('second-hand');
const progressArc = document.getElementById('progress-arc');
const timeSlider = document.getElementById('time-slider');
const currentTimeDisplay = document.getElementById('current-cosmic-time');
const playBtn = document.getElementById('play-btn');

// Panel Elements
const panelPlaceholder = document.getElementById('panel-placeholder');
const panelContent = document.getElementById('panel-content');
const eventTimeEl = document.getElementById('event-time');
const eventTitleEl = document.getElementById('event-title');
const eventEraEl = document.getElementById('event-era');
const eventDescEl = document.getElementById('event-desc');
const eventFactEl = document.getElementById('event-fact');

/**
 * Initialize
 */
function init() {
    renderMarkers();
    setupListeners();
    updateClock(0);
}

function renderMarkers() {
    // Hour Ticks
    for (let i = 0; i < 24; i++) {
        const angle = (i * 15) - 90;
        const rad = (angle * Math.PI) / 180;
        const x1 = 250 + 210 * Math.cos(rad);
        const y1 = 250 + 210 * Math.sin(rad);
        const x2 = 250 + 225 * Math.cos(rad);
        const y2 = 250 + 225 * Math.sin(rad);
        
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", i % 6 === 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)");
        line.setAttribute("stroke-width", i % 6 === 0 ? "3" : "1");
        hourMarkersGrp.appendChild(line);
    }

    // Event Markers
    COSMIC_EVENTS.forEach(event => {
        const angle = (event.time / 86400) * 360 - 90;
        const rad = (angle * Math.PI) / 180;
        const x = 250 + 220 * Math.cos(rad);
        const y = 250 + 220 * Math.sin(rad);

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", "6");
        circle.setAttribute("fill", "currentColor");
        circle.setAttribute("class", `marker marker-${event.category}`);
        circle.setAttribute("data-id", event.id);
        
        circle.onclick = (e) => {
            e.stopPropagation();
            currentTime = event.time;
            timeSlider.value = currentTime;
            updateClock(currentTime);
            selectEvent(event);
            stopVoyage();
        };

        eventMarkersGrp.appendChild(circle);
    });
}

function setupListeners() {
    timeSlider.oninput = (e) => {
        currentTime = parseInt(e.target.value);
        updateClock(currentTime);
        checkSnap(currentTime);
        stopVoyage();
    };

    playBtn.onclick = toggleVoyage;
}

function toggleVoyage() {
    if (isPlaying) stopVoyage();
    else startVoyage();
}

function startVoyage() {
    isPlaying = true;
    playBtn.textContent = '⏸ Pause';
    playBtn.classList.add('playing');
    
    // Reset if at end
    if (currentTime >= 86395) currentTime = 0;

    playInterval = setInterval(() => {
        currentTime += 80; // Fast forward
        if (currentTime >= 86400) {
            currentTime = 86400;
            stopVoyage();
        }
        timeSlider.value = currentTime;
        updateClock(currentTime);
        checkSnap(currentTime, true);
    }, 30);
}

function stopVoyage() {
    isPlaying = false;
    if (playInterval) clearInterval(playInterval);
    playBtn.textContent = '▶️ Lancer le Voyage';
    playBtn.classList.remove('playing');
}

function updateClock(seconds) {
    // Hour rotation
    const hrRot = (seconds / 86400) * 360;
    hourHand.setAttribute('transform', `rotate(${hrRot}, 250, 250)`);
    
    // Second rotation (loops every 1h cosmique)
    const scRot = (seconds / 3600) * 360;
    secondHand.setAttribute('transform', `rotate(${scRot}, 250, 250)`);

    // Arc
    updateArc(hrRot);

    // Digital
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    currentTimeDisplay.textContent = `${h}:${m}:${s}`;
}

function updateArc(angle) {
    const r = 220;
    const startAngle = -90;
    const endAngle = angle - 90;
    
    const start = polarToCartesian(250, 250, r, endAngle);
    const end = polarToCartesian(250, 250, r, startAngle);
    const largeArcFlag = angle <= 180 ? "0" : "1";

    const d = [
        "M", start.x, start.y, 
        "A", r, r, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");

    progressArc.setAttribute("d", d);
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
}

function checkSnap(seconds, isAuto = false) {
    const threshold = isAuto ? 100 : 800;
    const match = COSMIC_EVENTS.find(e => Math.abs(e.time - seconds) < threshold);
    if (match) selectEvent(match);
    else if (!isAuto) deselect();
}

function selectEvent(ev) {
    panelPlaceholder.classList.add('hidden');
    panelContent.classList.remove('hidden');

    const h = Math.floor(ev.time / 3600).toString().padStart(2, '0');
    const m = Math.floor((ev.time % 3600) / 60).toString().padStart(2, '0');

    eventTimeEl.textContent = `${h}:${m}`;
    eventTitleEl.textContent = ev.title;
    eventEraEl.textContent = ev.era;
    eventDescEl.textContent = ev.desc;
    eventFactEl.textContent = ev.fact;

    document.querySelectorAll('.marker').forEach(m => m.classList.toggle('active', m.dataset.id === ev.id));
}

function deselect() {
    panelPlaceholder.classList.remove('hidden');
    panelContent.classList.add('hidden');
    document.querySelectorAll('.marker').forEach(m => m.classList.remove('active'));
}

init();
