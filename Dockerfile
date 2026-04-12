FROM node:20-alpine AS build-stage

WORKDIR /app
RUN corepack enable
RUN corepack prepare pnpm@10.10.0 --activate

# 安装 git，兼容依赖中可能存在的 git 源
RUN apk update && apk add --no-cache git

RUN npm config set registry https://registry.npmmirror.com

COPY .npmrc package.json pnpm-lock.yaml ./
# 容器构建不需要执行 husky/only-allow 等本地开发生命周期脚本
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .
RUN pnpm build

FROM nginx:stable-alpine as production-stage

COPY --from=build-stage /app/dist/build/h5 /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
