# Geo data

Two sets from [sapics/ip-location-db][db], on deliberately different terms.

`iptoasn-country-ipv4.csv`, `iptoasn-country-ipv6.csv`, `iptoasn-asn-ipv4.csv`
and `iptoasn-asn-ipv6.csv` supply the country and provider labels. They are
released under the Public Domain Dedication and License (PDDL): no key, no
attribution requirement.

`dbip-city-ipv4.csv.gz` and `dbip-city-ipv6.csv.gz` supply the city and the
coordinates the map plots. These are **CC BY 4.0**, and DB-IP ask for a link
back to db-ip.com on any page that shows results — `/nodes/all` carries one,
and it has to stay there. The GeoLite2 tables hold the same data under CC
BY-SA, whose share-alike would arguably reach our own published lists; that is
why this is dbip and not geolite2.

They stay gzipped. Expanded they are around 450 MB; the lookup streams them
one line at a time rather than loading them, so unpacking would cost disk for
nothing. See `src/server/addnodes/city.ts` for why they are streamed and the
iptoasn tables are not.

All of them are fetched at image build time (see `Dockerfile`) rather than
committed, because they are tens of megabytes and change upstream constantly.
A build without network access simply ships without them: the job logs a
warning, skips the labels and the coordinates, and everything else works.

    npm run geo:fetch

[db]: https://github.com/sapics/ip-location-db
