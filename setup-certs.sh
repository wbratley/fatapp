#!/bin/bash
set -e

CERT_DIR="$(dirname "$0")/nginx/certs"
mkdir -p "$CERT_DIR"

openssl req -x509 -newkey rsa:4096 \
  -keyout "$CERT_DIR/key.pem" \
  -out "$CERT_DIR/cert.pem" \
  -days 3650 -nodes \
  -subj "/CN=fatapp.local" \
  -addext "subjectAltName=DNS:fatapp.local"

echo ""
echo "Cert written to $CERT_DIR"
echo ""
echo "Next: trust the cert in your browser/OS, then add to /etc/hosts:"
echo "  <server-ip>  fatapp.local"
