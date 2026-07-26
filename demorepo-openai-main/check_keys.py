import json

with open('src/i18n/locales/en.json', encoding='utf-8') as f:
    en_keys = set(json.load(f).keys())

with open('src/i18n/locales/hi.json', encoding='utf-8') as f:
    hi_keys = set(json.load(f).keys())

missing = en_keys - hi_keys
extra = hi_keys - en_keys

if missing:
    print(f"Missing in HI ({len(missing)}): {sorted(missing)}")
if extra:
    print(f"Extra in HI ({len(extra)}): {sorted(extra)}")
if not missing and not extra:
    print("All keys match!")

print(f"EN: {len(en_keys)} keys, HI: {len(hi_keys)} keys")
