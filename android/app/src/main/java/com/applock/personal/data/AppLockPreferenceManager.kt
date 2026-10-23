package com.applock.personal.data

import android.content.Context
import android.content.SharedPreferences

class AppLockPreferenceManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("app_lock_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_LOCKED_PACKAGES = "locked_packages"
        private const val KEY_LOCK_ON_SCREEN_OFF = "lock_on_screen_off"
        private const val KEY_FIRST_RUN = "first_run"
    }

    fun getLockedPackages(): MutableSet<String> {
        val set = prefs.getStringSet(KEY_LOCKED_PACKAGES, emptySet()) ?: emptySet()
        return HashSet(set)
    }

    fun setAppLocked(packageName: String, isLocked: Boolean) {
        val current = getLockedPackages()
        if (isLocked) {
            current.add(packageName)
        } else {
            current.remove(packageName)
        }
        prefs.edit().putStringSet(KEY_LOCKED_PACKAGES, current).apply()
    }

    fun isAppLocked(packageName: String): Boolean {
        val set = prefs.getStringSet(KEY_LOCKED_PACKAGES, emptySet()) ?: emptySet()
        return set.contains(packageName)
    }

    var lockOnScreenOff: Boolean
        get() = prefs.getBoolean(KEY_LOCK_ON_SCREEN_OFF, true)
        set(value) = prefs.edit().putBoolean(KEY_LOCK_ON_SCREEN_OFF, value).apply()

    var isFirstRun: Boolean
        get() = prefs.getBoolean(KEY_FIRST_RUN, true)
        set(value) = prefs.edit().putBoolean(KEY_FIRST_RUN, value).apply()
}
