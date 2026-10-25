import Item from './Item';
import NoteList from '../NoteList';
import UserItem from './UserItem';
import { FiPlus, FiSearch, FiTrash2 } from 'react-icons/fi';
import { useNoteStore } from '../../modules/notes/notes.state';
import { noteRepository } from '../../modules/notes/note.repository';
import { useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { themeAtom } from '../../modules/theme/theme.state';
import ThemeToggle from './ThemeToggle';

interface Props {
  onSearchClick?: () => void;
  onTrashClick?: () => void;
}

export default function SideBar({ onSearchClick, onTrashClick }: Props) {
  const noteStore = useNoteStore(); 
  const navigate = useNavigate();
  const [theme, setTheme] = useAtom(themeAtom);

  const createNote = async () => {
    try {
      const newNote = await noteRepository.create({});
      noteStore.set([newNote]); 
      navigate(`/notes/${newNote.id}`);
    } catch(error) {
      console.error(error);
      alert("ノートの作成に失敗しました。");
    } 
  }

  const toggleTheme = () => {
    setTheme((prev) => prev === "light" ? "dark" : "light");
  }

  return (
    <>
      <aside className='sidebar'>
        <div>
          <div>
            <UserItem />
            <Item
              label='検索'
              icon={FiSearch}
              onClick={onSearchClick}
            />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
          <div className='sidebar-spacer'>
            <NoteList />
            <Item label='ノートを作成' icon={FiPlus} onClick={createNote} />
            <Item label='ゴミ箱' icon={FiTrash2} onClick={onTrashClick} />
          </div>
        </div>
      </aside>
      <div className='sidebar-placeholder'></div>
    </>
  );
}
