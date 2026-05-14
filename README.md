# Arte y Cultura Encino 2026

App de inscripciones para talleres artísticos.

## Cómo subir a Vercel

### Opción A — Sin instalar nada (recomendada)

1. Ve a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta GitHub
2. Crea un repositorio nuevo en GitHub y sube estos archivos
3. En Vercel haz clic en "Add New Project" → importa ese repositorio
4. Vercel detecta Vite automáticamente → clic en Deploy
5. En ~1 minuto tendrás tu URL pública

### Opción B — Desde terminal

```bash
npm install
npm run build
npx vercel --prod
```

## Contraseña admin

`admin_encino_2026`

## Firebase

Ya está configurado con el proyecto `arte-encino-2026`.
Asegúrate de que en Firestore las reglas permitan lectura/escritura
en modo de prueba (válido 30 días).
