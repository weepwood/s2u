// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import Change from 'components/Change.vue'


const routes = [
    { path: '/', name: 'change', component: Change },
]

const router = createRouter({
    history: createWebHistory('/s2u/'),
    routes
})

export default router
