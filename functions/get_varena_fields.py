# functions/get_all_districts_fields.py
import os
import json
import random
import re

LITHUANIAN_DISTRICTS = [
    "Akmenės r.", "Alytaus r.", "Anykščių r.", "Biržų r.", "Elektrėnų sav.",
    "Ignalinos r.", "Jonavos r.", "Joniškio r.", "Jurbarko r.", "Kaišiadorių r.",
    "Kalvarijos sav.", "Kauno r.", "Kazlų Rūdos sav.", "Kelmės r.", "Kėdainių r.",
    "Klaipėdos r.", "Kretingos r.", "Kupiškio r.", "Lazdijų r.", "Marijampolės sav.",
    "Mažeikių r.", "Molėtų r.", "Pagėgių sav.", "Pakruojo r.", "Panevėžio r.",
    "Pasvalio r.", "Plungės r.", "Prienų r.", "Radviliškio r.", "Raseinių r.",
    "Rietavo sav.", "Rokiškio r.", "Skuodo r.", "Šakių r.", "Šalčininkų r.",
    "Šilalės r.", "Šilutės r.", "Širvintų r.", "Šiaulių r.", "Švenčionių r.",
    "Tauragės r.", "Telšių r.", "Trakų r.", "Ukmergės r.", "Utenos r.",
    "Varėnos r.", "Vilkaviškio r.", "Vilniaus r.", "Zarasų r."
]

# Visų 49 rajonų centrai (lat, lng) tiksliam priskyrimui
DISTRICT_CENTERS = {
    "Akmenės r.": (56.25, 22.75), "Alytaus r.": (54.40, 24.05), "Anykščių r.": (55.53, 25.10),
    "Biržų r.": (56.20, 24.75), "Elektrėnų sav.": (54.78, 24.65), "Ignalinos r.": (55.35, 26.15),
    "Jonavos r.": (55.08, 24.28), "Joniškio r.": (56.24, 23.61), "Jurbarko r.": (55.08, 22.76),
    "Kaišiadorių r.": (54.86, 24.46), "Kalvarijos sav.": (54.41, 23.22), "Kauno r.": (54.90, 23.85),
    "Kazlų Rūdos sav.": (54.75, 23.49), "Kelmės r.": (55.63, 22.93), "Kėdainių r.": (55.29, 23.97),
    "Klaipėdos r.": (55.71, 21.41), "Kretingos r.": (55.88, 21.25), "Kupiškio r.": (55.84, 24.97),
    "Lazdijų r.": (54.23, 23.50), "Marijampolės sav.": (54.56, 23.35), "Mažeikių r.": (56.31, 22.34),
    "Molėtų r.": (55.23, 25.42), "Pagėgių sav.": (55.13, 21.90), "Pakruojo r.": (55.98, 23.85),
    "Panevėžio r.": (55.73, 24.36), "Pasvalio r.": (56.06, 24.40), "Plungės r.": (55.91, 21.86),
    "Prienų r.": (54.63, 23.95), "Radviliškio r.": (55.81, 23.54), "Raseinių r.": (55.38, 23.15),
    "Rietavo sav.": (55.72, 21.92), "Rokiškio r.": (55.96, 25.62), "Skuodo r.": (56.27, 21.56),
    "Šakių r.": (54.95, 23.08), "Šalčininkų r.": (54.31, 25.41), "Šilalės r.": (55.49, 22.21),
    "Šilutės r.": (55.35, 21.48), "Širvintų r.": (55.04, 24.95), "Šiaulių r.": (55.93, 23.28),
    "Švenčionių r.": (55.13, 26.15), "Tauragės r.": (55.25, 22.32), "Telšių r.": (55.98, 22.25),
    "Trakų r.": (54.64, 24.96), "Ukmergės r.": (55.25, 24.79), "Utenos r.": (55.50, 25.63),
    "Varėnos r.": (54.21, 24.54), "Vilkaviškio r.": (54.65, 23.06), "Vilniaus r.": (54.85, 25.12),
    "Zarasų r.": (55.73, 26.28)
}

def get_district_for_grid(filename):
    match = re.search(r'grid_(\d+)_(\d+)', filename)
    if not match:
        return "Vilniaus r."
    lat = int(match.group(1)) / 10.0
    lng = int(match.group(2)) / 10.0

    closest_dist = float('inf')
    closest_name = "Vilniaus r."
    for dist_name, (d_lat, d_lng) in DISTRICT_CENTERS.items():
        dist = (lat - d_lat)**2 + (lng - d_lng)**2
        if dist < closest_dist:
            closest_dist = dist
            closest_name = dist_name
    return closest_name

base_dir = os.path.dirname(os.path.abspath(__file__))
grid_dir = os.path.join(base_dir, "nma_grid")
if not os.path.exists(grid_dir):
    grid_dir = os.path.join(base_dir, "..", "nma_grid")

def generate_all_districts_fields():
    print("🔍 Skenuojami visi nma_grid failai visai Lietuvai (ariama žemė 5 - 50 ha)...")
    district_map = {d: [] for d in LITHUANIAN_DISTRICTS}

    files = [f for f in os.listdir(grid_dir) if f.endswith(".json")]
    print(f"📁 Skenuojami {len(files)} tinklelio failai...")

    total_scanned = 0
    for g_file in files:
        district = get_district_for_grid(g_file)
        f_path = os.path.join(grid_dir, g_file)
        try:
            with open(f_path, "r", encoding="utf-8") as f:
                fields = json.load(f)

            for item in fields:
                area = float(item.get("area", 0))
                crop_val = item.get("crop", "Javai")
                crop_lower = crop_val.lower()

                # Atmetame pievas, ganyklas, miškus:
                if any(bad in crop_lower for bad in ["ganykl", "piev", "žol", "daugiamet", "sod", "mišk"]):
                    continue

                if 5.0 <= area <= 50.0:
                    coords = item.get("coords", [])
                    if len(coords) >= 3:
                        district_map[district].append({
                            "block": item.get("block", "Nenurodyta"),
                            "areaHa": area,
                            "nmaCrop": crop_val,
                            "coords": coords,
                            "region": district
                        })
                        total_scanned += 1
        except Exception:
            pass

    print(f"📋 Iš viso rasta tinkamų ariamos žemės laukų: {total_scanned} vnt.\n")
    print("==================================================")
    print("📊 STATISTIKA PAGAL VISUS 49 RAJONUS:")
    print("==================================================")

    final_selected = []
    random.seed(123)

    for dist in LITHUANIAN_DISTRICTS:
        fields = district_map[dist]
        if len(fields) > 0:
            picked = random.sample(fields, min(20, len(fields)))
            for i, p in enumerate(picked):
                # 10 rapsams, 10 kviečiams
                p["assignedCrop"] = "Žieminiai rapsai" if i < 10 else "Žieminiai kviečiai"
                final_selected.append(p)
            print(f"📍 {dist:20s} -> Rasta laukų: {len(fields):4d} | Atrinkta: {len(picked)}")
        else:
            print(f"⚠️ {dist:20s} -> Nerasta laukų")

    out_file = os.path.join(base_dir, "all_districts_20_laukai.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(final_selected, f, indent=2, ensure_ascii=False)

    print(f"\n✅ Iš viso visai Lietuvai atrinkta ir išsaugota: {len(final_selected)} laukų.")
    print(f"💾 Failas padėtas į: {out_file}")

if __name__ == "__main__":
    generate_all_districts_fields()