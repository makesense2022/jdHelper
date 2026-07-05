import '../styles/globals.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // 拦截和处理不需要的资源请求
  useEffect(() => {
    // 如果URL包含error，重定向到主页
    if (router.pathname === '/error') {
      router.replace('/');
    }
  }, [router.pathname, router]);

  return (
    <>
      <Head>
        <title>简历助手 - AI简历优化与匹配分析</title>
        <meta name="description" content="使用AI技术分析简历与岗位匹配度，提供专业优化建议" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        {/* 添加自定义meta标签，防止其他应用的资源请求 */}
        <meta name="application-name" content="resume-assistant" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp; 