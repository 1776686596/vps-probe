# VPS Probe

轻量级 VPS 监控探针，一键部署到 Cloudflare（免费）。

## 一键部署

### 方式一：GitHub Actions（推荐）

1. **Fork 本仓库**

2. **获取 Cloudflare API Token**
   - 访问 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - 创建 Token，选择 "Edit Cloudflare Workers" 模板
   - 添加 D1 和 KV 权限

3. **配置 GitHub Secrets**

   在仓库 Settings → Secrets → Actions 添加：
   - `CF_API_TOKEN`: Cloudflare API Token
   - `CF_ACCOUNT_ID`: Cloudflare Account ID（在 Workers 页面右侧可见）

4. **运行 Actions**

   进入 Actions → Deploy to Cloudflare → Run workflow

5. **获取安装命令**

   部署完成后访问 Dashboard，进入 `/setup` 页面获取 VPS 安装命令

### 方式二：本地部署

```bash
git clone https://github.com/your-username/vps-probe.git
cd vps-probe
./deploy.sh
```

## 在 VPS 上安装

复制 Dashboard 中的安装命令，或手动执行：

```bash
curl -fsSL https://vps-probe-releases.pages.dev/install.sh | sudo bash -s -- \
  --url https://your-worker.workers.dev/v1/ingest \
  --secret YOUR_SECRET
```

## 监控指标

- CPU / 内存 / 磁盘使用率
- 网络流量（实时 + 累计）
- 运行时间

## 架构

```
Cloudflare (免费)
├── Workers (API)
├── D1 (数据库)
├── KV (缓存)
└── Pages (前端)
         ↑
    VPS Agent (~5MB Go binary)
```

## 管理

```bash
systemctl status vps-probe-agent   # 状态
journalctl -u vps-probe-agent -f   # 日志
systemctl restart vps-probe-agent  # 重启
```
