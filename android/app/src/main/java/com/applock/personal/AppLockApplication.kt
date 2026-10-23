package com.applock.personal

import android.app.Application
import com.applock.personal.data.AppLockPreferenceManager
import com.applock.personal.data.SessionManager

class AppLockApplication : Application() {

    lateinit var preferenceManager: AppLockPreferenceManager
        private set

    lateinit var sessionManager: SessionManager
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this
        preferenceManager = AppLockPreferenceManager(this)
        sessionManager = SessionManager()
    }

    companion object {
        lateinit var instance: AppLockApplication
            private set
    }
}
