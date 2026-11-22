import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist';
import { apiGuard } from '../../utils/api-guard';
import { initPdfJS } from '../../utils/pdfParser';

export const config = {
  api: {
    bodyParser: false, // 禁用默认的bodyParser，使用formidable处理
  },
};

const imageOperators = new Set([
  pdfjsLib.OPS.paintImageXObject,
  pdfjsLib.OPS.paintImageXObjectRepeat,
  pdfjsLib.OPS.paintInlineImageXObject,
  pdfjsLib.OPS.paintInlineImageXObjectGroup,
  pdfjsLib.OPS.paintImageMaskXObject,
  pdfjsLib.OPS.paintImageMaskXObjectRepeat,
  pdfjsLib.OPS.paintImageMaskXObjectGroup,
]);

async function extractTextFromPDF(pdfBuffer: Buffer): Promise<{ text: string; isScanned: boolean }> {
  await initPdfJS();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    disableFontFace: true,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  try {
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    let hasText = false;
    let hasImagePage = false;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .trim();

      pages.push(pageText);
      if (pageText) hasText = true;
      if (!hasText && !hasImagePage) {
        const operators = await page.getOperatorList();
        hasImagePage = operators.fnArray.some((operator: number) => imageOperators.has(operator));
      }
    }

    return { text: pages.join('\n\n').trim(), isScanned: !hasText && hasImagePage };
  } catch (error) {
    console.error('PDF解析错误:', error);
    throw new Error(`PDF解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
  } finally {
    await loadingTask.destroy();
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  // 鉴权 + 限流,防止任意访客刷爆 DeepSeek 付费额度
  if (!apiGuard(req, res)) {
    return;
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
      const { text: extractedText, isScanned } = await extractTextFromPDF(fileData);
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
        isProbablyScannedPDF: isScanned
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
