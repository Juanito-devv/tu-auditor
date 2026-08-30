# Backend Tu Auditor - API Node/Express (Google Sheets)
FROM node:20-alpine

WORKDIR /app

# Copiar manifests e instalar (con caché de capas)
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copiar código fuente
COPY src ./src

# Puerto expuesto (Koyeb lo mapea)
ENV PORT=4000
EXPOSE 4000

# User no-root
RUN addgroup -S app && adduser -S app -G app
USER app

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
