import clsx from 'clsx';
import { TASK_STATUS, USER_ROLES } from '../../utils/constants';

const Badge = ({ children, variant = 'default', className }) => {
  const variants = {
    default: 'bg-neutral-100 text-neutral-800',
    todo: 'badge-todo',
    in_progress: 'badge-in-progress',
    done: 'badge-done',
    admin: 'badge-admin',
    project_admin: 'badge-project-admin',
    member: 'badge-member',
  };

  return (
    <span className={clsx('badge', variants[variant], className)}>
      {children}
    </span>
  );
};

export default Badge;

