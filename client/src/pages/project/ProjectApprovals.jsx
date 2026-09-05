import Approvals from '../../components/project/Approvals.jsx';
import { useProject } from './ProjectLayout.jsx';

export default function ProjectApprovals() {
  const { project, myRole, refreshProject } = useProject();
  return <Approvals project={project} myRole={myRole} onChanged={refreshProject} />;
}
