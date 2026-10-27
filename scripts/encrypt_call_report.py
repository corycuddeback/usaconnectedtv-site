"""Encrypt a client's call-reporting data for usaconnectedtv.com/call-reporting.

Usage:
  python scripts/encrypt_call_report.py CLIENT_DATA.json ACCESS-CODE

CLIENT_DATA.json stays on your computer (never commit it). The script writes
call-reporting/data/<id>.json, which only opens with the access code.
Needs: pip install cryptography
"""
import base64, hashlib, json, os, re, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

ITER = 310000

def norm(code):
    return re.sub(r"[^A-Z0-9]", "", code.upper())

def main(src, code):
    c = norm(code)
    if len(c) < 8:
        sys.exit("Access code needs at least 8 letters/digits.")
    plain = open(src, "rb").read()
    json.loads(plain)  # must be valid JSON
    salt, iv = os.urandom(16), os.urandom(12)
    key = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(c.encode())
    data = AESGCM(key).encrypt(iv, plain, None)
    fid = hashlib.sha256(("ucv-call-reporting:" + c).encode()).hexdigest()[:32]
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "call-reporting", "data")
    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, fid + ".json")
    b = lambda x: base64.b64encode(x).decode()
    json.dump({"v": 1, "iter": ITER, "salt": b(salt), "iv": b(iv), "data": b(data)}, open(out, "w"))
    print("Wrote", os.path.normpath(out))

if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
