package com.applock.personal.data

import java.util.concurrent.ConcurrentHashMap

/**
 * Manages in-memory unlock sessions for protected applications.
 *
 * Core Guarantees:
 * 1. Independent session for each package: Unlocking App A does NOT unlock App B.
 * 2. Non-interference: Opening App B does NOT lock App A.
 * 3. Persistence across navigation: Switching between home, recents, and other apps
 *    retains the unlocked status until the task is dismissed.
 * 4. Zero time-based expiration: No artificial 30s/1m/5m timers.
 * 5. Instant revocation on task dismissal from Recents.
 * 6. Full purge upon device reboot (RAM wiped).
 */
class SessionManager {

    // Map of packageName -> timestamp of unlock
    private val unlockedPackages = ConcurrentHashMap<String, Long>()

    /**
     * Checks if the package currently has an active unlock session.
     */
    fun isPackageUnlocked(packageName: String): Boolean {
        return unlockedPackages.containsKey(packageName)
    }

    /**
     * Registers successful biometric authentication for a specific package.
     */
    fun markUnlocked(packageName: String) {
        unlockedPackages[packageName] = System.currentTimeMillis()
    }

    /**
     * Revokes unlock state for a single package (e.g. when swiped from Recents).
     */
    fun revokeUnlock(packageName: String) {
        unlockedPackages.remove(packageName)
    }

    /**
     * Revokes all sessions (e.g. upon screen lock or reboot).
     */
    fun revokeAll() {
        unlockedPackages.clear()
    }

    /**
     * Returns an unmodifiable snapshot of currently unlocked packages.
     */
    fun getActiveUnlockedPackages(): Set<String> {
        return unlockedPackages.keys.toSet()
    }
}
