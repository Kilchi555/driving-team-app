// middleware/auth.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import { useSupabaseUser } from '#imports' 


export default defineNuxtRouteMiddleware(async (to, from) => {
  const user = useSupabaseUser() // Holt den vom Supabase-Modul verwalteten User

  // Seiten, die IMMER öffentlich sein sollen, auch wenn kein User eingeloggt ist.
  // Diese Liste sollte mit der 'exclude' Liste in nuxt.config.ts übereinstimmen.
  const publicRoutes = ['/', '/login', '/register', '/confirm'];

  // Wenn die aktuelle Route eine öffentliche Route ist, keine Weiterleitung durch diese Middleware.
  if (publicRoutes.includes(to.path)) {
    return;
  }

  // Wenn kein User eingeloggt ist UND die Seite keine öffentliche Route ist, leite um.
  if (!user.value) { // <-- useSupabaseUser gibt ein Ref zurück, daher .value
    console.log('Middleware: No user, redirecting to /login from', to.path);
    return navigateTo('/login');
  }

  // Optional (und empfohlen): Wenn der User eingeloggt ist, aber auf eine Login/Register-Seite zugreifen will,
  // leite ihn zu einer Dashboard-Seite weiter (oder wo immer angemeldete User hingehen sollen).
  if (user.value && (to.path === '/login' || to.path === '/register')) {
    console.log('Middleware: User logged in, redirecting to /dashboard'); // Passe dies an deine Dashboard-Seite an
    return navigateTo('/dashboard'); // <-- ERSETZE '/dashboard' durch deine gewünschte Seite für eingeloggte User
  }
})