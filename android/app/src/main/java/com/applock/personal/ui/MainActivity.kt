package com.applock.personal.ui

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.accessibility.AccessibilityManager
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.applock.personal.AppLockApplication
import com.applock.personal.R
import com.applock.personal.databinding.ActivityMainBinding
import com.applock.personal.service.AppLockAccessibilityService
import com.applock.personal.service.AppLockForegroundService
import com.google.android.material.switchmaterial.SwitchMaterial
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class AppItem(
    val name: String,
    val packageName: String,
    val icon: Drawable?,
    var isLocked: Boolean
)

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val preferenceManager by lazy { AppLockApplication.instance.preferenceManager }
    private val allApps = ArrayList<AppItem>()
    private val filteredApps = ArrayList<AppItem>()
    private lateinit var adapter: AppsAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupRecyclerView()
        setupSearch()
        loadInstalledApps()

        // Ensure foreground service is running
        AppLockForegroundService.start(this)
    }

    override fun onResume() {
        super.onResume()
        checkPermissions()
    }

    private fun setupRecyclerView() {
        adapter = AppsAdapter(filteredApps) { item, isChecked ->
            item.isLocked = isChecked
            preferenceManager.setAppLocked(item.packageName, isChecked)
            updateProtectedCount()
        }
        binding.rvAppsList.layoutManager = LinearLayoutManager(this)
        binding.rvAppsList.adapter = adapter
    }

    private fun setupSearch() {
        binding.etSearchApps.addTextChangedListener(object : TextWatcher {
            override fun afterTextChanged(s: Editable?) {
                filterApps(s?.toString().orEmpty())
            }
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
        })
    }

    private fun filterApps(query: String) {
        filteredApps.clear()
        if (query.isBlank()) {
            filteredApps.addAll(allApps)
        } else {
            val q = query.trim().lowercase()
            for (app in allApps) {
                if (app.name.lowercase().contains(q) || app.packageName.lowercase().contains(q)) {
                    filteredApps.add(app)
                }
            }
        }
        adapter.notifyDataSetChanged()
    }

    private fun loadInstalledApps() {
        lifecycleScope.launch(Dispatchers.IO) {
            val pm = packageManager
            val intent = Intent(Intent.ACTION_MAIN, null).apply {
                addCategory(Intent.CATEGORY_LAUNCHER)
            }
            val resolveInfos = pm.queryIntentActivities(intent, 0)
            val lockedSet = preferenceManager.getLockedPackages()

            val list = resolveInfos.mapNotNull { resolveInfo ->
                val pkg = resolveInfo.activityInfo.packageName
                // Exclude self
                if (pkg == packageName) return@mapNotNull null

                val appName = resolveInfo.loadLabel(pm).toString()
                val icon = try {
                    resolveInfo.loadIcon(pm)
                } catch (e: Exception) {
                    null
                }
                AppItem(
                    name = appName,
                    packageName = pkg,
                    icon = icon,
                    isLocked = lockedSet.contains(pkg)
                )
            }.sortedByDescending { it.isLocked } // Show locked apps at the top

            withContext(Dispatchers.Main) {
                allApps.clear()
                allApps.addAll(list)
                filterApps(binding.etSearchApps.text.toString())
                updateProtectedCount()
            }
        }
    }

    private fun updateProtectedCount() {
        val count = preferenceManager.getLockedPackages().size
        binding.tvProtectedCount.text = getString(R.string.protected_apps_count, count)
    }

    private fun checkPermissions() {
        val hasAccessibility = isAccessibilityServiceEnabled()
        val hasOverlay = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(this)
        } else true
        val hasBattery = isBatteryOptimizationIgnored()

        val allGranted = hasAccessibility && hasOverlay && hasBattery

        if (allGranted) {
            binding.tvProtectionStatus.text = "الحماية نشطة ✓"
            binding.tvProtectionStatus.setTextColor(getColor(R.color.success))
            binding.cardPermissionsWarning.isVisible = false
        } else {
            binding.tvProtectionStatus.text = "الحماية معطلة ✕"
            binding.tvProtectionStatus.setTextColor(getColor(R.color.warning))
            binding.cardPermissionsWarning.isVisible = true

            val missingList = mutableListOf<String>()
            if (!hasAccessibility) missingList.add("• خدمة إمكانية الوصول (Accessibility)")
            if (!hasOverlay) missingList.add("• الظهور فوق التطبيقات (Overlay Shield)")
            if (!hasBattery) missingList.add("• استثناء تحسين البطارية (Realme UI)")

            binding.tvPermissionsDetails.text =
                "مطلوب تفعيل الصلاحيات التالية:\n" + missingList.joinToString("\n") +
                        "\n\nملاحظة خاصة بـ Realme C53 (Android 15): إذا كانت خدمة إمكانية الوصول رمادية، اضغط هنا لفتح صفحة التطبيق ثم (3 نقاط) -> السماح بالإعدادات المقيدة."

            binding.btnFixPermissions.setOnClickListener {
                when {
                    !hasOverlay && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M -> {
                        startActivity(Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")))
                    }
                    !hasAccessibility -> {
                        // Open app details first if user needs to enable restricted settings
                        startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
                    }
                    !hasBattery && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M -> {
                        startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:$packageName")))
                    }
                }
            }
        }
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val am = getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
        val enabledServices = am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
        for (service in enabledServices) {
            if (service.resolveInfo.serviceInfo.packageName == packageName) {
                return true
            }
        }
        return AppLockAccessibilityService.instance != null
    }

    private fun isBatteryOptimizationIgnored(): Boolean {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            return pm.isIgnoringBatteryOptimizations(packageName)
        }
        return true
    }

    class AppsAdapter(
        private val items: List<AppItem>,
        private val onToggle: (AppItem, Boolean) -> Unit
    ) : RecyclerView.Adapter<AppsAdapter.ViewHolder>() {

        class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val ivIcon: ImageView = view.findViewById(R.id.ivAppIcon)
            val tvName: TextView = view.findViewById(R.id.tvAppName)
            val tvPackage: TextView = view.findViewById(R.id.tvPackageName)
            val switchLock: SwitchMaterial = view.findViewById(R.id.switchLock)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context).inflate(R.layout.item_app_lock, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val item = items[position]
            holder.tvName.text = item.name
            holder.tvPackage.text = item.packageName
            if (item.icon != null) {
                holder.ivIcon.setImageDrawable(item.icon)
            } else {
                holder.ivIcon.setImageResource(android.R.drawable.sym_def_app_icon)
            }

            holder.switchLock.setOnCheckedChangeListener(null)
            holder.switchLock.isChecked = item.isLocked
            holder.switchLock.setOnCheckedChangeListener { _, isChecked ->
                onToggle(item, isChecked)
            }
        }

        override fun getItemCount(): Int = items.size
    }
}
