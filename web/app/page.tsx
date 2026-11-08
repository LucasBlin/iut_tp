import { getStages } from '@/lib/run-workflow';
import { WorkflowLab } from './workflow-lab';

export const dynamic = 'force-dynamic';

export default function Page() {
  return <WorkflowLab stages={getStages()} source={process.env.TP_WORKFLOW_SOURCE ?? 'src/workflow.ts'} />;
}
