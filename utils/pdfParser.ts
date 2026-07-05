import * as pdfjs from 'pdfjs-dist';

// PDF.js 初始化函数，区分客户端和服务器端
export function initPdfJS() {
  if (typeof window !== 'undefined') {
    // 浏览器环境
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  } else {
    // 服务器环境 - 简单地禁用worker
    console.log('在服务器端初始化PDF.js，禁用Worker');
    // 在Node.js环境中，我们不需要完整的canvas功能，只需禁用worker
    pdfjs.GlobalWorkerOptions.workerSrc = '';
  }
}

/**
 * 从PDF文件提取文本内容的简化版本
 * @param fileBuffer PDF文件的buffer
 * @returns 提取的文本内容
 */
export async function extractTextFromPDF(fileBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log('PDF解析开始...');
    // 确保PDF.js初始化
    initPdfJS();
    
    console.log('加载PDF文档...');
    // 使用最简单的配置加载PDF - 只使用data参数
    const dataArray = new Uint8Array(fileBuffer);
    
    // 直接使用数据数组而不使用配置对象
    const loadingTask = pdfjs.getDocument(dataArray);
    
    console.log('等待PDF加载完成...');
    const pdf = await loadingTask.promise;
    console.log(`PDF加载成功，共${pdf.numPages}页`);
    
    // 获取PDF页数
    const numPages = pdf.numPages;
    const textContent: string[] = [];
    
    // 逐页提取文本
    console.log('开始逐页提取文本...');
    for (let i = 1; i <= numPages; i++) {
      try {
        console.log(`处理第${i}/${numPages}页...`);
        const page = await pdf.getPage(i);
        
        console.log(`获取第${i}页文本内容...`);
        const content = await page.getTextContent();
        
        console.log(`提取第${i}页文本字符串...`);
        // 安全地访问items属性，添加类型检查
        if (content && Array.isArray(content.items)) {
          const strings = content.items
            .filter(item => typeof item === 'object' && item !== null && 'str' in item)
            .map(item => (item as any).str || '');
          
          const pageText = strings.join(' ');
          console.log(`第${i}页文本提取完成，共${pageText.length}个字符`);
          textContent.push(pageText);
        } else {
          console.warn(`第${i}页没有有效的文本内容`, content);
          textContent.push(`[第${i}页：无文本内容]`);
        }
      } catch (pageError) {
        console.error(`提取第${i}页文本时出错:`, pageError);
        textContent.push(`[第${i}页提取失败]`);
      }
    }
    
    console.log(`所有页面处理完成，共提取${textContent.length}页文本`);
    return textContent.join('\n\n');
  } catch (error) {
    console.error('PDF解析过程中发生错误:', error);
    // 提供更详细的错误信息
    const errorMsg = error instanceof Error ? 
      `PDF解析错误: ${error.name} - ${error.message}` : 
      '未知PDF解析错误';
    
    throw new Error(errorMsg);
  }
}

/**
 * 从BASE64编码的PDF数据中提取文本
 * @param base64Data BASE64编码的PDF数据
 * @returns 提取的文本内容
 */
export async function extractTextFromBase64PDF(base64Data: string): Promise<string> {
  try {
    // 移除Data URL前缀
    const base64WithoutPrefix = base64Data.replace(/^data:[^;]+;base64,/, '');
    
    // 转换BASE64为ArrayBuffer
    const binaryString = Buffer.from(base64WithoutPrefix, 'base64');
    const arrayBuffer = new Uint8Array(binaryString).buffer;
    
    return await extractTextFromPDF(arrayBuffer);
  } catch (error) {
    console.error('BASE64 PDF解析错误:', error);
    throw new Error('无法解析BASE64编码的PDF文件，请重试或使用其他方式');
  }
} 