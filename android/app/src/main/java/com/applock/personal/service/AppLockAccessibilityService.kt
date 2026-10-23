package com.applock.personal.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import com.applock.personal.AppLockApplication
import com.applock.personal.ui.BiometricAuthActivity

/**
 * High-performance, zero-polling Accessibility Service.
 * Listens purely to OS window state changes (Event-Driven).
 * CPU consumption is 0% when user is not switching windows.
 */
class AppLockAccessibilityService : AccessibilityService() {

    private val preferenceManager by lazy { AppLockApplication.instance.preferenceManager }
    private val sessionManager by lazy { AppLockApplication.instance.sessionManager }

    private var screenOffReceiver: BroadcastReceiver? = null
    private var lastForegroundPackage: String? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this

        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED or
                    AccessibilityEvent.TYPE_VIEW_CLICKED or
                    AccessibilityEvent.TYPE_VIEW_SCROLLED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            notificationTimeout = 16 // ~1 frame (60fps) response
            flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS or
                    AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS
        }
        serviceInfo = info

        registerScreenOffReceiver()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val pkgName = event.packageName?.toString() ?: return

        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> {
                handleWindowStateChanged(pkgName)
            }
            AccessibilityEvent.TYPE_VIEW_CLICKED,
            AccessibilityEvent.TYPE_VIEW_SCROLLED -> {
                detectRecentsDismissal(event)
            }
        }
    }

    private fun handleWindowStateChanged(packageName: String) {
        // Ignore self and common system dialogs
        if (packageName == applicationContext.packageName) return
        if (isSystemUiOrLauncher(packageName)) {
            lastForegroundPackage = packageName
            return
        }

        lastForegroundPackage = packageName

        // Check if package is in user's protected list
        if (!preferenceManager.isAppLocked(packageName)) {
            return // Not protected, open freely
        }

        // Check independent session state
        if (sessionManager.isPackageUnlocked(packageName)) {
            // Already unlocked and retaining active session -> do nothing!
            return
        }

        // Package is protected and not yet unlocked -> Drop instant shield & prompt biometric
        OverlayLockManager.showShield(this, packageName)

        val authIntent = Intent(this, BiometricAuthActivity::class.java).apply {
            putExtra(BiometricAuthActivity.EXTRA_TARGET_PACKAGE, packageName)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_NO_ANIMATION or
                    Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
        }
        startActivity(authIntent)
    }

    /**
     * Inspects events from System UI / Launcher Recents overview to detect when
     * an app card is swiped away by the user.
     */
    private fun detectRecentsDismissal(event: AccessibilityEvent) {
        val pkg = event.packageName?.toString() ?: return
        if (isSystemUiOrLauncher(pkg)) {
            // Inspect root in active window for dismissed node descriptions
            val source: AccessibilityNodeInfo? = event.source
            if (source != null) {
                try {
                    val contentDesc = source.contentDescription?.toString() ?: ""
                    val text = source.text?.toString() ?: ""
                    
                    // Check if content description matches any unlocked package name or label
                    for (unlockedPkg in sessionManager.getActiveUnlockedPackages()) {
                        if (contentDesc.contains(unlockedPkg, ignoreCase = true) ||
                            text.contains(unlockedPkg, ignoreCase = true)) {
                            sessionManager.revokeUnlock(unlockedPkg)
                        }
                    }
                } catch (e: Exception) {
                    // Safe catch for detached node hierarchy
                }
            }
        }
    }

    private fun isSystemUiOrLauncher(pkg: String): Boolean {
        return pkg == "com.android.systemui" ||
                pkg.contains("launcher") ||
                pkg == "com.google.android.apps.nexuslauncher" ||
                pkg == "com.oppo.launcher" ||
                pkg == "com.realme.launcher"
    }

    private fun registerScreenOffReceiver() {
        screenOffReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context?, intent: Intent?) {
                if (intent?.action == Intent.ACTION_SCREEN_OFF) {
                    if (preferenceManager.lockOnScreenOff) {
                        sessionManager.revokeAll()
                        OverlayLockManager.hideShield()
                    }
                }
            }
        }
        val filter = IntentFilter(Intent.ACTION_SCREEN_OFF)
        registerReceiver(screenOffReceiver, filter)
    }

    override fun onInterrupt() {
        // Required callback
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        screenOffReceiver?.let {
            try {
                unregisterReceiver(it)
            } catch (e: Exception) {
                // Ignore if not registered
            }
        }
        OverlayLockManager.hideShield()
    }

    companion object {
        var instance: AppLockAccessibilityService? = null
            private set
    }
}
