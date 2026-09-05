import Milestones from '../../components/project/Milestones.jsx';
import { useProject } from './ProjectLayout.jsx';

export default function ProjectMilestones() {
  const { project, myRole } = useProject();
  return <Milestones project={project} myRole={myRole} />;
}
