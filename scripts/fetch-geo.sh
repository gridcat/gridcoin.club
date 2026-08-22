#!/bin/sh
# Fetch the IP-to-country and IP-to-ASN range tables used to label nodes.
#
# sapics/ip-location-db, the iptoasn-* sets: PDDL / public domain, no key, no
# attribution requirement. Run at image build time so the job never makes a
# network call of its own.
#
# POSIX sh and either curl or wget on purpose: this runs inside the alpine
# builder stage, which ships busybox wget and neither bash nor curl.
#
# A failure here is deliberately non-fatal. The job logs a warning, skips the
# country/provider label, and every other part of the list still works.
set -u

DEST="${1:-data/geo}"
BASE="https://github.com/sapics/ip-location-db/releases/download/latest"
FILES="iptoasn-country-ipv4.csv iptoasn-country-ipv6.csv iptoasn-asn-ipv4.csv iptoasn-asn-ipv6.csv"

if command -v curl >/dev/null 2>&1; then
  fetch() { curl -fsSL --retry 3 --max-time 180 -o "$1" "$2"; }
elif command -v wget >/dev/null 2>&1; then
  fetch() { wget -q -T 180 -O "$1" "$2"; }
else
  echo "warning: neither curl nor wget available, skipping geo data" >&2
  exit 1
fi

mkdir -p "$DEST"
status=0
for f in $FILES; do
  echo "fetching $f"
  if fetch "$DEST/$f.tmp" "$BASE/$f"; then
    mv "$DEST/$f.tmp" "$DEST/$f"
  else
    echo "warning: could not fetch $f, node labels will be incomplete" >&2
    rm -f "$DEST/$f.tmp"
    status=1
  fi
done

exit $status
