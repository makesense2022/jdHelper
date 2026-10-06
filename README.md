# 简历助手 - AI简历匹配分析工具

一个使用Next.js、LangChain和DeepSeek AI构建的简历与岗位匹配度分析工具。

## 功能特点

- 简历与岗位描述匹配度分析
- 提供匹配分数、缺失技能和改进建议
- 现代化用户界面，易于使用
- 使用DeepSeek AI进行智能分析

## 技术栈

- **前端**：Next.js, React, TailwindCSS
- **AI集成**：LangChain, DeepSeek AI
- **语言**：TypeScript

## 系统要求

- Node.js 16+ 
- 有效的DeepSeek API密钥（可在[DeepSeek平台](https://platform.deepseek.com)注册获取）

## API密钥安全

为保护API密钥安全，请遵循以下最佳实践：

1. **本地开发**：
   - 使用`.env`文件存储API密钥，并确保将`.env`添加到`.gitignore`中
   - 不要将包含实际API密钥的文件提交到版本控制系统

2. **部署环境**：
   - 使用部署平台（如Vercel、Netlify等）提供的环境变量功能
   - 在CI/CD流程中，使用安全的方式注入环境变量

3. **团队协作**：
   - 使用`.env.example`作为模板，不包含实际API密钥
   - 与团队成员分享如何获取和配置自己的API密钥

## 本地开发

1. 克隆项目
   ```bash
   git clone <repository-url>
   cd resume-assistant
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 创建`.env.local`文件并设置环境变量
   ```bash
   cp .env.example .env.local
   ```

4. 在`.env.local`中添加DeepSeek API密钥
   ```
   DEEPSEEK_API_KEY=your_api_key_here
   DEEPSEEK_MODEL_NAME=deepseek-chat
   DEEPSEEK_API_BASE_URL=https://api.deepseek.com/v1
   ```

5. 启动开发服务器
   ```bash
   npm run dev
   ```

应用将在 http://localhost:3001 上运行。

## 构建与部署

1. 构建生产版本
   ```bash
   npm run build
   ```

2. 启动生产服务器
   ```bash
   npm start
   ```

## API接口

除了Web界面，该应用还提供API接口用于集成：

### 简历分析API

**端点**: `POST /api/analyze`

**请求体**:
```json
{
  "resumeText": "您的简历文本...",
  "jobDesc": "岗位描述文本..."
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "matchScore": 75,
    "missingSkills": ["技能1", "技能2"],
    "suggestions": ["建议1", "建议2"]
  }
}
```

## 项目结构

```
resume-assistant/
├── components/          # React组件
│   └── ResultDisplay.tsx # 结果展示组件
├── pages/               # Next.js页面
│   ├── api/             # API路由
│   │   └── analyze.ts   # 简历分析API
│   ├── _app.tsx         # 应用入口
│   └── index.tsx        # 主页面
├── public/              # 静态文件
├── styles/              # 样式文件
│   └── globals.css      # 全局样式
├── utils/               # 工具函数
│   ├── deepseekModel.ts # DeepSeek模型配置
│   └── matchResumeToJD.ts # 简历匹配链
├── .env.example         # 环境变量示例
├── next.config.js       # Next.js配置
└── README.md            # 项目文档
```

## 许可证

MIT # jdHelper
# jdHelper

## 保存状态与最小恢复核验（2026-09-30）

建议按需保存简历助手，不继续扩功能或接新模型。本轮保留现有鉴权、限流、PDF 流程和 Git；未使用真实简历、未调用付费模型、未改变线上服务或访问保护。

当前 `/api/analyze` 在通过原 guard 后检查模型配置：没有有效服务端密钥、仍是示例占位值，或缺失 HTTPS 服务地址，返回明确 503，并且不发送简历分析请求。它没有改选模型或供应商。配置存在不等于密钥有效；真正模型调用需单独使用明确授权的测试文本验收。

- Node/依赖以已有锁文件和实际安装版本为准；本次为 Next 14.2.28，保留 pnpm-lock.yaml，没有做依赖升级。
- `npx tsc --noEmit` 与 `npm run build` 通过。构建出现旧 Browserslist 数据提示，没有为封存而扩大升级范围。
- `node --test tests/config.test.cjs` 三项通过，覆盖缺失/占位配置，以及原生产 guard 的 503、401、429 与正确凭据放行；均为隔离内存数据。
- 跟踪文件清单中未发现 PDF、Word、CSV 或表格类用户附件；本轮未把忽略文件、临时上传、真实简历或环境变量内容复制进说明。这个清点不代表外部临时目录审计。
- PDF 接口原来已有临时文件清理流程；扫描件/OCR和完整真实 PDF 上传未在本轮重新验收。

恢复：进入本目录，使用现有 pnpm 锁文件安装兼容依赖；按 `.env.example` 在受保护环境配置服务端模型地址/密钥。先构建与运行 `npm start`，核对 `/api/analyze` 的未配置状态，再决定是否用独立样本文本发起一次模型调用。不要把私人简历作为仓库示例。

`NEXT_PUBLIC_LEARN_API_KEY` 会出现在浏览器产物中，它不是对网站访问者保密的凭据。原 API key 检查与内存限流仍保留，后者是每实例尽力限制；应继续保留既有平台访问保护，不能因本轮构建通过而宣称完善账户鉴权或可靠费用上限。未配置时不把结果解释为“简历不匹配”，也不把没有公众统计解释成零使用需求。

实际本地 HTTP 验收还复现并修复了原提示模板 JSON 花括号导致的模块加载 500：格式说明改为模板参数，输入中的花括号保留为内容。修复后隔离测试凭据的 `/api/analyze` 无凭据返回 401、模型占位配置返回 503；未产生模型请求。

<!-- website-foundation:start -->
## Google Search Console Setup

The local Analytics + SEO foundation is configured in `site.foundation.json`. See [docs/analytics.md](docs/analytics.md) for events and environment variables, and [docs/seo.md](docs/seo.md) for Google/AI SEO and ownership verification. Configure the production ingestion key/host, SITE_URL and optional GOOGLE_SITE_VERIFICATION in the hosting environment before the next authorized deployment. Existing verification methods remain intact. No deployment or Search Console action is performed by the local upgrade.
<!-- website-foundation:end -->
