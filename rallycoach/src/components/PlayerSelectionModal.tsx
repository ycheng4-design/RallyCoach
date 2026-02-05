'use client';

import { useState, useEffect } from 'react';
import type { PlayerTrackData } from '@/lib/types';
import { EVENT_TYPE_LABELS } from '@/lib/types';

interface PlayerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedTracks: number[], matchFormat: 'singles' | 'doubles', eventType: string) => void;
  tracks: PlayerTrackData[];
  detectedFormat: 'singles' | 'doubles' | null;
  videoThumbnailUrl?: string;
}

export default function PlayerSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  tracks,
  detectedFormat,
  videoThumbnailUrl,
}: PlayerSelectionModalProps) {
  const [selectedTracks, setSelectedTracks] = useState<number[]>([]);
  const [matchFormat, setMatchFormat] = useState<'singles' | 'doubles'>(detectedFormat || 'singles');
  const [eventType, setEventType] = useState<string>('');
  const [step, setStep] = useState<'format' | 'players' | 'event'>('format');

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTracks([]);
      setMatchFormat(detectedFormat || 'singles');
      setEventType('');
      setStep('format');
    }
  }, [isOpen, detectedFormat]);

  // Get required selection count
  const requiredCount = matchFormat === 'singles' ? 1 : 2;

  // Handle track selection
  const handleTrackClick = (trackId: number) => {
    setSelectedTracks((prev) => {
      if (prev.includes(trackId)) {
        return prev.filter((id) => id !== trackId);
      }
      if (prev.length < requiredCount) {
        return [...prev, trackId];
      }
      // Replace the first selection if at max
      return [...prev.slice(1), trackId];
    });
  };

  // Get event type options based on format
  const eventTypeOptions = matchFormat === 'singles'
    ? ['MS', 'WS']
    : ['MD', 'WD', 'XD'];

  const handleNext = () => {
    if (step === 'format') {
      setStep('players');
    } else if (step === 'players') {
      setStep('event');
    }
  };

  const handleBack = () => {
    if (step === 'players') {
      setStep('format');
    } else if (step === 'event') {
      setStep('players');
    }
  };

  const handleConfirm = () => {
    onConfirm(selectedTracks, matchFormat, eventType);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {step === 'format' && 'Match Format'}
            {step === 'players' && 'Select Yourself'}
            {step === 'event' && 'Event Type'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {step === 'format' && 'Is this a singles or doubles match?'}
            {step === 'players' && `Select ${requiredCount === 1 ? 'yourself' : 'you and your partner'} for pose tracking`}
            {step === 'event' && 'What type of event is this?'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Step 1: Format Selection */}
          {step === 'format' && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setMatchFormat('singles')}
                className={`p-6 rounded-xl border-2 transition text-left ${
                  matchFormat === 'singles'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Singles</p>
                    <p className="text-sm text-gray-500">1 vs 1</p>
                  </div>
                </div>
                {detectedFormat === 'singles' && (
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    Auto-detected
                  </span>
                )}
              </button>

              <button
                onClick={() => setMatchFormat('doubles')}
                className={`p-6 rounded-xl border-2 transition text-left ${
                  matchFormat === 'doubles'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Doubles</p>
                    <p className="text-sm text-gray-500">2 vs 2</p>
                  </div>
                </div>
                {detectedFormat === 'doubles' && (
                  <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    Auto-detected
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Player Selection */}
          {step === 'players' && (
            <div>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  {matchFormat === 'singles' ? (
                    <>Click on <strong>yourself</strong> to select for pose tracking.</>
                  ) : (
                    <>Click on <strong>yourself and your partner</strong> ({selectedTracks.length}/2 selected).</>
                  )}
                </p>
              </div>

              {tracks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-gray-600">No players detected in the video.</p>
                  <p className="text-sm text-gray-500 mt-1">Please ensure the video clearly shows the players.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {tracks.map((track) => {
                    const isSelected = selectedTracks.includes(track.track_id);
                    return (
                      <button
                        key={track.track_id}
                        onClick={() => handleTrackClick(track.track_id)}
                        className={`relative p-2 rounded-xl border-2 transition ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Thumbnail */}
                        <div className="aspect-square rounded-lg bg-gray-100 overflow-hidden mb-2">
                          {track.thumbnail_url ? (
                            <img
                              src={track.thumbnail_url}
                              alt={`Player ${track.track_id}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="text-center">
                          <p className="font-medium text-gray-900 text-sm">
                            Player {track.track_id + 1}
                          </p>
                          <p className="text-xs text-gray-500">
                            {track.side === 'near' ? 'Near side' : track.side === 'far' ? 'Far side' : 'Court'}
                          </p>
                        </div>

                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}

                        {/* Confidence badge */}
                        <div className={`absolute top-2 left-2 px-1.5 py-0.5 rounded text-xs font-medium ${
                          track.confidence_avg >= 0.7
                            ? 'bg-green-100 text-green-700'
                            : track.confidence_avg >= 0.5
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {Math.round(track.confidence_avg * 100)}%
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Event Type Selection */}
          {step === 'event' && (
            <div>
              <div className="grid grid-cols-1 gap-3">
                {eventTypeOptions.map((type) => (
                  <button
                    key={type}
                    onClick={() => setEventType(type)}
                    className={`p-4 rounded-xl border-2 transition text-left flex items-center gap-4 ${
                      eventType === type
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      eventType === type ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className="font-bold">{type}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {EVENT_TYPE_LABELS[type]}
                      </p>
                      <p className="text-sm text-gray-500">
                        {type.includes('M') ? 'Male' : type.includes('W') ? 'Female' : 'Mixed'} players
                      </p>
                    </div>
                    {eventType === type && (
                      <div className="ml-auto">
                        <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}

                {/* Skip option */}
                <button
                  onClick={() => setEventType('unknown')}
                  className={`p-4 rounded-xl border-2 transition text-left flex items-center gap-4 ${
                    eventType === 'unknown'
                      ? 'border-gray-400 bg-gray-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    eventType === 'unknown' ? 'bg-gray-400 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <span className="font-bold">?</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Skip</p>
                    <p className="text-sm text-gray-500">I&apos;ll set this later</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={step === 'format' ? onClose : handleBack}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition"
          >
            {step === 'format' ? 'Cancel' : 'Back'}
          </button>

          <div className="flex items-center gap-2">
            {/* Step indicators */}
            <div className="flex gap-1 mr-4">
              {['format', 'players', 'event'].map((s, i) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full ${
                    s === step ? 'bg-primary-500' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {step !== 'event' ? (
              <button
                onClick={handleNext}
                disabled={step === 'players' && selectedTracks.length !== requiredCount}
                className="px-6 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleConfirm}
                disabled={!eventType}
                className="px-6 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm Selection
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Event Type Badge Component
// ============================================

interface EventTypeBadgeProps {
  eventType: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function EventTypeBadge({ eventType, size = 'md', className = '' }: EventTypeBadgeProps) {
  const colors: Record<string, string> = {
    MS: 'bg-blue-100 text-blue-700',
    WS: 'bg-pink-100 text-pink-700',
    MD: 'bg-blue-100 text-blue-700',
    WD: 'bg-pink-100 text-pink-700',
    XD: 'bg-purple-100 text-purple-700',
    unknown: 'bg-gray-100 text-gray-600',
  };

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm';

  return (
    <span className={`inline-flex items-center font-medium rounded ${sizeClasses} ${colors[eventType] || colors.unknown} ${className}`}>
      {eventType === 'unknown' ? 'Unset' : eventType}
    </span>
  );
}

// ============================================
// Match Format Badge Component
// ============================================

interface MatchFormatBadgeProps {
  format: 'singles' | 'doubles';
  size?: 'sm' | 'md';
  className?: string;
}

export function MatchFormatBadge({ format, size = 'md', className = '' }: MatchFormatBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm';

  return (
    <span className={`inline-flex items-center font-medium rounded ${sizeClasses} ${
      format === 'singles' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'
    } ${className}`}>
      {format === 'singles' ? 'Singles' : 'Doubles'}
    </span>
  );
}
