# FormModal Plugin for GLPI

Plugin para GLPI que permite mostrar mensajes personalizados en formato modal después del envío de formularios específicos.

## 📋 Características

- ✅ Mensajes personalizados por formulario
- ✅ Editor de texto enriquecido
- ✅ Activación/Desactivación individual
- ✅ Modal responsive y moderno
- ✅ Fácil configuración

## 🔧 Requisitos

- GLPI >= 11.0.0
- PHP >= 8.0
- MySQL >= 5.7 / MariaDB >= 10.2

## 📦 Instalación

1. Copia el plugin en `plugins/formmodal`
2. Ve a **Configuración > Plugins**
3. Instala y activa "Form Modal Messages"

## 🚀 Uso

### 1. Crear configuración

1. Ve a **Configuración > Plugins > Form Modal Messages** (icono engranaje)
2. Clic en **Añadir nueva configuración**
3. Completa:
   - **Form ID**: ID del formulario (ej: `ticket-form`)
   - **Activo**: Sí
   - **Mensaje**: Tu mensaje con formato HTML
4. Guardar

### 2. Identificar Form ID

Para encontrar el ID del formulario:

1. Abre el formulario en el navegador
2. Presiona F12 (herramientas de desarrollo)
3. Busca la etiqueta `<form>`
4. Anota el valor del atributo `id` o `name`

Ejemplo:

```html
<form id="ticket-form" method="post">
```

El Form ID es: `ticket-form`

### 3. Ejemplo de mensaje

```html
<h3>¡Solicitud Enviada!</h3>
<p><strong>Tu ticket ha sido creado correctamente.</strong></p>
<ul>
    <li>Tiempo de respuesta: 24-48 horas</li>
    <li>Recibirás una notificación por email</li>
</ul>
```

## 💾 Base de datos

El plugin crea una tabla simple:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | Identificador único |
| `form_id` | varchar(255) | ID del formulario |
| `message` | text | Mensaje HTML |
| `is_active` | tinyint | Activo (1) o no (0) |

## 🔍 Solución de problemas

### La tabla no existe

```sql
-- Crear tabla manualmente
CREATE TABLE `glpi_plugin_formmodal_configs` (
    `id` int unsigned NOT NULL AUTO_INCREMENT,
    `form_id` varchar(255) NOT NULL DEFAULT '',
    `message` text,
    `is_active` tinyint NOT NULL DEFAULT 1,
    PRIMARY KEY (`id`),
    KEY `form_id` (`form_id`),
    KEY `is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### El modal no aparece

1. Verifica que la configuración está activa
2. Verifica que el Form ID coincide exactamente
3. Abre la consola del navegador (F12) y busca errores
4. Limpia caché: `php bin/console cache:clear`

## 📁 Estructura

```
formmodal/
├── ajax/              # API endpoints
├── front/             # Interfaz
├── inc/               # Clases PHP
├── locales/           # Traducciones
├── public/            # Assets públicos (GLPI 11)
│   ├── css/           # Estilos
│   └── js/            # JavaScript
└── setup.php          # Configuración
```

## 📄 Licencia

GPLv3+ - Ver archivo LICENSE

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama para tu feature
3. Commit tus cambios
4. Push y crea un Pull Request

## 📝 Changelog

### v2.0.0 (2025-01-XX)

- 🔄 Migración a GLPI 11
- ⬆️ Actualización de requisitos: GLPI >= 11.0.0, PHP >= 8.0
- ✨ Compatible con las nuevas APIs de GLPI 11

### v1.0.0 (2025-12-04)

- ✨ Versión inicial
- ✨ Configuración de mensajes por formulario
- ✨ Editor de texto enriquecido
- ✨ Modal responsive
