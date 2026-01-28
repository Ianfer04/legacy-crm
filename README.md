# LegacyCRM - Refactorización de UX/UI

Este proyecto mejora el módulo "Registrar Cliente" de una aplicación Legacy, aplicando principios de Diseño Centrado en el Usuario (DCU) para corregir problemas graves de usabilidad.

A continuación se detallan las 3 mejoras principales implementadas:

---

### 1. Aplicación de Agrupamiento (Chunking)
**Principio:** Ley de Miller & Reducción de Carga Cognitiva.

* **El Problema:** El formulario original mostraba todos los campos (más de 10) en una sola pantalla larga, causando saturación mental al usuario.
* **La Mejora:**
    * Se dividió el proceso en **3 pasos lógicos**: Identificación, Contacto y Finalización.
    * Se añadió una **barra de progreso visual** para mantener al usuario informado sobre su avance.
* **Resultado:** Facilita el escaneo de información y reduce la sensación de agobio.

### 2. Flexibilidad en Campos de Entrada
**Principio:** Ley de Postel ("Sé liberal en lo que aceptas").

* **El Problema:** El sistema era rígido, rechazando nombres con "Ñ" o tildes, y exigiendo un formato de teléfono exacto, lo que generaba errores frustrantes.
* **La Mejora:**
    * **Validación Permisiva:** Ahora se acepta el ingreso de teléfonos con espacios, guiones o paréntesis. El sistema se encarga de limpiarlos internamente (sanitización) en lugar de culpar al usuario.
    * **Soporte extendido:** Se eliminaron las restricciones de caracteres para soportar nombres reales en español.
* **Resultado:** Una interacción más fluida y menos propensa a errores de validación técnica.

### 3. Jerarquía Visual y Ley de Fitts
**Principio:** Ley de Fitts & Prevención de Errores.

* **El Problema:** El botón "Guardar" estaba escondido y era pequeño (difícil de alcanzar), mientras que el botón "Cancelar" era rojo y muy llamativo, provocando clics accidentales que borraban todo.
* **La Mejora:**
    * **Botón Héroe:** El botón de acción principal ("Guardar Cliente") ahora es grande, de color verde y está ubicado al final del flujo, maximizando la facilidad de clic.
    * **Protección contra errores:** El botón "Cancelar" se convirtió en un enlace de texto discreto, reduciendo la probabilidad de que el usuario lo presione por error.
* **Resultado:** Mayor velocidad operativa y drástica reducción de errores fatales (pérdida de datos).

---

**Nota:** El resto de la aplicación (Dashboard, Reportes, etc.) mantiene intencionalmente la "Mala UX" original para fines demostrativos de contraste.