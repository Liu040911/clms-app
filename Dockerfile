FROM node:20-alpine as build-stage

WORKDIR /app
RUN corepack enable
RUN corepack prepare pnpm@10.10.0 --activate

# 安装 git，兼容依赖中可能存在的 git 源
RUN apk update && apk add --no-cache git

RUN npm config set registry https://registry.npmmirror.com

COPY .npmrc package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# 默认构建 H5 生产包，可通过 BUILD_MODE=test 切换为测试环境包
ARG BUILD_MODE=production
RUN if [ "$BUILD_MODE" = "test" ]; then pnpm build:h5:test; else pnpm build:h5:prod; fi

FROM nginx:stable-alpine as production-stage

COPY --from=build-stage /app/dist/build/h5 /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
