# Manual evidence workbench only; evaluation/inference tooling stays in cloud dev.
# Loopback intentionally prevents publishing this rehearsal as a public service.
FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df
WORKDIR /app
COPY package.json ./
COPY src/ ./src/
COPY scripts/workbench.mjs ./scripts/workbench.mjs
ARG SOURCE_COMMIT=unrecorded
ENV SOURCE_COMMIT=$SOURCE_COMMIT
RUN chown -R node:node /app
USER node
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","scripts/workbench.mjs"]
