import Messages from '../../components/project/Messages.jsx';
import { useProject } from './ProjectLayout.jsx';

export default function ProjectMessages() {
  const { project } = useProject();
  return <Messages project={project} />;
}
