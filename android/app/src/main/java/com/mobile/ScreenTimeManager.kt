package com.mobile

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.text.ParseException
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import kotlin.math.max
import kotlin.math.min

data class ScreenTimeGrant(
  val grantId: String,
  val childUserId: String,
  val familyId: String,
  val grantedMinutes: Int,
  val grantedAt: Long,
  val expiresAt: Long,
  var status: String,
  var revokedAt: Long?,
  var allowedPackages: List<String>,
  var allowedCategories: List<String>,
  val grantedByUserId: String,
  val sourceTaskId: String?,
  var usedMinutesOverride: Int?
)

class ScreenTimeManager(private val context: Context) {
  private val prefs: SharedPreferences =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
  private val handler = Handler(Looper.getMainLooper())
  private val expiryRunnable = Runnable { expireGrantsIfNeeded() }

  var onUpdate: ((ScreenTimeGrant) -> Unit)? = null

  fun grantScreenTime(
    childUserId: String,
    durationMinutes: Int,
    allowedPackages: List<String>?,
    allowedCategories: List<String>?
  ): ScreenTimeGrant {
    if (childUserId.isBlank()) {
      throw IllegalArgumentException("Child user ID is required.")
    }
    if (durationMinutes <= 0) {
      throw IllegalArgumentException("Duration must be greater than zero.")
    }

    val now = System.currentTimeMillis()
    val expiresAt = now + durationMinutes * 60L * 1000L
    val grant = ScreenTimeGrant(
      grantId = UUID.randomUUID().toString(),
      childUserId = childUserId,
      familyId = "",
      grantedMinutes = durationMinutes,
      grantedAt = now,
      expiresAt = expiresAt,
      status = "active",
      revokedAt = null,
      allowedPackages = allowedPackages ?: emptyList(),
      allowedCategories = allowedCategories ?: emptyList(),
      grantedByUserId = "local",
      sourceTaskId = null,
      usedMinutesOverride = null
    )

    val grants = loadGrants().toMutableList().apply {
      removeAll { it.childUserId == childUserId }
      add(grant)
    }
    saveGrants(grants)

    applyGrantSettings()
    scheduleExpiryTimer()
    onUpdate?.invoke(grant)
    return grant
  }

  fun revokeScreenTime(childUserId: String): ScreenTimeGrant? {
    if (childUserId.isBlank()) {
      throw IllegalArgumentException("Child user ID is required.")
    }

    val now = System.currentTimeMillis()
    var revokedGrant: ScreenTimeGrant? = null
    val grants = loadGrants().map { grant ->
      if (grant.childUserId == childUserId) {
        val updated = grant.copy(
          status = "revoked",
          revokedAt = now,
          usedMinutesOverride = usedMinutes(grant, now)
        )
        revokedGrant = updated
        updated
      } else {
        grant
      }
    }.filter { it.childUserId != childUserId }

    saveGrants(grants)
    applyGrantSettings()
    scheduleExpiryTimer()
    revokedGrant?.let { onUpdate?.invoke(it) }
    return revokedGrant
  }

  fun getScreenTimeStatus(childUserId: String?): Pair<Int, List<ScreenTimeGrant>> {
    expireGrantsIfNeeded()
    val now = System.currentTimeMillis()
    val activeGrants = loadGrants().filter { grant ->
      grant.status == "active" && grant.expiresAt > now &&
        (childUserId == null || grant.childUserId == childUserId)
    }

    val remaining = activeGrants
      .map { remainingMinutes(it, now) }
      .maxOrNull() ?: 0

    return Pair(remaining, activeGrants)
  }

  fun syncGrantFromServer(grantData: Map<String, Any?>): ScreenTimeGrant {
    val grantId = grantData["grantId"] as? String
      ?: throw IllegalArgumentException("grantId is required.")
    val childUserId = grantData["childUserId"] as? String
      ?: throw IllegalArgumentException("childUserId is required.")
    val familyId = grantData["familyId"] as? String
      ?: throw IllegalArgumentException("familyId is required.")
    val grantedMinutes = intValue(grantData["grantedMinutes"])
    if (grantedMinutes <= 0) {
      throw IllegalArgumentException("grantedMinutes must be greater than zero.")
    }

    val grantedAt = dateMillis(grantData["grantedAt"])
      ?: throw IllegalArgumentException("grantedAt is required.")
    val expiresAt = dateMillis(grantData["expiresAt"])
      ?: throw IllegalArgumentException("expiresAt is required.")

    val status = grantData["status"] as? String ?: "active"
    val revokedAt = dateMillis(grantData["revokedAt"])
    val allowedPackages = (grantData["allowedAppBundleIds"] as? List<*>)
      ?.mapNotNull { it as? String }
      ?: (grantData["allowedPackages"] as? List<*>)?.mapNotNull { it as? String }
      ?: emptyList()
    val allowedCategories = (grantData["allowedCategories"] as? List<*>)
      ?.mapNotNull { it as? String } ?: emptyList()
    val grantedByUserId = grantData["grantedByUserId"] as? String ?: "server"
    val sourceTaskId = grantData["sourceTaskId"] as? String
    val usedMinutesOverride = intValue(grantData["usedMinutes"])

    var grant = ScreenTimeGrant(
      grantId = grantId,
      childUserId = childUserId,
      familyId = familyId,
      grantedMinutes = grantedMinutes,
      grantedAt = grantedAt,
      expiresAt = expiresAt,
      status = status,
      revokedAt = revokedAt,
      allowedPackages = allowedPackages,
      allowedCategories = allowedCategories,
      grantedByUserId = grantedByUserId,
      sourceTaskId = sourceTaskId,
      usedMinutesOverride = if (usedMinutesOverride > 0) usedMinutesOverride else null
    )

    val now = System.currentTimeMillis()
    if (grant.status == "active" && grant.expiresAt <= now) {
      grant = grant.copy(
        status = "expired",
        usedMinutesOverride = usedMinutes(grant, now)
      )
    }

    val grants = loadGrants().toMutableList().apply {
      removeAll { it.grantId == grantId }
      add(grant)
    }
    saveGrants(grants)

    applyGrantSettings()
    scheduleExpiryTimer()
    onUpdate?.invoke(grant)
    return grant
  }

  fun grantToMap(grant: ScreenTimeGrant): Map<String, Any?> {
    val now = System.currentTimeMillis()
    val usedMinutes = usedMinutes(grant, now)
    val remainingMinutes = remainingMinutes(grant, now)
    val payload = mutableMapOf<String, Any?>(
      "grantId" to grant.grantId,
      "childUserId" to grant.childUserId,
      "familyId" to grant.familyId,
      "grantedMinutes" to grant.grantedMinutes,
      "usedMinutes" to usedMinutes,
      "remainingMinutes" to remainingMinutes,
      "status" to grant.status,
      "grantedAt" to isoString(grant.grantedAt),
      "expiresAt" to isoString(grant.expiresAt),
      "grantedByUserId" to grant.grantedByUserId
    )

    if (grant.revokedAt != null) {
      payload["revokedAt"] = isoString(grant.revokedAt!!)
    }
    if (grant.sourceTaskId != null) {
      payload["sourceTaskId"] = grant.sourceTaskId
    }
    if (grant.allowedPackages.isNotEmpty()) {
      payload["allowedAppBundleIds"] = grant.allowedPackages
    }
    if (grant.allowedCategories.isNotEmpty()) {
      payload["allowedCategories"] = grant.allowedCategories
    }
    return payload
  }

  private fun applyGrantSettings() {
    val now = System.currentTimeMillis()
    val activeGrants = loadGrants().filter { grant ->
      grant.status == "active" && grant.expiresAt > now
    }

    if (activeGrants.isEmpty()) {
      startBlockerService()
      return
    }

    val allowAll = activeGrants.any { grant ->
      grant.allowedPackages.isEmpty() && grant.allowedCategories.isEmpty() ||
        grant.allowedCategories.contains("all")
    }

    if (allowAll) {
      stopBlockerService()
      return
    }

    startBlockerService()
  }

  private fun startBlockerService() {
    val intent = Intent(context, AppBlockerService::class.java)
    ContextCompat.startForegroundService(context, intent)
  }

  private fun stopBlockerService() {
    context.stopService(Intent(context, AppBlockerService::class.java))
  }

  private fun scheduleExpiryTimer() {
    handler.removeCallbacks(expiryRunnable)
    val now = System.currentTimeMillis()
    val nextExpiry = loadGrants()
      .filter { it.status == "active" }
      .map { it.expiresAt }
      .minOrNull()
    if (nextExpiry != null) {
      val delay = max(1000L, nextExpiry - now)
      handler.postDelayed(expiryRunnable, delay)
    }
  }

  private fun expireGrantsIfNeeded() {
    val now = System.currentTimeMillis()
    val expired = mutableListOf<ScreenTimeGrant>()
    val grants = loadGrants().map { grant ->
      if (grant.status == "active" && grant.expiresAt <= now) {
        val updated = grant.copy(
          status = "expired",
          usedMinutesOverride = usedMinutes(grant, now)
        )
        expired.add(updated)
        updated
      } else {
        grant
      }
    }
    if (expired.isNotEmpty()) {
      saveGrants(grants)
      applyGrantSettings()
      expired.forEach { onUpdate?.invoke(it) }
    }
    scheduleExpiryTimer()
  }

  private fun usedMinutes(grant: ScreenTimeGrant, now: Long): Int {
    grant.usedMinutesOverride?.let {
      return min(grant.grantedMinutes, max(0, it))
    }
    val elapsedMinutes = ((now - grant.grantedAt) / 60000L).toInt()
    return min(grant.grantedMinutes, max(0, elapsedMinutes))
  }

  private fun remainingMinutes(grant: ScreenTimeGrant, now: Long): Int {
    if (grant.status != "active" || now >= grant.expiresAt) {
      return 0
    }
    return max(0, grant.grantedMinutes - usedMinutes(grant, now))
  }

  private fun loadGrants(): List<ScreenTimeGrant> = loadGrantsFromPrefs(prefs)

  private fun saveGrants(grants: List<ScreenTimeGrant>) {
    val array = JSONArray()
    grants.forEach { grant ->
      array.put(grantToJson(grant))
    }
    prefs.edit().putString(PREFS_KEY, array.toString()).apply()
  }

  private fun grantToJson(grant: ScreenTimeGrant): JSONObject {
    val obj = JSONObject()
    obj.put("grantId", grant.grantId)
    obj.put("childUserId", grant.childUserId)
    obj.put("familyId", grant.familyId)
    obj.put("grantedMinutes", grant.grantedMinutes)
    obj.put("grantedAt", grant.grantedAt)
    obj.put("expiresAt", grant.expiresAt)
    obj.put("status", grant.status)
    if (grant.revokedAt != null) {
      obj.put("revokedAt", grant.revokedAt)
    }
    obj.put("allowedPackages", JSONArray(grant.allowedPackages))
    obj.put("allowedCategories", JSONArray(grant.allowedCategories))
    obj.put("grantedByUserId", grant.grantedByUserId)
    if (grant.sourceTaskId != null) {
      obj.put("sourceTaskId", grant.sourceTaskId)
    }
    if (grant.usedMinutesOverride != null) {
      obj.put("usedMinutesOverride", grant.usedMinutesOverride)
    }
    return obj
  }

  private fun intValue(raw: Any?): Int {
    return when (raw) {
      is Number -> raw.toInt()
      is String -> raw.toIntOrNull() ?: 0
      else -> 0
    }
  }

  private fun dateMillis(raw: Any?): Long? {
    return when (raw) {
      is Number -> raw.toLong()
      is String -> parseIsoMillis(raw)
      is Date -> raw.time
      else -> null
    }
  }

  private fun isoString(timestamp: Long): String {
    return ISO_FORMAT.format(Date(timestamp))
  }

  private fun parseIsoMillis(value: String): Long? {
    return try {
      ISO_FORMAT.parse(value)?.time
    } catch (_: ParseException) {
      null
    }
  }

  companion object {
    private const val PREFS_NAME = "famconomy_screen_time"
    private const val PREFS_KEY = "famconomy_screen_time_grants_v1"
    private val ISO_FORMAT = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
      timeZone = TimeZone.getTimeZone("UTC")
    }

    fun loadGrantsFromPrefs(context: Context): List<ScreenTimeGrant> {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      return loadGrantsFromPrefs(prefs)
    }

    private fun loadGrantsFromPrefs(prefs: SharedPreferences): List<ScreenTimeGrant> {
      val data = prefs.getString(PREFS_KEY, "[]") ?: "[]"
      val array = JSONArray(data)
      val grants = mutableListOf<ScreenTimeGrant>()
      for (i in 0 until array.length()) {
        val obj = array.optJSONObject(i) ?: continue
        grants.add(
          ScreenTimeGrant(
            grantId = obj.optString("grantId"),
            childUserId = obj.optString("childUserId"),
            familyId = obj.optString("familyId"),
            grantedMinutes = obj.optInt("grantedMinutes"),
            grantedAt = obj.optLong("grantedAt"),
            expiresAt = obj.optLong("expiresAt"),
            status = obj.optString("status", "active"),
            revokedAt = if (obj.has("revokedAt")) obj.optLong("revokedAt") else null,
            allowedPackages = jsonArrayToList(obj.optJSONArray("allowedPackages")),
            allowedCategories = jsonArrayToList(obj.optJSONArray("allowedCategories")),
            grantedByUserId = obj.optString("grantedByUserId", "server"),
            sourceTaskId = obj.optString("sourceTaskId", null),
            usedMinutesOverride = if (obj.has("usedMinutesOverride")) obj.optInt("usedMinutesOverride") else null
          )
        )
      }
      return grants
    }

    private fun jsonArrayToList(array: JSONArray?): List<String> {
      if (array == null) return emptyList()
      val list = mutableListOf<String>()
      for (i in 0 until array.length()) {
        list.add(array.optString(i))
      }
      return list
    }
  }
}
