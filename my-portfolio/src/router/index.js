import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'

// Pages (we'll create these next)
import Home from '../pages/index.vue'
import About from '../pages/About.vue'
import Projects from '../pages/Projects.vue'
import Contact from '../pages/Contact.vue'

const routes = [
    {
        path: '/',
        component: DefaultLayout,
        children: [
            { path: '', name: 'Home', component: Home },
            { path: 'about', name: 'About', component: About },
            { path: 'projects', name: 'Projects', component: Projects },
            { path: 'contact', name: 'Contact', component: Contact },
        ],
    },
]
const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router