# Geo data

`iptoasn-country-ipv4.csv`, `iptoasn-country-ipv6.csv`, `iptoasn-asn-ipv4.csv`
and `iptoasn-asn-ipv6.csv` from [sapics/ip-location-db][db], the `iptoasn-*`
sets, which are released under the Public Domain Dedication and License
(PDDL), no key, no attribution requirement.

They are fetched at image build time (see `Dockerfile`) rather than committed,
because they are a few tens of megabytes and change daily upstream. A build
without network access simply ships without them: the job logs a warning,
skips the country/ASN comment, and everything else works.

    npm run geo:fetch

[db]: https://github.com/sapics/ip-location-db
