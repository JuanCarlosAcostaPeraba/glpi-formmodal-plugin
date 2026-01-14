# Guía de Instalación - FormModal Plugin para GLPI

Esta guía te llevará paso a paso por la instalación completa del plugin FormModal en GLPI 11.

## 📋 Requisitos Previos

- GLPI >= 11.0.0
- PHP >= 8.0
- MySQL >= 5.7 / MariaDB >= 10.2
- Acceso a la base de datos MySQL como usuario con permisos suficientes
- Acceso root a MySQL para habilitar el Event Scheduler
- MySQL Workbench (recomendado) o acceso por terminal a MySQL

## 🚀 Instalación Paso a Paso

### Paso 1: Instalar el Plugin en GLPI

1. **Copia el plugin en el directorio de plugins de GLPI:**
   ```bash
   cp -r formmodal /ruta/a/glpi/plugins/
   ```
   
   O si estás en Windows, copia la carpeta `formmodal` a `C:\ruta\a\glpi\plugins\`

2. **Asegúrate de que los permisos sean correctos:**
   ```bash
   chmod -R 755 /ruta/a/glpi/plugins/formmodal
   chown -R www-data:www-data /ruta/a/glpi/plugins/formmodal
   ```
   (Ajusta el usuario/grupo según tu configuración)

3. **Accede a la interfaz web de GLPI:**
   - Ve a **Configuración > Plugins**
   - Busca "Form Modal Messages" en la lista
   - Haz clic en **Instalar**
   - Una vez instalado, haz clic en **Activar**

### Paso 2: Habilitar Event Scheduler en MySQL

El Event Scheduler de MySQL debe estar habilitado para la limpieza automática de registros antiguos.

1. **Conéctate al servidor como root:**
   ```bash
   ssh usuario@servidor
   sudo su
   ```

2. **Conéctate a MySQL como root:**
   ```bash
   mysql -h 127.0.0.1 -u root -p GLPI_DB
   ```
   (Reemplaza `GLPI_DB` con el nombre de tu base de datos GLPI)

3. **Habilita el Event Scheduler:**
   ```sql
   SET GLOBAL event_scheduler = ON;
   ```

4. **Verifica que se habilitó correctamente:**
   ```sql
   SHOW VARIABLES LIKE 'event_scheduler';
   ```
   Debe mostrar `event_scheduler | ON`

5. **Sal de MySQL:**
   ```sql
   exit;
   ```

**⚠️ IMPORTANTE:** Para que el Event Scheduler permanezca habilitado después de reiniciar MySQL, añade esta línea al archivo de configuración de MySQL (`/etc/mysql/my.cnf` o `/etc/my.cnf`):

```ini
[mysqld]
event_scheduler = ON
```

Luego reinicia MySQL:
```bash
sudo systemctl restart mysql
# o
sudo service mysql restart
```

### Paso 3: Instalar el Trigger SQL

El trigger detecta cuando se envía un formulario configurado y crea un registro pendiente para mostrar el modal.

**⚠️ ANTES DE CONTINUAR:**

1. **Edita el archivo `sql/install_trigger_workbench.sql`** y configura:
   - **Form ID**: Busca la línea `IF @formmodal_form_id = 49 THEN` y cambia `49` por el ID de tu formulario
   - **Mensaje**: Busca la línea `SET @formmodal_message = '...'` y personaliza el mensaje que quieres mostrar

   **Ejemplo:**
   ```sql
   -- Para producción, cambiar de 49 a 46:
   IF @formmodal_form_id = 46 THEN
   
   -- Personalizar mensaje:
   SET @formmodal_message = '<p>Su incidencia con ID <strong>[ID_DE_INCIDENCIA]</strong> se ha subido correctamente. Puede llamar al teléfono de guardias y preguntar por el departamento: <strong>[NOMBRE_DEPARTAMENTO]</strong>.</p><p>ID de incidencia: <strong>[ID_DE_INCIDENCIA]</strong></p>';
   ```

2. **Haz backup de la base de datos:**
   ```bash
   mysqldump -u usuario -p GLPI_DB > backup_antes_trigger_$(date +%Y%m%d_%H%M%S).sql
   ```

3. **Instala el trigger desde MySQL Workbench:**
   - Abre MySQL Workbench y conéctate a tu base de datos GLPI
   - Selecciona la base de datos GLPI en el panel izquierdo
   - Abre el archivo `sql/install_trigger_workbench.sql`:
     - Menú: **File > Open SQL Script**
     - O arrastra el archivo a la ventana de consultas
   - **Revisa el contenido** para asegurarte de que el Form ID y el mensaje están configurados correctamente
   - Ejecuta el script completo:
     - Presiona **Ctrl+Shift+Enter** (o **Cmd+Shift+Enter** en Mac)
     - O haz clic en el botón **Execute** (⚡)
   - Verifica que no hay errores en el panel de resultados

4. **Verifica que el trigger se creó correctamente:**
   ```sql
   SHOW TRIGGERS WHERE `Trigger` = 'glpi_plugin_formmodal_after_formanswer_insert';
   ```
   Deberías ver una fila con el nombre del trigger.

### Paso 4: Instalar el Event Scheduler de Limpieza Automática

El evento elimina automáticamente registros de más de 10 días cada día a las 02:00 AM.

1. **Abre MySQL Workbench** (si no está abierto)

2. **Abre el archivo `sql/install_event_workbench.sql`:**
   - Menú: **File > Open SQL Script**
   - O arrastra el archivo a la ventana de consultas

3. **Ejecuta el script completo:**
   - Presiona **Ctrl+Shift+Enter** (o **Cmd+Shift+Enter** en Mac)
   - O haz clic en el botón **Execute** (⚡)
   - Verifica que no hay errores en el panel de resultados

4. **Verifica que el evento se creó correctamente:**
   ```sql
   SHOW EVENTS WHERE Name = 'glpi_plugin_formmodal_cleanup_old_records';
   ```
   Deberías ver una fila con el nombre del evento.

## ✅ Verificación de la Instalación

### Verificar que todo funciona:

1. **Verifica el trigger:**
   ```sql
   SHOW TRIGGERS WHERE `Trigger` = 'glpi_plugin_formmodal_after_formanswer_insert';
   ```

2. **Verifica el evento:**
   ```sql
   SHOW EVENTS WHERE Name = 'glpi_plugin_formmodal_cleanup_old_records';
   ```

3. **Prueba el plugin:**
   - Accede a GLPI como usuario normal
   - Envía el formulario configurado (el que especificaste en el trigger)
   - Deberías ver el modal aparecer inmediatamente después del envío

4. **Verifica que se crean registros:**
   ```sql
   SELECT * FROM glpi_plugin_formmodal_pending ORDER BY created_at DESC LIMIT 5;
   ```

## 🔧 Personalización

### Cambiar el Form ID

Si necesitas cambiar el Form ID después de la instalación:

1. **Desinstala el trigger anterior:**
   ```sql
   DROP TRIGGER IF EXISTS `glpi_plugin_formmodal_after_formanswer_insert`;
   ```

2. **Edita `sql/install_trigger_workbench.sql`** y cambia el Form ID

3. **Vuelve a ejecutar el script de instalación**

### Cambiar el Mensaje

Si necesitas cambiar el mensaje después de la instalación:

1. **Desinstala el trigger anterior:**
   ```sql
   DROP TRIGGER IF EXISTS `glpi_plugin_formmodal_after_formanswer_insert`;
   ```

2. **Edita `sql/install_trigger_workbench.sql`** y cambia el mensaje

3. **Vuelve a ejecutar el script de instalación**

### Cambiar el Intervalo de Limpieza

Si quieres cambiar cuántos días se conservan los registros:

1. **Desinstala el evento anterior:**
   ```sql
   DROP EVENT IF EXISTS `glpi_plugin_formmodal_cleanup_old_records`;
   ```

2. **Edita `sql/install_event_workbench.sql`** y cambia:
   ```sql
   -- De:
   WHERE created_at < DATE_SUB(NOW(), INTERVAL 10 DAY)
   
   -- A (ejemplo: 7 días):
   WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)
   ```

3. **Vuelve a ejecutar el script de instalación**

### Cambiar la Hora de Limpieza

Si quieres cambiar la hora de ejecución del evento:

1. **Desinstala el evento anterior:**
   ```sql
   DROP EVENT IF EXISTS `glpi_plugin_formmodal_cleanup_old_records`;
   ```

2. **Edita `sql/install_event_workbench.sql`** y cambia:
   ```sql
   -- De:
   STARTS CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 2 HOUR
   
   -- A (ejemplo: 03:30 AM):
   STARTS CURRENT_DATE + INTERVAL 1 DAY + INTERVAL 3 HOUR + INTERVAL 30 MINUTE
   ```

3. **Vuelve a ejecutar el script de instalación**

## 🗑️ Desinstalación

Si necesitas desinstalar el plugin:

1. **Desinstala el evento:**
   ```sql
   DROP EVENT IF EXISTS `glpi_plugin_formmodal_cleanup_old_records`;
   ```

2. **Desinstala el trigger:**
   ```sql
   DROP TRIGGER IF EXISTS `glpi_plugin_formmodal_after_formanswer_insert`;
   ```

3. **Desactiva y desinstala el plugin desde GLPI:**
   - Ve a **Configuración > Plugins**
   - Desactiva "Form Modal Messages"
   - Desinstala el plugin

4. **Opcional: Elimina las tablas (si quieres borrar todos los datos):**
   ```sql
   DROP TABLE IF EXISTS glpi_plugin_formmodal_pending;
   DROP TABLE IF EXISTS glpi_plugin_formmodal_configs;
   ```

## 🔍 Solución de Problemas

### El modal no aparece

1. **Verifica que el trigger está instalado:**
   ```sql
   SHOW TRIGGERS WHERE `Trigger` = 'glpi_plugin_formmodal_after_formanswer_insert';
   ```

2. **Verifica que el Form ID es correcto:**
   ```sql
   SELECT forms_forms_id FROM glpi_forms_answerssets ORDER BY id DESC LIMIT 1;
   ```

3. **Verifica que se están creando registros:**
   ```sql
   SELECT * FROM glpi_plugin_formmodal_pending ORDER BY created_at DESC LIMIT 5;
   ```

4. **Verifica que el endpoint funciona:**
   - Abre en el navegador: `https://tu-glpi/plugins/formmodal/ajax/get_pending_modal.php`
   - Debería devolver JSON válido

5. **Abre la consola del navegador (F12)** y busca errores

### El Event Scheduler no funciona

1. **Verifica que está habilitado:**
   ```sql
   SHOW VARIABLES LIKE 'event_scheduler';
   ```

2. **Verifica que el evento existe:**
   ```sql
   SHOW EVENTS WHERE Name = 'glpi_plugin_formmodal_cleanup_old_records';
   ```

3. **Verifica la última ejecución:**
   ```sql
   SELECT * FROM INFORMATION_SCHEMA.EVENTS 
   WHERE EVENT_NAME = 'glpi_plugin_formmodal_cleanup_old_records';
   ```

### Error: "Access denied; you need (at least one of) the SUPER privilege(s)"

Este error aparece cuando intentas habilitar el Event Scheduler sin permisos root. Solución:

1. Conéctate como root (ver Paso 2)
2. O contacta al administrador de la base de datos

## 📚 Documentación Adicional

- **README principal**: [README.md](README.md)
- **Documentación SQL detallada**: [sql/README.md](sql/README.md)
- **Estructura del plugin**: Ver sección "Estructura" en README.md

## 🆘 Soporte

Si tienes problemas con la instalación:

1. Revisa la sección "Solución de Problemas" arriba
2. Verifica los logs de MySQL y GLPI
3. Consulta la documentación en `sql/README.md` para más detalles técnicos
