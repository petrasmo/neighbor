# functions/calc_real_ndvi.py
import ee
import os
from google.cloud import firestore
from datetime import datetime, timezone, timedelta

# Priverstinai nurodome tavo projektą
os.environ["GCLOUD_PROJECT"] = "neighborpm-b9968"
os.environ["GOOGLE_CLOUD_PROJECT"] = "neighborpm-b9968"

print("🚀 Jungiamasi prie Google Earth Engine ir Firestore...")
ee.Initialize(project='neighborpm-b9968')
db = firestore.Client(project='neighborpm-b9968')
print("✅ Ryšys sėkmingas!\n")

# 🌟 1. DINAMINĖS DATOS: GRIEŽTAI PO RUGSĖJO 15 D. IKI ŠIANDIENOS
now = datetime.now()
current_year = now.year

# Nustatome einamojo rudens sezono pradžią (09-15)
if (now.month > 9) or (now.month == 9 and now.day >= 15):
    season_year = current_year
else:
    season_year = current_year - 1

start_date = f"{season_year}-09-15"
# Pridedame 1 dieną į priekį, kad apimtų ir šiandienos kadrus (GEE filterDate pabaiga yra neįskaitinė)
end_date = (now + timedelta(days=1)).strftime("%Y-%m-%d")

print(f"📅 Dinaminis paieškos langas: nuo {start_date} iki {now.strftime('%Y-%m-%d')} (šiandien)")

def mask_s2_clouds(image):
    scl = image.select('SCL')
    # Atmetame debesis (8, 9, 10), šešėlius (3) ir sniegą (11)
    mask = scl.neq(3).And(scl.neq(8)).And(scl.neq(9)).And(scl.neq(10)).And(scl.neq(11))
    
    # Laiko žyma ir NDVI paverčiami į suderinamą float tipą (.toDouble())
    time_val = ee.Number(image.get('system:time_start'))
    time_band = ee.Image.constant(time_val).toDouble().rename('time')
    ndvi_band = image.normalizedDifference(['B8', 'B4']).toDouble().rename('NDVI')
    
    return image.updateMask(mask).addBands(ndvi_band).addBands(time_band)

def run_latest_ndvi_sync():
    docs = list(db.collection("league_scores").stream())
    print(f"📋 Rasta laukų Firestore bazėje: {len(docs)} vnt.")

    if len(docs) == 0:
        print("❌ Laukų nerasta!")
        return

    features = []
    for doc in docs:
        data = doc.to_dict()
        coords_raw = data.get("coords", [])
        if len(coords_raw) < 3:
            continue

        ring = [[p["lng"], p["lat"]] for p in coords_raw]
        if ring[0] != ring[-1]:
            ring.append(ring[0])

        geom = ee.Geometry.Polygon([ring])
        feat = ee.Feature(geom, {"docId": doc.id, "crop": data.get("crop", "")})
        features.append(feat)

    fc = ee.FeatureCollection(features)
    print(f"🛰️ Siunčiama {len(features)} laukų į GEE...")

    # Ieškome kadrų TIK po rugsėjo 15 d. iki šiandienos, surūšiuojame: NAUJAUSIAS viršuje!
    s2_collection = (ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                     .filterBounds(fc)
                     .filterDate(start_date, end_date)
                     .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 70))
                     .map(mask_s2_clouds)
                     .sort('system:time_start', False))

    # Paimame patį viršutinį (naujausią giedrą) kadrą kiekvienam laukui
    latest_composite = s2_collection.select(['NDVI', 'time']).mosaic()

    print("⏳ Google superkompiuteriai ieško pačių naujausių kadrų po 09-15 kiekvienam laukui...")
    stats = latest_composite.reduceRegions(
        collection=fc,
        reducer=ee.Reducer.mean(),
        scale=10,
        tileScale=4
    )

    results = stats.getInfo()["features"]
    print(f"🎉 Gauti rezultatai {len(results)} laukams!\n")

    batch = db.batch()
    updated_count = 0

    for r in results:
        props = r.get("properties", {})
        doc_id = props.get("docId")
        raw_mean = props.get("NDVI")
        raw_time = props.get("time")

        if not doc_id or raw_mean is None:
            continue

        clean_ndvi = round(max(0.05, min(0.95, float(raw_mean))), 3)
        score = round((clean_ndvi / 0.85) * 100, 2)

        # Suformatuojame tikrą nuotraukos datą (pvz., "10-03")
        if raw_time:
            sat_date = datetime.fromtimestamp(raw_time / 1000, tz=timezone.utc).strftime("%m-%d")
        else:
            sat_date = now.strftime("%m-%d")

        ref = db.collection("league_scores").document(doc_id)
        batch.update(ref, {
            "ndvi": clean_ndvi,
            "score": score,
            "satDate": sat_date,
            "updatedAt": firestore.SERVER_TIMESTAMP
        })
        updated_count += 1

        if updated_count % 300 == 0:
            batch.commit()
            batch = db.batch()
            print(f"💾 Įrašyta {updated_count} laukų...")

    batch.commit()
    print(f"\n🏆 VALIO! Visi {updated_count} laukai atnaujinti su PAČIOMIS NAUJAUSIOMIS nuotraukomis po rugsėjo 15 d.!")

if __name__ == "__main__":
    run_latest_ndvi_sync()