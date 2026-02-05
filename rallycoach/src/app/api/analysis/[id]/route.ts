import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const analysisId = params.id;

    if (!analysisId) {
      return NextResponse.json(
        { error: 'Analysis ID is required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('analysis_results')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (error) {
      // For demo mode, return a mock completed result
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          id: analysisId,
          status: 'completed',
          result_json: getMockAnalysisResult(),
        });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Analysis fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analysis' },
      { status: 500 }
    );
  }
}

function getMockAnalysisResult() {
  return {
    top_issues: [
      {
        id: 'issue-1',
        title: 'Elbow Position During Backhand',
        severity: 'high',
        description:
          'Your elbow drops too low during backhand clears, reducing power transfer and causing strain.',
        affected_metrics: ['elbow_angle'],
      },
      {
        id: 'issue-2',
        title: 'Stance Width Inconsistency',
        severity: 'medium',
        description:
          'Your stance width varies throughout rallies, affecting your balance and movement speed.',
        affected_metrics: ['stance_width_norm'],
      },
      {
        id: 'issue-3',
        title: 'Good Body Rotation',
        severity: 'low',
        description:
          'Your shoulder-hip rotation is generally good on forehand shots. Keep it up!',
        affected_metrics: ['shoulder_hip_rotation_proxy'],
      },
    ],
    drills: [
      {
        id: 'drill-1',
        name: 'Wall Shadow Drill',
        description:
          'Practice your backhand swing motion against a wall mirror to visualize elbow position.',
        duration_minutes: 10,
        target_metrics: ['elbow_angle'],
        instructions: [
          'Stand sideways facing a mirror or wall',
          'Perform slow backhand swing motions',
          'Focus on keeping elbow at 90-100 degrees at contact point',
          'Repeat 30 times, gradually increasing speed',
        ],
      },
      {
        id: 'drill-2',
        name: 'Cone Shuffle Drill',
        description:
          'Improve stance consistency with structured footwork patterns.',
        duration_minutes: 15,
        target_metrics: ['stance_width_norm', 'knee_angle'],
        instructions: [
          'Set up 6 cones in a hexagon pattern',
          'Start at center in ready position',
          'Shuffle to each cone maintaining consistent stance',
          'Return to center between each cone',
          'Complete 3 sets of full rotations',
        ],
      },
      {
        id: 'drill-3',
        name: 'Multi-Shuttle Feeding',
        description: 'Practice shot preparation with continuous shuttle feeding.',
        duration_minutes: 20,
        target_metrics: ['elbow_angle', 'knee_angle', 'shoulder_hip_rotation_proxy'],
        instructions: [
          'Have a partner feed shuttles continuously',
          'Alternate forehand and backhand clears',
          'Focus on consistent ready position between shots',
          'Maintain proper body rotation throughout',
        ],
      },
    ],
    technique_summary:
      'Your overall technique shows promise with strong forehand mechanics. The main area for improvement is your backhand preparation, specifically the elbow position during the swing. Your footwork foundation is solid but could benefit from more consistent stance width, especially during defensive situations.',
    strategy_summary:
      'Focus on building confidence in your backhand by practicing shadow swings daily. Once the muscle memory improves, you can work on incorporating these improvements into match play. Consider playing more backhand-focused rallies during practice games.',
    training_plan: [
      {
        day: 1,
        focus: 'Backhand Mechanics',
        drills: ['drill-1'],
        duration_minutes: 30,
      },
      {
        day: 2,
        focus: 'Footwork & Stance',
        drills: ['drill-2'],
        duration_minutes: 25,
      },
      {
        day: 3,
        focus: 'Combined Practice',
        drills: ['drill-1', 'drill-3'],
        duration_minutes: 40,
      },
      {
        day: 4,
        focus: 'Active Recovery',
        drills: [],
        duration_minutes: 0,
      },
      {
        day: 5,
        focus: 'Match Play Application',
        drills: ['drill-3'],
        duration_minutes: 45,
      },
    ],
  };
}
