import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'
import './assets/style.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

const auth = useAuthStore()
auth.init().then(() => app.mount('#app'))

// PWA 서비스워커 등록
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
}
