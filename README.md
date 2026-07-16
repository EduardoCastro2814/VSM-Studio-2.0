# VSM Studio - Value Stream Mapping Profesional

VSM Studio es una herramienta profesional interactiva diseñada para la creación, visualización y análisis de Mapas de Flujo de Valor (Value Stream Mapping) bajo metodologías Lean Manufacturing. Permite calcular de manera automática métricas clave como Lead Time, Process Time (VA), Wait Time (NVA) y Eficiencia del Ciclo del Proceso (PCE).

Esta versión ha sido optimizada para un despliegue profesional integrado con **Supabase** para almacenamiento persistente y autenticación, y **GitHub Pages** para hosting estático.

---

## 🚀 Requisitos Previos

Asegúrate de tener instalado en tu sistema:
- [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
- Un cliente de Git para subir tus cambios a GitHub.

---

## 🛠️ Instalación de Dependencias

Para instalar todas las librerías necesarias del proyecto, navega a la carpeta raíz del proyecto y ejecuta:

```bash
npm install
```

---

## 🔗 Configuración de Supabase

Sigue estos pasos para configurar tu base de datos y almacenamiento en Supabase:

### 1. Crear el Esquema de Base de Datos
1. Dirígete a la consola de [Supabase](https://supabase.com/) y abre tu proyecto.
2. Abre la pestaña **SQL Editor**.
3. Copia el contenido del archivo `schema.sql` (ubicado en la raíz de este repositorio) y ejecútalo para crear las tablas necesarias (`profiles`, `projects`, `vsm_maps`, `assets`, y `vsm_map_versions`), configurar los triggers de actualización automática y la creación de perfiles al registrarse.

### 2. Configurar Políticas de Row Level Security (RLS)
1. En el **SQL Editor**, copia y ejecuta el archivo `supabase/policies.sql`.
2. Esto aplicará aislamiento estricto de datos: cada usuario autenticado solo podrá ver, editar o eliminar sus propios proyectos, mapas, versiones y archivos. Además, habilitará el acceso seguro a los buckets de almacenamiento.

### 3. Crear los Buckets de Almacenamiento (Supabase Storage)
Para guardar las exportaciones de canvas en la nube, crea dos buckets en la sección **Storage** de Supabase:
1. **`vsm-files`**: Configúralo como bucket **público**. Se utilizará para almacenar los archivos JSON editables.
2. **`vsm-exports`**: Configúralo como bucket **público**. Se utilizará para almacenar las exportaciones de imágenes (PNG, JPG) y reportes en formato PDF.

---

## ⚙️ Variables de Entorno

1. En la raíz del proyecto, duplica el archivo `.env.example` y renombralo a `.env`:
   ```bash
   cp .env.example .env
   ```
2. Abre el archivo `.env` e ingresa tus claves de API de Supabase (las puedes encontrar en tu panel de Supabase bajo *Settings > API*):
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anonima-publica
   ```

*Nota: Si dejas el archivo `.env` vacío o no configurado, la aplicación funcionará de manera automática en **Modo Demo Local** utilizando LocalStorage, lo cual es ideal para pruebas rápidas sin conexión.*

---

## 💻 Ejecución Local

Para iniciar el servidor de desarrollo local de Vite, ejecuta:

```bash
npm run dev
```

Abre tu navegador en [http://localhost:5173/](http://localhost:5173/) para usar la aplicación.

---

## 📁 Subir el Proyecto a GitHub

1. Inicializa el repositorio de Git local (si no está hecho aún):
   ```bash
   git init
   ```
2. Agrega los archivos al área de preparación y haz un commit:
   ```bash
   git add .
   git commit -m "Initial commit - VSM Studio con soporte para Supabase y GitHub Pages"
   ```
3. Crea un repositorio vacío en tu cuenta de GitHub con el nombre `VSM-Studio-2.0`.
4. Vincula tu repositorio local con el remoto de GitHub y sube los archivos:
   ```bash
   git remote add origin https://github.com/eduardocastro2814/VSM-Studio-2.0.git
   git branch -M main
   git push -u origin main
   ```

---

## 🖥️ Publicación en GitHub Pages

La aplicación detecta automáticamente si se está compilando en entornos de producción (como los servidores de GitHub Actions) y reescribe la ruta de acceso de los recursos usando la subruta `/VSM-Studio-2.0/`.

Dispones de dos métodos de publicación:

### Método 1: Despliegue Manual con una sola línea de comando (Recomendado)

Una vez que hayas vinculado tu proyecto a tu repositorio remoto de GitHub, puedes compilar y publicar tu aplicación en GitHub Pages ejecutando:

```bash
npm run deploy
```

Este comando ejecutará automáticamente `predeploy` (que compilará tu aplicación en la carpeta `/dist/`) y luego utilizará `gh-pages` para crear la rama `gh-pages` en tu repositorio remoto y subir los archivos de compilación. Tu aplicación estará disponible en segundos en:
`https://eduardocastro2814.github.io/VSM-Studio-2.0/`

### Método 2: Despliegue Automatizado con GitHub Actions (CI/CD)

Crea el archivo `.github/workflows/deploy.yml` en tu repositorio con el siguiente contenido:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Configuración en la interfaz de GitHub para CI/CD:
1. En tu repositorio de GitHub, ve a **Settings > Secrets and variables > Actions** y añade las siguientes dos variables secretas (Secrets) para que la versión compilada tenga acceso a tu Supabase en producción:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Ve a **Settings > Pages**.
3. En la sección **Build and deployment > Source**, asegúrate de que esté configurado como **GitHub Actions** (si usas el flujo de Actions) o **Deploy from a branch** (seleccionando la rama `gh-pages` si usas `npm run deploy`).
4. Tu aplicación estará disponible en: `https://eduardocastro2814.github.io/VSM-Studio-2.0/`

---

## 📋 Lista de Verificación de Producción

Antes de lanzar a producción, comprueba lo siguiente:
- [x] Ejecutar `npm run build` localmente y verificar que compile sin errores de TypeScript o Warnings.
- [x] Verificar que al guardar y exportar a PDF/PNG/JPG se incluyan las puntas de flecha en las líneas de flujo físicos y de información (los marcadores se inyectan automáticamente).
- [x] Confirmar que las llamadas de subida a Supabase Storage buckets funcionen.
- [x] Asegurarse de que el banner de "Modo de Demostración Local" desaparezca once que el archivo `.env` con variables esté presente.
