# functions_gee/main.py
import ee
import functions_framework
from datetime import datetime, timezone, timedelta

# Inicijuojame Google Earth Engine su tavo patvirtintu projektu
PROJECT_ID = 'neighborpm-b9968'
try:
    ee.Initialize(project=PROJECT_ID)
except Exception as e:
    print(f"GEE Initialize klaida: {e}")

@functions_framework.http
def calculate_field_ndvi_gee(request):
    # CORS palaikymas (kad naršyklė galėtų tiesiogiai kreiptis)
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        }
        return ('', 204, headers)

    headers = {'Access-Control-Allow-Origin': '*'}
    request_json = request.get_json(silent=True)

    if not request_json or 'coords' not in request_json:
        return ({'success': False, 'error': 'Nenurodytos lauko koordinatės'}, 400, headers)

    coords_raw = request_json['coords']
    if len(coords_raw) < 3:
        return ({'success': False, 'error': 'Laukas turi turėti bent 3 taškus'}, 400, headers)

    try:
        # 1. Suformuojame tikrą GeoJSON poligoną [lng, lat]
        ring = []
        for p in coords_raw:
            lng = p.get('lng') if isinstance(p, dict) else p[0]
            lat = p.get('lat') if isinstance(p, dict) else p[1]
            ring.append([float(lng), float(lat)])

        if ring[0] != ring[-1]:
            ring.append(ring[0])

        geom = ee.Geometry.Polygon([ring])

        # 2. Dinaminis laiko langas: po rugsėjo 15 d. iki šiandienos
        now = datetime.now()
        current_year = now.year
        season_year = current_year if (now.month > 9 or (now.month == 9 and now.day >= 15)) else current_year - 1
        start_date = f"{season_year}-09-15"
        end_date = (now + timedelta(days=1)).strftime('%Y-%m-%d')

        # 3. Sentinel-2 debesų filtras (SCL)
        def mask_s2_clouds(image):
            scl = image.select('SCL')
            mask = scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))
            time_val = ee.Number(image.get('system:time_start'))
            time_band = ee.Image.constant(time_val).toDouble().rename('time')
            ndvi_band = image.normalizedDifference(['B8', 'B4']).toDouble().rename('NDVI')
            return image.updateMask(mask).addBands(ndvi_band).addBands(time_band)

        # 4. Užklausa į Sentinel-2 L2A archyvą
        s2_collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                         .filterBounds(geom)
                         .filterDate(start_date, end_date)
                         .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 75))
                         .map(mask_s2_clouds)
                         .sort('system:time_start', False))

        # Paimame naujausią giedrą kadrą virš šio poligono
        latest_composite = s2_collection.select(['NDVI', 'time']).mosaic()

        # Apskaičiuojame tikrą poligono vidurkį
        stats = latest_composite.reduceRegion(
            reducer=ee.Reducer.mean(),
            geometry=geom,
            scale=10,
            maxPixels=1e7
        ).getInfo()

        raw_ndvi = stats.get('NDVI')
        raw_time = stats.get('time')

        # Jei laukas buvo pilnai po debesimis – jokių išgalvotų skaičių, grąžiname tiesą:
        if raw_ndvi is None:
            return ({
                'success': False,
                'error': 'Šiuo periodu virš lauko nerasta giedro dangaus nuotraukų (debesys).'
            }, 200, headers)

        # TIKRI REZULTATAI:
        clean_ndvi = round(max(-1.0, min(1.0, float(raw_ndvi))), 3)
        score = round((clean_ndvi / 0.85) * 100, 2)
        sat_date = datetime.fromtimestamp(raw_time / 1000, tz=timezone.utc).strftime('%m-%d') if raw_time else 'Nežinoma'

        return ({
            'success': True,
            'ndvi': clean_ndvi,
            'score': score,
            'satDate': sat_date
        }, 200, headers)

    except Exception as err:
        print(f"Klaida skaičiuojant GEE: {err}")
        return ({'success': False, 'error': str(err)}, 500, headers)