# Multi-stage Dockerfile: build frontend and serve with backend

# ---------- Frontend build stage ----------
FROM node:22-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# ---------- Backend stage ----------
FROM node:22-alpine AS backend
WORKDIR /usr/src/app
COPY backend/package*.json ./
RUN npm ci --only=production
COPY backend/ .
# Copy built frontend assets into backend expected path
COPY --from=frontend-build /frontend/dist ./frontend/dist

EXPOSE 5000
CMD ["node", "server.js"]
