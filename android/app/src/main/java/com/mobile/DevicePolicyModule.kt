package com.mobile

import android.app.Activity
import android.app.AppOpsManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Process
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class DevicePolicyModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val screenTimeManager = ScreenTimeManager(reactContext.applicationContext)

  override fun getName(): String = "DevicePolicyModule"

  init {
    screenTimeManager.onUpdate = { grant ->
      val payload = Arguments.makeNativeMap(screenTimeManager.grantToMap(grant))
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("onScreenTimeUpdate", payload)
    }
  }

  @ReactMethod
  fun requestAuthorization(promise: Promise) {
    try {
      val componentName = ComponentName(reactContext, DevicePolicyReceiver::class.java)
      val intent = Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN).apply {
        putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, componentName)
        putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Enable device admin to manage screen time.")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      setAuthorizationRequested()
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("AUTH_REQUEST_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun isAuthorized(promise: Promise) {
    promise.resolve(isAdminActive())
  }

  @ReactMethod
  fun isDeviceOwner(promise: Promise) {
    val devicePolicyManager =
      reactContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    promise.resolve(devicePolicyManager.isDeviceOwnerApp(reactContext.packageName))
  }

  @ReactMethod
  fun getAuthorizationStatus(promise: Promise) {
    if (isAdminActive()) {
      promise.resolve("authorized")
      return
    }
    val requested = getAuthorizationRequested()
    promise.resolve(if (requested) "denied" else "not_determined")
  }

  @ReactMethod
  fun grantScreenTime(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    try {
      val childUserId = options.getString("childUserId") ?: ""
      val durationMinutes = options.getInt("durationMinutes")
      val allowedPackages = mutableListOf<String>()
      if (options.hasKey("allowedPackages")) {
        val array = options.getArray("allowedPackages")
        if (array != null) {
          for (i in 0 until array.size()) {
            allowedPackages.add(array.getString(i) ?: "")
          }
        }
      }

      val grant = screenTimeManager.grantScreenTime(
        childUserId = childUserId,
        durationMinutes = durationMinutes,
        allowedPackages = allowedPackages,
        allowedCategories = emptyList()
      )

      val remainingMinutes = screenTimeManager
        .getScreenTimeStatus(childUserId)
        .first

      val result = Arguments.createMap().apply {
        putBoolean("success", true)
        putInt("remainingMinutes", remainingMinutes)
        putMap("grant", Arguments.makeNativeMap(screenTimeManager.grantToMap(grant)))
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("GRANT_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun revokeScreenTime(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    try {
      val childUserId = options.getString("childUserId") ?: ""
      val revoked = screenTimeManager.revokeScreenTime(childUserId)
      val result = Arguments.createMap().apply {
        putBoolean("success", true)
        if (revoked != null) {
          putMap("revokedGrant", Arguments.makeNativeMap(screenTimeManager.grantToMap(revoked)))
        } else {
          putNull("revokedGrant")
        }
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("REVOKE_FAILED", error.message, error)
    }
  }

  @ReactMethod
  fun getScreenTimeStatus(options: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    val childUserId = if (options.hasKey("childUserId")) options.getString("childUserId") else null
    val status = screenTimeManager.getScreenTimeStatus(childUserId)
    val activeGrantsArray = Arguments.createArray()
    status.second.forEach { grant ->
      activeGrantsArray.pushMap(Arguments.makeNativeMap(screenTimeManager.grantToMap(grant)))
    }
    val result = Arguments.createMap().apply {
      putInt("remainingMinutes", status.first)
      putArray("activeGrants", activeGrantsArray)
    }
    promise.resolve(result)
  }

  @ReactMethod
  fun syncGrantFromServer(grantData: com.facebook.react.bridge.ReadableMap, promise: Promise) {
    try {
      val map = grantData.toHashMap()
      val grant = screenTimeManager.syncGrantFromServer(map)
      val result = Arguments.createMap().apply {
        putBoolean("success", true)
        putMap("grant", Arguments.makeNativeMap(screenTimeManager.grantToMap(grant)))
      }
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("SYNC_FAILED", error.message, error)
    }
  }

  private fun isAdminActive(): Boolean {
    val devicePolicyManager =
      reactContext.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
    val componentName = ComponentName(reactContext, DevicePolicyReceiver::class.java)
    return devicePolicyManager.isAdminActive(componentName)
  }

  private fun setAuthorizationRequested() {
    reactContext.getSharedPreferences(PREFS_NAME, Activity.MODE_PRIVATE)
      .edit()
      .putBoolean(PREFS_KEY_REQUESTED, true)
      .apply()
  }

  private fun getAuthorizationRequested(): Boolean {
    return reactContext.getSharedPreferences(PREFS_NAME, Activity.MODE_PRIVATE)
      .getBoolean(PREFS_KEY_REQUESTED, false)
  }

  @ReactMethod
  fun hasUsageStatsPermission(promise: Promise) {
    try {
      val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
      val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        appOps.unsafeCheckOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          reactContext.packageName
        )
      } else {
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          Process.myUid(),
          reactContext.packageName
        )
      }
      promise.resolve(mode == AppOpsManager.MODE_ALLOWED)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun hasOverlayPermission(promise: Promise) {
    promise.resolve(Settings.canDrawOverlays(reactContext))
  }

  @ReactMethod
  fun openUsageStatsSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("SETTINGS_ERROR", e.message, e)
    }
  }

  @ReactMethod
  fun openOverlaySettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      reactContext.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("SETTINGS_ERROR", e.message, e)
    }
  }

  companion object {
    private const val PREFS_NAME = "famconomy_device_admin"
    private const val PREFS_KEY_REQUESTED = "device_admin_requested"
  }
}
