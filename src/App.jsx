import LoginScreen from './components/LoginScreen';
import Messenger from './components/Messenger';
import { useStoredState } from './hooks/useStoredState';

export default function App() {
  const [credentials, setCredentials] = useStoredState('max-chat:credentials', null);

  if (!credentials) return <LoginScreen onLogin={setCredentials} />;

  // key: при смене инстанса Messenger монтируется заново со своей историей
  return <Messenger key={credentials.idInstance} credentials={credentials} onLogout={() => setCredentials(null)} />;
}
