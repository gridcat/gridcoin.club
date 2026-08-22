# Install dependencies only when needed
FROM node:22.16.0-alpine3.22 AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM node:22.16.0-alpine3.22 AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED 1
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build \
    && npm run build:jobs \
    && npm install --production --ignore-scripts --prefer-offline

# Range tables for the country/provider labels. Fetched here rather than
# committed: ~39MB, public domain (iptoasn via sapics/ip-location-db), and
# refreshed whenever the image is rebuilt. A build without network access
# still succeeds; the job logs a warning and omits the labels.
RUN npm run geo:fetch || echo "geo data unavailable, node labels will be omitted"

# Production image, copy all the files and run next
FROM node:22.16.0-alpine3.22 AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
# The scheduled job: `docker run --rm --entrypoint node <image>
# dist/jobs/addnodes.js run`. Nothing runs it inside this container.
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder /app/data ./data
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs

EXPOSE 3000

ENV NEXT_TELEMETRY_DISABLED 1

CMD ["npm", "start"]
