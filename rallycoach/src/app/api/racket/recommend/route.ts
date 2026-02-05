import { NextResponse } from 'next/server';
import { getRacketRecommendations } from '@/lib/gemini';
import racketsData from '@/data/rackets.json';
import type { Racket, RacketRecommendRequest } from '@/lib/types';

const rackets: Racket[] = racketsData as Racket[];

export async function POST(request: Request) {
  try {
    const body: RacketRecommendRequest = await request.json();
    const { level, weaknesses, style_pref } = body;

    if (!level || !weaknesses || weaknesses.length === 0) {
      return NextResponse.json(
        { error: 'level and weaknesses are required' },
        { status: 400 }
      );
    }

    // Filter rackets by skill level first
    const eligibleRackets = rackets.filter((r) =>
      r.skill_level.includes(level)
    );

    // If Gemini API is available, use AI ranking
    if (process.env.GEMINI_API_KEY) {
      try {
        const recommendations = await getRacketRecommendations(
          eligibleRackets.length > 0 ? eligibleRackets : rackets,
          level,
          weaknesses,
          style_pref
        );

        return NextResponse.json({ recommendations });
      } catch (error) {
        console.error('Gemini recommendation error:', error);
        // Fall back to deterministic ranking
      }
    }

    // Deterministic fallback ranking
    const recommendations = deterministicRanking(
      eligibleRackets.length > 0 ? eligibleRackets : rackets,
      level,
      weaknesses,
      style_pref
    );

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Racket recommendation error:', error);
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    );
  }
}

function deterministicRanking(
  rackets: Racket[],
  level: string,
  weaknesses: string[],
  stylePref?: string
) {
  const scored = rackets.map((racket) => {
    let score = 50;
    const reasons: string[] = [];

    // Level match bonus
    if (racket.skill_level.includes(level)) {
      score += 15;
      reasons.push(`suitable for ${level} players`);
    }

    // Style preference match
    if (stylePref && racket.play_style.includes(stylePref)) {
      score += 20;
      reasons.push(`${stylePref} play style`);
    }

    // Weakness-based scoring
    if (weaknesses.includes('smash_power')) {
      if (racket.balance === 'Head Heavy') {
        score += 15;
        reasons.push('head-heavy for power');
      }
      if (racket.flexibility === 'Stiff') {
        score += 10;
      }
    }

    if (weaknesses.includes('defense')) {
      if (racket.balance === 'Head Light' || racket.balance === 'Even Balance') {
        score += 15;
        reasons.push('balanced for quick defense');
      }
      if (racket.weight.includes('5U') || racket.weight.includes('6U')) {
        score += 10;
      }
    }

    if (weaknesses.includes('footwork')) {
      // Lighter rackets help with overall movement
      if (racket.weight.includes('5U') || racket.weight.includes('6U')) {
        score += 10;
        reasons.push('lightweight for agility');
      }
    }

    if (weaknesses.includes('net_play')) {
      if (racket.balance === 'Head Light') {
        score += 15;
        reasons.push('head-light for quick net shots');
      }
    }

    if (weaknesses.includes('consistency')) {
      if (racket.flexibility === 'Flexible' || racket.flexibility === 'Medium') {
        score += 15;
        reasons.push('forgiving flex for consistency');
      }
      if (racket.balance === 'Even Balance') {
        score += 10;
      }
    }

    if (weaknesses.includes('endurance')) {
      // Lighter rackets reduce fatigue
      if (racket.weight.includes('5U') || racket.weight.includes('6U') || racket.weight.includes('4U')) {
        score += 10;
        reasons.push('lighter weight reduces fatigue');
      }
    }

    // Beginner-friendly adjustments
    if (level === 'beginner') {
      if (racket.flexibility === 'Flexible') {
        score += 10;
      }
      if (racket.price_band === 'budget') {
        score += 5;
        reasons.push('budget-friendly');
      }
    }

    // Advanced player adjustments
    if (level === 'advanced') {
      if (racket.price_band === 'premium') {
        score += 5;
      }
      if (racket.flexibility === 'Stiff') {
        score += 5;
      }
    }

    // Generate match reason
    const matchReason =
      reasons.length > 0
        ? `Great choice: ${reasons.slice(0, 2).join(', ')}.`
        : `Solid option for ${level} players looking to improve.`;

    return {
      ...racket,
      match_score: Math.min(score, 100),
      match_reason: matchReason,
    };
  });

  // Sort by score and return top 5
  return scored.sort((a, b) => b.match_score - a.match_score).slice(0, 5);
}
