import ReactDOM from 'react-dom/client';
import { SvgEditor } from './core/SvgEditor';
import './styles/editor.css';

const App = () => {
  return <SvgEditor />;
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
);
