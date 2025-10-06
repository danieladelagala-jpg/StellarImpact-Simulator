// ---------- Escena, cámara y renderizador ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ---------- Luz ----------
const light = new THREE.PointLight(0xffffff, 1.5, 1000);
light.position.set(10, 10, 10);
scene.add(light);

// ---------- Texturas ----------
const loader = new THREE.TextureLoader();
// NOTA: Asegúrate de tener estas imágenes en tu carpeta 'imagenes/'
const earthTexture = loader.load("imagenes/earth.jpg"); 
const meteorTexture = loader.load("imagenes/meteorito.jpg");

// ---------- Tierra ----------
const EARTH_RADIUS = 2;
const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);
const earthMaterial = new THREE.MeshPhongMaterial({ map: earthTexture });
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// ---------- Parámetros ----------
const params = { diametro: 100, velocidad: 20, densidad: 3000 };
const PI = Math.PI;
const SIMULATION_SCALE = 0.0005; // Escala para simular velocidades visibles

// ---------- Meteorito ----------
let meteor;
function resetMeteor() {
    if (meteor) {
        scene.remove(meteor);
        meteor.geometry.dispose();
        meteor.material.dispose();
    }
    const visualSize = Math.max(0.05, params.diametro / 4000);
    const g = new THREE.SphereGeometry(visualSize, 32, 32);
    const m = new THREE.MeshPhongMaterial({ map: meteorTexture });
    meteor = new THREE.Mesh(g, m);
    
    // POSICIÓN Z=0: Impacto frontal directo
    meteor.position.set(0, 6, 0); 
    
    meteor.visible = true;
    scene.add(meteor);
}
resetMeteor();

// ---------- Explosión y Marcador de Impacto ----------
const explosions = [];
const craters = []; 

function createExplosion(position) {
    const geo = new THREE.SphereGeometry(0.3, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.9 });
    const s = new THREE.Mesh(geo, mat);
    s.position.copy(position);
    scene.add(s);
    explosions.push({ mesh: s, life: 0 });
}

function createImpactMarker(position, sizeMeters) {
    // La función de marcador de impacto se mantiene vacía para no dibujar la mancha roja
}


// ---------- Cámara ----------
camera.position.z = 8;

// ---------- Estado y Detección de Impacto ----------
let running = false;
let impactDetected = false;
let deflectionActive = false; 
const statusMessage = document.getElementById('statusMessage');

// Variables globales para los resultados (usadas en "Aprender más")
let lastCraterSizeKm = 0.5;
let lastTntEquiv = "0 toneladas"; 
let impactPosition = new THREE.Vector3(0, -EARTH_RADIUS, 0); 
let lastSugerenciasHtml = "<h3>No se han calculado sugerencias.</h3>"; 

// FUNCIÓN DE BOTÓN: Mover la cámara para ver el impacto
function viewCrater() {
    const distance = EARTH_RADIUS * 2.5;
    const newCameraPosition = impactPosition.clone().normalize().multiplyScalar(distance);
    
    camera.position.copy(newCameraPosition);
    camera.lookAt(earth.position); 
    
    statusMessage.style.display = 'none';
}

// FUNCIÓN DE BOTÓN: Mostrar información detallada (CONEXIÓN FINAL)
function learnMore() {
    // 1. Recolectar todos los datos necesarios en un objeto
    const impactData = {
        diametro: `${params.diametro.toFixed(1)} m`,
        velocidad: `${params.velocidad.toFixed(2)} km/s`,
        densidad: `${params.densidad.toFixed(1)} kg/m³`,
        
        // Obtenemos los valores finales del panel de resultados
        energia: document.getElementById('res-energia').textContent,
        tnt: lastTntEquiv,
        crater: document.getElementById('res-crater').textContent,
        sismica: document.getElementById('res-sismica').textContent,
        sugerenciasHtml: lastSugerenciasHtml 
    };
    
    // 2. Guardar los datos en el Local Storage
    localStorage.setItem('impactData', JSON.stringify(impactData));
    
    // 3. Abrir la nueva página
    window.location.href = 'aprende_mas.html';
    
    statusMessage.style.display = 'none';
}


function animate() {
    requestAnimationFrame(animate);
    
    // Rotación automática de la Tierra
    earth.rotation.y += 0.002; 

    if (running && meteor.visible) {
        meteor.position.y -= params.velocidad * SIMULATION_SCALE;

        // Lógica de desviación
        if (deflectionActive) {
            meteor.position.x += 0.01; 
        }

        const distToEarthCenter = meteor.position.distanceTo(earth.position);
        const meteorRadius = meteor.geometry.parameters.radius;

        if (distToEarthCenter <= EARTH_RADIUS + meteorRadius) {
            if (!impactDetected) {
                running = false;
                impactDetected = true;
                
                // Guardamos la posición del impacto
                impactPosition.copy(meteor.position); 
                
                // LLAMADA AL MARCADOR DE IMPACTO (ahora vacío)
                const craterSizeMeters = lastCraterSizeKm * 1000; 
                createImpactMarker(impactPosition.clone(), craterSizeMeters); 

                createExplosion(impactPosition.clone());
                audioImpacto.currentTime = 0;
                audioImpacto.play().catch(e => console.error("Error al reproducir audio de impacto:", e));
                setTimeout(() => {
                    meteor.visible = false;
                }, 500);
                statusMessage.style.display = 'block';
            }
        }
    }

    // Animación de la explosión
    for (let i = explosions.length - 1; i >= 0; i--) {
        const e = explosions[i];
        e.life += 0.02;
        e.mesh.scale.multiplyScalar(1.05);
        e.mesh.material.opacity = Math.max(0, 1 - e.life * 0.3);
        if (e.life > 3) {
            scene.remove(e.mesh);
            explosions.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}
animate();

// ---------- Elementos de la UI y Botones ----------
const diametroSlider = document.getElementById('diametro-slider');
const velocidadSlider = document.getElementById('velocidad-slider');
const densidadSlider = document.getElementById('densidad-slider');
const diametroValueSpan = document.getElementById('diametro-value');
const velocidadValueSpan = document.getElementById('velocidad-value');
const densidadValueSpan = document.getElementById('densidad-value');
const resDiametro = document.getElementById('res-diametro');
const resVelocidad = document.getElementById('res-velocidad');
const resDensidad = document.getElementById('res-densidad');
const resEnergia = document.getElementById('res-energia');
const resTnt = document.getElementById('res-tnt');
const resCrater = document.getElementById('res-crater');
const resSismica = document.getElementById('res-sismica');
const resSugerencias = document.getElementById('res-sugerencias');
const bgMusic = document.getElementById("bgMusic");
const audioImpacto = document.getElementById("audioImpacto");

// REFERENCIAS A NUEVOS BOTONES
const viewCraterBtn = document.getElementById('viewCraterBtn');
const learnMoreBtn = document.getElementById('learnMoreBtn');


// ---------- Eventos de los Nuevos Botones ----------
if (viewCraterBtn) {
    viewCraterBtn.addEventListener('click', viewCrater);
}
if (learnMoreBtn) {
    learnMoreBtn.addEventListener('click', learnMore);
}
// ----------------------------------------------------


// ---------- Elementos de la NASA y Mitigación ----------
const asteroidSelect = document.getElementById('asteroid-select');
const deflectBtn = document.getElementById('deflectBtn');
let asteroidData = []; 

// ---------- Sugerencias ----------
const SUGERENCIAS_LOCALIZADAS = `
    <h3>Acciones Sugeridas (Impacto Local)</h3>
    <ul>
        <li>Emitir alerta de tsunami (si impacta en el mar).</li>
        <li>Evacuar zonas cercanas al punto de impacto.</li>
        <li>Preparar equipos de rescate y emergencia.</li>
    </ul>
`;
const SUGERENCIAS_REGIONALES = `
    <h3>Acciones Sugeridas (Impacto Regional)</h3>
    <ul>
        <li>Implementar refugios para desplazados.</li>
        <li>Monitorear caída global de cenizas.</li>
        <li>Asegurar reservas de alimentos y agua.</li>
    </ul>
`;
const SUGERENCIAS_GLOBALES = `
    <h3>Acciones Sugeridas (Impacto Global)</h3>
    <ul>
        <li>Activar plan de emergencia climática.</li>
        <li>Coordinar respuesta internacional.</li>
        <li>Preparar para un posible 'Invierno de Impacto'.</li>
    </ul>
`;


// Función para forzar la actualización de los sliders y la UI
function forceUpdateSlider(slider, value, span, unit) {
    slider.value = value;
    params[slider.id.split('-')[0]] = parseFloat(value);
    span.textContent = `${parseFloat(value).toFixed(1)} ${unit}`;
    slider.dispatchEvent(new Event('input'));
}


// ---------- Lógica de la API de NASA ----------
async function fetchAsteroidData() {
    // NOTA: Reemplaza con una clave válida si esta expira o falla.
    const API_KEY = 'EEStOMdG0oy2YG7RoCJ40hUTszb8XizDN6kPEj2L'; 
    const url = `https://api.nasa.gov/neo/rest/v1/neo/browse?api_key=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error de red: ${response.statusText}`);
        }
        const data = await response.json();
        asteroidData = data.near_earth_objects;
        populateAsteroidSelector();
    } catch (error) {
        console.error("Error al obtener datos de la NASA:", error);
        asteroidSelect.innerHTML = '<option value="">Error al cargar datos</option>';
    }
}

function populateAsteroidSelector() {
    asteroidSelect.innerHTML = '<option value="">Selecciona un asteroide</option>';
    const filteredAsteroids = asteroidData.filter(a => a.close_approach_data.length > 0);
    
    filteredAsteroids.forEach((asteroid, index) => {
        const option = document.createElement('option');
        option.value = index; 
        option.textContent = asteroid.name;
        asteroidSelect.appendChild(option);
    });
}

asteroidSelect.addEventListener('change', (e) => {
    const selectedIndex = e.target.value;
    if (selectedIndex === "") return;

    const filteredAsteroids = asteroidData.filter(a => a.close_approach_data.length > 0);
    const asteroid = filteredAsteroids[selectedIndex];
    
    const diametro = asteroid.estimated_diameter.meters.estimated_diameter_max;
    const velocidad = parseFloat(asteroid.close_approach_data[0].relative_velocity.kilometers_per_second);
    const densidad = 3500; 

    forceUpdateSlider(diametroSlider, diametro, diametroValueSpan, 'm');
    forceUpdateSlider(velocidadSlider, velocidad, velocidadValueSpan, 'km/s');
    forceUpdateSlider(densidadSlider, densidad, densidadValueSpan, 'kg/m³');

    resetMeteor();
    updateResultsPanel(false);
});


function updateParams(slider, paramName, span, decimals) {
    const value = parseFloat(slider.value);
    params[paramName] = value;
    const unit = paramName === 'diametro' ? 'm' : paramName === 'velocidad' ? 'km/s' : 'kg/m³';
    span.textContent = `${value.toFixed(decimals)} ${unit}`;

    if (!running) {
        resetMeteor();
    }
    updateResultsPanel(false);
}

diametroSlider.addEventListener('input', (e) => updateParams(e.target, 'diametro', diametroValueSpan, 0));
velocidadSlider.addEventListener('input', (e) => updateParams(e.target, 'velocidad', velocidadValueSpan, 0));
densidadSlider.addEventListener('input', (e) => updateParams(e.target, 'densidad', densidadValueSpan, 0));


/**
 * Calcula el tamaño físico del cráter (en KM) basado en la energía del impacto.
 */
function calculateCraterSize() {
    const radioMetros = params.diametro / 2;
    const velocidadMS = params.velocidad * 1000; 
    const densidadKG_M3 = params.densidad;
    const volumen = (4 / 3) * PI * Math.pow(radioMetros, 3);
    const masa = densidadKG_M3 * volumen;
    
    // Energía cinética (E = 1/2 * m * v^2)
    const energiaCineticaJulios = 0.5 * masa * Math.pow(velocidadMS, 2);
    
    // Fórmula empírica para el diámetro del cráter (en metros)
    const craterDiameterMeters = 2.5 * params.diametro * Math.pow(energiaCineticaJulios / 1e12, 1/3.4); 
    
    return craterDiameterMeters / 1000; // Devolvemos en KM
}


function updateResultsPanel(isImpactOccurred) {
    resDiametro.textContent = `${params.diametro.toFixed(1)} m`;
    resVelocidad.textContent = `${params.velocidad.toFixed(2)} km/s`;
    resDensidad.textContent = `${params.densidad.toFixed(1)} kg/m³`;

    if (isImpactOccurred) {
        // Ejecutamos el cálculo del tamaño del cráter para obtener la escala
        const craterDiameterKm = calculateCraterSize(); 
        lastCraterSizeKm = craterDiameterKm; 

        const radioMetros = params.diametro / 2;
        const velocidadMS = params.velocidad * 1000; 
        const densidadKG_M3 = params.densidad;
        const volumen = (4 / 3) * PI * Math.pow(radioMetros, 3);
        const masa = densidadKG_M3 * volumen;
        const energiaCineticaJulios = 0.5 * masa * Math.pow(velocidadMS, 2);
        
        const joulesPerTonTNT = 4.184e9; 
        const equivalenteTNT = energiaCineticaJulios / joulesPerTonTNT;
        
        const magnitudSismica = Math.log10(energiaCineticaJulios) - 8; 

        resEnergia.textContent = `${energiaCineticaJulios.toExponential(3)} J`;
        
        let tntDisplay;
        if (equivalenteTNT >= 1e9) {
            tntDisplay = `${(equivalenteTNT / 1e9).toFixed(2)} gigatoneladas`;
        } else if (equivalenteTNT >= 1e6) {
            tntDisplay = `${(equivalenteTNT / 1e6).toFixed(2)} megatoneladas`;
        } else {
            tntDisplay = `${equivalenteTNT.toLocaleString(undefined, { maximumFractionDigits: 0 })} toneladas`;
        }
        resTnt.textContent = tntDisplay;
        
        // GUARDAMOS LOS VALORES GLOBALES para learnMore()
        lastTntEquiv = tntDisplay; 
        
        resCrater.textContent = `${craterDiameterKm.toFixed(2)} km`; 
        resSismica.textContent = `M ${Math.max(0, magnitudSismica).toFixed(1)}`;
        
        // Lógica de sugerencias (Guardamos también el HTML)
        if (equivalenteTNT < 1e6) { 
            resSugerencias.innerHTML = SUGERENCIAS_LOCALIZADAS;
            lastSugerenciasHtml = SUGERENCIAS_LOCALIZADAS;
        } else if (equivalenteTNT < 100e6) { 
            resSugerencias.innerHTML = SUGERENCIAS_REGIONALES;
            lastSugerenciasHtml = SUGERENCIAS_REGIONALES;
        } else { 
            resSugerencias.innerHTML = SUGERENCIAS_GLOBALES;
            lastSugerenciasHtml = SUGERENCIAS_GLOBALES;
        }

    } else {
        resEnergia.textContent = `--- J`;
        resTnt.textContent = `--- toneladas`;
        resCrater.textContent = `--- km`;
        resSismica.textContent = `M ---`;
        resSugerencias.innerHTML = ``;
        lastSugerenciasHtml = `<h3>No hay datos de impacto disponibles.</h3>`;
    }
}

// ---------- Botones de simulación y mitigación ----------
const startBtn = document.getElementById("startBtn");
startBtn.addEventListener("click", () => {
    // Ocultar el mensaje de simulación terminada
    statusMessage.style.display = 'none'; 
    
    resetMeteor();
    running = true;
    impactDetected = false;
    deflectionActive = false; 
    deflectBtn.classList.remove('active');
    deflectBtn.textContent = 'Activar Desviación';
    
    // Limpiar marcadores de impacto anteriores antes de iniciar una nueva simulación
    craters.forEach(c => scene.remove(c));
    craters.length = 0; 
    
    // Restablecer la posición de la cámara
    camera.position.set(0, 0, 8); 

    // Forzamos la actualización del panel ANTES de la simulación
    updateResultsPanel(true); 
});

// Evento para el botón de desviación
deflectBtn.addEventListener('click', () => {
    if (!running) return; 
    deflectionActive = !deflectionActive;
    deflectBtn.classList.toggle('active', deflectionActive);
    deflectBtn.textContent = deflectionActive ? 'Desviación Activada' : 'Activar Desviación';
});


// ---------- Controles de Cámara Manuales ----------
document.getElementById("up").onclick = () => (camera.position.y += 0.5);
document.getElementById("down").onclick = () => (camera.position.y -= 0.5);
document.getElementById("left").onclick = () => (camera.position.x -= 0.5); 
document.getElementById("right").onclick = () => (camera.position.x += 0.5); 
document.getElementById("center").onclick = () => camera.position.set(0, 0, 8);

window.addEventListener("wheel", (e) => {
    camera.position.z += e.deltaY * 0.01;
    camera.position.z = Math.min(Math.max(4, camera.position.z), 30);
});

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// LÓGICA DE CLIC: Ocultar el mensaje de "SIMULACIÓN TERMINADA"
window.addEventListener("click", (event) => {
    if (statusMessage.style.display === 'block' && event.target.id !== 'viewCraterBtn' && event.target.id !== 'learnMoreBtn') {
        // Si el clic NO fue en los botones ni en un elemento de la GUI, ocultamos.
        const guiElements = document.querySelectorAll('.custom-gui, .impact-results-panel, #asteroid-select');
        let clickedOnGUI = false;
        
        guiElements.forEach(el => {
            if (el.contains(event.target)) {
                clickedOnGUI = true;
            }
        });

        if (!clickedOnGUI) {
            statusMessage.style.display = 'none';
        }
    }
});


// ---------- Traducciones de interfaz ----------
const translations = {
    es: {
        title: "Simulación Impacto Meteoritos",
        adjust: "Ajusta los parámetros",
        start: "Simular Impacto",
        deflect: "Activar Desviación",
        deflect_active: "Desviación Activada",
        diametro: "Diámetro (m):",
        velocidad: "Velocidad (km/s):",
        densidad: "Densidad (kg/m³):",
        resultados: "Resultados del Impacto",
        energia: "Energía",
        tnt: "Equivalente TNT",
        crater: "Tamaño estimado del cráter",
        sismica: "Magnitud sísmica aproximada",
        terminado: "SIMULACIÓN TERMINADA",
        load_data: "Cargar datos de un asteroide real (NASA):",
        loading: "Cargando asteroides...",
        select: "Selecciona un asteroide",
        view_crater: "Ver Cráter",
        learn_more: "Aprender más..."
    },
    en: {
        title: "Meteor Impact Simulation",
        adjust: "Adjust Parameters",
        start: "Simulate Impact",
        deflect: "Activate Deflection",
        deflect_active: "Deflection Activated",
        diametro: "Diameter (m):",
        velocidad: "Velocity (km/s):",
        densidad: "Density (kg/m³):",
        resultados: "Impact Results",
        energia: "Energy",
        tnt: "TNT Equivalent",
        crater: "Estimated Crater Size",
        sismica: "Approximate Seismic Magnitude",
        terminado: "SIMULATION ENDED",
        load_data: "Load real asteroid data (NASA):",
        loading: "Loading asteroids...",
        select: "Select an asteroid",
        view_crater: "View Crater",
        learn_more: "Learn More..."
    }
};

function updateLanguage(lang) {
    document.querySelector("title").textContent = translations[lang].title;
    document.querySelector(".custom-gui h2").textContent = translations[lang].adjust;
    document.getElementById("startBtn").textContent = translations[lang].start;
    
    const isDeflecting = deflectBtn.classList.contains('active');
    deflectBtn.textContent = isDeflecting ? translations[lang].deflect_active : translations[lang].deflect;

    document.querySelector("label[for='diametro-slider']").textContent = translations[lang].diametro;
    document.querySelector("label[for='velocidad-slider']").textContent = translations[lang].velocidad;
    document.querySelector("label[for='densidad-slider']").textContent = translations[lang].densidad;
    document.querySelector("label[for='asteroid-select']").textContent = translations[lang].load_data;

    document.querySelector(".impact-results-panel .panel-header").textContent = translations[lang].resultados;

    const updateResultLabel = (id, textKey) => {
        const element = document.getElementById(id);
        if (element && element.parentElement && element.parentElement.firstChild) {
            element.parentElement.firstChild.nodeValue = translations[lang][textKey] + ": ";
        }
    };

    updateResultLabel('res-energia', 'energia');
    updateResultLabel('res-tnt', 'tnt');
    updateResultLabel('res-crater', 'crater');
    updateResultLabel('res-sismica', 'sismica');

    statusMessage.firstChild.textContent = translations[lang].terminado;
    
    // Traducción de los nuevos botones
    document.getElementById('viewCraterBtn').textContent = translations[lang].view_crater;
    document.getElementById('learnMoreBtn').textContent = translations[lang].learn_more;

}

// Evento para cambiar idioma
const languageSelect = document.getElementById("language");
languageSelect.addEventListener("change", (e) => {
    updateLanguage(e.target.value);
});

// Inicializar en español
updateLanguage("es");


// ---------- Lógica de Audio ----------
document.addEventListener("click", () => {
    if (bgMusic && bgMusic.paused) {
        bgMusic.volume = 0.4;
        bgMusic.play().catch(e => console.error("Música bloqueada:", e));
    }
    if (audioImpacto) {
        audioImpacto.play().then(() => {
            audioImpacto.pause();
            audioImpacto.currentTime = 0;
        }).catch(e => console.error("Impacto bloqueado:", e));
    }
}, { once: true });


// ---------- INICIALIZACIÓN ----------
updateResultsPanel(false);
statusMessage.style.display = 'none';
fetchAsteroidData();