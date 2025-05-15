# -------------------------------
# STAGE 1 — Builder
# -------------------------------
FROM node:22-slim AS builder

ENV PNPM_HOME="/home/node/.pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

# Install pnpm and turbo
RUN npm install -g pnpm@10.6.3 turbo@latest

# Copy everything needed
COPY . .

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build selected apps using Turbo and output to /app/out
RUN turbo run build \
  --filter=saleor-app-smtp \
  --filter=saleor-app-payment-stripe-v2

# -------------------------------
# STAGE 2 — Runtime
# -------------------------------
FROM node:22-slim AS runtime

ENV NODE_ENV=production
ENV PNPM_HOME="/home/node/.pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

# Install pnpm runtime
RUN npm install -g pnpm@10.6.3

# ✅ Copy the actual built apps from builder
COPY --from=builder /app/apps/smtp /app/apps/smtp
COPY --from=builder /app/apps/stripe /app/apps/stripe

# ✅ Copy shared workspace dependencies
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml
COPY --from=builder /app/packages /app/packages

# ✅ Default to smtp (can override in docker-compose)
WORKDIR /app/apps/smtp
CMD ["pnpm", "start"]