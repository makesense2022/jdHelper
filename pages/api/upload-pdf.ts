import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import { extractTextFromPDF } from '../../utils/pdfParser';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // 禁用默认的bodyParser，使用formidable处理
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '只支持POST请求' });
  }

  let uploadedFile: formidable.File | undefined;

  try {
    console.log('开始处理PDF上传请求');
    
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
      
      // 将Buffer转换为Uint8Array后再转为ArrayBuffer
      // 这样可以解决ArrayBufferLike类型不兼容的问题
      const arrayBuffer = new Uint8Array(fileData).buffer;
      
      // 提取PDF文本内容
      console.log('开始提取PDF文本');
      const pdfText = await extractTextFromPDF(arrayBuffer);
      console.log(`PDF文本提取完成，长度: ${pdfText.length} 字符`);
      
      // 删除临时文件
      if (fs.existsSync(uploadedFile.filepath)) {
        fs.unlinkSync(uploadedFile.filepath);
        console.log('临时文件已删除');
      }
      
      // 返回提取的文本
      return res.status(200).json({ success: true, text: pdfText });
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
    console.error('PDF上传处理错误:', error);
    
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