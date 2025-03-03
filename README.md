# Highlight countries one at a time on maps of the continents
This repository uses leaflet, and geojson data of world countries exported from https://geojson-maps.kyd.au/,
which in turn sources the data from https://www.naturalearthdata.com/ .

I first exported the geojson data by continent from https://geojson-maps.kyd.au/.
This data is stored in the `geojson` folder.

Since French Guiana was included in the France geojson data,
I had to manually move that from Europe -> France to Americas -> French Guiana,
in order to fill in the missing gap in South America.
Since there was no `features.properties` data for French Guiana,
I manually created the minimum data I needed for my own purposes in exporting the images.

In order to export the images, I made the browser tab full screen, refreshed the page, and then started the export.
This results in a final zip file that is downloaded, and the resulting images in the zip file are included in the `Countries_Export` folder.

Since the screen I was using had a resolution of 2560 width x 1600 height,
the script crops the final images according to these dimensions, for a final image size of 1350 width x 1200 height (for the Americas).
