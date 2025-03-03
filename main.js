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

const mapHighLightStyle = {
    weight: 1,
    opacity: 1.0,
    color: 'darkgreen',
    fillColor: 'darkgreen',
    fillOpacity: 0.5
};

const miniMapHighLightStyle = {
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

const miniMapElement = document.getElementById('miniMap');
const rect = miniMapElement.getBoundingClientRect();
const topLeftPixelCoords = {
    x: rect.left,
    //y: rect.top + rect.height / 2
    y: rect.top + 1
};
const bottomLeftPixelCoords = {
    x: rect.left,
    //y: rect.top + rect.height / 2
    y: rect.bottom - 1
};

// Function to reposition at top center
function positionTooltipAtTopCenter(map) {
    let bounds = map.getBounds();
    tooltip.setLatLng([bounds.getNorth(), bounds.getCenter().lng]);
}

function fitBoundsAsync(map, bounds, options = {}) {
    return new Promise(resolve => {
        map.once("zoomend moveend", () => {
            positionTooltipAtTopCenter(map);
            resolve(map.getZoom()); // Resolves with the final zoom level
        });
        map.fitBounds(bounds, options);
    });
}

const lineLayer = L.polyline([[0, 0], [0, 0]], {
    color: 'gray',
    weight: 1,
    opacity: 1
}).addTo(map);

// Add GeoJSON data to the main map
let mapGeoJsonLayer;
let geoJsonData;
let miniMapGeoJsonLayer;
fetch('geojson/Americas.json')
    .then(response => response.json())
    .then(data => {
        geoJsonData = data;
        mapGeoJsonLayer = L.geoJson(geoJsonData, {
            style: style,
            onEachFeature: onEachFeature
        }).addTo(map);
        miniMapGeoJsonLayer = L.geoJson(geoJsonData, {
            style: style('miniMap')
        }).addTo(miniMap);
        L.control.scale().addTo(miniMap);
        map.fitBounds(mapGeoJsonLayer.getBounds()).setZoom(2.3);
        miniMap.fitBounds(miniMapGeoJsonLayer.getBounds()).setZoom(2.3);
    })
    .catch(error => {
        console.error('Error loading GeoJSON on the Main Map:', error);
    });


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
    const layer = e.target;
    const countryName = layer.feature.properties.name_it;

    layer.setStyle(mapHighLightStyle);

    const miniMapLayer = miniMapGeoJsonLayer.getLayers().find(layer => layer.feature.properties.name_it === countryName);
    console.log(`miniMapLayer: ${miniMapLayer}`);
    let finalZoom = await fitBoundsAsync(miniMap, miniMapLayer.getBounds(), { padding: [50, 50] });
    console.log(`finalZoom: ${finalZoom}`);

    if (finalZoom > 4.0) {
        miniMapElement.style.visibility = 'visible';
        tooltip.setContent(countryName);
        const topLeftLatLng = map.containerPointToLatLng(topLeftPixelCoords, map.getZoom());
        const bottomLeftLatLng = map.containerPointToLatLng(bottomLeftPixelCoords, map.getZoom());
        lineLayer.setLatLngs([
            [layer.getBounds().getCenter(), topLeftLatLng],
            [layer.getBounds().getCenter(), bottomLeftLatLng]
        ]);
        miniMapGeoJsonLayer.resetStyle();
        miniMapLayer.setStyle(miniMapHighLightStyle);
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

async function doHighlightFeature(layer, countryName, isoCode) {
    // Reset styles
    mapGeoJsonLayer.resetStyle(layer);

    // Highlight only the current country
    if (layer.feature.properties.name_it === countryName) {
        layer.setStyle(mapHighLightStyle);

        // Bring the layer to the front to ensure the highlight is visible
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
            layer.bringToFront();
        }

        const miniMapLayer = miniMapGeoJsonLayer.getLayers().find(layer => layer.feature.properties.name_it === countryName);
        console.log(`miniMapLayer: ${miniMapLayer}`);
        let finalZoom = await fitBoundsAsync(miniMap, miniMapLayer.getBounds(), { padding: [50, 50] });
        console.log(`finalZoom: ${finalZoom}`);

        if (finalZoom > 4.0) {
            miniMapElement.style.visibility = 'visible';
            tooltip.setContent(countryName);
            positionTooltipAtTopCenter(miniMap);
            const topLeftLatLng = map.containerPointToLatLng(topLeftPixelCoords, map.getZoom());
            const bottomLeftLatLng = map.containerPointToLatLng(bottomLeftPixelCoords, map.getZoom());
            lineLayer.setLatLngs([
                [layer.getBounds().getCenter(), topLeftLatLng],
                [layer.getBounds().getCenter(), bottomLeftLatLng]
            ]);
            miniMapGeoJsonLayer.resetStyle();
            miniMapLayer.setStyle(miniMapHighLightStyle);
        } else {
            miniMapElement.style.visibility = 'hidden';
            lineLayer.setLatLngs([]);
        }
    } else {
        //layer.closeTooltip();
    }
}


async function exportImages() {

    const zip = new JSZip();
    const totalCountries = geoJsonData.features.length;
    const progressText = document.getElementById('progress');

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

    let completed = 0;

    for (let feature of geoJsonData.features) {
        const countryName = feature.properties.name_it;
        const isoCode = feature.properties.iso_a2;

        // ✅ Highlight feature & force Leaflet to update
        mapGeoJsonLayer.eachLayer(layer => doHighlightFeature(layer, countryName, isoCode));

        // ✅ Wait for styles to update using `requestAnimationFrame`
        await new Promise(resolve => requestAnimationFrame(resolve));
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for styles to render

        // ✅ Capture updated screen
        const bitmap = await imageCapture.grabFrame();

        // ✅ Define crop region (adjust these values)
        const cropX = 850; // Left offset
        const cropY = 200; // Top offset
        const cropWidth = 1350;  // Adjust to crop width
        const cropHeight = 1200; // Adjust to crop height

        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        ctx.drawImage(bitmap, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

        // ✅ Save to ZIP
        let imageData = canvas.toDataURL("image/png").split(',')[1]; // Get image base64 data
        zip.file(`${isoCode} - ${countryName}.png`, imageData, { base64: true });

        completed++;
        progressText.textContent = `Progress: ${completed} / ${totalCountries}`;

        await new Promise(resolve => setTimeout(resolve, 1500)); // Pause between exports
    }

    track.stop(); // ✅ Stop screen capture

    // ✅ Generate ZIP and trigger download
    zip.generateAsync({ type: "blob" }).then(function(content) {
        saveAs(content, "Countries_Export.zip");
    });
    alert("Export complete! Downloading ZIP file.");
}

// ✅ Ensure function is only triggered when clicking the export button
document.addEventListener('click', function (event) {
    if (event.target.matches('#exportButton')) {
        exportImages();
    }
});

