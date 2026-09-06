package com.khusphus.apk

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings

object CallReliabilityHelper {

    fun requestBatteryOptimizationExemption(context: Context) {
        val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager ?: return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!pm.isIgnoringBatteryOptimizations(context.packageName)) {
                try {
                    context.startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:")
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    })
                } catch (e: Exception) { /* device Settings screen not supported */ }
            }
        }
    }

    fun openAutoStartSettings(context: Context) {
        val manufacturer = Build.MANUFACTURER.lowercase()
        val intents = when {
            manufacturer.contains("xiaomi") -> listOf(
                Intent().setComponent(ComponentName("com.miui.securitycenter",
                    "com.miui.permcenter.autostart.AutoStartManagementActivity")).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
            )
            manufacturer.contains("oppo") || manufacturer.contains("realme") -> listOf(
                Intent().setComponent(ComponentName("com.coloros.safecenter",
                    "com.coloros.safecenter.permission.startup.StartupAppListActivity")).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK },
                Intent().setComponent(ComponentName("com.coloros.safecenter",
                    "com.coloros.safecenter.startupapp.StartupAppListActivity")).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
            )
            manufacturer.contains("vivo") -> listOf(
                Intent().setComponent(ComponentName("com.vivo.permissionmanager",
                    "com.vivo.permissionmanager.activity.BgStartUpManagerActivity")).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
            )
            else -> emptyList()
        }
        for (intent in intents) {
            try {
                context.startActivity(intent)
                return
            } catch (e: Exception) { continue }
        }
    }

    fun runOnboardingReliabilityCheck(context: Context) {
        // Disabled: do not launch background OEM settings or battery optimization prompts automatically
    }
}
