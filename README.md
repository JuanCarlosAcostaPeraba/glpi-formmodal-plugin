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

**📖 Para una guía de instalación completa y detallada, consulta [INSTALL.md](INSTALL.md)**

### Resumen Rápido

1. Copia el plugin en `plugins/formmodal`
2. Ve a **Configuración > Plugins** en GLPI e instala/activa el plugin
3. Habilitar Event Scheduler en MySQL (como root)
4. Instalar el trigger SQL desde MySQL Workbench (configurar Form ID y mensaje antes)
5. Instalar el evento de limpieza automática desde MySQL Workbench

Ver [INSTALL.md](INSTALL.md) para instrucciones detalladas paso a paso.

## 🚀 Uso

### Configuración Hardcodeada

**IMPORTANTE**: Este plugin usa una configuración hardcodeada mediante un trigger SQL. El formulario configurado es el **ID 49** y el mensaje está definido en el trigger SQL.

Para cambiar el form_id o el mensaje, edita `sql/install_trigger.sql` y vuelve a ejecutar la instalación del trigger (ver [sql/README.md](sql/README.md)).

### Flujo de Funcionamiento

1. Usuario envía un formulario con ID 49
2. El trigger SQL detecta la inserción en `glpi_formanswers`
3. Se crea un registro en `glpi_plugin_formmodal_pending`
4. Al cargar la página siguiente, el frontend consulta el endpoint una vez
5. Si hay un modal pendiente, se muestra automáticamente

### Mensajes Especiales

El plugin aplica mensajes especiales según el nombre del departamento:

- Si contiene **"ITT"** o **"IB"**: Muestra mensaje de contacto con centralita
- Si contiene **"Jefe/a de día o Supervisor/a de guardia"**: Muestra mensaje de tramitación por guardia

### Personalización

Para personalizar el mensaje o cambiar el form_id, edita `sql/install_trigger.sql` y vuelve a ejecutar la instalación.

## 💾 Base de datos

El plugin crea dos tablas:

### glpi_plugin_formmodal_configs (legacy, no se usa)

Tabla de configuración (mantenida por compatibilidad, pero no se usa en la implementación actual con trigger SQL).

### glpi_plugin_formmodal_pending

Tabla que almacena los modales pendientes de mostrar:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | int | Identificador único |
| `session_id` | varchar(255) | ID de sesión/usuario (formato: `user_{user_id}`) |
| `form_id` | varchar(255) | ID del formulario |
| `ticket_id` | varchar(255) | ID del ticket creado (opcional) |
| `department_name` | varchar(255) | Nombre del departamento (opcional) |
| `message` | text | Mensaje HTML |
| `created_at` | timestamp | Fecha de creación |
| `shown` | tinyint | Si ya se mostró (1) o no (0) |

### Trigger SQL

El plugin añade un trigger a la tabla `glpi_forms_destinations_answerssets_formdestinationitems` de GLPI:

- **Nombre**: `glpi_plugin_formmodal_after_formanswer_insert`
- **Evento**: AFTER INSERT
- **Acción**: Inserta registro en `glpi_plugin_formmodal_pending` cuando `forms_forms_id = 49`

### Event Scheduler (Limpieza Automática)

El plugin incluye un evento MySQL que elimina automáticamente registros antiguos:

- **Nombre**: `glpi_plugin_formmodal_cleanup_old_records`
- **Frecuencia**: Diario a las 02:00 AM
- **Acción**: Elimina registros de más de 10 días de `glpi_plugin_formmodal_pending`

Ver [sql/README.md](sql/README.md) para más detalles sobre la instalación y configuración.

## 🔍 Solución de problemas

### El modal no aparece

1. **Verifica que el trigger SQL está instalado:**

   ```sql
   SHOW TRIGGERS WHERE `Trigger` = 'glpi_plugin_formmodal_after_formanswer_insert';
   ```

2. **Verifica que el form_id es 49** (o el que configuraste):

   ```sql
   SELECT forms_id FROM glpi_formanswers ORDER BY id DESC LIMIT 1;
   ```

3. **Verifica que se están creando registros:**

   ```sql
   SELECT * FROM glpi_plugin_formmodal_pending ORDER BY created_at DESC LIMIT 5;
   ```

4. **Verifica que el endpoint funciona:**
   - Abre: `https://tu-glpi/plugins/formmodal/ajax/get_pending_modal.php`
   - Debería devolver JSON válido

5. **Abre la consola del navegador (F12)** y busca errores

6. **Limpia caché:**

   ```bash
   php bin/console cache:clear
   ```

### El trigger no se ejecuta

Ver [sql/README.md](sql/README.md) para troubleshooting del trigger SQL.

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
