import Tasks from '../../components/project/Tasks.jsx';
import { useProject } from './ProjectLayout.jsx';

export default function ProjectTasks() {
  const { project, members, myRole, refreshProject } = useProject();
  return <Tasks project={project} members={members} myRole={myRole} onChanged={refreshProject} />;
}
