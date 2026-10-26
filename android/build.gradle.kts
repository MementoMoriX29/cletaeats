// Top-level build file — opciones comunes a todos los subproyectos/módulos
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.compose) apply false
    // KSP requerido por AGP 9.x (built-in Kotlin es incompatible con KAPT)
    alias(libs.plugins.ksp) apply false
}
