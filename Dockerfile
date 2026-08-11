# Single container: builds the React frontend and runs the Express API,
# which also serves the built frontend in production. Deployed on Render.
FROM node:20-slim

WORKDIR /app

# Prisma needs OpenSSL at build + runtime.
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install all workspace dependencies.
COPY . .
RUN npm install

# Generate the Prisma client and build the frontend (→ frontend/dist).
RUN npm run prisma:generate -w backend
RUN npm run build -w frontend

ENV NODE_ENV=production
# Render provides PORT at runtime; the app reads process.env.PORT.
EXPOSE 4000

# Runs `tsx src/index.ts` (see backend package.json) — no separate compile step needed.
CMD ["npm", "run", "start", "-w", "backend"]
