# 联系作者与改进建议

本项目接入 Projects feedback v1.0.0。收件地址：zhangjunnan510@gmail.com。用户在「联系 / 建议」入口中选择使用问题、改进建议或其他联系，填写说明后打开 Gmail 草稿、其他邮件应用，或复制内容。只有用户在邮箱中发送后作者才会收到，网站不显示已提交或已送达。

## 配置与独立构建

`site.feedback.json` 保存公开收件邮箱、项目标识、显示名称、主题和公开路径名单；不需要 Gmail 密码、OAuth token 或服务端密钥。公开运行文件为 `public/site-feedback.js` 与 `site-feedback.css`，源码副本与自包含适配器在 `scripts/site-feedback*`，独立仓库不依赖兄弟项目或运行时 CDN。修改配置后运行 `node scripts/site-feedback.mjs --prepare`；常规构建通过现有 foundation 适配器的 prepare/finalize 自动执行。

## 隐私与真实事件

正文仅临时保留在当前页面；不写本机持久存储、不自动上传、不预取邮件URL。用户主动打开邮件草稿时，正文才交给所选邮件服务。复制失败提供可选中的文本，不虚报复制成功。项目名称/标识始终附上；只允许明确列出的固定公开路径，自动删除所有 query/hash；敏感项目完全不附页面URL或document.title。用户可以取消附上公开页面。健康/财务/笔记/搜索信息不得自动复制。

复用 `window.websiteAnalytics.trackEvent`，入口与成功复制调用 `cta_clicked`（固定 `feedback_open` / `feedback_copy`，`cta_location=feedback_widget`）；打开邮件调用 `outbound_clicked`，仅 `destination_domain` 与固定 `link_type=feedback_email`。没有适配器时不安装另一SDK；没有统计这些新控件的站点如实保留该局限。遵从现有环境/公共路由/DNT/GPC/退出边界。反馈正文、类型之外的私人数据、邮箱和草稿URL均不进入事件；无反馈送达或完成事件。

源码接入、构建、浏览器行为、公开发布、真实邮件送达和生产统计收件分别验收。本次模块不会执行 commit、push、部署或账户写入。
