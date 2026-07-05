import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

// 设置PDFJS的worker路径
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

export const config = {
  api: {
    bodyParser: false, // 禁用默认的bodyParser，使用formidable处理
  },
};

// 使用PDFJS从PDF中提取文本
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    // 将Buffer转换为Uint8Array
    const uint8Array = new Uint8Array(pdfBuffer);
    
    // 加载PDF文档
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdf = await loadingTask.promise;
    console.log(`PDF加载成功，共 ${pdf.numPages} 页`);

    // 存储所有页面的文本
    let allText = '';
    let isEmptyTextDetected = false;

    // 遍历所有页面提取文本
    for (let i = 1; i <= pdf.numPages; i++) {
      console.log(`正在处理第 ${i}/${pdf.numPages} 页...`);
      const page = await pdf.getPage(i);
      
      // 获取页面信息以诊断是否为扫描件
      const imageResources = await page.getOperatorList();
      const hasImages = imageResources.fnArray.some((fn: number) => fn === pdfjsLib.OPS.paintImageXObject);
      console.log(`第 ${i} 页包含图片: ${hasImages}`);
      
      const textContent = await page.getTextContent();
      
      // 检查页面是否包含实际文本
      if (textContent.items.length === 0 || textContent.items.every((item: any) => !item.str.trim())) {
        console.log(`警告: 第 ${i} 页没有可提取的文本`);
        isEmptyTextDetected = true;
      }
      
      // 合并当前页的所有文本项
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      allText += pageText + '\n\n';
    }

    // 如果文本内容过少，判断是否为扫描件PDF
    if (allText.trim().length < 100 || isEmptyTextDetected) {
      console.log('诊断结果：这很可能是扫描件PDF，需要使用OCR技术提取文本');
      return allText.trim() + "\n\n[PDF诊断：这似乎是扫描件PDF，建议使用OCR工具识别文本。您可以尝试在线OCR服务如ABBYY FineReader、Google Cloud Vision或Tesseract.js]";
    }

    return allText;
  } catch (error) {
    console.error('PDF解析错误:', error);
    throw new Error(`PDF解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  let uploadedFile: formidable.File | undefined;

  try {
    console.log('开始处理PDF提取请求...');
    
    // 使用formidable解析multipart表单
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });
    
    // 读取表单数据
    const [fields, files] = await form.parse(req);
    uploadedFile = files.file?.[0];
    
    if (!uploadedFile) {
      console.log('请求中未找到文件');
      return res.status(400).json({ error: '未找到上传的文件' });
    }
    
    console.log(`文件已接收: ${uploadedFile.originalFilename} (${uploadedFile.size} 字节, ${uploadedFile.mimetype})`);
    
    // 检查文件类型
    if (uploadedFile.mimetype !== 'application/pdf') {
      console.log(`文件类型不支持: ${uploadedFile.mimetype}`);
      if (fs.existsSync(uploadedFile.filepath)) {
        fs.unlinkSync(uploadedFile.filepath);
      }
      return res.status(400).json({ error: '请上传PDF文件' });
    }
    
    try {
      // 读取文件内容
      console.log(`正在读取文件: ${uploadedFile.filepath}`);
      const fileData = fs.readFileSync(uploadedFile.filepath);
      console.log(`文件已读取，大小: ${fileData.length} 字节`);
      
      // 使用PDFJS提取文本
      console.log('开始使用PDFJS解析PDF文件...');
      const extractedText = await extractTextFromPDF(fileData);
      console.log(`PDF解析完成，提取的文本长度: ${extractedText.length} 字符`);
      
      // 删除临时文件
      if (fs.existsSync(uploadedFile.filepath)) {
        fs.unlinkSync(uploadedFile.filepath);
        console.log('临时文件已删除');
      }
      
      // 返回提取的文本
      return res.status(200).json({ 
        success: true, 
        text: extractedText,
        isProbablyScannedPDF: extractedText.length < 100 && uploadedFile.size > 100000
      });
    } catch (fileError) {
      console.error('文件处理错误:', fileError);
      // 确保清理临时文件
      if (uploadedFile && fs.existsSync(uploadedFile.filepath)) {
        fs.unlinkSync(uploadedFile.filepath);
        console.log('错误处理中: 临时文件已删除');
      }
      throw fileError;
    }
  } catch (error) {
    console.error('PDF处理错误:', error);
    
    // 确保在任何情况下都清理临时文件
    if (uploadedFile && fs.existsSync(uploadedFile.filepath)) {
      try {
        fs.unlinkSync(uploadedFile.filepath);
        console.log('错误处理: 临时文件已清理');
      } catch (cleanupError) {
        console.error('清理临时文件时发生错误:', cleanupError);
      }
    }
    
    const errorMessage = error instanceof Error ? error.message : '处理PDF文件时出错';
    console.error(`向客户端返回错误: ${errorMessage}`);
    
    return res.status(500).json({ 
      error: errorMessage,
      success: false
    });
  }
} 