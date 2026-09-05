import Files from '../../components/project/Files.jsx';
import { useProject } from './ProjectLayout.jsx';

export default function ProjectFiles() {
  const { project, myRole } = useProject();
  return <Files project={project} myRole={myRole} />;
}
