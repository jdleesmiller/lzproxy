#!/bin/bash

while true; do
  DEBUG=lzproxy:* npm t
  if [[ "$?" -ne 0 ]]; then
    break
  fi
done
