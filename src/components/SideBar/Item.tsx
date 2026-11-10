import type { IconType } from 'react-icons';

interface ItemProps {
  label: string;
  // 左端のアイコン：設計図（FiSearch など）を渡すと Item が組み立てる
  icon?: IconType;
  onClick?: () => void;
  onIconClick?: (event: React.MouseEvent) => void;
  isActive?: boolean;
  // 左端の差し込み口：組み立て済みの要素（<NoteIcon … /> など）を渡すと、icon の代わりに出す
  leadingItem?: React.ReactElement;
  trailingItem?: React.ReactElement;
}

export default function Item({
  label,
  onClick = () => {},
  onIconClick = () => {},
  icon: Icon,
  isActive = false,
  leadingItem,
  trailingItem,
}: ItemProps) {
  return (
    <div
      className={`sidebar-item ${isActive ? 'active' : ''} note-item`}
      onClick={onClick}
      role='button'
      style={{ paddingLeft: '12px' }}
    >
      {leadingItem ? (
        // 組み立て済みの要素は、外枠の span でクリックと大きさを受け持つ
        <span onClick={onIconClick} className='sidebar-item-icon'>
          {leadingItem}
        </span>
      ) : (
        Icon && (
          <Icon onClick={onIconClick} className='sidebar-item-icon' size={18} />
        )
      )}
      <span className='sidebar-item-label'>{label}</span>
      {trailingItem}
    </div>
  );
}
