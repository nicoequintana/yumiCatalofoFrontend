FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Vite bakes VITE_* vars into the static bundle at build time, so it must
# arrive as a build arg — an EasyPanel "environment variable" alone would
# never reach `npm run build` and the deployed bundle would silently keep
# calling localhost:4000.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
# Fail the build loudly if the arg is missing or empty: a bundle baked
# without it points at localhost:4000 and ships as a silently broken deploy
# that nobody notices until a user opens the page.
RUN if [ -z "$VITE_API_BASE_URL" ]; then \
      echo "ERROR: VITE_API_BASE_URL build arg is required (set it as a Build Arg in EasyPanel, not a runtime env var)." >&2; \
      exit 1; \
    fi
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
