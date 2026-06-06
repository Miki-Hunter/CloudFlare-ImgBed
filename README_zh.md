# Fly2Sun ImgBed

🗂️ 基于 [CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed) 的文件托管服务，支持 Docker 和 Cloudflare Pages/Workers 部署，提供 Telegram、Discord、R2、S3、WebDAV 等多种存储渠道。

> 原项目作者：**MarSeventh** · 本项目为独立维护的 fork

## 快速部署

### Cloudflare Pages

1. Fork 或 clone 本仓库
2. 在 Cloudflare Dashboard 创建 Pages 项目，连接本仓库
3. 构建命令：`npm install`，输出目录：`/frontend-dist`
4. 按需配置环境变量（详见原项目文档）

### Docker

```bash
docker compose up -d
```

## License

[MIT](LICENSE) © 2024 MarSeventh
