import json
import string

import segno

TOTAL_CODEWORDS = [26, 44, 70, 100, 134, 172, 196, 242, 292, 346]
EC_CODEWORDS = {
    "L": [7, 10, 15, 20, 26, 36, 40, 48, 60, 72],
    "M": [10, 16, 26, 36, 48, 64, 72, 88, 110, 130],
}

ALPHABET = string.ascii_letters + string.digits + "-_./?=:"

def exact_length(version, level):
    capacity = TOTAL_CODEWORDS[version - 1] - EC_CODEWORDS[level][version - 1]
    header = 2 if version < 10 else 3
    return capacity - header

def payload(length):
    return "".join(ALPHABET[i * 7 % len(ALPHABET)] for i in range(length))

out = []
for level in ("L", "M"):
    for version in range(1, 11):
        data = payload(exact_length(version, level))
        for mask in range(8):
            qr = segno.make(data, error=level, mask=mask, mode="byte",
                            version=version, boost_error=False, micro=False)
            out.append({
                "data": data,
                "level": level,
                "mask": mask,
                "version": qr.version,
                "rows": ["".join(str(int(m)) for m in row) for row in qr.matrix],
            })

with open("tools/qr-reference.json", "w", encoding="utf-8") as fh:
    json.dump(out, fh, ensure_ascii=False)

print(f"cases: {len(out)}")
