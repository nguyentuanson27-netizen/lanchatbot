# Production compose

Use `docker-compose.production.yml` for the VPS deployment. It joins only the
existing `lana-chatbot-backend` and `n8n-docker_n8n-network` networks and runs
the Sheet write adapter that injects the mandatory `BY_CHATGPT:` note.

The generic `docker-compose.yml` is a reference layout for environments that
provide URL secrets and a dedicated Authentik network; it is not the VPS
cutover file.
