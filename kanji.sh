#!/bin/bash
if [ -z "$1" ]; then
  echo "Uso: ./kanji.sh 犬"
  exit 1
fi
curl -s -H "Origin: https://test.toolzar.com" \
  "https://kanji-api.toolzar.com/find?search=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$1'))")&page=0"
