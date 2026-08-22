#!/bin/sh
# Fetch the IP-to-country and IP-to-ASN range tables used to label nodes.
#
# Two sets, on deliberately different terms:
#
#   iptoasn-*    country + ASN. PDDL / public domain, no attribution.
#   dbip-city-*  city + latitude/longitude. CC BY 4.0 — DB-IP require a link
#                back to db-ip.com on any page that shows results, which is
#                why /nodes/all carries one. GeoLite2 has the same data under
#                CC BY-SA, whose share-alike would arguably reach our own
#                published lists; that is the reason this is dbip and not
#                geolite2.
#
# Run at image build time so the job never makes a network call of its own.
#
# POSIX sh and either curl or wget on purpose: this runs inside the alpine
# builder stage, which ships busybox wget and neither bash nor curl.
#
# A failure here is deliberately non-fatal. The job logs a warning, skips the
# country/provider label, and every other part of the list still works.
set -u

DEST="${1:-data/geo}"
BASE="https://github.com/sapics/ip-location-db/releases/download/latest"
# The city tables stay gzipped: ~85 MB compressed against ~450 MB expanded,
# and the lookup streams them rather than loading them, so there is nothing to
# gain by unpacking.
FILES="iptoasn-country-ipv4.csv iptoasn-country-ipv6.csv iptoasn-asn-ipv4.csv iptoasn-asn-ipv6.csv dbip-city-ipv4.csv.gz dbip-city-ipv6.csv.gz"

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
