# Fly2Sun ImgBed

🗂️ 基于 [CloudFlare-ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed) 的文件托管服务。

> 原项目作者：**MarSeventh** · 本项目为独立维护的 fork

## 功能亮点

- ✅ **开箱即用**：部署后用户即可上传和浏览文件
- ✅ **公开画廊**：`/browse/` 路径访客可浏览所有公开文件，支持卡片/列表视图切换、搜索、复制链接、下载
- ✅ **私密文件夹**：管理员可标记文件夹为私密，仅管理员可查看内容
- ✅ **灵活上传**：支持 Telegram、Discord、R2、S3、WebDAV 等渠道
- ✅ **目录管理**：上传时可选择或新建文件夹

## 快速部署

### Cloudflare Pages

1. Fork 或 clone 本仓库
2. 在 Cloudflare Dashboard 创建 Pages 项目，连接本仓库
3. 构建命令：`npm install`，输出目录：`/frontend-dist`
4. 绑定 KV 命名空间（变量名 `img_url`）和/或 D1 数据库

### Docker

```bash
docker compose up -d
```

## 管理私密文件夹

登录管理面板后，访问：

```
https://你的域名/api/manage/private-folders-panel
```

在此页面可添加/移除私密文件夹。私密文件夹中的文件不会在公开画廊中出现。

## License

[MIT](LICENSE) © 2024 MarSeventh
