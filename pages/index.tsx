import { useState } from 'react';
import Head from 'next/head';
import ResultDisplay from '../components/ResultDisplay';
import FileUpload from '../components/FileUpload';
import type { MatchResult } from '../utils/matchResumeToJD';

export default function Home() {
  const [resumeText, setResumeText] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证输入
    if (!resumeText.trim() || !jobDesc.trim()) {
      setError('请同时填写简历内容和岗位描述');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ resumeText, jobDesc }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '分析请求失败');
      }
      
      if (data.success && data.data) {
        setResult(data.data);
      } else {
        throw new Error('返回数据格式不正确');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '发生未知错误');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResumeText('');
    setJobDesc('');
    setResult(null);
    setError(null);
  };

  // 处理PDF上传提取的文本
  const handleResumeTextExtracted = (text: string) => {
    setResumeText(text);
  };
  
  const handleJobDescTextExtracted = (text: string) => {
    setJobDesc(text);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>简历助手 - 智能简历匹配分析</title>
        <meta name="description" content="使用AI分析简历与岗位匹配度，获取专业优化建议" />
      </Head>

      <header className="bg-indigo-600 shadow-md">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white">简历助手</h1>
          <p className="mt-1 text-indigo-100">AI驱动的简历分析与优化工具</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {!result ? (
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">分析简历与岗位匹配度</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label 
                    htmlFor="resumeText" 
                    className="block text-gray-700 font-medium mb-2"
                  >
                    简历内容
                  </label>
                  <textarea
                    id="resumeText"
                    className="w-full resume-container px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="请粘贴您的简历内容..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    required
                  />
                  
                  {/* 简历文件上传 */}
                  <FileUpload 
                    onTextExtracted={handleResumeTextExtracted} 
                    type="resume"
                    isLoading={isLoading}
                  />
                </div>
                
                <div>
                  <label 
                    htmlFor="jobDesc" 
                    className="block text-gray-700 font-medium mb-2"
                  >
                    岗位描述
                  </label>
                  <textarea
                    id="jobDesc"
                    className="w-full job-container px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="请粘贴岗位描述..."
                    value={jobDesc}
                    onChange={(e) => setJobDesc(e.target.value)}
                    required
                  />
                  
                  {/* 岗位描述文件上传 */}
                  <FileUpload 
                    onTextExtracted={handleJobDescTextExtracted} 
                    type="job"
                    isLoading={isLoading}
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="mr-3 px-4 py-2 text-indigo-600 bg-white border border-indigo-600 rounded-md hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isLoading}
                >
                  重置
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 border-t-2 border-r-2 border-white rounded-full animate-spin mr-2"></div>
                      分析中...
                    </div>
                  ) : '开始分析'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <ResultDisplay result={result} />
            <div className="mt-6 text-center">
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                重新分析
              </button>
            </div>
          </div>
        )}
        
        <div className="mt-12 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">关于简历助手</h2>
          <p className="text-gray-600">
            简历助手利用先进的人工智能技术，分析您的简历与目标岗位的匹配程度。
            系统会评估简历中的技能、经验与岗位要求的匹配度，识别缺失的关键技能，
            并提供针对性的优化建议，帮助您提高面试成功率。
          </p>
          <div className="mt-4">
            <h3 className="font-medium text-gray-700">使用方法：</h3>
            <ul className="list-disc pl-5 mt-2 text-gray-600 space-y-1">
              <li>在文本框中<span className="font-medium">粘贴</span>您的简历内容和岗位描述</li>
              <li>或者<span className="font-medium">上传PDF文件</span>，系统会自动提取文本</li>
              <li>点击"开始分析"获取匹配度评分和优化建议</li>
            </ul>
          </div>
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center">© {new Date().getFullYear()} 简历助手 - 基于 Next.js, LangChain 和 DeepSeek AI</p>
        </div>
      </footer>
    </div>
  );
} 