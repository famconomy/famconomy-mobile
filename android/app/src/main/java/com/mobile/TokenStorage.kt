package com.mobile

import android.content.Context

object TokenStorage {
  private const val PREFS_NAME = "famconomy_push"
  private const val KEY_TOKEN = "fcm_token"

  fun cacheToken(context: Context, token: String) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .edit()
      .putString(KEY_TOKEN, token)
      .apply()
  }

  fun getCachedToken(context: Context): String? {
    return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(KEY_TOKEN, null)
  }
}
