# Instalación del Trigger SQL

## ⚠️ ADVERTENCIA

Esta solución es **invasiva** ya que modifica la base de datos de GLPI añadiendo un trigger a la tabla `glpi_forms_destinations_answerssets_formdestinationitems`.

**IMPORTANTE:**

- Hacer backup de la base de datos antes de instalar
- El trigger está hardcodeado para el formulario con ID **49** (preproducción)
- **Para producción**: Cambiar a form_id **46** (ver sección Personalización)
- El mensaje del modal está hardcodeado en el trigger SQL
- **GLPI 11**: El trigger se ejecuta cuando se crea la relación entre un answer set y un Ticket

**¿Por qué esta tabla?** El ticket se crea DESPUÉS del answer set, por lo que el trigger se ejecuta cuando se crea la relación, asegurando que el `ticket_id` ya existe.

## Instalación

1. **Hacer backup de la base de datos:**

   ```bash
   mysqldump -u usuario -p nombre_base_datos > backup_antes_trigger.sql
   ```

2. **Verificar que las tablas existen:**

   ```sql
   SHOW TABLES LIKE 'glpi_forms_answerssets';
   SHOW TABLES LIKE 'glpi_forms_destinations_answerssets_formdestinationitems';
   ```

3. **Verificar estructura de las tablas (opcional, para debugging):**

   ```sql
   DESCRIBE glpi_forms_answerssets;
   DESCRIBE glpi_forms_destinations_answerssets_formdestinationitems;
   ```

4. **Instalar el trigger:**

   **Opción A: Desde MySQL Workbench (Recomendado si no tienes acceso por terminal)**
   1. Abre MySQL Workbench y conéctate a tu base de datos GLPI
   2. Selecciona la base de datos GLPI en el panel izquierdo
   3. Abre el archivo `sql/install_trigger_workbench.sql` en MySQL Workbench:
      - Menú: **File > Open SQL Script**
      - O arrastra el archivo a la ventana de consultas
   4. Ejecuta el script completo:
      - Presiona **Ctrl+Shift+Enter** (o **Cmd+Shift+Enter** en Mac)
      - O haz clic en el botón **Execute** (⚡)
   5. Verifica que no hay errores en el panel de resultados

   **Opción B: Desde terminal (si tienes acceso)**

   ```bash
   mysql -u usuario -p nombre_base_datos < sql/install_trigger.sql
   ```

   **Opción C: Copiar y pegar manualmente**
   - Abre `sql/install_trigger.sql` en un editor de texto
   - Copia todo el contenido
   - Pégalo en MySQL Workbench en una nueva consulta
   - Ejecuta la consulta

5. **Verificar que el trigger se creó correctamente:**

   En MySQL Workbench, ejecuta esta consulta:

   ```sql
   SHOW TRIGGERS WHERE `Trigger` = 'glpi_plugin_formmodal_after_formanswer_insert';
   ```

   Deberías ver una fila con el nombre del trigger. Si no aparece, revisa los errores en el panel de resultados.

## Desinstalación

**Desde MySQL Workbench:**

1. Abre MySQL Workbench y conéctate a tu base de datos
2. Selecciona la base de datos GLPI
3. Ejecuta esta consulta:

   ```sql
   DROP TRIGGER IF EXISTS `glpi_plugin_formmodal_after_formanswer_insert`;
   ```

**Desde terminal:**

```bash
mysql -u usuario -p nombre_base_datos < sql/uninstall_trigger.sql
```

## Personalización

### Cambiar el Form ID

El trigger está configurado para el formulario **49** (preproducción).

**Para cambiar a producción (form_id 46):**

Edita `sql/install_trigger.sql` (o `sql/install_trigger_workbench.sql`) y cambia:

```sql
-- De:
IF @formmodal_form_id = 49 THEN

-- A:
IF @formmodal_form_id = 46 THEN
```

**Para soportar múltiples formularios (producción y preproducción):**

```sql
IF @formmodal_form_id IN (46, 49) THEN  -- Producción y preproducción
```

**Nota**: En GLPI 11, el campo es `forms_forms_id`, no `forms_id`.

Luego vuelve a ejecutar el script de instalación (primero desinstala el trigger anterior).

### Cambiar el mensaje

El mensaje está hardcodeado en el trigger SQL. Para cambiarlo, edita la línea en `sql/install_trigger.sql`:

```sql
SET @formmodal_message = '<p>Tu mensaje personalizado aquí...</p>';
```

Luego vuelve a ejecutar el script de instalación.

## Estructura de las tablas en GLPI 11

### glpi_forms_answerssets

Tabla principal que almacena las respuestas de formularios:

- `id`: ID de la respuesta del formulario
- `forms_forms_id`: ID del formulario (usado para filtrar) - **IMPORTANTE**: Es `forms_forms_id`, no `forms_id`
- `users_id`: ID del usuario que envió el formulario
- `name`: Nombre/título de la respuesta (usado para extraer department_name)
- `date_creation`: Fecha de creación
- `answers`: JSON con las respuestas

### glpi_forms_destinations_answerssets_formdestinationitems

Tabla que relaciona las respuestas con los items creados (tickets):

- `id`: ID de la relación
- `forms_answerssets_id`: ID de la respuesta
- `itemtype`: Tipo de item relacionado (ej: 'Ticket')
- `items_id`: ID del item relacionado (ej: ID del ticket)

**El trigger se ejecuta en esta tabla** cuando se inserta una relación con un Ticket. Esto asegura que el ticket ya existe cuando se crea el registro en `glpi_plugin_formmodal_pending`.

## Troubleshooting

### El trigger no se ejecuta

1. Verifica que el trigger existe:

   ```sql
   SHOW TRIGGERS WHERE `Trigger` = 'glpi_plugin_formmodal_after_formanswer_insert';
   ```

2. Verifica que el forms_forms_id es 49 (preproducción) o el que configuraste:

   ```sql
   SELECT forms_forms_id FROM glpi_forms_answerssets ORDER BY id DESC LIMIT 1;
   ```

3. Verifica que se están creando registros en `glpi_plugin_formmodal_pending`:

   ```sql
   SELECT * FROM glpi_plugin_formmodal_pending ORDER BY created_at DESC LIMIT 5;
   ```

### El modal no aparece

1. Verifica que el plugin está activado
2. Abre la consola del navegador (F12) y busca errores
3. Verifica que el endpoint funciona:

   ```
   https://tu-glpi/plugins/formmodal/ajax/get_pending_modal.php
   ```

   Debería devolver JSON con `{"success":true,"has_pending":false}` o `{"success":true,"has_pending":true,...}`

4. Verifica que el usuario actual coincide con el que envió el formulario

---

# Instalación del Event Scheduler (Limpieza Automática)

## 📋 Descripción

El plugin incluye un **Event Scheduler de MySQL** que elimina automáticamente los registros de más de 10 días de la tabla `glpi_plugin_formmodal_pending` cada día a las **02:00 AM**.

Esto mantiene la base de datos limpia sin necesidad de intervención manual, ya que estos datos son meramente informativos y no necesitan conservarse más de 10 días.

## ⚠️ Requisitos

**IMPORTANTE**: El Event Scheduler de MySQL debe estar habilitado para que funcione.

### Verificar si está habilitado

Ejecuta esta consulta en MySQL Workbench:

```sql
SHOW VARIABLES LIKE 'event_scheduler';
```

Si el valor es `OFF`, necesitas habilitarlo. Tienes dos opciones:

### Opción 1: Usar usuario root (Recomendado si tienes acceso)

Conéctate a MySQL como usuario `root` y ejecuta:

```sql
SET GLOBAL event_scheduler = ON;
```

**Nota**: Para que el cambio persista después de reiniciar MySQL, añade esta línea al archivo de configuración de MySQL (`my.cnf` o `my.ini`):

```ini
[mysqld]
event_scheduler = ON
```

### Opción 2: Usar script PHP con Cron (Alternativa)

Si no tienes permisos SUPER ni acceso root, puedes usar el script PHP alternativo que se ejecuta vía cron del sistema. Ver [cron/README.md](../cron/README.md) para más detalles.

## Instalación

1. **Verificar que el Event Scheduler está habilitado** (ver sección Requisitos arriba)

2. **Instalar el evento:**

   **Opción A: Desde MySQL Workbench (Recomendado)**

   1. Abre MySQL Workbench y conéctate a tu base de datos GLPI
   2. Selecciona la base de datos GLPI en el panel izquierdo
   3. Abre el archivo `sql/install_event_workbench.sql` en MySQL Workbench:
      - Menú: **File > Open SQL Script**
      - O arrastra el archivo a la ventana de consultas
   4. Ejecuta el script completo:
      - Presiona **Ctrl+Shift+Enter** (o **Cmd+Shift+Enter** en Mac)
      - O haz clic en el botón **Execute** (⚡)
   5. Verifica que no hay errores en el panel de resultados

   **Opción B: Desde terminal**

   ```bash
   mysql -u usuario -p nombre_base_datos < sql/install_event.sql
   ```

3. **Verificar que el evento se creó correctamente:**

   En MySQL Workbench, ejecuta esta consulta:

   ```sql
   SHOW EVENTS WHERE Name = 'glpi_plugin_formmodal_cleanup_old_records';
   ```

   Deberías ver una fila con el nombre del evento. Si no aparece, revisa los errores en el panel de resultados.

## Desinstalación

**Desde MySQL Workbench:**

1. Abre MySQL Workbench y conéctate a tu base de datos
2. Selecciona la base de datos GLPI
3. Ejecuta esta consulta:

   ```sql
   DROP EVENT IF EXISTS `glpi_plugin_formmodal_cleanup_old_records`;
   ```

**Desde terminal:**

```bash
mysql -u usuario -p nombre_base_datos < sql/uninstall_event.sql
```

## Personalización

### Cambiar el intervalo de días

Por defecto, el evento elimina registros de más de **10 días**. Para cambiarlo, edita `sql/install_event.sql` (o `sql/install_event_workbench.sql`) y modifica:

```sql
-- De:
WHERE created_at < DATE_SUB(NOW(), INTERVAL 10 DAY);

-- A (ejemplo: 7 días):
WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
```

Luego vuelve a ejecutar el script de instalación (primero desinstala el evento anterior).

### Cambiar la hora de ejecución

Por defecto, el evento se ejecuta a las **02:00 AM**. Para cambiarlo, edita `sql/install_event.sql` y modifica:

```sql
-- De:
STARTS CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 2 HOUR

-- A (ejemplo: 03:30 AM):
STARTS CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 3 HOUR + INTERVAL 30 MINUTE
```

Luego vuelve a ejecutar el script de instalación.

## Verificación Manual

Para verificar manualmente que el evento funciona, puedes ejecutar la consulta de limpieza manualmente:

```sql
-- Ver cuántos registros se eliminarían (sin eliminar realmente)
SELECT COUNT(*) as registros_a_eliminar
FROM glpi_plugin_formmodal_pending 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 10 DAY);

-- Ejecutar la limpieza manualmente (si quieres probar)
DELETE FROM glpi_plugin_formmodal_pending 
WHERE created_at < DATE_SUB(NOW(), INTERVAL 10 DAY);
```

## Alternativa: Script PHP con Cron

Si no puedes habilitar el Event Scheduler (no tienes permisos SUPER ni acceso root), puedes usar el script PHP alternativo que se ejecuta vía cron del sistema operativo.

**Ventajas:**
- No requiere permisos SUPER en MySQL
- Funciona en cualquier sistema operativo
- Más fácil de depurar y mantener

**Ver documentación completa:** [cron/README.md](../cron/README.md)

## Troubleshooting

### El evento no se ejecuta

1. Verifica que el Event Scheduler está habilitado:

   ```sql
   SHOW VARIABLES LIKE 'event_scheduler';
   ```

   Si está `OFF`, habilítalo como usuario root (ver sección Requisitos).

2. Verifica que el evento existe y está habilitado:

   ```sql
   SHOW EVENTS WHERE Name = 'glpi_plugin_formmodal_cleanup_old_records';
   ```

   Verifica que la columna `Status` sea `ENABLED`.

3. Verifica la última ejecución:

   ```sql
   SELECT * FROM INFORMATION_SCHEMA.EVENTS 
   WHERE EVENT_NAME = 'glpi_plugin_formmodal_cleanup_old_records';
   ```

   Revisa `LAST_EXECUTED` para ver cuándo se ejecutó por última vez.

### Los registros no se eliminan

1. Verifica que hay registros antiguos:

   ```sql
   SELECT COUNT(*) FROM glpi_plugin_formmodal_pending 
   WHERE created_at < DATE_SUB(NOW(), INTERVAL 10 DAY);
   ```

2. Verifica los permisos del usuario de MySQL. El usuario necesita permisos `EVENT` en la base de datos.

3. Revisa los logs de MySQL para ver si hay errores relacionados con el evento.
