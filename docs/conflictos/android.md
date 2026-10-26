# Conflictos encontrados y soluciones — CletaEats Android

> Proyecto: CletaEats — app Android nativa (Kotlin 2.2.10 + AGP 9.1.1 + Jetpack Compose)  
> Paper académico: comparación Kotlin/Compose vs React.js  
> Registrado el: 2026-05-16

---

## Conflicto 0 — Paquete incorrecto en el proyecto inicial

### Error
El proyecto fue generado por Android Studio con el paquete por defecto `com.example.cletaeats` en lugar del paquete especificado en el spec.

### Causa
El wizard de Android Studio asigna `com.example.<appname>` si no se configura manualmente el Package Name antes de crear el proyecto.

### Solución
Eliminar el directorio `com/example/` completo y recrear toda la estructura de paquetes bajo `com/cletaeats/app/`. Actualizar `namespace` y `applicationId` en `app/build.gradle.kts`:

```kotlin
android {
    namespace = "com.cletaeats.app"

    defaultConfig {
        applicationId = "com.cletaeats.app"
    }
}
```

---

## Conflicto 1 — `DeliveryRepository`: reflection inválido para acceder a `orderApiService`

### Error
Crash en runtime al llamar `updateOrderStatus()` en `DeliveryRepository`. El repositorio intentaba acceder a `orderApiService` mediante Java Reflection en lugar de recibirlo como dependencia.

### Causa
Error de diseño: `DeliveryRepository` solo recibía `deliveryApiService` en el constructor, pero `updateOrderStatus()` necesitaba también `orderApiService`. Se intentó obtenerlo por reflection como workaround, lo cual es incorrecto y frágil.

### Intento fallido
```kotlin
// Reflection incorrecto — rompe en runtime
val field = this::class.java.getDeclaredField("orderApiService")
field.isAccessible = true
val service = field.get(this) as OrderApiService
```

### Solución
Agregar `orderApiService` como parámetro explícito del constructor:

```kotlin
// ANTES (roto):
class DeliveryRepository(
    private val deliveryApiService: DeliveryApiService
)

// DESPUÉS (correcto):
class DeliveryRepository(
    private val deliveryApiService: DeliveryApiService,
    private val orderApiService: OrderApiService
) {
    suspend fun updateOrderStatus(orderId: Int, status: String) {
        orderApiService.updateOrderStatus(orderId, UpdateOrderStatusRequest(status))
    }
}
```

---

## Conflicto 2 — `CletaEatsApp`: constructor de `DeliveryRepository` desactualizado

### Error
Error de compilación tras corregir el Conflicto 1. `CletaEatsApp` seguía instanciando `DeliveryRepository` con un solo argumento.

```
Too many arguments for public constructor DeliveryRepository(...)
```

### Causa
`CletaEatsApp` actúa como contenedor de DI manual. Al cambiar la firma del constructor de `DeliveryRepository`, el sitio de instanciación quedó desincronizado.

### Solución
Actualizar la instanciación en `CletaEatsApp.kt`:

```kotlin
// ANTES (roto):
val deliveryRepository by lazy {
    DeliveryRepository(deliveryApiService)
}

// DESPUÉS (correcto):
val deliveryRepository by lazy {
    DeliveryRepository(deliveryApiService, orderApiService)
}
```

---

## Conflicto 3 — Versiones de librerías inexistentes en Maven

### Error
Build fallido al intentar resolver dependencias. Varias versiones en `libs.versions.toml` no existían en Google Maven ni Maven Central.

### Causa
Las versiones fueron estimadas al escribir el spec inicial sin verificarlas contra los repositorios Maven.

### Versiones afectadas

| Librería | Versión escrita | Resultado verificación | Acción tomada |
|---|---|---|---|
| `mapsCompose` | `6.2.1` | No existe — última confirmada: `6.1.0` | Bajado a `6.1.0` |
| `accompanist` | `0.37.0` | No existe — última confirmada: `0.36.0` | Bajado a `0.36.0` |
| `composeBom` | `2025.04.01` | Confirmado en Maven | Sin cambio |
| `playServicesMaps` | `19.0.0` | Confirmado en Maven | Sin cambio |

### Solución
Verificar versiones en [mvnrepository.com](https://mvnrepository.com) y corregir en `gradle/libs.versions.toml`:

```toml
# ANTES (versiones no verificadas):
mapsCompose = "6.2.1"
accompanist = "0.37.0"

# DESPUÉS (versiones confirmadas en Maven):
mapsCompose = "6.1.0"
accompanist = "0.36.0"
```

---

## Conflicto 4 — KSP: versión con formato incorrecto (`1.x` en lugar de `2.x`)

### Error
```
Plugin [id: 'com.google.devtools.ksp', version: '2.2.10-1.0.29', apply: false] was not found
in any of the following sources:
- Gradle Core Plugins (not applicable for this notation)
- Plugin Repositories (could not resolve plugin artifact
  'com.google.devtools.ksp:com.google.devtools.ksp.gradle.plugin:2.2.10-1.0.29')
```

### Causa
El formato de versión KSP cambió entre KSP 1.x y KSP 2.x. Las versiones KSP 1.x usaban el sufijo `1.0.x` (ej: `1.9.23-1.0.19`). KSP 2.x, lanzado junto con Kotlin 2.x, usa el sufijo `2.0.x`. La versión `2.2.10-1.0.29` simplemente no existe en ningún repositorio.

### Intento fallido
Se intentó cambiar de KSP a KAPT como workaround (`kotlin("kapt")`), lo cual generó el Conflicto 5.

### Solución
Usar KSP con la versión correcta para Kotlin 2.2.10:

```toml
# gradle/libs.versions.toml
[versions]
ksp = "2.2.10-2.0.2"   # Formato correcto: {kotlin-version}-{ksp-api-2.x}

[plugins]
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
```

```kotlin
// build.gradle.kts (raíz)
plugins {
    alias(libs.plugins.ksp) apply false
}

// app/build.gradle.kts
plugins {
    alias(libs.plugins.ksp)
}
dependencies {
    ksp(libs.androidx.room.compiler)
}
```

---

## Conflicto 5 — KAPT incompatible con AGP 9.x built-in Kotlin

### Error
```
An exception occurred applying plugin request [id: 'org.jetbrains.kotlin.kapt']
> Failed to apply plugin 'org.jetbrains.kotlin.kapt'.
   > The 'org.jetbrains.kotlin.kapt' plugin is not compatible with built-in Kotlin support.
     Solution:
       - [Recommended] Migrate this project to built-in Kotlin.
       - Or set the Gradle property 'android.builtInKotlin=false' and 'android.newDsl=false'
         to temporarily bypass this issue.
```

### Causa
AGP 9.x activó "built-in Kotlin" por defecto: el plugin gestiona internamente la compilación Kotlin sin necesitar el plugin externo `org.jetbrains.kotlin.android` ni `org.jetbrains.kotlin.kapt`. El plugin KAPT externo choca con este mecanismo interno.

### Intento fallido
KAPT fue usado como workaround al Conflicto 4 (versión KSP incorrecta), pero resultó en este nuevo conflicto.

### Solución
Volver a KSP con la versión correcta (`2.2.10-2.0.2`, ver Conflicto 4) y eliminar toda referencia a KAPT:

```kotlin
// app/build.gradle.kts

// ANTES (roto con AGP 9.x):
plugins {
    kotlin("kapt")
}
dependencies {
    kapt(libs.androidx.room.compiler)
}

// DESPUÉS (correcto):
plugins {
    alias(libs.plugins.ksp)
}
dependencies {
    ksp(libs.androidx.room.compiler)
}
```

---

## Conflicto 6 — `kotlinOptions` eliminado en AGP 9.x

### Error
```
Script compilation errors:

  Line 67:     kotlinOptions {
               ^ Unresolved reference 'kotlinOptions'.

  Line 68:         jvmTarget = "11"
                   ^ Unresolved reference 'jvmTarget'.
```

### Causa
El bloque `kotlinOptions { jvmTarget = "..." }` pertenecía al plugin `org.jetbrains.kotlin.android`, que en AGP 9.x con built-in Kotlin ya no se aplica manualmente. El DSL fue eliminado junto con el plugin externo.

### Solución
Eliminar `kotlinOptions` del bloque `android {}` y reemplazar con `kotlin { jvmToolchain(N) }` a nivel raíz del script:

```kotlin
// app/build.gradle.kts

// ANTES (roto en AGP 9.x):
android {
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
}

// DESPUÉS (correcto):
android {
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    // kotlinOptions eliminado — AGP 9.x no lo reconoce
}

// Fuera del bloque android {}:
kotlin {
    jvmToolchain(11)   // Reemplazo de kotlinOptions.jvmTarget en AGP 9.x
}
```

---

## Conflicto 7 — KSP registra fuentes generadas en `kotlin.sourceSets` (prohibido en AGP 9.x)

### Error
```
Using kotlin.sourceSets DSL to add Kotlin sources is not allowed with built-in Kotlin.
Kotlin source set 'debug' contains:
  [C:\...\app\build\generated\ksp\debug\kotlin,
   C:\...\app\build\generated\ksp\debug\java]
Solution: Use android.sourceSets DSL instead.
To suppress this error, set android.disallowKotlinSourceSets=false in gradle.properties.
```

### Causa
KSP `2.2.10-2.0.2` todavía registra el código generado (implementaciones de Room DAOs, etc.) mediante `kotlin.sourceSets`, el mecanismo antiguo. AGP 9.x con built-in Kotlin exige que las fuentes generadas se registren vía `android.sourceSets`. Es un bug pendiente de corrección en KSP.

### Solución
Agregar la propiedad de supresión en `gradle.properties`. No es la solución ideal (KSP debería migrar internamente), pero es el workaround oficial documentado por Android:

```properties
# gradle.properties
android.disallowKotlinSourceSets=false
```

> **Nota:** Esta propiedad deberá eliminarse cuando KSP lance una versión que use `android.sourceSets` internamente. Verificar en futuras actualizaciones de KSP.

---

## Resumen ejecutivo

| # | Área | Tipo de error | Solución |
|---|---|---|---|
| 0 | Proyecto | Configuración inicial incorrecta | Migrar paquete `com.example` → `com.cletaeats.app` |
| 1 | Código Kotlin | Bug de diseño (reflection en lugar de DI) | Agregar `orderApiService` al constructor de `DeliveryRepository` |
| 2 | Código Kotlin | DI manual desincronizada | Actualizar instanciación en `CletaEatsApp` |
| 3 | Build | Versiones Maven no verificadas | Confirmar versiones en mvnrepository y corregir `libs.versions.toml` |
| 4 | Build | Formato de versión KSP incorrecto | `2.2.10-1.0.29` → `2.2.10-2.0.2` |
| 5 | Build | KAPT incompatible con AGP 9.x | Eliminar KAPT, usar KSP |
| 6 | Build | DSL `kotlinOptions` eliminado en AGP 9.x | `kotlinOptions` → `kotlin { jvmToolchain(11) }` |
| 7 | Build | KSP usa API de source sets prohibida en AGP 9.x | `android.disallowKotlinSourceSets=false` en gradle.properties |

---

## Patrón raíz

Los conflictos 4–7 comparten la misma causa raíz: **AGP 9.x introdujo "built-in Kotlin"**, un sistema de compilación Kotlin gestionado internamente por AGP que hace incompatibles las integraciones tradicionales (KAPT, `kotlinOptions`, `kotlin.sourceSets`). El ecosistema de herramientas (KSP, Room) aún no ha terminado de adaptarse a esta API a la fecha de este proyecto (mayo 2026).
