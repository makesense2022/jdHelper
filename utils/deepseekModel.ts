import { ChatOpenAI } from "@langchain/openai";
import OpenAI from "openai";

// 检查必要的环境变量
const checkRequiredEnvVars = () => {
  if (typeof window !== 'undefined') return; // 客户端不检查
  
  if (!process.env.DEEPSEEK_API_KEY || 
      process.env.DEEPSEEK_API_KEY === 'your_api_key_here') {
    console.error('警告: DEEPSEEK_API_KEY 未设置或使用了默认值');
  }

  if (!process.env.DEEPSEEK_API_BASE_URL) {
    console.error('警告: DEEPSEEK_API_BASE_URL 未设置');
  }
};

// 初始函数调用检查
checkRequiredEnvVars();

// 初始化OpenAI客户端
export const openaiClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "default_key",
  baseURL: process.env.DEEPSEEK_API_BASE_URL
});

// 初始化PDFJS的函数
export function initPdfJS() {
  if (typeof window === 'undefined') {
    // 服务器端初始化
    console.log("服务器端初始化PDF.js");
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');
    return pdfjsLib;
  } else {
    // 客户端初始化
    console.log("客户端初始化PDF.js");
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    // 客户端需要指定worker路径
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    return pdfjsLib;
  }
}

// 获取DeepSeek模型实例
export function getDeepseekModel() {
  // 检查环境变量
  checkRequiredEnvVars();

  // 创建并返回DeepSeek模型实例
  return new ChatOpenAI({
    modelName: process.env.DEEPSEEK_MODEL_NAME || "deepseek-chat",
    openAIApiKey: process.env.DEEPSEEK_API_KEY || "default_key",
    configuration: {
      baseURL: process.env.DEEPSEEK_API_BASE_URL,
    },
    temperature: 0.2,
    maxTokens: 2000,
  });
}

// 导出默认实例
const deepseekModel = getDeepseekModel();
export default deepseekModel; 
