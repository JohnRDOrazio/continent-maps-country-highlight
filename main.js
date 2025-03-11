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

const miniMapDynamicInstanceStack = [];
const lineLayerStack = [];

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
    ['Europe',   4.75],
    ['Asia',     4.0],
    ['Americas', 4.0],
    ['Africa',   4.5],
    ['Oceania',  4.0]
]);

/**
 * Returns the crop coordinates for the image of thecurrent continent in the format
 * { left, top, width, height }.
 * @return {Object|null} The crop coordinates or null if the current
 *     continent is not supported.
 */
const cropForContinent = new Map([
    ['Europe',   { left: 750, top: 0, width: 1550, height: 1600 }],
    ['Asia',     { left: 550, top: 0, width: 1725, height: 1600 }],
    ['Americas', { left: 775, top: 75, width: 1425, height: 1450 }],
    ['Africa',   { left: 425, top: 0, width: 1575, height: 1600 }],
    ['Oceania',  { left: 300, top: 0, width: 2025, height: 1600 }]
]);

/**
 * A Map of predefined groups for each continent that need special handling
 * when positioning the minimap. The keys of the outer Map are the continent names,
 * and the values are inner Maps where the keys are the country names and
 * the values are callbacks that set the style of the miniMap element.
 * These callbacks are used to position the minimap so that it doesn't overlap
 * with the country that is highlighted in the main map.
 * @type {Map<string, Map<string, function(L HTMLElement): void>>}
 */
const predefinedGroupMiniMaps = new Map([
    ['Europe', new Map([
        ['Estonia',  (miniMapInstance) => {
            miniMapInstance.style.margin = 0;
            miniMapInstance.style.top = '480px';
            miniMapInstance.style.right = '250px';
            miniMapInstance.style.bottom = 'auto';
            miniMapInstance.style.width = '256px';
            miniMapInstance.style.height = '160px';
        }],
        ['Lettonia', (miniMapInstance) => {
            miniMapInstance.style.margin = 0;
            miniMapInstance.style.top = '660px';
            miniMapInstance.style.bottom = 'auto';
            miniMapInstance.style.right = '250px';
            miniMapInstance.style.width = '256px';
            miniMapInstance.style.height = '160px';
        }]
    ])],
    ['Asia',     null],
    ['Americas', new Map([
        ['Guatemala', (miniMapInstance) => {
            miniMapInstance.style.margin = 0;
            miniMapInstance.style.top = '80px';
            miniMapInstance.style.bottom = 'auto';
            miniMapInstance.style.right = '860px';
            miniMapInstance.style.width = '256px';
            miniMapInstance.style.height = '160px';
        }],
        ['Belize', (miniMapInstance) => {
            miniMapInstance.style.margin = 0;
            miniMapInstance.style.top = '80px';
            miniMapInstance.style.bottom = 'auto';
            miniMapInstance.style.right = '578px';
            miniMapInstance.style.width = '256px';
            miniMapInstance.style.height = '160px';
        }],
        ['Honduras', (miniMapInstance) => {
            miniMapInstance.style.margin = 0;
            miniMapInstance.style.top = '80px';
            miniMapInstance.style.bottom = 'auto';
            miniMapInstance.style.right = '276px';
            miniMapInstance.style.width = '256px';
            miniMapInstance.style.height = '160px';
        }],
        ['Nicaragua', (miniMapInstance) => {
            miniMapInstance.style.margin = 0;
            miniMapInstance.style.top = '432px';
            miniMapInstance.style.bottom = 'auto';
            miniMapInstance.style.width = '256px';
            miniMapInstance.style.height = '160px';
        }],
        ['Panama', (miniMapInstance) => {
            miniMapInstance.style.margin = 0;
            miniMapInstance.style.top = '608px';
            miniMapInstance.style.bottom = 'auto';
            miniMapInstance.style.width = '256px';
            miniMapInstance.style.height = '160px';
        }],
        ['Costa Rica', (miniMapInstance) => {
            miniMapInstance.style.margin = 0;
            miniMapInstance.style.top = '854px';
            miniMapInstance.style.bottom = 'auto';
            miniMapInstance.style.right = '638px';
            miniMapInstance.style.width = '256px';
            miniMapInstance.style.height = '160px';
        }],
        ['El Salvador', (miniMapInstance) => {
            miniMapInstance.style.margin = 0;
            miniMapInstance.style.top = '678px';
            miniMapInstance.style.bottom = 'auto';
            miniMapInstance.style.right = '920px';
            miniMapInstance.style.width = '256px';
            miniMapInstance.style.height = '160px';
        }],
    ])],
    ['Africa',   new Map([
        ['Zambia', (miniMapInstance) => {
            miniMapInstance.style.margin = 0;
            miniMapInstance.style.right = 'auto';
            miniMapInstance.style.left = '300px';
            miniMapInstance.style.top = 'auto';
            miniMapInstance.style.bottom = '350px';
            miniMapInstance.style.width = '256px';
            miniMapInstance.style.height = '160px';
        }],
        ['Zimbabwe', (miniMapInstance) => {
            miniMapInstance.style.margin = 0;
            miniMapInstance.style.right = 'auto';
            miniMapInstance.style.left = '330px';
            miniMapInstance.style.top = 'auto';
            miniMapInstance.style.bottom = '130px';
            miniMapInstance.style.width = '256px';
            miniMapInstance.style.height = '160px';
        }]
    ])],
    ['Oceania',  new Map([
        ['Papua Nuova Guinea', (miniMapInstance) => {
            miniMapInstance.style.margin = 0;
            miniMapInstance.style.right = 'auto';
            miniMapInstance.style.left = '300px';
            miniMapInstance.style.top = '150px';
            miniMapInstance.style.bottom = 'auto';
            miniMapInstance.style.width = '256px';
            miniMapInstance.style.height = '160px';
        }],
        ['Isole Salomone', (miniMapInstance) => {
            miniMapInstance.style.margin = 0;
            miniMapInstance.style.right = 'auto';
            miniMapInstance.style.left = '330px';
            miniMapInstance.style.top = '330px';
            miniMapInstance.style.bottom = 'auto';
            miniMapInstance.style.width = '256px';
            miniMapInstance.style.height = '160px';
        }],
        ['Vanuatu', (miniMapInstance) => {
            miniMapInstance.style.margin = 0;
            miniMapInstance.style.right = 'auto';
            miniMapInstance.style.left = '400px';
            miniMapInstance.style.top = '510px';
            miniMapInstance.style.bottom = 'auto';
            miniMapInstance.style.width = '256px';
            miniMapInstance.style.height = '160px';
        }],
        ['Nuova Caledonia', (miniMapInstance) => {
            miniMapInstance.style.margin = 0;
            miniMapInstance.style.right = 'auto';
            miniMapInstance.style.left = '470px';
            miniMapInstance.style.top = '700px';
            miniMapInstance.style.bottom = 'auto';
            miniMapInstance.style.width = '256px';
            miniMapInstance.style.height = '160px';
        }],
        ['Figi', (miniMapInstance) => {
            miniMapInstance.style.margin = 0;
            miniMapInstance.style.right = 'auto';
            miniMapInstance.style.left = '940px';
            miniMapInstance.style.top = '750px';
            miniMapInstance.style.bottom = 'auto';
            miniMapInstance.style.width = '256px';
            miniMapInstance.style.height = '160px';
        }]
    ])]
]);

let geoJsonData;
let mapGeoJsonLayer;
let miniMapGeoJsonLayer;

async function createDynamicMiniMapInstance(positionMiniMapCallback) {
    const domElement = document.createElement('div');
    domElement.classList.add('miniMap');
    document.body.appendChild(domElement);

    const mapInstance = L.map(domElement, { zoomControl: false, attributionControl: false, zoomSnap: 0.25 });
    mapInstance.doubleClickZoom.disable();
    mapInstance.scrollWheelZoom.disable();
    mapInstance.boxZoom.disable();
    mapInstance.keyboard.disable();
    mapInstance.dragging.disable();

    const miniMapGeoJsonLayer = L.geoJson(geoJsonData, {
        style: style('miniMap')
    }).addTo(mapInstance);

    L.control.scale().addTo(mapInstance);

    const tooltip = L.tooltip([0,0], {
        permanent: true,
        direction: "bottom",
        content: "minimap tooltip",
        className: "custom-tooltip"
    }).addTo(mapInstance);

    positionMiniMapCallback(domElement);
    miniMapDynamicInstanceStack.push([mapInstance, domElement]);

    const lineLayer = L.polyline([[0, 0], [0, 0]], {
        color: 'gray',
        weight: 1,
        opacity: 1
    }).addTo(map);
    lineLayerStack.push(lineLayer);

    return [mapInstance, miniMapGeoJsonLayer, tooltip, domElement, lineLayer];
}

function destroyDynamicMiniMapInstances() {
    while (miniMapDynamicInstanceStack.length > 0) {
        const [mapInstance, domElement] = miniMapDynamicInstanceStack.pop();
        mapInstance.remove();
        domElement.remove();
    }
    while (lineLayerStack.length > 0) {
        const lineLayer = lineLayerStack.pop();
        lineLayer.remove();
    }
}

/**
 * Repositions the minimap based on the main map,
 * so it doesn't overlap with the continent land area of the main map.
 * @return {undefined}
 */
function positionMiniMap() {
    const currentContinent = document.querySelector('[name="continents"]:checked').value;
    switch (currentContinent) {
        case 'Europe':
            miniMapElement.style.right = '200px';
            break;
        case 'Africa':
            miniMapElement.style.margin = 0;
            miniMapElement.style.right = 'auto';
            miniMapElement.style.left = '300px';
            miniMapElement.style.top = 'auto';
            miniMapElement.style.bottom = '100px';
            break;
        case 'Asia':
            miniMapElement.style.top = 'auto';
            miniMapElement.style.bottom = '100px';
            miniMapElement.style.left = 'auto';
            miniMapElement.style.right = '200px';
            break;
        case 'Oceania':
            miniMapElement.style.top = 'auto';
            miniMapElement.style.bottom = '250px';
            miniMapElement.style.right = '200px';
            break;
        case 'Americas':
            // nothing to do, this is the default styling
            break;
    }
}

function miniMapPixelCoordinates(corner, side='left', miniMapElementInstance) {
    const rect = miniMapElementInstance.getBoundingClientRect();
    switch (corner) {
        case 'topLeft':
            return {
                y: rect.top + (['left', 'right'].includes(side) ? 1 : 0),
                x: rect.left + (['top', 'bottom'].includes(side) ? 1 : 0),
            };
        case 'bottomLeft':
            return {
                y: rect.bottom,
                x: rect.left + (['top', 'bottom'].includes(side) ? 1 : 0),
            };
        case 'topRight':
            return {
                y: rect.top + (['left', 'right'].includes(side) ? 1 : 0),
                x: rect.right - (['top', 'bottom'].includes(side) ? 1 : 0),
            };
        case 'bottomRight':
            return {
                y: rect.bottom,
                x: rect.right - (['top', 'bottom'].includes(side) ? 1 : 0),
            }
        default:
            return null;
    }
}


// Function to reposition the tooltip at top center of the minimap
function positionTooltipAtTopCenter(map, tooltip) {
    const bounds = map.getBounds();
    tooltip.setLatLng([bounds.getNorth(), bounds.getCenter().lng]);
}

// Function to center minimap on Highlighted feature / country and zoom accordingly,
// and when finished, reposition tooltip to top center
function fitBoundsAsync(map, bounds, options = {}, tooltip) {
    return new Promise(resolve => {
        map.once("zoomend moveend", () => {
            positionTooltipAtTopCenter(map, tooltip);
            resolve(map.getZoom()); // Resolves with the final zoom level
        });
        map.fitBounds(bounds, options);
    });
}

// Function to load and display GeoJSON data
function loadGeoJson(continent) {
    fetch(`geojson/${continent}.json`)
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
                onEachFeature
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

            // Asia gets clipped on the main map, so we need to adjust the center
            if (continent === 'Asia') {
                let center = mapBounds.getCenter();  // Get center from fitBounds()
                center = L.latLng(center.lat + 20, center.lng);  // Adjust latitude downward
                //console.log('current main map zoom level:', map.getZoom());
                map.setView(center, 3.0); // Maintain center but set custom zoom
            }
            positionMiniMap();
            document.querySelector('#miniMapZoomValue').textContent = miniMap.getZoom().toFixed(2);
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
async function highlightFeature(e, resetStyles = true, miniMapCallback = null) {
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

    if (resetStyles) {
        // Reset styles to default to undo any previous highlights
        mapGeoJsonLayer.resetStyle();
    }

    // Highlight only the current country
    layer.setStyle(mapHighlightStyle);

    // Fit minimap to the highlighted country
    const [miniMapInstance, geoJsonLayer, tooltipInstance, miniMapElementInstance, lineLayerInstance] = miniMapCallback === null
        ? [miniMap, miniMapGeoJsonLayer, tooltip, miniMapElement, lineLayer]
        : await createDynamicMiniMapInstance(miniMapCallback);

    const miniMapLayer = geoJsonLayer.getLayers().find(layer => layer.feature.properties.name_it === countryName);
    console.log(`miniMapLayer:`, miniMapLayer);
    let finalZoom = await fitBoundsAsync(miniMapInstance, miniMapLayer.getBounds(), { padding: [50, 50] }, tooltipInstance);

    if (isMouseOverEvent) {
        document.querySelector('#miniMapZoomValue').textContent = finalZoom.toFixed(2);
    }

    if (finalZoom > zoomThreshold.get(currentContinent) || miniMapCallback !== null) {
        miniMapElementInstance.style.visibility = 'visible';
        tooltipInstance.setContent(countryName);
        lineLayerInstance.setLatLngs(getLineLayerLatLngs(layer, miniMapElementInstance));
        geoJsonLayer.resetStyle();
        miniMapLayer.setStyle(miniMapHighlightStyle);
    } else {
        miniMapElementInstance.style.visibility = 'hidden';
        lineLayerInstance.setLatLngs([]);
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

// Define events for each feature (country)
function onEachFeature(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight
    });
}
function disableMapHover() {
    mapGeoJsonLayer.eachLayer(layer => {
        layer.off("mouseover", highlightFeature);
        layer.off("mouseout", resetHighlight);
    });
}

function enableMapHover() {
    mapGeoJsonLayer.eachLayer(layer => {
        layer.on("mouseover", highlightFeature);
        layer.on("mouseout", resetHighlight);
    });
}

/**
 * Calculates the angle in degrees between two points with respect to the horizontal axis.
 * The angle is measured counterclockwise from the positive x-axis to the line connecting the two points.
 *
 * @param {Object} p1 - The first point, with properties `x` and `y`.
 * @param {Object} p2 - The second point, with properties `x` and `y`.
 * @return {number} The angle in degrees, normalized to the range 0-360.
 */

function calcAngle(p1, p2) {
    const deltaY = p2.y - p1.y;
    const deltaX = p2.x - p1.x;

    let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI); // Convert radians to degrees

    return (angle + 360) % 360; // Normalize to 0-360 degrees
}


function distanceBetweenPoints(p1, p2) {
    const A = p1.x - p2.x;
    const B = p1.y - p2.y;
    return Math.sqrt(A * A + B * B);
}

function getLineLayerLatLngs(layer, miniMapElementInstance) {
    const topLeftPixelCoords       = miniMapPixelCoordinates('topLeft', 'left', miniMapElementInstance);
    const topRightPixelCoords      = miniMapPixelCoordinates('topRight', 'right', miniMapElementInstance);
    const bottomLeftPixelCoords    = miniMapPixelCoordinates('bottomLeft', 'left', miniMapElementInstance);
    const bottomRightPixelCoords   = miniMapPixelCoordinates('bottomRight', 'right', miniMapElementInstance);
    const layerCenterCoords        = layer.getBounds().getCenter();
    const layerCenterPixelCoords   = map.latLngToContainerPoint(layerCenterCoords);
    const topLeftPixelDistance     = distanceBetweenPoints(layerCenterPixelCoords, topLeftPixelCoords);
    const topRightPixelDistance    = distanceBetweenPoints(layerCenterPixelCoords, topRightPixelCoords);
    const bottomLeftPixelDistance  = distanceBetweenPoints(layerCenterPixelCoords, bottomLeftPixelCoords);
    const bottomRightPixelDistance = distanceBetweenPoints(layerCenterPixelCoords, bottomRightPixelCoords);

    // ✅ Store all four possible lines with their distances
    const lines = [
        { pixelCoords: topLeftPixelCoords, distance: topLeftPixelDistance, tag: 'topLeft' },
        { pixelCoords: topRightPixelCoords, distance: topRightPixelDistance, tag: 'topRight' },
        { pixelCoords: bottomLeftPixelCoords, distance: bottomLeftPixelDistance, tag: 'bottomLeft' },
        { pixelCoords: bottomRightPixelCoords, distance: bottomRightPixelDistance, tag: 'bottomRight' }
    ];

    // ✅ Sort lines by pixel distance
    lines.sort((a, b) => a.distance - b.distance);

    // ✅ Calculate the greatest angle between the shortest line and the two next shortest lines
    const shortestLineAngle       = calcAngle(layerCenterPixelCoords, lines[0].pixelCoords);
    const secondShortestLineAngle = calcAngle(layerCenterPixelCoords, lines[1].pixelCoords);
    const thirdShortestLineAngle  = calcAngle(layerCenterPixelCoords, lines[2].pixelCoords);
    const angleDiff1 = Math.abs(shortestLineAngle - secondShortestLineAngle);
    const angleDiff2 = Math.abs(shortestLineAngle - thirdShortestLineAngle);
    const greaterAngleDiff = Math.max(angleDiff1, angleDiff2);

    // ✅ Select the geodesic coordinates of the line with the greater angle difference compared to the shortest line
    const shortestLineCoords       = map.containerPointToLatLng(lines[0].pixelCoords, map.getZoom());
    const secondShortestLineCoords = map.containerPointToLatLng(lines[1].pixelCoords, map.getZoom());
    const thirdShortestLineCoords  = map.containerPointToLatLng(lines[2].pixelCoords, map.getZoom());
    const selectedLineCoords = (greaterAngleDiff === angleDiff1) ? secondShortestLineCoords : thirdShortestLineCoords;

    // ✅ Return the geodesic coordinates of the two lines, the shortest and the line selected because of the greater angle difference
    return [
        [layerCenterCoords, shortestLineCoords],
        [layerCenterCoords, selectedLineCoords]
    ];
}

/**
 * Highlights all countries in the currently selected continent that are part of a predefined group.
 * The predefined groups are to simplify presentation in the Vademecum document
 * for smaller countries that are closeby and could possibly be combined into a single tour.
 * The predefined groups are stored in the `predefinedGroups` Map.
 * @returns {Promise<void>}
 */
async function highlightPredefinedGroup() {
    const continent = document.querySelector('[name="continents"]:checked').value;
    console.log('highlightPredefinedGroup for continent:', continent);
    const predefinedGroup = predefinedGroupMiniMaps.get(continent);
    if (predefinedGroup && predefinedGroup instanceof Map && predefinedGroup.size > 0) {
        console.log(`Highlighting predefined group:`, predefinedGroup);
        for (const [countryName, miniMapCallback] of predefinedGroup) {
            const layer = mapGeoJsonLayer.getLayers().find(layer => layer.feature.properties.name_it === countryName);
            console.log(`Highlighting country: ${countryName}`);
            await highlightFeature(layer, false, miniMapCallback);
        }
    } else {
        console.warn('predefinedGroup seems to be empty?', predefinedGroup);
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
    const toolbar = document.getElementById('toolbar');
    const currentContinent = document.querySelector('[name="continents"]:checked').value;
    const crop = cropForContinent.get(currentContinent);
    //const progressText = document.getElementById('progress');

    disableMapHover();

    //let completed = 0;
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
        enableMapHover();
    });

    for (let feature of geoJsonData.features) {
        if (!screenSharingActive) break; // ✅ Exit loop if screen sharing stops

        const countryName = feature.properties.name_it;
        const isoCode = feature.properties.iso_a2;

        // ✅ Highlight feature
        const layer = mapGeoJsonLayer.getLayers().find(layer => layer.feature.properties.name_it === countryName);
        await highlightFeature(layer);

        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for styles to render

        // ✅ Capture updated screen
        const bitmap = await imageCapture.grabFrame();
        ctx.drawImage(bitmap, crop.left, crop.top, crop.width, crop.height, 0, 0, crop.width, crop.height);

        // ✅ Save to ZIP
        let imageData = canvas.toDataURL("image/png").split(',')[1]; // Get image base64 data
        zip.file(`${isoCode} - ${countryName}.png`, imageData, { base64: true });

        //completed++;
        //progressText.textContent = `Progress: ${completed} / ${totalCountries}`;

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
    enableMapHover();
}

// ✅ Ensure function is only triggered when clicking the export button
document.addEventListener('click', function (event) {
    console.log('click event.target:', event.target);
    if (event.target.matches('#exportButton')) {
        exportImages();
    }
    if (event.target.matches('#highlightGroupButton')) {
        highlightPredefinedGroup();
        event.target.disabled = true;
        document.querySelector('#clearHighlightsButton').disabled = false;
        document.querySelectorAll('#toolbar > :not(#highlightGroup)').forEach(el => el.style.display = 'none');
    }
    if (event.target.matches('#clearHighlightsButton')) {
        destroyDynamicMiniMapInstances();
        mapGeoJsonLayer.resetStyle();
        document.querySelector('#highlightGroupButton').disabled = false;
        document.querySelectorAll('#toolbar > :not(#highlightGroup)').forEach(el => el.style.display = 'inherit');
    }
});

document.addEventListener('change', function (event) {
    console.log('change event.target:', event.target);
    if (event.target.matches('input[name="continents"]')) {
        const selectedContinent = event.target.value;
        loadGeoJson(selectedContinent);
    }
});

// ✅ Initial load
loadGeoJson('Americas');
