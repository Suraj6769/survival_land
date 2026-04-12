# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 – Build the Vite / React frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim AS frontend-builder

WORKDIR /app/ui

# Install deps first (better layer caching)
COPY ui/package.json ui/package-lock.json* ./
RUN npm ci --prefer-offline

# Copy all UI source
COPY ui/ ./

# Vite bakes VITE_* vars into the static bundle at build time.
# HF Spaces forwards the matching secrets as Docker build-args automatically
# when you set them in Space Settings → Variables and secrets.
ARG VITE_HF_TOKEN=""
ARG VITE_HF_MODEL="mistralai/Mistral-7B-Instruct-v0.2"
ENV VITE_HF_TOKEN=${VITE_HF_TOKEN}
ENV VITE_HF_MODEL=${VITE_HF_MODEL}

RUN npm run build


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 – Python backend + Nginx to serve frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

# System packages: nginx for static serving + reverse-proxy
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx \
    curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application source
COPY models.py .
COPY inference.py .
COPY server/ ./server/
COPY openenv.yaml .

# Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Built frontend from stage 1
COPY --from=frontend-builder /app/ui/dist ./ui/dist

# Startup script
COPY start.sh /start.sh
RUN chmod +x /start.sh

# HF Spaces exposes port 7860
EXPOSE 7860

# Runtime environment (overridden by HF Space secrets at runtime)
ENV PORT=7860 \
    HF_MODEL="mistralai/Mistral-7B-Instruct-v0.2" \
    HF_TOKEN="" \
    PYTHONUNBUFFERED=1

CMD ["/start.sh"]
