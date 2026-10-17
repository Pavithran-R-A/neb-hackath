# Manual evidence workbench only; no public listener or model execution at startup.
FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node src/ ./src/
COPY --chown=node:node scripts/ ./scripts/
COPY --chown=node:node evaluation/diagnosis-v1/ ./evaluation/diagnosis-v1/
# This is an operator-supplied source claim. File hashes identify actual image content.
ARG SOURCE_COMMIT
USER node
RUN if [ -n "$SOURCE_COMMIT" ]; then node scripts/build-manifest.mjs --source-commit "$SOURCE_COMMIT"; else node scripts/build-manifest.mjs; fi
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","scripts/workbench.mjs"]
