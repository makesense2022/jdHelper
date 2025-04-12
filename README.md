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
   ```

5. 启动开发服务器
   ```bash
   npm run dev
   ```

应用将在 http://localhost:3000 上运行。

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
