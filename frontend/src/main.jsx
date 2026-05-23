import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import App from './App.jsx'
import { store } from './redux/store'

const storedTheme = localStorage.getItem('crimewatch_theme')
const initialTheme = storedTheme === 'light' || storedTheme === 'dark'
  ? storedTheme
  : (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark')

document.documentElement.dataset.theme = initialTheme
document.documentElement.style.colorScheme = initialTheme

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
