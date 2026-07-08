# 压力雷达网站部署说明

这个项目不是纯静态网页，因为它需要后端隐藏 OpenAI / DeepSeek 的 API Key。
推荐部署成一个 Node.js Web Service。

## 如果 Render 要求绑卡

如果 Render 强制要求添加银行卡，可以先不要继续，改用 Vercel。
Vercel 更适合不想绑卡的个人展示项目。

## 推荐平台一：Vercel

Vercel 会给你一个公网地址，例如：

```text
https://pressure-radar-ai.vercel.app
```

部署步骤：

1. 打开 https://vercel.com 并用 GitHub 登录。
2. 点击 `Add New...` -> `Project`。
3. 选择你的 GitHub 仓库。
4. Framework Preset 选择 `Vite`。
5. Build Command 填：

```text
npm run build
```

6. Output Directory 填：

```text
dist
```

7. 在 Environment Variables 里添加：

```text
OPENAI_API_KEY=你的 OpenAI 或中转站密钥
OPENAI_BASE_URL=https://sub.kedaya.xyz/v1
OPENAI_API_STYLE=chat
OPENAI_MODEL=gpt-5.4-mini
OPENAI_REASONING_EFFORT=low

DEEPSEEK_API_KEY=你的 DeepSeek 密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

8. 点击 Deploy。

部署完成后，先打开：

```text
https://你的网址/api/health
```

看到 `{"ok":true}` 后，再打开主页。

## 推荐平台二：Render

Render 会给你一个公网地址，例如：

```text
https://study-pressure-radar.onrender.com
```

以后别人打开这个地址就能访问网站，不需要你在电脑上启动。

## 部署前准备

1. 注册 GitHub 账号，并把这个项目上传到一个 GitHub 仓库。
2. 注册 Render 账号：https://render.com
3. 准备好这些环境变量，不要把真实密钥写进代码仓库：

```text
OPENAI_API_KEY=你的 OpenAI 或中转站密钥
OPENAI_BASE_URL=https://sub.kedaya.xyz/v1
OPENAI_API_STYLE=chat
OPENAI_MODEL=gpt-5.4-mini
OPENAI_REASONING_EFFORT=low

DEEPSEEK_API_KEY=你的 DeepSeek 密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
```

## Render 设置

在 Render 新建服务时选择：

```text
New + -> Web Service
```

连接你的 GitHub 仓库后，填写：

```text
Language: Node
Build Command: npm install && npm run build
Start Command: npm start
```

然后在 Environment / 环境变量里逐条添加上面的 API Key 和模型配置。

注意：不要手动添加 PORT。Render 会自动提供 PORT，本项目已经适配。

## 部署后检查

部署成功后，先打开：

```text
https://你的网址/api/health
```

如果看到：

```json
{"ok":true}
```

说明后端 API 正常。

然后打开：

```text
https://你的网址/
```

就能看到完整网站。

## 常见问题

- 如果页面能打开但 AI 不能回复：检查 Render 的环境变量是否填错，尤其是 API Key 和 BASE_URL。
- 如果部署失败：看 Render 的 Logs，一般是 Build Command 或 Start Command 填错。
- 免费版 Render 可能会休眠，第一次打开会慢一些，这是正常的。
- 如果要绑定自己的域名，可以在 Render 服务的 Settings 里添加 Custom Domain。
