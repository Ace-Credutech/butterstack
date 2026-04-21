# ── Build stage ───────────────────────────────────────────────────────
FROM oven/bun:latest AS builder

WORKDIR /butterstack-fe

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-setuptools \
    python3-venv \
    python3-dev \
    make \
    g++ \
 && apt-get clean

# Copy package files
COPY package*.json bun.lock* ./

# Install dependencies with Bun
RUN bun install

# Copy source code
COPY . .

# Build Angular app (outputs to dist/web/browser)
RUN bun run build

# ── Serve stage ───────────────────────────────────────────────────────
FROM nginx:alpine

# Copy built Angular assets
COPY --from=builder /butterstack-fe/dist/web/browser /usr/share/nginx/html

# Nginx config: SPA fallback + /api proxy to backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
