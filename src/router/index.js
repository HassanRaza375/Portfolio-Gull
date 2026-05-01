import { createRouter, createWebHistory } from "vue-router";
import DefaultLayout from "../layouts/DefaultLayout.vue";

// Pages (we'll create these next)
import Home from "../pages/index.vue";
import About from "../pages/About.vue";
import Projects from "../pages/Projects.vue";
import Contact from "../pages/Contact.vue";

const routes = [
  {
    path: "/",
    component: DefaultLayout,
    children: [
      { path: "", name: "Home", component: Home },
      { path: "about", name: "About", component: About },
      { path: "projects/:id", name: "Projects", component: Projects },
      { path: "contact", name: "Contact", component: Contact },
    ],
  },
];
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 1. Back / forward navigation
    if (savedPosition) {
      return savedPosition
    }

    // 2. Hash navigation
    if (to.hash) {
      return {
        el: to.hash,
        top: 97,
        behavior: "smooth",
      }
    }

    // 3. Default → scroll to top
    return {
      top: 0,
    }
  }
});

export default router;
