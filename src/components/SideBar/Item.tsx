import type { IconType } from 'react-icons';

interface ItemProps {
  label: string;
  icon: IconType;
  onClick?: () => void;
  onIconClick?: (event: React.MouseEvent) => void;
  isActive?: boolean;
  trailingItem?: React.ReactElement;
}

export default function Item({
  label,
  onClick = () => {},
  onIconClick = () => {},
  icon: Icon,
  isActive = false,
  trailingItem,
}: ItemProps) {
  return (
    <div
      className={`sidebar-item ${isActive ? 'active' : ''} note-item`}
      onClick={onClick}
      role='button'
      style={{ paddingLeft: '12px' }}
    >
      <Icon onClick={onIconClick} className='sidebar-item-icon' size={18} />
      <span className='sidebar-item-label'>{label}</span>
      {trailingItem}
    </div>
  );
}
