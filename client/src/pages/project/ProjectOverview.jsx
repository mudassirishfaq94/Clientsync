import Overview from '../../components/project/Overview.jsx';
import { useProject } from './ProjectLayout.jsx';

export default function ProjectOverview() {
  const { project, members, myRole, reload, onProjectChange } = useProject();
  return (
    <Overview
      project={project}
      members={members}
      myRole={myRole}
      reload={reload}
      onProjectChange={onProjectChange}
    />
  );
}
