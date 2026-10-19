import { FiMoon, FiSun } from 'react-icons/fi';
import Item from './Item';
import type { Theme } from '../../modules/theme/theme.state';

// テーマの切り替えボタン（見た目だけを担当。state は親から受け取る）
interface Props {
  theme: Theme;
  onToggle: () => void;
}

export default function ThemeToggle({ theme, onToggle }: Props) {
  const isDark = theme === 'dark';

  return (
    <Item
      label={isDark ? 'ライトモード' : 'ダークモード'}
      icon={isDark ? FiSun : FiMoon}
      onClick={onToggle}
    />
  );
}
