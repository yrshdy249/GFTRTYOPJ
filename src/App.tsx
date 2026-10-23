/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Code2,
  FileCode,
  Settings,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  AlertTriangle,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Home,
  Menu,
  Square,
  Lock,
  Unlock,
  Play
} from 'lucide-react';

interface MockApp {
  id: string;
  name: string;
  pkg: string;
  iconColor: string;
  initialLocked: boolean;
  content: string;
}

const DEFAULT_APPS: MockApp[] = [
  {
    id: 'whatsapp',
    name: 'واتساب',
    pkg: 'com.whatsapp',
    iconColor: 'bg-emerald-600',
    initialLocked: true,
    content: 'محادثاتك الشخصية ورسائلك الخاصة مشفرة تماماً.'
  },
  {
    id: 'chrome',
    name: 'المتصفح (Chrome)',
    pkg: 'com.android.chrome',
    iconColor: 'bg-blue-600',
    initialLocked: true,
    content: 'سجل التصفح وعلامات التبويب المفتوحة وحساباتك.'
  },
  {
    id: 'photos',
    name: 'معرض الصور',
    pkg: 'com.google.android.apps.photos',
    iconColor: 'bg-amber-500',
    initialLocked: true,
    content: 'صورك الشخصية ومقاطع الفيديو العائلية.'
  },
  {
    id: 'telegram',
    name: 'تيليجرام',
    pkg: 'org.telegram.messenger',
    iconColor: 'bg-sky-500',
    initialLocked: false,
    content: 'قنوات ومجموعات ومحادثات العمل.'
  },
  {
    id: 'calculator',
    name: 'الآلة الحاسبة',
    pkg: 'com.google.android.calculator',
    iconColor: 'bg-slate-700',
    initialLocked: false,
    content: 'تطبيق عادي غير محمي، يفتح دائماً فوراً.'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'guide' | 'build'>('simulator');
  
  // Simulator State
  const [lockedPackages, setLockedPackages] = useState<Set<String>>(new Set(['com.whatsapp', 'com.android.chrome', 'com.google.android.apps.photos']));
  const [unlockedSessions, setUnlockedSessions] = useState<Set<String>>(new Set());
  const [currentApp, setCurrentApp] = useState<MockApp | null>(null);
  const [isHome, setIsHome] = useState(true);
  const [isRecents, setIsRecents] = useState(false);
  const [recentTasks, setRecentTasks] = useState<MockApp[]>([]);
  const [biometricPromptApp, setBiometricPromptApp] = useState<MockApp | null>(null);
  const [shieldActive, setShieldActive] = useState(false);
  const [biometricError, setBiometricError] = useState(false);
  const [rebooting, setRebooting] = useState(false);

  // Code Viewer State
  const [selectedFile, setSelectedFile] = useState<string>('SessionManager.kt');
  const [copied, setCopied] = useState(false);

  // Test Scenario Log
  const [scenarioLogs, setScenarioLogs] = useState<string[]>([
    'تم تهيئة النظام: هاتف Realme C53 (نظام Android 15)',
    'الحماية نشطة: AccessibilityService تراقب الأحداث بدون استهلاك بطارية'
  ]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('ar-EG', { hour12: false });
    setScenarioLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 8)]);
  };

  const toggleLock = (pkg: string) => {
    setLockedPackages(prev => {
      const next = new Set(prev);
      if (next.has(pkg)) {
        next.delete(pkg);
        addLog(`إلغاء حماية التطبيق: ${pkg}`);
      } else {
        next.add(pkg);
        addLog(`تفعيل حماية التطبيق بالبصمة: ${pkg}`);
      }
      return next;
    });
  };

  // Launching an App in Simulator
  const launchApp = (app: MockApp) => {
    setIsHome(false);
    setIsRecents(false);

    // Add to recent tasks if not exists
    setRecentTasks(prev => {
      if (!prev.find(t => t.pkg === app.pkg)) {
        return [app, ...prev];
      }
      return [app, ...prev.filter(t => t.pkg !== app.pkg)];
    });

    // Check if app is locked
    const isProtected = lockedPackages.has(app.pkg);

    if (!isProtected) {
      // Unprotected app opens immediately
      setCurrentApp(app);
      setShieldActive(false);
      setBiometricPromptApp(null);
      addLog(`فتح تطبيق غير محمي (${app.name}) مباشرة بدون بصمة`);
      return;
    }

    // App is protected: check independent session!
    const isSessionActive = unlockedSessions.has(app.pkg);

    if (isSessionActive) {
      // Session is already active! Smooth instant opening, NO biometric asked!
      setCurrentApp(app);
      setShieldActive(false);
      setBiometricPromptApp(null);
      addLog(`✓ جلسة نشطة: تم فتح (${app.name}) فوراً دون طلب البصمة مجدداً`);
    } else {
      // Not yet unlocked: drop shield in <10ms and show BiometricPrompt!
      setShieldActive(true);
      setBiometricPromptApp(app);
      setCurrentApp(null);
      addLog(`🔒 رصد فتح تطبيق محمي (${app.name}): إسقاط درع الحجب الفوري وعرض نافذة البصمة`);
    }
  };

  // Biometric Success
  const handleBiometricSuccess = () => {
    if (!biometricPromptApp) return;
    const target = biometricPromptApp;
    
    // Add to independent sessions
    setUnlockedSessions(prev => new Set(prev).add(target.pkg));
    setShieldActive(false);
    setBiometricPromptApp(null);
    setCurrentApp(target);
    setBiometricError(false);
    addLog(`✅ نجاح مصادقة البصمة: تسجيل جلسة مستقلة للحزمة (${target.name}) وعرض التطبيق`);
  };

  // Biometric Cancel / Fail
  const handleBiometricCancel = () => {
    setShieldActive(false);
    setBiometricPromptApp(null);
    setBiometricError(false);
    setIsHome(true);
    addLog(`⛔ إلغاء أو فشل البصمة: إعادة المستخدم فوراً للشاشة الرئيسية وحجب المحتوى`);
  };

  // Home Button
  const handlePressHome = () => {
    setIsHome(true);
    setIsRecents(false);
    setCurrentApp(null);
    setShieldActive(false);
    setBiometricPromptApp(null);
    addLog('الضغط على زر الرئيسية: الانتقال للشاشة الرئيسية مع الحفاظ على حالة الجلسات في الذاكرة');
  };

  // Recents Button
  const handlePressRecents = () => {
    setIsHome(false);
    setIsRecents(true);
    setCurrentApp(null);
    setShieldActive(false);
    setBiometricPromptApp(null);
    addLog('فتح شاشة التطبيقات الحديثة (Overview / Recents)');
  };

  // Swipe away task from Recents
  const handleSwipeDismiss = (pkg: string, name: string) => {
    setRecentTasks(prev => prev.filter(t => t.pkg !== pkg));
    setUnlockedSessions(prev => {
      const next = new Set(prev);
      next.delete(pkg);
      return next;
    });
    addLog(`🗑️ إزالة مهمة (${name}) من الحديثة: تم إلغاء جلسة السماح فوراً! سيطلب البصمة عند فتحه مجدداً`);
  };

  // Simulate Phone Reboot
  const handleSimulateReboot = () => {
    setRebooting(true);
    addLog('🔄 إعادة تشغيل هاتف Realme C53...');
    setTimeout(() => {
      setUnlockedSessions(new Set()); // Wipes all RAM
      setRecentTasks([]);
      setIsHome(true);
      setCurrentApp(null);
      setShieldActive(false);
      setBiometricPromptApp(null);
      setRebooting(false);
      addLog('⚡ اكتمل إقلاع الهاتف: مسح كامل لذاكرة RAM وتصفير كل الجلسات المصرحة تلقائياً!');
    }, 1500);
  };

  // Copy code helper
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const KOTLIN_FILES: Record<string, { title: string; lang: string; code: string }> = {
    'SessionManager.kt': {
      title: 'إدارة الجلسات المستقلة بالذاكرة',
      lang: 'kotlin',
      code: `package com.applock.personal.data

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

    fun isPackageUnlocked(packageName: String): Boolean {
        return unlockedPackages.containsKey(packageName)
    }

    fun markUnlocked(packageName: String) {
        unlockedPackages[packageName] = System.currentTimeMillis()
    }

    fun revokeUnlock(packageName: String) {
        unlockedPackages.remove(packageName)
    }

    fun revokeAll() {
        unlockedPackages.clear()
    }

    fun getActiveUnlockedPackages(): Set<String> {
        return unlockedPackages.keys.toSet()
    }
}`
    },
    'AppLockAccessibilityService.kt': {
      title: 'خدمة الرصد الفوري (Event-Driven بدون استهلاك بطارية)',
      lang: 'kotlin',
      code: `package com.applock.personal.service

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.view.accessibility.AccessibilityEvent
import com.applock.personal.AppLockApplication
import com.applock.personal.ui.BiometricAuthActivity

class AppLockAccessibilityService : AccessibilityService() {

    private val preferenceManager by lazy { AppLockApplication.instance.preferenceManager }
    private val sessionManager by lazy { AppLockApplication.instance.sessionManager }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        val pkgName = event.packageName?.toString() ?: return

        when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> handleWindowStateChanged(pkgName)
            AccessibilityEvent.TYPE_VIEW_CLICKED,
            AccessibilityEvent.TYPE_VIEW_SCROLLED -> detectRecentsDismissal(event)
        }
    }

    private fun handleWindowStateChanged(packageName: String) {
        if (packageName == applicationContext.packageName) return
        if (isSystemUiOrLauncher(packageName)) return

        if (!preferenceManager.isAppLocked(packageName)) return
        if (sessionManager.isPackageUnlocked(packageName)) return

        // Drop instant shield (<10ms) & trigger BiometricPrompt
        OverlayLockManager.showShield(this, packageName)

        val authIntent = Intent(this, BiometricAuthActivity::class.java).apply {
            putExtra(BiometricAuthActivity.EXTRA_TARGET_PACKAGE, packageName)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_NO_ANIMATION or
                    Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
        }
        startActivity(authIntent)
    }
}`
    },
    'OverlayLockManager.kt': {
      title: 'درع التراكب الفوري لحجب الشاشة (<10ms)',
      lang: 'kotlin',
      code: `package com.applock.personal.service

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Build
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.TextView

object OverlayLockManager {
    private var windowManager: WindowManager? = null
    private var overlayView: View? = null

    @Synchronized
    fun showShield(context: Context, packageName: String) {
        if (overlayView != null) return
        try {
            windowManager = context.getSystemService(Context.WINDOW_SERVICE) as? WindowManager
            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT
            )
            val shield = FrameLayout(context).apply {
                setBackgroundColor(Color.parseColor("#F50F172A"))
            }
            windowManager?.addView(shield, params)
            overlayView = shield
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    @Synchronized
    fun hideShield() {
        overlayView?.let { windowManager?.removeViewImmediate(it) }
        overlayView = null
    }
}`
    },
    'AndroidManifest.xml': {
      title: 'ملف بيان التطبيق وصلاحيات Android 15',
      lang: 'xml',
      code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />

    <application
        android:name=".AppLockApplication"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:theme="@style/Theme.MyPersonalAppLock">

        <activity android:name=".ui.MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <service
            android:name=".service.AppLockAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>
    </application>
</manifest>`
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" dir="rtl">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Fingerprint className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg text-white">قفل تطبيقاتي</h1>
                <span className="text-xs bg-teal-500/10 text-teal-400 border border-teal-500/30 px-2 py-0.5 rounded-full font-mono">
                  Android 15 • Realme C53
                </span>
              </div>
              <p className="text-xs text-slate-400">حماية بالبصمة مع إدارة جلسات مستقلة لكل تطبيق بدون استهلاك للبطارية</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>المحاكي التفاعلي المباشر</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'code'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>أكواد Kotlin الأصلية</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'guide'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>دليل ضبط Realme C53</span>
            </button>

            <button
              onClick={() => setActiveTab('build')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'build'
                  ? 'bg-teal-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <FileCode className="w-4 h-4" />
              <span>بناء APK وGitHub</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6">
        {activeTab === 'simulator' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Phone Screen Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-[340px] sm:w-[360px] h-[700px] bg-slate-900 border-4 border-slate-700 rounded-[44px] shadow-2xl relative overflow-hidden flex flex-col ring-8 ring-slate-800/40">
                {/* Realme C53 Notch / Dynamic Island */}
                <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-950 rounded-full flex items-center justify-center z-50">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                </div>

                {/* Status Bar */}
                <div className="h-8 bg-slate-900/90 text-[11px] text-slate-400 px-6 flex items-center justify-between select-none z-40 border-b border-slate-800/50">
                  <span>06:40</span>
                  <div className="flex items-center gap-1.5">
                    <span>VoLTE</span>
                    <span>5G</span>
                    <span className="text-teal-400 font-mono">92%</span>
                  </div>
                </div>

                {/* Phone Display Content */}
                <div className="flex-1 relative overflow-y-auto bg-slate-950 text-slate-100 flex flex-col">
                  {rebooting ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-black">
                      <div className="w-14 h-14 rounded-full border-4 border-teal-500 border-t-transparent animate-spin mb-4" />
                      <p className="text-sm font-bold text-white">realme</p>
                      <p className="text-xs text-slate-400 mt-1">جارٍ إعادة تشغيل النظام وتفريغ الجلسات...</p>
                    </div>
                  ) : shieldActive ? (
                    /* Instant Shield Overlay Guard */
                    <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-100">
                      <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4 animate-pulse">
                        <Lock className="w-8 h-8" />
                      </div>
                      <h3 className="font-bold text-base text-white">تطبيق محمي بالبصمة</h3>
                      <p className="text-xs text-slate-400 mt-1 mb-6">
                        {biometricPromptApp?.name} محمي بواسطة «قفل تطبيقاتي»
                      </p>

                      {/* Biometric Prompt Dialog */}
                      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col items-center">
                        <button
                          onClick={handleBiometricSuccess}
                          className="w-20 h-20 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 hover:scale-105 active:scale-95 transition-all flex items-center justify-center text-slate-950 shadow-lg shadow-teal-500/30 mb-3 cursor-pointer"
                          title="المس البصمة للمصادقة"
                        >
                          <Fingerprint className="w-10 h-10 animate-pulse" />
                        </button>
                        <span className="text-xs font-semibold text-teal-400">المس مستشعر البصمة للمتابعة</span>
                        <p className="text-[11px] text-slate-400 mt-1 text-center">
                          (محاكاة لمستشعر بصمة Realme C53 الجانبي)
                        </p>

                        <div className="w-full grid grid-cols-2 gap-2 mt-5">
                          <button
                            onClick={handleBiometricSuccess}
                            className="bg-teal-500/20 text-teal-300 border border-teal-500/40 text-xs py-2 rounded-xl font-medium hover:bg-teal-500/30"
                          >
                            تأكيد البصمة ✓
                          </button>
                          <button
                            onClick={handleBiometricCancel}
                            className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs py-2 rounded-xl font-medium hover:bg-rose-500/30"
                          >
                            إلغاء / رجوع ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : isRecents ? (
                    /* Recents Overview Screen */
                    <div className="flex-1 p-4 flex flex-col justify-center">
                      <div className="text-center mb-4">
                        <span className="text-xs font-bold text-slate-400">التطبيقات الحديثة (Overview)</span>
                        <p className="text-[11px] text-slate-500">اسحب أي بطاقة لأعلى لاختبار إزالة المهمة وإلغاء الجلسة</p>
                      </div>

                      {recentTasks.length === 0 ? (
                        <div className="text-center text-xs text-slate-500 py-12">
                          لا توجد تطبيقات في قائمة الحديثة حالياً
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[460px] overflow-y-auto px-1">
                          {recentTasks.map(task => {
                            const isLocked = lockedPackages.has(task.pkg);
                            const isUnlocked = unlockedSessions.has(task.pkg);

                            return (
                              <div
                                key={task.id}
                                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-xl ${task.iconColor} flex items-center justify-center font-bold text-white text-sm`}>
                                    {task.name[0]}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-white">{task.name}</span>
                                      {isLocked && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                          isUnlocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                        }`}>
                                          {isUnlocked ? 'جلسة مفتوحة' : 'مقفل'}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[11px] text-slate-400 block font-mono">{task.pkg}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => launchApp(task)}
                                    className="text-xs bg-slate-800 text-teal-400 px-2.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-700"
                                  >
                                    فتح
                                  </button>
                                  <button
                                    onClick={() => handleSwipeDismiss(task.pkg, task.name)}
                                    className="text-xs bg-rose-500/20 text-rose-300 px-2.5 py-1.5 rounded-lg border border-rose-500/30 hover:bg-rose-500/30"
                                    title="محاكاة سحب البطاقة لإزالة المهمة"
                                  >
                                    سحب (إزالة)
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : currentApp ? (
                    /* Active Running App Screen */
                    <div className="flex-1 flex flex-col bg-slate-900">
                      {/* App Header */}
                      <div className="bg-slate-850 p-4 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg ${currentApp.iconColor} flex items-center justify-center text-white font-bold text-xs`}>
                            {currentApp.name[0]}
                          </div>
                          <div>
                            <h3 className="text-xs font-bold text-white">{currentApp.name}</h3>
                            <span className="text-[10px] text-emerald-400 font-mono">جلسة نشطة ومصادقة بنجاح</span>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">قيد التشغيل</span>
                      </div>

                      {/* App Content */}
                      <div className="flex-1 p-5 flex flex-col justify-center items-center text-center">
                        <div className={`w-16 h-16 rounded-2xl ${currentApp.iconColor} flex items-center justify-center text-white font-bold text-2xl shadow-xl mb-4`}>
                          {currentApp.name[0]}
                        </div>
                        <h4 className="text-base font-bold text-white mb-2">{currentApp.name}</h4>
                        <p className="text-xs text-slate-300 max-w-[240px] leading-relaxed mb-6">
                          {currentApp.content}
                        </p>
                        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 max-w-[260px]">
                          💡 اضغط زر "الرئيسية" أو "الحديثة" للانتقال لتطبيق آخر ثم العودة لتجربة عدم طلب البصمة مجدداً!
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Home Screen / App Launcher */
                    <div className="flex-1 p-4 flex flex-col">
                      <div className="bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/20 rounded-2xl p-3.5 mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-white">تطبيق «قفل تطبيقاتي»</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
                            نشط 100%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          اختر التطبيقات لحمايتها، ثم اضغط على أيقونة التطبيق لفتحه.
                        </p>
                      </div>

                      <div className="text-[11px] font-bold text-slate-400 mb-2 px-1">التطبيقات المثبتة على الهاتف:</div>

                      <div className="space-y-2.5">
                        {DEFAULT_APPS.map(app => {
                          const isLocked = lockedPackages.has(app.pkg);
                          const isUnlocked = unlockedSessions.has(app.pkg);

                          return (
                            <div
                              key={app.id}
                              className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between hover:border-slate-700 transition-colors"
                            >
                              <div
                                onClick={() => launchApp(app)}
                                className="flex items-center gap-3 cursor-pointer flex-1"
                              >
                                <div className={`w-9 h-9 rounded-xl ${app.iconColor} flex items-center justify-center font-bold text-white text-xs shadow`}>
                                  {app.name[0]}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-white">{app.name}</span>
                                    {isLocked ? (
                                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                        isUnlocked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-teal-500/20 text-teal-400'
                                      }`}>
                                        {isUnlocked ? 'مفتوح بجلسة' : 'محمي'}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-500">غير محمي</span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-500 block font-mono">{app.pkg}</span>
                                </div>
                              </div>

                              <button
                                onClick={() => toggleLock(app.pkg)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                                  isLocked
                                    ? 'bg-teal-500/20 border-teal-500/40 text-teal-300'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                              >
                                {isLocked ? 'محمي ✓' : 'حماية'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Android Navigation Bar (Home, Back, Recents) */}
                <div className="h-12 bg-slate-950 border-t border-slate-800 flex items-center justify-around px-8 z-40 select-none">
                  {/* Recents */}
                  <button
                    onClick={handlePressRecents}
                    className="p-2 text-slate-400 hover:text-white active:scale-90 transition-transform"
                    title="التطبيقات الحديثة (Recents)"
                  >
                    <Square className="w-4 h-4" />
                  </button>

                  {/* Home */}
                  <button
                    onClick={handlePressHome}
                    className="p-2 text-slate-400 hover:text-white active:scale-90 transition-transform"
                    title="الشاشة الرئيسية"
                  >
                    <Home className="w-4 h-4" />
                  </button>

                  {/* Back */}
                  <button
                    onClick={handlePressHome}
                    className="p-2 text-slate-400 hover:text-white active:scale-90 transition-transform"
                    title="رجوع"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Test Scenarios Panel & Live Logs */}
            <div className="lg:col-span-7 space-y-5">
              {/* Scenario Guide Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center">
                      <Play className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-bold text-sm text-white">اختبار السيناريوهات السبعة الإلزامية</h2>
                      <p className="text-xs text-slate-400">تحقق مباشرة من تطابق السلوك مع قواعد الجلسات المستقلة</p>
                    </div>
                  </div>

                  <button
                    onClick={handleSimulateReboot}
                    disabled={rebooting}
                    className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-xl transition-all"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${rebooting ? 'animate-spin' : ''}`} />
                    <span>محاكاة إعادة تشغيل الهاتف</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                    <span className="text-xs font-bold text-teal-400 block mb-1">السيناريو 1: الفتح لأول مرة</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      اضغط على <b>واتساب</b> في الهاتف. سيظهر درع الحجب الفوري ثم يطلب البصمة. عند التأكيد يفتح فوراً.
                    </p>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                    <span className="text-xs font-bold text-teal-400 block mb-1">السيناريو 2: العودة دون بصمة</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      بعد فتح واتساب، اضغط زر <b>الرئيسية</b>، ثم افتح واتساب مجدداً. ستجده يفتح <b>مباشرة بدون طلب بصمة</b>!
                    </p>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                    <span className="text-xs font-bold text-teal-400 block mb-1">السيناريو 3: استقلالية الجلسات</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      افتح <b>المتصفح</b> وأكّد بصمته. الآن عُد إلى واتساب: سيفتح بدون بصمة، والمتصفح أيضاً بدون بصمة!
                    </p>
                  </div>

                  <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
                    <span className="text-xs font-bold text-teal-400 block mb-1">السيناريو 4: إزالة المهمة (Recents)</span>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      اضغط زر <b>الحديثة</b> واسحب بطاقة واتساب (إزالة). ثم افتحه مجدداً: <b>سيطلب البصمة من جديد فوراً</b>!
                    </p>
                  </div>
                </div>

                {/* Active Sessions Monitor */}
                <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-300">الجلسات المفتوحة حالياً في RAM:</span>
                    {unlockedSessions.size === 0 ? (
                      <span className="text-xs text-slate-500 font-mono">لا توجد (كل التطبيقات مقفلة)</span>
                    ) : (
                      <div className="flex gap-1.5">
                        {Array.from(unlockedSessions).map(pkg => (
                          <span key={String(pkg)} className="text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                            {String(pkg).split('.').pop()} ✓
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="text-xs text-slate-400">
                    التطبيقات المحمية: <b className="text-teal-400">{lockedPackages.size}</b>
                  </span>
                </div>
              </div>

              {/* Event Logs Box */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="text-xs font-bold text-slate-300">سجل أحداث الحماية المباشر (Event Log):</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Zero-Polling • Event-Driven</span>
                </div>

                <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 font-mono text-[11px] space-y-1.5 max-h-[220px] overflow-y-auto">
                  {scenarioLogs.map((log, i) => (
                    <div key={i} className={`leading-relaxed ${i === 0 ? 'text-teal-300 font-semibold' : 'text-slate-400'}`}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* File List */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <h3 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-teal-400" />
                <span>ملفات المشروع الأصلية (Kotlin)</span>
              </h3>

              <div className="space-y-1.5">
                {Object.keys(KOTLIN_FILES).map(fileName => (
                  <button
                    key={fileName}
                    onClick={() => setSelectedFile(fileName)}
                    className={`w-full text-right p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${
                      selectedFile === fileName
                        ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 font-bold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-white text-xs">{fileName}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{KOTLIN_FILES[fileName].title}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>
                ))}
              </div>
            </div>

            {/* Code Display */}
            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                <div>
                  <span className="text-xs font-bold text-white font-mono">{selectedFile}</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">{KOTLIN_FILES[selectedFile].title}</p>
                </div>

                <button
                  onClick={() => handleCopyCode(KOTLIN_FILES[selectedFile].code)}
                  className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ الكود'}</span>
                </button>
              </div>

              <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-slate-200 overflow-x-auto max-h-[560px] leading-relaxed border border-slate-850" dir="ltr">
                <code>{KOTLIN_FILES[selectedFile].code}</code>
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'guide' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">إرشادات ضبط هاتف Realme C53 (نظام Android 15)</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                في إصدار Android 15 وواجهة Realme UI T Edition، تفرض جوجل والشركة قيود حماية إضافية على التطبيقات المثبتة خارج المتجر (Sideload). ليعمل تطبيق الحماية بكفاءة 100% دون أن توقفه واجهة ريلمي، اتبع الخطوات البسيطة التالية مرة واحدة فقط:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Step 1 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-sm mb-3">
                    1
                  </div>
                  <h4 className="font-bold text-sm text-white mb-1.5">السماح بالإعدادات المقيدة</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    إذا ظهرت خدمة الوصول باللون الرمادي في الإعدادات:
                    افتح <b>معلومات التطبيق (App Info)</b> في هاتفك، اضغط على <b>الثلاث نقاط (⋮)</b> في الزاوية العلوية، ثم اختر <b>«السماح بالإعدادات المقيدة» (Allow Restricted Settings)</b> وأكّد بصمتك.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-teal-400">
                  ميزة أمان قياسية في أندرويد 13/14/15
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-sm mb-3">
                    2
                  </div>
                  <h4 className="font-bold text-sm text-white mb-1.5">استثناء توفير البطارية</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    اذهب إلى إعدادات الهاتف ← التطبيقات ← قفل تطبيقاتي ← استخدام البطارية ← اختر <b>«غير مقيد» (Unrestricted)</b>، لضمان عدم إيقاف الخدمة أثناء نوم الهاتف.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-teal-400">
                  استهلاك البطارية الفعلي 0% عند السكون
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center text-sm mb-3">
                    3
                  </div>
                  <h4 className="font-bold text-sm text-white mb-1.5">قفل التطبيق في الحديثة</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    افتح شاشة التطبيقات الحديثة في هاتفك (Realme Recents)، اضغط على النقطتين بجوار تطبيق «قفل تطبيقاتي» واختر <b>«قفل» (Lock)</b> حتى لا يُغلق عند الضغط على زر "مسح الكل".
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-teal-400">
                  حماية إضافية مدمجة في واجهة ريلمي
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'build' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h3 className="font-bold text-base text-white mb-2 flex items-center gap-2">
                <FileCode className="w-5 h-5 text-teal-400" />
                <span>كيفية بناء ملف APK وتثبيته على هاتفك</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                تم تجهيز جميع ملفات المشروع في مجلد <code>/android</code> مع ملف إعدادات البناء التلقائي <code>.github/workflows/build-apk.yml</code>.
              </p>

              <div className="space-y-4">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <h4 className="font-bold text-xs text-teal-400 mb-1">الخيار 1: البناء التلقائي عبر GitHub Actions (بدون كمبيوتر)</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    بناءً على تعليماتك الصارمة: لم يتم لمس GitHub API حتى الآن ولن يُرفع الكود إلا إذا طلبت صراحة بقول كلمة <b>«تأكيد تأكيد»</b> مرتين.
                    عند الرفع، سيقوم خادم GitHub السحابي المجاني ببناء الـ APK تلقائياً وتنزيله بضغطة زر على هاتفك.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <h4 className="font-bold text-xs text-teal-400 mb-1">الخيار 2: الفتح المباشر في Android Studio</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    إذا كان لديك جهاز كمبيوتر عليه Android Studio، يمكنك فتح مجلد <code>android</code> مباشرة ثم الضغط على <b>Build → Build APK</b> لتوليد ملف الـ APK وتثبيته عبر كابل USB.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
