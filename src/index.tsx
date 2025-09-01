import ReactDOM from 'react-dom/client';
import { SvgEditor } from './core/SvgEditor';
import { SafeAreaProvider } from './components/SafeAreaComponents';
import './styles/editor.css';
import './styles/safe-area.css';

const App = () => {
  return (
    <SafeAreaProvider enableAutoStyles={true} debugMode={false}>
      <SvgEditor />
    </SafeAreaProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
