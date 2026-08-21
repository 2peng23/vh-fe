FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=http://localhost:8000/api/v1
ARG APP_NAME="Vehicle Hub"
ARG APP_TAGLINE="VEHICLE MANAGEMENT"
ENV VITE_API_URL=${VITE_API_URL}
ENV APP_NAME=${APP_NAME}
ENV APP_TAGLINE=${APP_TAGLINE}

RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
