package com.mobile

import android.app.NotificationManager
import android.content.Context
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.firebase.messaging.FirebaseMessaging

class PushNotificationModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "PushNotificationModule"

  @ReactMethod
  fun getDeviceToken(promise: Promise) {
    val cached = TokenStorage.getCachedToken(reactContext)
    if (cached != null) {
      promise.resolve(cached)
      return
    }

    FirebaseMessaging.getInstance().token
      .addOnSuccessListener { token ->
        TokenStorage.cacheToken(reactContext, token)
        promise.resolve(token)
      }
      .addOnFailureListener { error ->
        promise.reject("TOKEN_ERROR", error.message, error)
      }
  }

  @ReactMethod
  fun getDeviceId(promise: Promise) {
    val deviceId = Settings.Secure.getString(
      reactContext.contentResolver,
      Settings.Secure.ANDROID_ID
    )
    promise.resolve(deviceId ?: "unknown-device")
  }

  @ReactMethod
  fun clearAllNotifications(promise: Promise) {
    val manager = reactContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.cancelAll()
    promise.resolve(true)
  }

  fun emitNotificationReceived(payload: Map<String, Any?>) {
    val map = Arguments.makeNativeMap(payload)
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("onNotificationReceived", map)
  }

  fun emitNotificationOpened(payload: Map<String, Any?>) {
    val map = Arguments.makeNativeMap(payload)
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("onNotificationOpened", map)
  }

  companion object {
    @Volatile
    private var instance: PushNotificationModule? = null

    fun setInstance(module: PushNotificationModule) {
      instance = module
    }

    fun emitReceived(payload: Map<String, Any?>) {
      instance?.emitNotificationReceived(payload)
    }

    fun emitOpened(payload: Map<String, Any?>) {
      instance?.emitNotificationOpened(payload)
    }
  }

  init {
    setInstance(this)
  }
}
