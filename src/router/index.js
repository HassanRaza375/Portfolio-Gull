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
  scrollBehavior(to) {
    if (to.hash) {
      return {
        el: to.hash,
        top: 97, // header height
        behavior: "smooth",
      };
    }
  },
});

export default router;
