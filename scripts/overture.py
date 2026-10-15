#!/usr/bin/env python3
"""
Estrae da Overture Maps (tema places) i luoghi di un'area e li prepara per 739.

Overture pubblica ogni mese i luoghi del mondo in file GeoParquet aperti (bucket S3 pubblico, nessuna chiave,
nessun costo). DuckDB legge solo i blocchi del riquadro chiesto: per San Marino servono pochi secondi.
Il risultato è un file JSON da caricare in /admin/fonti (gli amministratori lo controllano e decidono cosa
pubblicare): niente va online da solo.

Uso:
  pip install duckdb
  python3 scripts/overture.py --uscita overture-sm.json
  python3 scripts/overture.py --riquadro 12.40,43.89,12.52,43.995 --paese SM --release 2026-09-23.1 --uscita x.json

Se l'ambiente ha credenziali AWS che il bucket pubblico rifiuta, lanciarlo senza:
  env -u AWS_ACCESS_KEY_ID -u AWS_SECRET_ACCESS_KEY python3 scripts/overture.py ...

Licenza dei dati: CDLA Permissive 2.0 (in parte Apache 2.0 e CC0, scritto per ogni luogo). Attribuzione:
«© Overture Maps Foundation» (https://docs.overturemaps.org/attribution/).
"""
import argparse
import json
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone

BUCKET = "https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com"

# ---- Dalle categorie di Overture (basic_category e taxonomy.primary) a quelle di 739 -------------------------
# Restituisce (categoria, sottocategoria) oppure None se il luogo non entra in 739 (o arriva già da OSM:
# banche, distributori, chiese, scuole, musei, uffici pubblici, farmacie, ospedali). Animali e associazioni dalla 0039, dormire dalla 0041.


# Associazioni: Overture non distingue culturali, sportive o di volontariato, quindi si guarda anche il nome.
# Fuori: Giunte di castello (istituzioni, arriveranno dalla fonte ufficiale), partiti, parrocchie e luoghi di culto
# (le chiese arrivano da OSM).
ORG_ESCLUSE = re.compile(r"\bgiunta\b|partito|parrocchia|santuario|sacello|cimitero|barangay|神社")
ORG_TIPI = [
    ("di categoria", re.compile(r"sindacat|confederazione|lavoratori|imprenditori|pensionati|\bordine (degli|dei)\b|\bcollegio\b|"
                               r"\b(cdls|csdl|usl|usc|usot|osla|anis)\b|unione sammarinese")),
    ("ricreativa", re.compile(r"campeggiator|(juventus|inter|milan) club|tifosi")),
    ("religiosa", re.compile(r"oratorio|salesian|^ac |azione cattolica|caritas")),
    ("sportiva", re.compile(r"federazione|comitato olimpico|polisportiva|\basd\b|aeroclub|ippic|\bjudo\b|balestrier|calcio|tennis|"
                            r"ciclis|sci club|bocciofil|moto ?club|\bsport")),
    ("ricreativa", re.compile(r"circolo|centro sociale|comitato|\bfesta\b|pro loco|kiwanis|lions|rotary|recreational")),
    ("volontariato", re.compile(r"onlus|volontar|oncologic|cuore|soccorso|non rischio|protezione civile|croce rossa|avis\b|aido|"
                                r"\b(avsso|asdei|aslem|asfa)\b|batticinque|insiamo|viviamo in positivo|geriatri|donator")),
    ("culturale", re.compile(r"cultur|musica|dante|fondazione|istituto|memoria|micologic|sommelier|fratellanza|comites|regolaristi|"
                             r"biblio|teatro|\bcoro\b|\bbanda\b|informatica|giappone")),
]
# Categorie di Overture che a San Marino sono associazioni (con le eccezioni di ORG_ESCLUSE)
ORG = ("social_or_community_service", "non_governmental_association", "charity_organization", "labor_union", "religious_organization",
       "cultural_center", "sport_league")


def tipo_associazione(nome, t):
    n = (nome or "").lower()
    if ORG_ESCLUSE.search(n):
        return None
    if t == "labor_union":
        return "di categoria"
    if t == "charity_organization":
        return "volontariato"
    for tipo, r in ORG_TIPI:
        if r.search(n):
            return tipo
    return {"religious_organization": "religiosa", "sport_league": "sportiva"}.get(t, "altro")


def mappa(cat, t, nome=""):
    cat = cat or ""
    t = t or cat
    # Animali (prima dei negozi: per Overture anche i veterinari sono «animal_or_pet_service»).
    # Allevamenti e servizi generici restano fuori.
    if t == "veterinarian":
        return "animali", "veterinario"
    if t == "pet_groomer":
        return "animali", "toelettatura"
    if t in ("animal_shelter", "animal_rescue_service"):
        return "animali", "rifugio"
    if t in ("dog_trainer", "pet_training"):
        return "animali", "addestramento"
    if t in ("pet_boarding", "pet_sitting", "pet_hotel"):
        return "animali", "pensione"
    if cat == "animal_or_pet_service":
        return None
    # Dormire (dalla 0041)
    if cat in ("hotel", "motel", "inn", "resort") or t in ("hotel", "motel", "resort"):
        if re.match(r"gruppo\b", (nome or "").lower()):
            return None  # la sede di un gruppo alberghiero, non una struttura
        return "dormire", "residence" if re.search(r"\bresidence\b", (nome or "").lower()) else "hotel"
    if cat in ("bed_and_breakfast", "guest_house") or t in ("bed_and_breakfast", "guest_house"):
        return "dormire", "bed and breakfast"
    if cat in ("campground", "rv_park") or t in ("campground", "rv_park", "campsite"):
        return "dormire", "campeggio"
    if t in ("agriturismo", "farm_stay"):
        return "dormire", "agriturismo"
    # Associazioni
    if t in ORG:
        tipo = tipo_associazione(nome, t)
        return ("associazione", tipo) if tipo else None
    # «Sport e tempo libero» mescola palestre, scuderie e federazioni: entrano solo le società e le federazioni
    if t == "sports_and_recreation":
        return ("associazione", "sportiva") if re.search(r"federazione|comitato olimpico|polisportiva|\basd\b", (nome or "").lower()) else None
    # Locali
    if t == "pizza_restaurant":
        return "locale", "pizzeria"
    if t in ("ice_cream_shop", "dessert_shop", "gelato"):
        return "locale", "gelateria"
    if t in ("pub", "irish_pub", "gastropub", "brewery"):
        return "locale", "pub"
    if cat in ("cafe", "coffee_shop", "bar", "lounge") or t in ("cocktail_bar", "wine_bar"):
        return "locale", "bar"
    if cat == "fast_food_restaurant" or t in ("sandwich_shop", "burger_restaurant", "diner", "food_truck"):
        return "locale", "cibo veloce"
    if cat == "restaurant":
        return "locale", "ristorante"
    if t in ("bakery", "delicatessen", "cupcake_shop", "japanese_confectionery_shop"):
        return "negozio", "alimentari"
    # Negozi
    if t == "jewelry_store":
        return "negozio", "gioielleria"
    if t in ("eyewear_store",) or cat == "personal_care_and_beauty_store":
        return "negozio", "profumeria"
    if cat in ("fashion_and_apparel_store", "sporting_goods_store"):
        return "negozio", "abbigliamento"
    if t in ("gift_shop", "souvenir_store"):
        return "negozio", "souvenir"
    if t == "gun_and_ammo_store":
        return "negozio", "armeria"
    if t in ("tobacco_shop", "smoke_and_vape_store"):
        return "negozio", "tabaccheria"
    if t == "outlet_store" or cat in ("shopping_mall", "department_store", "warehouse_club_store", "discount_store"):
        return "negozio", "centro commerciale"
    if cat == "food_and_beverage_store":
        return "negozio", "alimentari"
    if cat == "hardware_home_and_garden_store":
        return "negozio", "casa"
    if cat == "electronics_store":
        return "negozio", "elettronica"
    if cat in ("books_music_and_video_store", "toys_and_games_store", "arts_crafts_and_hobby_store", "office_supply_store", "musical_instrument_and_pro_audio_store"):
        return "negozio", "libri e giochi"
    if cat in ("vehicle_parts_store", "auto_dealer", "vehicle_dealer"):
        return "negozio", "auto"
    if cat == "laundry_service":
        return "negozio", "servizi"
    if cat in ("shopping", "specialty_store", "flowers_and_gifts_store", "animal_and_pet_store", "second_hand_store"):
        return "negozio", "negozio"
    # Artigiani
    if t in ("beauty_salon", "hair_salon", "barber", "nail_salon", "tanning_salon", "laser_hair_removal"):
        return "artigiano", "parrucchiere"
    if t == "plumbing":
        return "artigiano", "idraulico"
    if t == "electrician":
        return "artigiano", "elettricista"
    if t in ("contractor", "masonry_concrete", "roofing", "windows_installation") or cat == "building_or_construction_service" and t != "engineering_service":
        return "artigiano", "edile"
    if t == "painting":
        return "artigiano", "imbianchino"
    if t == "landscaping":
        return "artigiano", "giardiniere"
    if t == "sewing_and_alterations":
        return "artigiano", "sartoria"
    if cat in ("automotive_service", "vehicle_service") and t not in ("automobile_registration_service", "automotive_consultant"):
        return "artigiano", "meccanico"
    if cat in ("home_service", "personal_or_beauty_service") and t not in ("life_coach", "interior_design"):
        return "artigiano", "altro"
    # Professionisti
    if t == "accountant":
        return "professionista", "commercialista"
    if t == "insurance_agency":
        return "professionista", "assicurazioni"
    if t == "notary_public":
        return "professionista", "notaio"
    if cat in ("legal_service", "attorney_or_law_firm"):
        return "professionista", "avvocato"
    if t == "land_surveying":
        return "professionista", "geometra"
    if cat == "real_estate_service":
        return "professionista", "agenzia immobiliare"
    if t in ("architectural_designer", "interior_design"):
        return "professionista", "architetto"
    if t == "engineering_service":
        return "professionista", "ingegnere"
    if t == "business_consulting":
        return "professionista", "consulente"
    if cat in ("dental_clinic", "physical_medicine_and_rehabilitation", "behavioral_or_mental_health_clinic", "specialized_health_care",
               "complementary_and_alternative_medicine", "pediatric_clinic", "reproductive_perinatal_and_womens_care") or t == "doctors_office":
        return "professionista", "studio medico"
    if cat == "professional_service" and t in ("marketing_agency", "advertising_agency", "internet_marketing_service", "social_media_agency"):
        return "azienda", "comunicazione"
    if t == "employment_agency":
        return "azienda", "consulenza"
    if cat == "professional_service":
        return "professionista", "altro"
    # Aziende
    if cat == "financial_service":
        return "azienda", "finanza"
    if cat in ("manufacturer", "b2b_industrial_and_machine_service") or t == "machine_shop":
        return "azienda", "industria"
    if cat == "technical_service" or t in ("information_technology_company", "telecommunications_company"):
        return "azienda", "informatica"
    if cat in ("media_service", "printing_service", "design_service"):
        return "azienda", "comunicazione"
    if cat == "travel_service" and t != "visitor_center":
        return "azienda", "turismo"
    if cat in ("supplier_or_distributor", "wholesaler"):
        return "azienda", "commercio"
    if cat in ("b2b_transportation_and_storage_service", "shipping_or_delivery_service") and t != "post_office":
        return "azienda", "trasporti e logistica"
    if cat in ("b2b_service", "b2b_office_and_professional_service"):
        return "azienda", "consulenza"
    if cat in ("corporate_or_business_office", "event_or_party_service"):
        return "azienda", "altro"
    # Impianti sportivi
    if cat in ("gym", "fitness_studio", "sport_or_fitness_facility", "stadium_arena", "sport_field", "sport_court", "swimming_pool", "skate_park", "sport_or_recreation_club"):
        return "impianto", None
    return None


AREA = {"locale": "uscire", "negozio": "uscire", "azienda": "lavorare", "professionista": "lavorare", "artigiano": "lavorare", "impianto": "sport",
        "animali": "vivere", "associazione": "comunita", "dormire": "uscire"}


def ultima_release():
    xml = urllib.request.urlopen(f"{BUCKET}/?list-type=2&prefix=release/&delimiter=/", timeout=30).read().decode()
    return sorted(re.findall(r"<Prefix>release/([^<]+)/</Prefix>", xml))[-1]


def telefono(v):
    for p in v or []:
        p = re.sub(r"[^+0-9]", "", p or "")
        if len(p) < 6:
            continue
        # Fissi di San Marino, che Overture scrive con il prefisso +378 o +39: «+378 0549 999792»
        m = re.match(r"^\+(378|39)(0549)(\d{6})$", p)
        if m:
            return f"+{m.group(1)} {m.group(2)} {m.group(3)}"
        return p
    return None


def sito(v):
    for s in v or []:
        if s and re.match(r"^https?://", s) and len(s) <= 500:
            return s
    return None


def main():
    a = argparse.ArgumentParser(description="Estrae i luoghi di Overture Maps per un'area e li prepara per 739.")
    a.add_argument("--riquadro", default="12.40,43.89,12.52,43.995", help="ovest,sud,est,nord (predefinito: San Marino)")
    a.add_argument("--paese", default="SM", help="codice ISO del paese da tenere (vuoto = tutti nel riquadro)")
    a.add_argument("--release", default=None, help="release di Overture (predefinita: l'ultima)")
    a.add_argument("--uscita", required=True, help="file JSON da scrivere")
    x = a.parse_args()
    o, s, e, n = (float(v) for v in x.riquadro.split(","))
    if not (o < e and s < n) or (e - o) * (n - s) > 1:
        sys.exit("Riquadro non valido o troppo grande (al massimo 1 grado quadrato: prima una prova su un'area piccola).")
    import duckdb

    release = x.release or ultima_release()
    t0 = time.time()
    c = duckdb.connect()
    c.sql("install httpfs; load httpfs;")
    c.sql("create secret anonimo (type s3, provider config, region 'us-west-2', key_id '', secret '')")
    righe = c.execute(
        f"""
        select id, names.primary, basic_category, taxonomy.primary, confidence, websites, phones,
               addresses[1].freeform, addresses[1].locality, addresses[1].country,
               (bbox.xmin + bbox.xmax) / 2, (bbox.ymin + bbox.ymax) / 2,
               list_transform(sources, x -> x.dataset), list_transform(sources, x -> x.license),
               list_max(list_transform(sources, x -> x.update_time)), operating_status
        from read_parquet('s3://overturemaps-us-west-2/release/{release}/theme=places/type=place/*')
        where bbox.xmin between ? and ? and bbox.ymin between ? and ?
        """,
        [o, e, s, n],
    ).fetchall()
    letti = len(righe)
    candidati, scartati = [], {"altro paese": 0, "chiuso": 0, "senza nome": 0, "categoria non usata": 0}
    non_usate = {}
    for (oid, nome, cat, tax, conf, siti, tel, ind, loc, paese, lng, lat, fonti, licenze, agg, stato) in righe:
        if x.paese and paese != x.paese:
            scartati["altro paese"] += 1
            continue
        if stato in ("permanently_closed", "temporarily_closed"):
            scartati["chiuso"] += 1
            continue
        if not nome or not nome.strip():
            scartati["senza nome"] += 1
            continue
        m = mappa(cat, tax, nome)
        if not m:
            scartati["categoria non usata"] += 1
            k = tax or cat or "nessuna"
            non_usate[k] = non_usate.get(k, 0) + 1
            continue
        indirizzo = ", ".join(v for v in [ind, loc] if v and v.strip()) or None
        # Un indirizzo in un altro alfabeto (thai, cirillico…) vuol dire un luogo finito qui per errore
        if indirizzo and re.search(r"[\u0370-\u03ff\u0400-\u04ff\u0590-\u06ff\u0e00-\u0e7f\u3040-\u30ff\u4e00-\u9fff]", indirizzo):
            scartati["categoria non usata"] += 1
            continue
        candidati.append({
            "id_esterno": oid, "nome": nome.strip()[:120], "categoria": m[0], "sottocategoria": m[1], "area": AREA[m[0]],
            "lat": round(lat, 7), "lng": round(lng, 7), "indirizzo": indirizzo[:200] if indirizzo else None,
            "telefono": telefono(tel), "sito": sito(siti), "confidenza": round(conf or 0, 3),
            "fonti": sorted(set(f for f in fonti or [] if f and f != "Overture")),
            "licenza": "CDLA-Permissive-2.0" if "CDLA-Permissive-2.0" in (licenze or []) else (sorted(set(licenze or [])) or ["?"])[0],
            "tassonomia": tax or cat, "aggiornato": agg,
        })
    risultato = {
        "fonte": "overture", "release": release, "riquadro": [o, s, e, n], "paese": x.paese or None,
        "generato_il": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "attribuzione": "© Overture Maps Foundation", "licenza": "CDLA Permissive 2.0 (vedi «licenza» di ogni luogo)",
        "letti": letti, "scartati": scartati, "candidati": candidati,
    }
    with open(x.uscita, "w", encoding="utf-8") as f:
        json.dump(risultato, f, ensure_ascii=False, indent=1)
    per_cat = {}
    for k in candidati:
        per_cat[k["categoria"]] = per_cat.get(k["categoria"], 0) + 1
    print(f"Release {release}: {letti} luoghi nel riquadro in {time.time() - t0:.0f} s, {len(candidati)} candidati", file=sys.stderr)
    print(f"Per categoria: {per_cat}", file=sys.stderr)
    print(f"Scartati: {scartati}", file=sys.stderr)
    print("Categorie non usate più frequenti: " + ", ".join(f"{k} {v}" for k, v in sorted(non_usate.items(), key=lambda kv: -kv[1])[:15]), file=sys.stderr)


if __name__ == "__main__":
    main()
