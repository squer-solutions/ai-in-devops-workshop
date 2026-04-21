for i in $(seq 1 60); do
  curl -s -X POST http://localhost:8080/claims \
    -H "content-type: application/json" \
    -d '{"customerId":"c1","amountCents":100,"description":"warmup"}'
  sleep 0.5
done
