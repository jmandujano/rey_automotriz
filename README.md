
# Sistema Rey Automotriz – Gestión Empresarial

Este repositorio contiene la base del **Sistema de Gestión Empresarial Rey Automotriz (SGERA)**, una solución completa para la gestión de repuestos y accesorios automotrices.  Sobre la plantilla TailAdmin se han implementado múltiples módulos para la administración de usuarios, clientes, productos, pedidos, devoluciones, finanzas y reportería.

## Características principales

- Panel de **Dashboard** con métricas clave (ingresos, egresos, pedidos, devoluciones) y gráficos dinámicos.
- Gestión completa de **usuarios**, **roles** y **permisos** con registro y edición de datos personales (DNI, fecha de nacimiento, teléfonos) y filtros por estado.
- Administración de **clientes** con asignación de vendedores y control de visitas.
- Catálogo de **productos** con stock y categorías.
- Módulo de **pedidos** y **devoluciones** con control de estados y visualización de detalle de productos por pedido.
- Sección de **finanzas** para registrar ingresos y egresos.
- **Reportes** de top clientes y vendedores, así como resumen financiero y de pedidos mensuales.
- Notificaciones internas y panel administrativo.

La aplicación está construida con **Next.js 14**, **React 19**, **TypeScript 5**, **Tailwind CSS 4**, **Prisma ORM** sobre **PostgreSQL** y se despliega en **Azure**.  Se mantiene la arquitectura monolítica moderna usando las [API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) de Next.js.

## Instalación y ejecución

1. Asegúrese de tener **Node.js 20.x** y **npm** instalados.
2. Instale las dependencias:
   ```bash
   npm install
   # o
   yarn install
   ```
3. Configure la cadena de conexión a PostgreSQL en un archivo `.env` en la raíz del proyecto:
   ```env
   DATABASE_URL="postgresql://usuario:contraseña@host:puerto/base_de_datos"
   NEXTAUTH_SECRET="una_clave_secreta"
   NEXTAUTH_URL="http://localhost:3000"
   ```
4. Ejecute las migraciones de Prisma y siembra de datos (opcional):
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```
5. Inicie el servidor de desarrollo:
   ```bash
   npm run dev
   # o
   yarn dev
   ```
6. Acceda a la aplicación en [http://localhost:3000](http://localhost:3000).  El inicio de sesión está disponible en la ruta `/signin`.

## Cambios recientes (v1.1 – 15/10/2025)

- Se reemplazó el logotipo de TailAdmin por el de **Rey Automotriz** para modo claro y oscuro.
- El panel de dashboard ahora muestra cuatro métricas: **ingresos**, **egresos**, **pedidos** y **devoluciones**, con números formateados y diferenciados por color.
- Se añadieron los gráficos:
  - Resumen financiero (ingresos/egresos por mes) – línea/área.
  - Pedidos por mes – línea/área.
  - Top 5 clientes por ventas – barra horizontal.
  - Top 5 vendedores por ventas – barra horizontal.
- Se corrigieron errores al crear usuarios y clientes, permitiendo registrar fecha de nacimiento, DNI y teléfonos, y filtrando solo registros **activos** por defecto.
- El módulo de pedidos ahora muestra el detalle de productos (código, descripción, cantidad, precio unitario y subtotal) al editar un pedido.
- Se implementaron restricciones de acceso: los vendedores solo ven sus clientes y pedidos; los administradores ven todos los registros.

---

# TailAdmin Next.js - Free Next.js Tailwind Admin Dashboard Template

TailAdmin es una plantilla gratuita de panel de administración construida sobre **Next.js y Tailwind CSS** que proporciona los componentes básicos de interfaz de usuario utilizados por el proyecto SGERA.

![TailAdmin - Next.js Dashboard Preview](./banner.png)

With TailAdmin Next.js, you get access to all the necessary dashboard UI components, elements, and pages required to build a high-quality and complete dashboard or admin panel. Whether you're building a dashboard or admin panel for a complex web application or a simple website. 

TailAdmin utilizes the powerful features of **Next.js 15** and common features of Next.js such as server-side rendering (SSR), static site generation (SSG), and seamless API route integration. Combined with the advancements of **React 19** and the robustness of **TypeScript**, TailAdmin is the perfect solution to help get your project up and running quickly.

## Overview

TailAdmin provides essential UI components and layouts for building feature-rich, data-driven admin dashboards and control panels. It's built on:

- Next.js 15.x
- React 19
- TypeScript
- Tailwind CSS V4

### Quick Links
- [✨ Visit Website](https://tailadmin.com)
- [📄 Documentation](https://tailadmin.com/docs)
- [⬇️ Download](https://tailadmin.com/download)
- [🖌️ Figma Design File (Community Edition)](https://www.figma.com/community/file/1463141366275764364)
- [⚡ Get PRO Version](https://tailadmin.com/pricing)

### Demos
- [Free Version](https://nextjs-free-demo.tailadmin.com)
- [Pro Version](https://nextjs-demo.tailadmin.com)

### Other Versions
- [HTML Version](https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-template)
- [React Version](https://github.com/TailAdmin/free-react-tailwind-admin-dashboard)
- [Vue.js Version](https://github.com/TailAdmin/vue-tailwind-admin-dashboard)

## Installation

### Prerequisites
To get started with TailAdmin, ensure you have the following prerequisites installed and set up:

- Node.js 18.x or later (recommended to use Node.js 20.x or later)

### Cloning the Repository
Clone the repository using the following command:

```bash
git clone https://github.com/TailAdmin/free-nextjs-admin-dashboard.git
```

> Windows Users: place the repository near the root of your drive if you face issues while cloning.

1. Install dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```
    > Use `--legacy-peer-deps` flag if you face peer-dependency error during installation.

2. Start the development server:
    ```bash
    npm run dev
    # or
    yarn dev
    ```

## Components

TailAdmin is a pre-designed starting point for building a web-based dashboard using Next.js and Tailwind CSS. The template includes:

- Sophisticated and accessible sidebar
- Data visualization components
- Profile management and custom 404 page
- Tables and Charts(Line and Bar)
- Authentication forms and input elements
- Alerts, Dropdowns, Modals, Buttons and more
- Can't forget Dark Mode 🕶️

All components are built with React and styled using Tailwind CSS for easy customization.

## Feature Comparison

### Free Version
- 1 Unique Dashboard
- 30+ dashboard components
- 50+ UI elements
- Basic Figma design files
- Community support

### Pro Version
- 5 Unique Dashboards: Analytics, Ecommerce, Marketing, CRM, Stocks (more coming soon)
- 400+ dashboard components and UI elements
- Complete Figma design file
- Email support

To learn more about pro version features and pricing, visit our [pricing page](https://tailadmin.com/pricing).

## Changelog

### Version 2.0.2 - [March 25, 2025]

- Upgraded to Next v15.2.3 for [CVE-2025-29927](https://nextjs.org/blog/cve-2025-29927) concerns
- Included overrides vectormap for packages to prevent peer dependency errors during installation.
- Migrated from react-flatpickr to flatpickr package for React 19 support

### Version 2.0.1 - [February 27, 2025]

#### Update Overview

- Upgraded to Tailwind CSS v4 for better performance and efficiency.
- Updated class usage to match the latest syntax and features.
- Replaced deprecated class and optimized styles.

#### Next Steps

- Run npm install or yarn install to update dependencies.
- Check for any style changes or compatibility issues.
- Refer to the Tailwind CSS v4 [Migration Guide](https://tailwindcss.com/docs/upgrade-guide) on this release. if needed.
- This update keeps the project up to date with the latest Tailwind improvements. 🚀

### v2.0.0 (February 2025)
A major update focused on Next.js 15 implementation and comprehensive redesign.

#### Major Improvements
- Complete redesign using Next.js 15 App Router and React Server Components
- Enhanced user interface with Next.js-optimized components
- Improved responsiveness and accessibility
- New features including collapsible sidebar, chat screens, and calendar
- Redesigned authentication using Next.js App Router and server actions
- Updated data visualization using ApexCharts for React

#### Breaking Changes

- Migrated from Next.js 14 to Next.js 15
- Chart components now use ApexCharts for React
- Authentication flow updated to use Server Actions and middleware

[Read more](https://tailadmin.com/docs/update-logs/nextjs) on this release.

#### Breaking Changes
- Migrated from Next.js 14 to Next.js 15
- Chart components now use ApexCharts for React
- Authentication flow updated to use Server Actions and middleware

### v1.3.4 (July 01, 2024)
- Fixed JSvectormap rendering issues

### v1.3.3 (June 20, 2024)
- Fixed build error related to Loader component

### v1.3.2 (June 19, 2024)
- Added ClickOutside component for dropdown menus
- Refactored sidebar components
- Updated Jsvectormap package

### v1.3.1 (Feb 12, 2024)
- Fixed layout naming consistency
- Updated styles

### v1.3.0 (Feb 05, 2024)
- Upgraded to Next.js 14
- Added Flatpickr integration
- Improved form elements
- Enhanced multiselect functionality
- Added default layout component

## License

TailAdmin Next.js Free Version is released under the MIT License.

## Support

If you find this project helpful, please consider giving it a star on GitHub. Your support helps us continue developing and maintaining this template.
