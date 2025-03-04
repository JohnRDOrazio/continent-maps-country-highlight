import * as L from "https://unpkg.com/leaflet/dist/leaflet-src.esm.js";

// Initialize the main map centered over Brasília, Brazil
const map = L.map('map', { zoomControl: false, attributionControl: false, zoomSnap: 0.25 });
map.doubleClickZoom.disable();
map.scrollWheelZoom.disable();
map.boxZoom.disable();
map.keyboard.disable();
map.dragging.disable();

const miniMap = L.map('miniMap', { zoomControl: false, attributionControl: false, zoomSnap: 0.25 });
miniMap.doubleClickZoom.disable();
miniMap.scrollWheelZoom.disable();
miniMap.boxZoom.disable();
miniMap.keyboard.disable();
miniMap.dragging.disable();

const mapHighlightStyle = {
    weight: 1,
    opacity: 1.0,
    color: 'darkgreen',
    fillColor: 'darkgreen',
    fillOpacity: 0.5
};

const miniMapHighlightStyle = {
    weight: 1,
    opacity: 1.0,
    color: 'darkgreen',
    fillColor: 'darkgreen',
    fillOpacity: 0.5
};

const tooltip = L.tooltip([0,0], {
    permanent: true,  // Always visible
    direction: "bottom", // Anchor at the bottom
    content: "minimap tooltip",
    className: "custom-tooltip" // Custom styling
}).addTo(miniMap);

const scaleControl = L.control.scale().addTo(miniMap);

const lineLayer = L.polyline([[0, 0], [0, 0]], {
    color: 'gray',
    weight: 1,
    opacity: 1
}).addTo(map);

const miniMapElement = document.getElementById('miniMap');

const zoomThreshold = new Map([
    ['Americas', 4.0],
    ['Europe', 4.75],
    ['Asia', 4.0],
    ['Africa', 4.0],
    ['Oceania', 4.0]
]);

let geoJsonData;
let mapGeoJsonLayer;
let miniMapGeoJsonLayer;

function miniMapPixelCoordinates(corner, side='left') {
    const rect = miniMapElement.getBoundingClientRect();
    switch (corner) {
        case 'topLeft':
            return {
                x: rect.left + (['top', 'bottom'].includes(side) ? 1 : 0),
                y: rect.top + (['left', 'right'].includes(side) ? 1 : 0)
            };
        case 'bottomLeft':
            return {
                x: rect.left + (['top', 'bottom'].includes(side) ? 1 : 0),
                y: rect.bottom //- (['left', 'right'].includes(side) ? 1 : 0)
            };
        case 'topRight':
            return {
                x: rect.right - (['top', 'bottom'].includes(side) ? 1 : 0),
                y: rect.top + (['left', 'right'].includes(side) ? 1 : 0)
            };
        case 'bottomRight':
            return {
                x: rect.right - (['top', 'bottom'].includes(side) ? 1 : 0),
                y: rect.bottom //- (['left', 'right'].includes(side) ? 1 : 0)
            }
        default:
            return null;
    }
}


// Function to reposition the tooltip at top center of the minimap
function positionTooltipAtTopCenter(map) {
    let bounds = map.getBounds();
    tooltip.setLatLng([bounds.getNorth(), bounds.getCenter().lng]);
}

function positionMiniMap() {
    const currentContinent = document.querySelector('[name="continents"]:checked').value;
    switch (currentContinent) {
        case 'Europe':
            miniMapElement.style.right = '200px';
            break;
    }
}

// Function to center minimap on Highlighted feature / country and zoom accordingly,
// and when finished, reposition tooltip to top center
function fitBoundsAsync(map, bounds, options = {}) {
    return new Promise(resolve => {
        map.once("zoomend moveend", () => {
            positionTooltipAtTopCenter(map);
            resolve(map.getZoom()); // Resolves with the final zoom level
        });
        map.fitBounds(bounds, options);
    });
}

// Function to load and display GeoJSON data
function loadGeoJson(url) {
    fetch(url)
        .then(response => response.json())
        .then(data => {
            let russiaOrFiji = data.features.find(feature => (feature.properties.name_it === 'Russia' || feature.properties.name_it === 'Figi'));
            if (russiaOrFiji) {
                russiaOrFiji.geometry.coordinates.forEach(polygon => {
                    polygon.forEach(line => {
                        line.forEach(section => {
                            if (section[0] < 0) {
                                section[0] += 360;
                            }
                        });
                    });
                });
            }
            geoJsonData = data;

            // ✅ Remove previous layers if they exist
            if (mapGeoJsonLayer && map.hasLayer(mapGeoJsonLayer)) {
                map.removeLayer(mapGeoJsonLayer);
            }
            if (miniMapGeoJsonLayer && miniMap.hasLayer(miniMapGeoJsonLayer)) {
                miniMap.removeLayer(miniMapGeoJsonLayer);
            }

            // ✅ Add new GeoJSON layer to the main map
            mapGeoJsonLayer = L.geoJson(geoJsonData, {
                style,
                onEachFeature: onEachFeature
            }).addTo(map);

            // ✅ Add new GeoJSON layer to the minimap
            miniMapGeoJsonLayer = L.geoJson(geoJsonData, {
                style: style('miniMap')
            }).addTo(miniMap);

            // ✅ Fit bounds to the new dataset
            const mapBounds = mapGeoJsonLayer.getBounds();
            const miniMapBounds = miniMapGeoJsonLayer.getBounds();
            map.fitBounds(mapBounds);
            miniMap.fitBounds(miniMapBounds);
            positionMiniMap();
        })
        .catch(error => {
            console.error('Error loading GeoJSON:', error);
        });
}


// Style for countries on the main map
function style(whichMap) {
    if ('miniMap' === whichMap) {
        return {
            weight: 0,
            opacity: 0,
            fillOpacity: 0
        };
    }
    return {
        weight: 0.25,
        opacity: 1.0,
        color: 'black',
        fillColor: 'gray',
        fillOpacity: 0.4
    };
}

// Highlight a country on hover
async function highlightFeature(e) {
    let layer;
    let isMouseOverEvent = false;
    if (e.hasOwnProperty('target')) {
        console.log(e);
        layer = e.target;
        isMouseOverEvent = e.originalEvent.type === 'mouseover';
    } else {
        layer = e;
    }

    const countryName = layer.feature.properties.name_it;
    const currentContinent = document.querySelector('[name="continents"]:checked').value;

    // Reset styles
    mapGeoJsonLayer.resetStyle();

    // Highlight only the current country
    layer.setStyle(mapHighlightStyle);

    // Fit minimap to the highlighted country
    const miniMapLayer = miniMapGeoJsonLayer.getLayers().find(layer => layer.feature.properties.name_it === countryName);
    console.log(`miniMapLayer: ${miniMapLayer}`);
    let finalZoom = await fitBoundsAsync(miniMap, miniMapLayer.getBounds(), { padding: [50, 50] });

    if (isMouseOverEvent) {
        document.querySelector('#miniMapZoomValue').textContent = finalZoom;
    }

    if (finalZoom > zoomThreshold.get(currentContinent)) {
        miniMapElement.style.visibility = 'visible';
        tooltip.setContent(countryName);
        const topLeftLatLng = map.containerPointToLatLng(miniMapPixelCoordinates('topLeft', 'left'), map.getZoom());
        const bottomLeftLatLng = map.containerPointToLatLng(miniMapPixelCoordinates('bottomLeft', 'left'), map.getZoom());
        const layerCenterCoords = layer.getBounds().getCenter();
        lineLayer.setLatLngs([
            [layerCenterCoords, topLeftLatLng],
            [layerCenterCoords, bottomLeftLatLng]
        ]);
        miniMapGeoJsonLayer.resetStyle();
        miniMapLayer.setStyle(miniMapHighlightStyle);
    } else {
        miniMapElement.style.visibility = 'hidden';
        lineLayer.setLatLngs([]);
    }
}

// Reset the country's style when the mouse leaves
function resetHighlight(e) {
    const layer = e.target;
    const countryName = layer.feature.properties.name_it;
    lineLayer.setLatLngs([]);
    mapGeoJsonLayer.resetStyle(layer);
    //miniMapGeoJsonLayer.resetStyle();
    miniMapElement.style.visibility = 'hidden';
    //layer.closeTooltip();
}

// Zoom into the clicked country
function zoomToFeature(e) {
    const layer = e.target;
    map.fitBounds(layer.getBounds(), { padding: [50, 50] });
}


// Define events for each feature (country)
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: zoomToFeature
    });
}

function getCropForContinent() {
    const currentContinent = document.querySelector('[name="continents"]:checked').value;
    switch (currentContinent) {
        case 'Europe':
            return {
                left: 750,
                top: 0,
                width: 1550,
                height: 1600
            }
        case 'Asia':
            return {
                left: 850,
                top: 200,
                width: 1350,
                height: 1200
            };
        case 'Africa':
            return {
                left: 850,
                top: 200,
                width: 1350,
                height: 1200
            };
        case 'Americas':
            return {
                left: 775,
                top: 75,
                width: 1425,
                height: 1450
            };
        case 'Oceania':
            return {
                left: 850,
                top: 200,
                width: 1350,
                height: 1200
            };
        default:
            return null;
    }
}

async function exportImages() {

    // ✅ Ensure user grants screen capture permission before proceeding
    let stream;
    try {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    } catch (err) {
        alert("Screen capture permission denied. Export canceled.");
        return;
    }
    const track = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);
    const zip = new JSZip();
    const totalCountries = geoJsonData.features.length;
    const progressText = document.getElementById('progress');
    const toolbar = document.getElementById('toolbar');
    const crop = getCropForContinent();

    let completed = 0;
    let screenSharingActive = true;
    let canvas = document.createElement("canvas");
    let ctx = canvas.getContext("2d");
    canvas.width = crop.width;
    canvas.height = crop.height;
    toolbar.style.visibility = 'hidden';

    // ✅ Detect if the user stops screen sharing
    track.addEventListener("ended", () => {
        toolbar.style.visibility = 'visible';
        console.warn("Screen sharing was interrupted by the user.");
        screenSharingActive = false;
    });

    for (let feature of geoJsonData.features) {
        if (!screenSharingActive) break; // ✅ Exit loop if screen sharing stops

        const countryName = feature.properties.name_it;
        const isoCode = feature.properties.iso_a2;

        // ✅ Highlight feature & force Leaflet to update
        const layer = mapGeoJsonLayer.getLayers().find(layer => layer.feature.properties.name_it === countryName);

        await highlightFeature(layer);

        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for styles to render

        // ✅ Capture updated screen
        const bitmap = await imageCapture.grabFrame();
        ctx.drawImage(bitmap, crop.left, crop.top, crop.width, crop.height, 0, 0, crop.width, crop.height);

        // ✅ Save to ZIP
        let imageData = canvas.toDataURL("image/png").split(',')[1]; // Get image base64 data
        zip.file(`${isoCode} - ${countryName}.png`, imageData, { base64: true });

        completed++;
        progressText.textContent = `Progress: ${completed} / ${totalCountries}`;

        await new Promise(resolve => setTimeout(resolve, 1500)); // Pause between exports
    }

    track.stop(); // ✅ Stop screen capture
    toolbar.style.visibility = 'visible';

    // ✅ Generate ZIP and trigger download
    zip.generateAsync({ type: "blob" }).then(function(content) {
        const currentContinent = document.querySelector('[name="continents"]:checked').value;
        saveAs(content, `${currentContinent}_Export.zip`);
    });
    alert("Export complete! Downloading ZIP file.");
}

// ✅ Ensure function is only triggered when clicking the export button
document.addEventListener('click', function (event) {
    console.log('click event.target:', event.target);
    if (event.target.matches('#exportButton')) {
        exportImages();
    }
});

document.addEventListener('change', function (event) {
    console.log('change event.target:', event.target);
    if (event.target.matches('input[name="continents"]')) {
        const selectedContinent = event.target.value;
        loadGeoJson(`geojson/${selectedContinent}.json`);
    }
});

// ✅ Initial load
loadGeoJson('geojson/Americas.json');
