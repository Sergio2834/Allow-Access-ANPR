# Allow Access with ANPR

## Come Avviare l'app (frontend e backend in un unico passaggio) con Docker:
1. Digitare il seguente comando SOLO quando il codice è stato modificato
```bash
docker-compose up --build
```
2. Digitare il seguente comando per accendere tutta l'infrastruttura in background
```bash
docker-compose up -d
```
## Come avviare frontend e backend SEPARATAMENTE (senza l'utilizzo di Docker):
1. Segui la guida del [README.md](backend/README.md) contenuto nella sottocartella **backend** per avviare il backend
2. Segui la guida del [README.md](frontend/README.md) contenuto nella sottocartella **frontend** per avviare il frontend 