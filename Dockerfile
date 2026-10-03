FROM node:24-alpine
WORKDIR /app
RUN apk add --no-cache su-exec
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node server.mjs ./
COPY --chown=node:node lib ./lib
COPY --chown=node:node public ./public
RUN mkdir -p /app/data && chown node:node /app/data
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:3000/api/state').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Synology may create/populate a named volume as root. Repair its ownership at
# startup, then run the web server as the unprivileged node user.
ENTRYPOINT ["sh", "-c", "chown -R node:node /app/data && chmod -R u+rwX /app/data && echo 'Yudam data permissions repaired' >&2 && exec su-exec node:node node server.mjs"]
