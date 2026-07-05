import React from 'react';
import type { MatchResult } from '../utils/matchResumeToJD';

interface ResultDisplayProps {
  result: MatchResult;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result }) => {
  const { matchScore, missingSkills, suggestions } = result;

  // 决定分数的颜色
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 创建百分比进度条
  const ProgressBar = ({ percentage }: { percentage: number }) => (
    <div className="w-full bg-gray-200 rounded-full h-4 my-2">
      <div
        className={`h-4 rounded-full ${
          percentage >= 80 ? 'bg-green-500' : percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
        }`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-lg shadow-md result-card">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">简历匹配分析结果</h2>
      
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">匹配度评分</h3>
          <span className={`text-2xl font-bold ${getScoreColor(matchScore)}`}>
            {matchScore}/100
          </span>
        </div>
        <ProgressBar percentage={matchScore} />
        <p className="text-sm text-gray-600 mt-1">
          {matchScore >= 80
            ? '您的简历非常符合此岗位要求！'
            : matchScore >= 60
            ? '您的简历基本符合要求，但有改进空间。'
            : '您的简历与岗位匹配度较低，建议按照建议优化。'}
        </p>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">缺失技能</h3>
        {missingSkills.length === 0 ? (
          <p className="text-green-600">没有发现明显缺失的技能！</p>
        ) : (
          <ul className="list-disc pl-5 space-y-1">
            {missingSkills.map((skill, index) => (
              <li key={index} className="text-gray-700">{skill}</li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">优化建议</h3>
        <ul className="list-disc pl-5 space-y-2">
          {suggestions.map((suggestion, index) => (
            <li key={index} className="text-gray-700">{suggestion}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ResultDisplay; 