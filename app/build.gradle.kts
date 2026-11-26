plugins {
    id("com.android.application")
}

android {
    namespace = "com.kinetic.flexrush"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.kinetic.flexrush"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    lint { abortOnError = false }
}
