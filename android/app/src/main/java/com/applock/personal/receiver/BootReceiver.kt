package com.applock.personal.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.applock.personal.AppLockApplication
import com.applock.personal.service.AppLockForegroundService

/**
 * Responds to device reboot.
 * RAM is completely purged by the OS, guaranteeing all locked apps require
 * fresh biometric authentication upon first launch.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context?, intent: Intent?) {
        if (context == null || intent == null) return

        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            "android.intent.action.QUICKBOOT_POWERON",
            "com.htc.intent.action.QUICKBOOT_POWERON" -> {
                // Ensure all in-memory sessions are pristine
                AppLockApplication.instance.sessionManager.revokeAll()

                // Start persistent foreground service
                AppLockForegroundService.start(context)
            }
        }
    }
}
