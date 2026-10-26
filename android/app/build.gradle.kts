import java.util.Properties

// Lee local.properties para inyectar configuración y secretos como BuildConfig fields
val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) load(file.inputStream())
}

// Busca primero en -P de Gradle (CI) y después en local.properties
fun config(key: String, default: String): String =
    (project.findProperty(key) as String?) ?: localProperties.getProperty(key) ?: default

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    // KSP procesa anotaciones de Room (@Entity, @Dao, @Database)
    // KAPT es incompatible con AGP 9.x built-in Kotlin — KSP 2.x es el reemplazo
    alias(libs.plugins.ksp)
}

android {
    namespace = "com.cletaeats.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.cletaeats.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Maps API Key inyectada en AndroidManifest.xml via manifestPlaceholders
        manifestPlaceholders["MAPS_API_KEY"] = config("MAPS_API_KEY", "YOUR_MAPS_API_KEY_HERE")
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            isDebuggable = true
            // 10.0.2.2 es el localhost de la computadora vista desde el emulador.
            // En un celular físico usá la IP de tu computadora en la red local (API_BASE_URL_DEBUG).
            buildConfigField("String", "API_BASE_URL", "\"${config("API_BASE_URL_DEBUG", "http://10.0.2.2:3000/api/")}\"")
        }
        release {
            // URL del backend desplegado (HTTPS). Definila en local.properties: API_BASE_URL=https://tu-dominio/api/
            buildConfigField("String", "API_BASE_URL", "\"${config("API_BASE_URL", "https://cletaeats.example.com/api/")}\"")
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    buildFeatures {
        compose = true
        buildConfig = true  // Requerido en AGP 9.x para acceder a BuildConfig
    }
}

// AGP 9.x built-in Kotlin: jvmToolchain reemplaza kotlinOptions { jvmTarget }
kotlin {
    jvmToolchain(11)
}

dependencies {
    // Compose BOM — garantiza compatibilidad entre todas las libs de Compose
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    // Material Icons Extended — iconos adicionales (Delivery, Map, etc.)
    implementation(libs.androidx.compose.material.icons.extended)

    // Core Android
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)

    // Navigation Compose — manejo de rutas entre pantallas
    implementation(libs.androidx.navigation.compose)

    // ViewModel + StateFlow (patrón Observer)
    implementation(libs.androidx.lifecycle.viewmodel.compose)

    // Retrofit 2.11.0 + Gson — consumo del backend Express.js
    implementation(libs.retrofit)
    implementation(libs.retrofit.converter.gson)
    implementation(libs.okhttp.logging)

    // Room (base de datos local para offline-first)
    implementation(libs.androidx.room.runtime)
    implementation(libs.androidx.room.ktx)
    ksp(libs.androidx.room.compiler)    // KSP genera implementaciones de DAO

    // WorkManager — sincronización en background cuando vuelve la red
    implementation(libs.androidx.work.runtime.ktx)

    // DataStore Preferences — sesión persistente (reemplaza SharedPreferences)
    implementation(libs.androidx.datastore.preferences)

    // Coroutines — async sin callbacks
    implementation(libs.kotlinx.coroutines.android)

    // Lottie Compose — animaciones en pantallas vacías, carga y error
    implementation(libs.lottie.compose)

    // Google Maps Compose + Fused Location Provider
    implementation(libs.maps.compose)
    implementation(libs.play.services.maps)
    implementation(libs.play.services.location)

    // Coil — carga de imágenes asíncrona (logos restaurantes, combos)
    implementation(libs.coil.compose)

    // Accompanist Permissions — permisos de runtime en Compose (ubicación GPS)
    implementation(libs.accompanist.permissions)

    // Testing
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}
