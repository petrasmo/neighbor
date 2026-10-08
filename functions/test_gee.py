# test_gee.py
import ee

print("🛰️ Jungiamasi prie Google Earth Engine per ADC...")

# Inicijuojame su tavo patvirtintu projektu
ee.Initialize(project='neighborpm-b9968')

print("✅ SĖKMĖ! Prisijungta prie Google Earth Engine!")

# Išbandome užklausą į Sentinel-2 palydovo archyvą
s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED').limit(1)
print(f"📡 Ryšys su kosmoso duomenų baze veikia! Pavyzdžių kiekis: {s2.size().getInfo()}")