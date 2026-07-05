import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  onTextExtracted: (text: string) => void;
  type: 'resume' | 'job';
  isLoading: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onTextExtracted, type, isLoading }) => {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    
    if (!file) return;
    
    // 检查文件类型
    if (file.type !== 'application/pdf') {
      setError('请上传PDF文件');
      return;
    }
    
    // 检查文件大小 (限制为10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过10MB');
      return;
    }
    
    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(10); // 开始上传
      
      // 创建表单数据
      const formData = new FormData();
      formData.append('file', file);
      
      setUploadProgress(30); // 文件准备完毕
      
      // 发送请求到API - 使用新的DeepSeek端点
      console.log('正在上传文件到DeepSeek...');
      const response = await fetch('/api/pdf-to-deepseek', {
        method: 'POST',
        body: formData,
      });
      
      setUploadProgress(60); // 上传完成
      
      console.log('等待DeepSeek处理...');
      const data = await response.json();
      console.log('服务器返回数据:', { success: data.success, textLength: data.text?.length });
      
      if (!response.ok) {
        console.error('服务器错误:', data.error);
        throw new Error(data.error || '上传失败');
      }
      
      if (!data.success || !data.text) {
        console.error('返回数据无效:', data);
        throw new Error('无法解析文件内容');
      }
      
      setUploadProgress(100); // 处理完成
      
      // 提取成功，将文本传递给父组件
      onTextExtracted(data.text);
    } catch (err) {
      console.error('文件上传错误:', err);
      setError(err instanceof Error ? err.message : '文件处理失败，请重试');
    } finally {
      // 延迟重置状态，使用户可以看到进度
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  }, [onTextExtracted]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
    },
    disabled: isLoading || isUploading,
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });
  
  return (
    <div className="mt-2">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300'}
          ${(isLoading || isUploading) ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        {isUploading ? (
          <div className="flex flex-col items-center justify-center">
            {/* 更详细的进度条 */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4 dark:bg-gray-700">
              <div 
                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {uploadProgress < 30 ? '准备文件...' : 
               uploadProgress < 60 ? '上传中...' : 
               uploadProgress < 100 ? 'AI分析中...' : '处理完成'}
            </p>
          </div>
        ) : (
          <>
            <svg 
              className="mx-auto h-12 w-12 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
            
            <p className="mt-1 text-sm text-gray-600">
              {isDragActive ? 
                `拖放文件至此上传` : 
                `点击${type === 'resume' ? '上传简历' : '上传职位描述'}（PDF格式）或拖拽至此`}
            </p>
            <p className="mt-1 text-xs text-gray-500">仅支持PDF文件 (最大10MB)</p>
          </>
        )}
      </div>
      
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload; 