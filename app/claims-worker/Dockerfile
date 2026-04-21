FROM node:24-slim AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY app/shared ./app/shared
COPY app/claims-worker ./app/claims-worker
RUN node -e "const fs=require('fs');const p=require('./package.json');p.workspaces=['app/shared','app/claims-worker'];fs.writeFileSync('./package.json',JSON.stringify(p,null,2));"
RUN npm install --ignore-scripts
RUN npm run build -w @workshop/shared && npm run build -w @workshop/claims-worker

FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/app/shared/dist ./app/shared/dist
COPY --from=build /app/app/shared/package.json ./app/shared/package.json
COPY --from=build /app/app/claims-worker/dist ./app/claims-worker/dist
COPY --from=build /app/app/claims-worker/package.json ./app/claims-worker/package.json
EXPOSE 8081
CMD ["node", "--enable-source-maps", "app/claims-worker/dist/index.js"]
