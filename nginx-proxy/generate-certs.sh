#!/usr/bin/env bash
# Generates a self-signed TLS certificate with your local network IP as a SAN.
# Run this once before `docker compose up`.  Re-run whenever your IP changes.
#
# Optional: set EXTRA_SANS to add extra DNS names, e.g.:
#   EXTRA_SANS="DNS:fatapp.local,DNS:otherthing.local" ./generate-certs.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="$SCRIPT_DIR/certs"

mkdir -p "$CERTS_DIR"

# Detect primary local-network IP
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')

SAN="IP:127.0.0.1,DNS:localhost"
if [ -n "${LOCAL_IP:-}" ]; then
    SAN="IP:${LOCAL_IP},${SAN}"
fi
if [ -n "${EXTRA_SANS:-}" ]; then
    SAN="${SAN},${EXTRA_SANS}"
fi

echo "Generating certificate..."
echo "  SANs: ${SAN}"

openssl req -x509 -newkey rsa:2048 -sha256 -days 3650 -nodes \
    -keyout "$CERTS_DIR/key.pem" \
    -out    "$CERTS_DIR/cert.pem" \
    -subj   "/CN=fatapp" \
    -addext "subjectAltName=${SAN}" \
    2>/dev/null

echo ""
echo "Certificate written to $CERTS_DIR/"
echo ""
echo "Trust this cert on your devices to avoid browser warnings:"
echo "  macOS   : sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $CERTS_DIR/cert.pem"
echo "  Linux   : sudo cp $CERTS_DIR/cert.pem /usr/local/share/ca-certificates/fatapp.crt && sudo update-ca-certificates"
echo "  Windows : Import cert.pem into Trusted Root Certification Authorities"
echo "  Android : Transfer cert.pem to device → Settings → Install certificate → CA certificate"
echo "  iOS     : AirDrop/email cert.pem → tap to install → Settings → General → VPN & Device Management → trust it"
