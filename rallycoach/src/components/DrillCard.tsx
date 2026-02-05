'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getKeyframeSVGs, type DrillDefinition } from '@/lib/rules-engine';
import Skeleton3D from './Skeleton3D';

interface DrillCardProps {
  issue: {
    code: string;
    title: string;
    severity: 'low' | 'medium' | 'high';
    description?: string;
    timestamps?: number[];
    drill?: DrillDefinition;
  };
  onTimestampClick?: (timestamp: number) => void;
  onPracticeClick?: (drillId: string) => void;
  currentTime?: number;
}

export default function DrillCard({
  issue,
  onTimestampClick,
  onPracticeClick,
  currentTime = 0,
}: DrillCardProps) {
  const [activeKeyframe, setActiveKeyframe] = useState(0);

  // Get drill info
  const drill = issue.drill;
  const drillType = (drill?.keyframeType || 'footwork') as 'smash' | 'clear' | 'netshot' | 'footwork' | 'drive';
  const keyframes = getKeyframeSVGs(drillType, { width: 100, height: 150 });

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'low':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Format timestamp for display
  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if a timestamp is currently playing
  const isTimestampActive = (timestamp: number) => {
    return Math.abs(currentTime - timestamp) < 0.5;
  };

  return (
    <div className={`rounded-xl border-2 overflow-hidden ${getSeverityColor(issue.severity)}`}>
      {/* Header */}
      <div className="p-4 border-b border-current/10">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${getSeverityBadgeColor(issue.severity)}`}></span>
              <h3 className="font-semibold">{issue.title}</h3>
            </div>
            {issue.description && (
              <p className="text-sm opacity-80">{issue.description}</p>
            )}
          </div>
          <span className="text-xs uppercase font-bold px-2 py-1 rounded bg-current/10">
            {issue.severity}
          </span>
        </div>
      </div>

      {/* 3D Skeleton Animation or Keyframe Carousel */}
      <div className="p-4 bg-white/50">
        <p className="text-xs font-medium text-gray-600 mb-2">Correct Form:</p>

        {/* 3D Animation (default) */}
        <div className="flex justify-center">
          <Skeleton3D
            drillType={drillType}
            activePhase={activeKeyframe}
            isPlaying={true}
            showLabels={true}
            width={200}
            height={250}
          />
        </div>

        {/* Phase selector tabs */}
        <div className="flex justify-center gap-2 mt-2">
          {keyframes.map((keyframe, index) => (
            <button
              key={index}
              onClick={() => setActiveKeyframe(index)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition ${
                activeKeyframe === index
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {keyframe.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timestamps */}
      {issue.timestamps && issue.timestamps.length > 0 && (
        <div className="px-4 py-3 bg-white/30 border-t border-current/10">
          <p className="text-xs font-medium text-gray-600 mb-2">
            Occurred at ({issue.timestamps.length}x):
          </p>
          <div className="flex flex-wrap gap-2">
            {issue.timestamps.slice(0, 8).map((timestamp, index) => (
              <button
                key={index}
                onClick={() => onTimestampClick?.(timestamp)}
                className={`px-2 py-1 text-xs font-mono rounded transition ${
                  isTimestampActive(timestamp)
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {formatTimestamp(timestamp)}
              </button>
            ))}
            {issue.timestamps.length > 8 && (
              <span className="px-2 py-1 text-xs text-gray-500">
                +{issue.timestamps.length - 8} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Drill Info */}
      {drill && (
        <div className="p-4 bg-white/30 border-t border-current/10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-medium text-gray-600">Recommended Drill:</p>
              <p className="font-semibold text-gray-900">{drill.name}</p>
            </div>
            <span className="text-sm text-gray-500">{drill.durationMinutes} min</span>
          </div>

          {/* Drill Steps */}
          <div className="mb-3">
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
              {drill.steps.slice(0, 3).map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </div>

          {/* Tips */}
          {drill.tips.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {drill.tips.map((tip, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded"
                >
                  {tip}
                </span>
              ))}
            </div>
          )}

          {/* Practice Button */}
          <Link
            href={`/practice?drill=${drill.id}`}
            className="block w-full py-2 bg-primary-500 text-white text-center rounded-lg font-medium hover:bg-primary-600 transition"
          >
            Practice This Drill
          </Link>
        </div>
      )}
    </div>
  );
}

// Mini version for lists
export function DrillCardMini({
  issue,
  onClick,
}: {
  issue: { code: string; title: string; severity: string; count?: number };
  onClick?: () => void;
}) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-300 bg-red-50';
      case 'medium':
        return 'border-yellow-300 bg-yellow-50';
      default:
        return 'border-green-300 bg-green-50';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg border-2 transition hover:shadow-md ${getSeverityColor(issue.severity)}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900">{issue.title}</span>
        {issue.count && (
          <span className="text-xs text-gray-500">{issue.count}x</span>
        )}
      </div>
    </button>
  );
}
