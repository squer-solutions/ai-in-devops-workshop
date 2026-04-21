FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY app/shared ./app/shared
COPY app/claims-api ./app/claims-api
# Minimal workspaces list so npm install only pulls what we build.
RUN node -e "const fs=require('fs');const p=require('./package.json');p.workspaces=['app/shared','app/claims-api'];fs.writeFileSync('./package.json',JSON.stringify(p,null,2));"
RUN npm install --ignore-scripts
RUN npm run build -w @workshop/shared && npm run build -w @workshop/claims-api

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/app/shared/dist ./app/shared/dist
COPY --from=build /app/app/shared/package.json ./app/shared/package.json
COPY --from=build /app/app/claims-api/dist ./app/claims-api/dist
COPY --from=build /app/app/claims-api/package.json ./app/claims-api/package.json
EXPOSE 8080
CMD ["node", "--enable-source-maps", "--require", "/app/app/shared/dist/register.js", "app/claims-api/dist/index.js"]
