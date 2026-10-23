package com.applock.personal.service

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView

/**
 * Handles the instant overlay shield that drops onto the screen within ~10ms
 * to prevent any screen peeking / content flickering before BiometricPrompt opens.
 */
object OverlayLockManager {

    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var currentShieldedPackage: String? = null

    @Synchronized
    fun showShield(context: Context, packageName: String) {
        if (overlayView != null) {
            currentShieldedPackage = packageName
            return
        }

        try {
            windowManager = context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager
            if (windowManager == null) return

            val layoutParams = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                } else {
                    @Suppress("DEPRECATION")
                    WindowManager.LayoutParams.TYPE_PHONE
                },
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
            ).apply {
                gravity = Gravity.CENTER
            }

            val shieldContainer = FrameLayout(context).apply {
                setBackgroundColor(Color.parseColor("#F50F172A")) // Opaque dark shield
                val label = TextView(context).apply {
                    text = "🔒 قفل تطبيقاتي — جارٍ التحقق من البصمة..."
                    setTextColor(Color.WHITE)
                    textSize = 16f
                    gravity = Gravity.CENTER
                }
                addView(
                    label,
                    FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.WRAP_CONTENT,
                        FrameLayout.LayoutParams.WRAP_CONTENT,
                        Gravity.CENTER
                    )
                )
            }

            windowManager?.addView(shieldContainer, layoutParams)
            overlayView = shieldContainer
            currentShieldedPackage = packageName
        } catch (e: Exception) {
            // WindowManager permission or lifecycle exception
            e.printStackTrace()
        }
    }

    @Synchronized
    fun hideShield() {
        try {
            overlayView?.let { view ->
                windowManager?.removeViewImmediate(view)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            overlayView = null
            currentShieldedPackage = null
        }
    }

    fun isShieldShowing(): Boolean = overlayView != null
}
