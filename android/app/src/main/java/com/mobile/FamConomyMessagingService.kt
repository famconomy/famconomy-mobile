package com.mobile

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class FamConomyMessagingService : FirebaseMessagingService() {
  override fun onNewToken(token: String) {
    TokenStorage.cacheToken(applicationContext, token)
  }

  override fun onMessageReceived(message: RemoteMessage) {
    val title = message.notification?.title ?: message.data["title"] ?: "FamConomy"
    val body = message.notification?.body ?: message.data["body"] ?: ""
    val type = message.data["type"] ?: ""

    val payload = mutableMapOf<String, Any?>(
      "title" to title,
      "body" to body
    )
    if (type.isNotEmpty()) {
      payload["type"] = type
    }
    if (message.data.isNotEmpty()) {
      payload["data"] = message.data
    }

    PushNotificationModule.emitReceived(payload)
    showNotification(title, body, payload)
  }

  private fun showNotification(title: String, body: String, payload: Map<String, Any?>) {
    createNotificationChannel()
    val intent = Intent(this, MainActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      payload.forEach { (key, value) ->
        if (value is String) {
          putExtra(key, value)
        }
      }
    }

    val pendingIntent = PendingIntent.getActivity(
      this,
      0,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(body)
      .setSmallIcon(android.R.drawable.ic_dialog_info)
      .setAutoCancel(true)
      .setContentIntent(pendingIntent)
      .build()

    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    manager.notify(NOTIFICATION_ID, notification)
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channel = NotificationChannel(
        CHANNEL_ID,
        "General",
        NotificationManager.IMPORTANCE_DEFAULT
      )
      val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      manager.createNotificationChannel(channel)
    }
  }

  companion object {
    private const val CHANNEL_ID = "default"
    private const val NOTIFICATION_ID = 3011
  }
}
