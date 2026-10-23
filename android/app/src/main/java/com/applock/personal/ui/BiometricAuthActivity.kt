package com.applock.personal.ui

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.fragment.app.FragmentActivity
import com.applock.personal.AppLockApplication
import com.applock.personal.biometric.BiometricHelper
import com.applock.personal.service.AppLockAccessibilityService
import com.applock.personal.service.OverlayLockManager

class BiometricAuthActivity : FragmentActivity() {

    private var targetPackage: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        targetPackage = intent.getStringExtra(EXTRA_TARGET_PACKAGE)
        if (targetPackage.isNullOrEmpty()) {
            dismissAndGoHome()
            return
        }

        val appLabel = try {
            val appInfo = packageManager.getApplicationInfo(targetPackage!!, 0)
            packageManager.getApplicationLabel(appInfo).toString()
        } catch (e: PackageManager.NameNotFoundException) {
            targetPackage!!
        }

        BiometricHelper.showBiometricPrompt(
            activity = this,
            targetPackageName = targetPackage!!,
            appName = appLabel,
            onSuccess = {
                // Register independent session
                AppLockApplication.instance.sessionManager.markUnlocked(targetPackage!!)
                OverlayLockManager.hideShield()
                finish()
            },
            onFailure = {
                Toast.makeText(this, "البصمة غير متطابقة، حاول مجدداً", Toast.LENGTH_SHORT).show()
            },
            onError = { _, _ ->
                // User cancelled or biometric error -> eject to home screen
                dismissAndGoHome()
            }
        )
    }

    private fun dismissAndGoHome() {
        OverlayLockManager.hideShield()
        val service = AppLockAccessibilityService.instance
        if (service != null) {
            service.performGlobalAction(android.accessibilityservice.AccessibilityService.GLOBAL_ACTION_HOME)
        } else {
            val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(homeIntent)
        }
        finish()
    }

    override fun onBackPressed() {
        super.onBackPressed()
        dismissAndGoHome()
    }

    companion object {
        const val EXTRA_TARGET_PACKAGE = "extra_target_package"
    }
}
