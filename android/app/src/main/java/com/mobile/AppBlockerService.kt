package com.mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat

class AppBlockerService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var overlayView: View? = null
  private lateinit var windowManager: WindowManager
  private lateinit var usageStatsManager: UsageStatsManager

  private val monitorRunnable = object : Runnable {
    override fun run() {
      monitorForegroundApp()
      handler.postDelayed(this, POLL_INTERVAL_MS)
    }
  }

  override fun onCreate() {
    super.onCreate()
    windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    startForeground(NOTIFICATION_ID, buildNotification())
    handler.post(monitorRunnable)
  }

  override fun onDestroy() {
    handler.removeCallbacks(monitorRunnable)
    removeOverlay()
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun monitorForegroundApp() {
    val packageName = getForegroundPackage() ?: return
    val blockDecision = shouldBlock(packageName)

    if (blockDecision) {
      showOverlay()
    } else {
      removeOverlay()
    }
  }

  private fun shouldBlock(packageName: String): Boolean {
    if (packageName == this.packageName) {
      return false
    }

    val grants = ScreenTimeManager.loadGrantsFromPrefs(this)
    val now = System.currentTimeMillis()
    val activeGrants = grants.filter { it.status == "active" && it.expiresAt > now }

    if (activeGrants.isEmpty()) {
      return true
    }

    val allowAll = activeGrants.any { grant ->
      grant.allowedPackages.isEmpty() && grant.allowedCategories.isEmpty() ||
        grant.allowedCategories.contains("all")
    }
    if (allowAll) {
      return false
    }

    val allowedPackages = activeGrants
      .flatMap { it.allowedPackages }
      .toSet()

    return !allowedPackages.contains(packageName)
  }

  private fun getForegroundPackage(): String? {
    if (!hasUsageStatsPermission()) {
      return null
    }
    val end = System.currentTimeMillis()
    val begin = end - QUERY_WINDOW_MS
    val events = usageStatsManager.queryEvents(begin, end)
    val event = UsageEvents.Event()
    var packageName: String? = null

    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (event.eventType == UsageEvents.Event.ACTIVITY_RESUMED ||
        event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
        packageName = event.packageName
      }
    }
    return packageName
  }

  private fun hasUsageStatsPermission(): Boolean {
    val appOps = getSystemService(Context.APP_OPS_SERVICE) as android.app.AppOpsManager
    val mode = appOps.checkOpNoThrow(
      android.app.AppOpsManager.OPSTR_GET_USAGE_STATS,
      android.os.Process.myUid(),
      packageName
    )
    return mode == android.app.AppOpsManager.MODE_ALLOWED
  }

  private fun showOverlay() {
    if (overlayView != null || !Settings.canDrawOverlays(this)) {
      return
    }

    val layout = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setBackgroundColor(0xCC000000.toInt())
      gravity = Gravity.CENTER
      layoutParams = LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.MATCH_PARENT
      )
    }

    val title = TextView(this).apply {
      text = "Access Locked"
      textSize = 22f
      setTextColor(0xFFFFFFFF.toInt())
      gravity = Gravity.CENTER
    }

    val subtitle = TextView(this).apply {
      text = "Complete a task to unlock!"
      textSize = 16f
      setTextColor(0xFFE0E0E0.toInt())
      gravity = Gravity.CENTER
    }

    layout.addView(title)
    layout.addView(subtitle)

    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
      } else {
        WindowManager.LayoutParams.TYPE_PHONE
      },
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
      PixelFormat.TRANSLUCENT
    ).apply {
      gravity = Gravity.TOP or Gravity.START
    }

    windowManager.addView(layout, params)
    overlayView = layout
  }

  private fun removeOverlay() {
    overlayView?.let {
      windowManager.removeView(it)
      overlayView = null
    }
  }

  private fun buildNotification(): Notification {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        NOTIFICATION_CHANNEL_ID,
        "Screen Time Monitoring",
        NotificationManager.IMPORTANCE_LOW
      )
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.createNotificationChannel(channel)
    }

    return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
      .setContentTitle("FamConomy Screen Time")
      .setContentText("Monitoring app usage for screen time limits.")
      .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
      .setOngoing(true)
      .build()
  }

  companion object {
    private const val POLL_INTERVAL_MS = 1000L
    private const val QUERY_WINDOW_MS = 10000L
    private const val NOTIFICATION_CHANNEL_ID = "famconomy_screen_time"
    private const val NOTIFICATION_ID = 2011
  }
}
