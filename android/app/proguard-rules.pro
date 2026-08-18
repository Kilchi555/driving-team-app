# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Keep line numbers for readable crash reports (Sentry/Play Vitals), but hide
# the real source file name in the obfuscated release build.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# --- Capacitor (bridge + plugins are invoked via reflection) ---
-keep class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
}
-keepattributes *Annotation*
-keepattributes Signature

# --- WebView JS bridge ---
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# --- Firebase Cloud Messaging (push notifications) ---
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**
