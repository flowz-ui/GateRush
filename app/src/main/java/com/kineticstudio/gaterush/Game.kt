package com.kineticstudio.gaterush

import android.content.Context
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Shader
import android.graphics.Typeface
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.toArgb
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.random.Random

// ---------------------------------------------------------------- veri

enum class Stage { SPLASH, MENU, PLAY, DEAD, AD }
enum class Op { ADD, MUL, SUB, DIV }

class Gate(val z: Float, val lOp: Op, val lVal: Int, val rOp: Op, val rVal: Int) {
    var used = false
}

class Enemy(val z: Float, val x: Float, hp0: Float, val boss: Boolean) {
    var hp = hp0
    val maxHp = hp0
    var dead = false
    val radius: Float
        get() = if (boss) 1.3f else 0.38f + min(0.18f, sqrt(maxHp) * 0.012f)
}

class Particle(
    var x: Float, var y: Float, var vx: Float, var vy: Float,
    var life: Float, val maxLife: Float, val color: Color, val size: Float
)

class Popup(val x: Float, var y: Float, val text: String, val color: Color, var life: Float)

private class Item(val z: Float, val gate: Gate?, val enemy: Enemy?)

// ---------------------------------------------------------------- sabitler

private const val F = 90f // perspektif odak uzaklığı

private val C_BLUE = Color(0xFF2E9BFF)
private val C_BLUE_D = Color(0xFF1457B8)
private val C_BLUE_L = Color(0xFF9AD8FF)
private val C_RED = Color(0xFFFF4B55)
private val C_RED_D = Color(0xFF9E1B2B)
private val C_RED_L = Color(0xFFFFB3B3)
private val C_BOSS = Color(0xFFB5179E)
private val C_BOSS_D = Color(0xFF560A6B)
private val C_BOSS_L = Color(0xFFFFA6F0)
private val C_GOLD = Color(0xFFFFC93C)

private val MTN_TOP = arrayOf(Color(0xFF4B2F8A), Color(0xFF35226E), Color(0xFF231659))
private val MTN_BOT = arrayOf(Color(0xFFB04A86), Color(0xFF7A3A86), Color(0xFF4A2A7A))

// ---------------------------------------------------------------- oyun

class Game(ctx: Context) {

    private val prefs = ctx.getSharedPreferences("gaterush", Context.MODE_PRIVATE)

    var stage = Stage.SPLASH
        private set

    private var t = 0f
    private var stageTime = 0f
    private var w = 1080f
    private var h = 1920f

    private var coins = prefs.getInt("coins", 0)
    private var best = prefs.getInt("best", 0)

    private var camZ = 0f
    private var playerX = 0f
    private var targetX = 0f
    private var squad = 10f
    private var runCoins = 0f
    private var nextSpawnZ = 60f
    private var segment = 0
    private var simCount = 10f
    private var adUsed = false
    private var adTimer = 0f
    private var shake = 0f
    private var fight: Enemy? = null
    private var deathDistance = 0
    private var deathCoins = 0

    private val gates = ArrayList<Gate>()
    private val enemies = ArrayList<Enemy>()
    private val particles = ArrayList<Particle>()
    private val popups = ArrayList<Popup>()
    private val items = ArrayList<Item>()

    private val path = Path()
    private val tp = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        typeface = Typeface.create("sans-serif-black", Typeface.NORMAL)
    }

    private var btnRevive = Rect.Zero
    private var btnReplay = Rect.Zero

    private val starX = FloatArray(45) { Random.nextFloat() }
    private val starY = FloatArray(45) { Random.nextFloat() }
    private val starS = FloatArray(45) { Random.nextFloat() }

    private val fx = FloatArray(64)
    private val fz = FloatArray(64)

    private val scaleU get() = w * 0.42f
    private val horizonY get() = h * 0.30f
    private val groundY get() = h * 0.80f
    private val speed get() = 20f + min(segment * 0.25f, 12f)

    init {
        resetWorld()
    }

    // ------------------------------------------------------------ projeksiyon

    private fun sc(z: Float) = F / (F + z)
    private fun px(x: Float, s: Float) = w * 0.5f + x * s * scaleU
    private fun py(s: Float) = horizonY + (groundY - horizonY) * s

    // ------------------------------------------------------------ girdi

    fun onDrag(dx: Float) {
        if (stage == Stage.PLAY) {
            targetX = (targetX + dx / scaleU * 1.25f).coerceIn(-0.85f, 0.85f)
        }
    }

    fun onTap(p: Offset) {
        when (stage) {
            Stage.MENU -> if (stageTime > 0.3f) startRun()
            Stage.DEAD -> {
                if (!adUsed && btnRevive.contains(p)) {
                    stage = Stage.AD
                    stageTime = 0f
                    adTimer = 3f
                } else if (btnReplay.contains(p)) {
                    startRun()
                }
            }
            else -> {}
        }
    }

    // ------------------------------------------------------------ mantık

    private fun resetWorld() {
        gates.clear()
        enemies.clear()
        particles.clear()
        popups.clear()
        camZ = 0f
        nextSpawnZ = 60f
        segment = 0
        simCount = 10f
        squad = 10f
        fight = null
        spawn()
    }

    private fun startRun() {
        resetWorld()
        runCoins = 0f
        adUsed = false
        playerX = 0f
        targetX = 0f
        stage = Stage.PLAY
        stageTime = 0f
    }

    fun update(dtRaw: Float) {
        val dt = min(dtRaw, 0.05f)
        t += dt
        stageTime += dt
        shake = max(0f, shake - dt * 2.5f)
        updateParticles(dt)
        when (stage) {
            Stage.SPLASH -> {
                if (stageTime > 3.0f) {
                    stage = Stage.MENU
                    stageTime = 0f
                }
            }
            Stage.MENU -> {
                camZ += 14f * dt
                playerX = sin(t * 0.9f) * 0.5f
                spawn()
                cleanup()
            }
            Stage.PLAY -> play(dt)
            Stage.DEAD -> {}
            Stage.AD -> {
                adTimer -= dt
                if (adTimer <= 0f) revive()
            }
        }
    }

    private fun play(dt: Float) {
        if (fight == null) camZ += speed * dt
        playerX += (targetX - playerX) * min(1f, dt * 14f)
        spawn()

        for (g in gates) {
            if (!g.used && g.z - camZ <= 0f) {
                g.used = true
                applyGate(g)
                if (stage != Stage.PLAY) return
            }
        }

        if (fight == null) {
            for (e in enemies) {
                val rz = e.z - camZ
                if (!e.dead && rz <= 1.5f && rz > -8f && abs(playerX - e.x) < e.radius) {
                    fight = e
                    break
                }
            }
        }
        fight?.let { stepFight(it, dt) }
        cleanup()
    }

    private fun applyGate(g: Gate) {
        val left = playerX < 0f
        val op = if (left) g.lOp else g.rOp
        val v = if (left) g.lVal else g.rVal
        squad = applyOp(op, v, squad).coerceAtMost(9999f)
        val good = isGood(op)
        val col = if (good) Color(0xFF6BFF9A) else Color(0xFFFF6B7A)
        popups.add(Popup(w * 0.5f, py(1f) - scaleU * 0.7f, gateText(op, v), col, 1.1f))
        emit(px(playerX, 1f), py(1f) - scaleU * 0.15f, if (good) C_BLUE_L else C_RED_L, 22, w * 0.5f)
        if (squad < 1f) die()
    }

    private fun stepFight(e: Enemy, dt: Float) {
        val a = 0.9f
        val bias = 0.8f
        val p = squad
        val en = e.hp
        squad = max(0f, p - (en * a + bias) * dt)
        e.hp = max(0f, en - (p * a + bias) * dt)
        val killed = en - e.hp
        runCoins += killed * (if (e.boss) 2f else 1f)

        val s = sc(e.z - camZ)
        val sx = px(e.x, s)
        val sy = py(s) - 0.18f * scaleU * s
        emit(sx, sy, Color(0xFFFFE27A), 2, w * 0.35f)
        emit(sx, sy, Color(0xFFFF9A3C), 1, w * 0.3f)
        shake = max(shake, if (e.boss) 0.8f else 0.35f)

        if (squad <= 0.5f) {
            squad = 0f
            die()
        } else if (e.hp <= 0f) {
            e.dead = true
            fight = null
            var bonus = 0
            if (e.boss) {
                bonus = 50
                runCoins += bonus
            }
            val gain = (e.maxHp * (if (e.boss) 2f else 1f)).roundToInt() + bonus
            popups.add(Popup(w * 0.5f, py(1f) - scaleU * 1.0f, "+$gain", C_GOLD, 1.3f))
            emit(sx, sy, C_GOLD, 30, w * 0.6f)
        }
    }

    private fun die() {
        stage = Stage.DEAD
        stageTime = 0f
        deathDistance = camZ.toInt()
        deathCoins = runCoins.toInt()
        coins += deathCoins
        runCoins = 0f
        if (deathDistance > best) best = deathDistance
        prefs.edit().putInt("coins", coins).putInt("best", best).apply()
        shake = 1f
        emit(px(playerX, 1f), py(1f) - scaleU * 0.2f, C_BLUE, 40, w * 0.7f)
        emit(px(playerX, 1f), py(1f) - scaleU * 0.2f, C_RED, 20, w * 0.5f)
    }

    private fun revive() {
        fight?.let { it.dead = true }
        fight = null
        squad = 15f
        adUsed = true
        stage = Stage.PLAY
        stageTime = 0f
    }

    private fun cleanup() {
        gates.removeAll { it.z - camZ < -14f }
        enemies.removeAll { it.z - camZ < -14f }
    }

    private fun updateParticles(dt: Float) {
        for (i in particles.indices.reversed()) {
            val p = particles[i]
            p.life -= dt
            if (p.life <= 0f) {
                particles.removeAt(i)
                continue
            }
            p.vy += 900f * dt
            p.x += p.vx * dt
            p.y += p.vy * dt
        }
        for (i in popups.indices.reversed()) {
            val p = popups[i]
            p.life -= dt
            p.y -= 90f * dt
            if (p.life <= 0f) popups.removeAt(i)
        }
    }

    private fun emit(x: Float, y: Float, color: Color, n: Int, spd: Float) {
        if (particles.size > 320) return
        repeat(n) {
            val ang = Random.nextFloat() * 6.2832f
            val sp = Random.nextFloat() * spd
            val life = 0.4f + Random.nextFloat() * 0.5f
            particles.add(
                Particle(
                    x, y, cos(ang) * sp, sin(ang) * sp - spd * 0.4f,
                    life, life, color, 3f + Random.nextFloat() * 5f
                )
            )
        }
    }

    // ------------------------------------------------------------ üretim

    private fun isGood(op: Op) = op == Op.ADD || op == Op.MUL

    private fun gateText(op: Op, v: Int) = when (op) {
        Op.ADD -> "+$v"
        Op.MUL -> "×$v"
        Op.SUB -> "-$v"
        Op.DIV -> "÷$v"
    }

    private fun applyOp(op: Op, v: Int, n: Float): Float = when (op) {
        Op.ADD -> n + v
        Op.MUL -> n * v
        Op.SUB -> n - v
        Op.DIV -> ceil(n / v)
    }

    private fun round5(x: Float): Int = max(1, (x / 5f).roundToInt()) * 5

    private fun spawn() {
        while (nextSpawnZ < camZ + 320f) {
            segment++
            val z = nextSpawnZ
            when (segment % 6) {
                1, 3, 5 -> {
                    spawnGate(z)
                    nextSpawnZ += 52f
                }
                2, 4 -> {
                    spawnEnemy(z)
                    nextSpawnZ += 52f
                }
                else -> {
                    spawnBoss(z)
                    nextSpawnZ += 80f
                }
            }
        }
    }

    private fun spawnGate(z: Float) {
        val goodOp: Op
        val goodVal: Int
        if (Random.nextFloat() < 0.4f) {
            goodOp = Op.MUL
            goodVal = if (Random.nextFloat() < 0.75f) 2 else 3
        } else {
            goodOp = Op.ADD
            goodVal = round5(simCount * 0.35f).coerceIn(5, 80)
        }
        val badOp: Op
        val badVal: Int
        if (Random.nextFloat() < 0.5f) {
            badOp = Op.SUB
            badVal = round5(simCount * 0.3f).coerceIn(5, 60)
        } else {
            badOp = Op.DIV
            badVal = 2
        }
        val goodLeft = Random.nextBoolean()
        gates.add(
            if (goodLeft) Gate(z, goodOp, goodVal, badOp, badVal)
            else Gate(z, badOp, badVal, goodOp, goodVal)
        )
        simCount = applyOp(goodOp, goodVal, simCount)
    }

    private fun spawnEnemy(z: Float) {
        val frac = 0.45f + min(0.3f, segment * 0.004f) + Random.nextFloat() * 0.15f
        val hp = max(3f, (simCount * frac).roundToInt().toFloat())
        val x = Random.nextFloat() * 0.8f - 0.4f
        enemies.add(Enemy(z, x, hp, false))
        simCount = sqrt(max(1f, simCount * simCount - hp * hp))
    }

    private fun spawnBoss(z: Float) {
        val hp = max(10f, (simCount * (0.7f + Random.nextFloat() * 0.15f)).roundToInt().toFloat())
        enemies.add(Enemy(z, 0f, hp, true))
        simCount = max(10f, sqrt(max(1f, simCount * simCount - hp * hp)) + 15f)
    }

    // ------------------------------------------------------------ çizim girişi

    fun draw(ds: DrawScope) {
        ds.render()
    }

    private fun DrawScope.render() {
        w = size.width
        h = size.height
        if (stage == Stage.SPLASH) {
            drawSplash()
            return
        }
        val sx = (Random.nextFloat() - 0.5f) * shake * 24f
        val sy = (Random.nextFloat() - 0.5f) * shake * 24f
        translate(sx, sy) { drawWorld() }
        drawVignette()
        when (stage) {
            Stage.PLAY -> drawHud()
            Stage.MENU -> drawMenu()
            Stage.DEAD -> {
                drawHud()
                drawDead()
            }
            Stage.AD -> drawAd()
            else -> {}
        }
    }

    // ------------------------------------------------------------ yardımcılar

    private fun DrawScope.quad(
        x1: Float, y1: Float, x2: Float, y2: Float,
        x3: Float, y3: Float, x4: Float, y4: Float, color: Color
    ) {
        path.reset()
        path.moveTo(x1, y1)
        path.lineTo(x2, y2)
        path.lineTo(x3, y3)
        path.lineTo(x4, y4)
        path.close()
        drawPath(path, color)
    }

    private fun DrawScope.txt(
        s: String, x: Float, y: Float, size: Float, color: Color,
        align: Paint.Align = Paint.Align.CENTER, alpha: Float = 1f, shadow: Boolean = true
    ) {
        if (alpha <= 0f) return
        drawIntoCanvas { c ->
            tp.shader = null
            tp.textSize = size
            tp.textAlign = align
            tp.color = color.toArgb()
            tp.alpha = (color.alpha * alpha * 255f).toInt().coerceIn(0, 255)
            if (shadow) {
                val sa = (176 * alpha).toInt().coerceIn(0, 255)
                tp.setShadowLayer(size * 0.07f, 0f, size * 0.05f, sa shl 24)
            } else {
                tp.clearShadowLayer()
            }
            c.nativeCanvas.drawText(s, x, y, tp)
        }
    }

    private fun DrawScope.title3d(
        s: String, x: Float, y: Float, size: Float,
        top: Color, bottom: Color, side: Color, alpha: Float = 1f
    ) {
        if (alpha <= 0f) return
        drawIntoCanvas { c ->
            val nc = c.nativeCanvas
            val a = (255 * alpha).toInt().coerceIn(0, 255)
            val depth = (size * 0.07f).toInt().coerceAtLeast(4)
            tp.textSize = size
            tp.textAlign = Paint.Align.CENTER
            tp.shader = null
            tp.setShadowLayer(size * 0.1f, size * 0.04f, size * 0.09f, (150 * alpha).toInt().coerceIn(0, 255) shl 24)
            tp.color = side.toArgb()
            tp.alpha = a
            nc.drawText(s, x + depth * 0.6f, y + depth, tp)
            tp.clearShadowLayer()
            for (i in depth - 1 downTo 1) {
                nc.drawText(s, x + i * 0.6f, y + i, tp)
            }
            tp.shader = LinearGradient(
                0f, y - size * 0.75f, 0f, y,
                top.toArgb(), bottom.toArgb(), Shader.TileMode.CLAMP
            )
            tp.alpha = a
            nc.drawText(s, x, y, tp)
            tp.shader = null
        }
    }

    private fun DrawScope.bubble(label: String, cx: Float, cy: Float, size: Float, fill: Color) {
        tp.shader = null
        tp.textSize = size
        val tw = tp.measureText(label)
        val bw = tw + size * 1.1f
        val bh = size * 1.5f
        val tl = Offset(cx - bw / 2f, cy - bh / 2f)
        drawRoundRect(Color(0x55000000), tl + Offset(3f, 6f), Size(bw, bh), CornerRadius(bh / 2f))
        drawRoundRect(
            Brush.verticalGradient(listOf(lerp(fill, Color.White, 0.3f), fill), startY = tl.y, endY = tl.y + bh),
            tl, Size(bw, bh), CornerRadius(bh / 2f)
        )
        drawRoundRect(
            Color.White.copy(alpha = 0.5f), tl, Size(bw, bh), CornerRadius(bh / 2f),
            style = Stroke(width = max(1.5f, size * 0.06f))
        )
        txt(label, cx, cy + size * 0.36f, size, Color.White)
    }

    private fun DrawScope.button(
        label: String, cx: Float, cy: Float, bw: Float, bh: Float,
        c1: Color, c2: Color, textSize: Float, pulse: Float = 0f
    ): Rect {
        val k = 1f + pulse
        val bw2 = bw * k
        val bh2 = bh * k
        val tl = Offset(cx - bw2 / 2f, cy - bh2 / 2f)
        val corner = CornerRadius(bh2 * 0.3f)
        drawRoundRect(Color(0x66000000), tl + Offset(0f, bh2 * 0.14f), Size(bw2, bh2), corner)
        drawRoundRect(lerp(c2, Color.Black, 0.35f), tl + Offset(0f, bh2 * 0.08f), Size(bw2, bh2), corner)
        drawRoundRect(
            Brush.verticalGradient(listOf(c1, c2), startY = tl.y, endY = tl.y + bh2),
            tl, Size(bw2, bh2), corner
        )
        drawRoundRect(
            Color.White.copy(alpha = 0.25f),
            Offset(tl.x + bh2 * 0.08f, tl.y + bh2 * 0.06f),
            Size(bw2 - bh2 * 0.16f, bh2 * 0.38f), CornerRadius(bh2 * 0.2f)
        )
        txt(label, cx, cy + textSize * 0.35f, textSize, Color.White)
        return Rect(tl.x, tl.y, tl.x + bw2, tl.y + bh2)
    }

    private fun DrawScope.coinIcon(cx: Float, cy: Float, r: Float) {
        drawCircle(Color(0xFF9A6A00), r, Offset(cx + r * 0.08f, cy + r * 0.12f))
        drawCircle(
            Brush.verticalGradient(listOf(Color(0xFFFFE680), Color(0xFFFFB300)), startY = cy - r, endY = cy + r),
            radius = r, center = Offset(cx, cy)
        )
        drawCircle(Color(0xFFE59A00), r * 0.68f, Offset(cx, cy), style = Stroke(width = r * 0.14f))
        drawCircle(Color.White.copy(alpha = 0.55f), r * 0.16f, Offset(cx - r * 0.38f, cy - r * 0.4f))
    }

    // ------------------------------------------------------------ dünya

    private fun DrawScope.drawWorld() {
        drawSky()
        drawGround()
        drawBarriers()

        items.clear()
        for (g in gates) {
            val rz = g.z - camZ
            if (rz > -10f && rz < 320f) items.add(Item(rz, g, null))
        }
        for (e in enemies) {
            val rz = e.z - camZ
            if (!e.dead && rz > -10f && rz < 320f) items.add(Item(rz, null, e))
        }
        items.sortByDescending { it.z }

        for (item in items) if (item.z > 0f) drawItem(item)
        if (stage == Stage.PLAY || stage == Stage.MENU) drawSquad()
        for (item in items) if (item.z <= 0f) drawItem(item)

        drawFog()
        drawParticles()
    }

    private fun DrawScope.drawItem(item: Item) {
        item.gate?.let { drawGate(it, item.z) }
        item.enemy?.let { drawEnemy(it, item.z) }
    }

    private fun DrawScope.drawSky() {
        val hy = horizonY
        drawRect(
            Brush.verticalGradient(
                0f to Color(0xFF0B0E2E), 0.45f to Color(0xFF2E2470),
                0.8f to Color(0xFFD9507F), 1f to Color(0xFFFFB066),
                startY = 0f, endY = hy
            ),
            size = Size(w, hy + 2f)
        )
        for (i in starX.indices) {
            val a = (0.35f + 0.65f * abs(sin(t * 1.3f + i))) * (1f - starY[i] * 0.9f)
            drawCircle(
                Color.White.copy(alpha = a.coerceIn(0f, 1f)),
                1.5f + starS[i] * 2f,
                Offset(starX[i] * w, starY[i] * hy * 0.7f)
            )
        }
        val sxn = w * 0.5f - playerX * w * 0.06f
        val syn = hy - h * 0.035f
        drawCircle(
            Brush.radialGradient(listOf(Color(0x99FFD08A), Color.Transparent), center = Offset(sxn, syn), radius = w * 0.55f),
            radius = w * 0.55f, center = Offset(sxn, syn)
        )
        val sr = w * 0.09f
        drawCircle(
            Brush.verticalGradient(listOf(Color(0xFFFFF3C4), Color(0xFFFF9A5C)), startY = syn - sr, endY = syn + sr),
            radius = sr, center = Offset(sxn, syn)
        )
        for (layer in 0..2) {
            val amp = h * (0.075f - layer * 0.022f)
            val par = (1f + layer * 1.4f) * 40f
            val off = playerX * par
            path.reset()
            path.moveTo(0f, hy + 2f)
            var x = 0f
            while (x <= w + 12f) {
                val u = (x + off) * (0.006f + layer * 0.004f) + layer * 7f
                val y = hy - amp * (0.55f + 0.30f * sin(u) + 0.15f * sin(u * 2.7f + 1.3f))
                path.lineTo(x, y)
                x += 12f
            }
            path.lineTo(w, hy + 2f)
            path.close()
            drawPath(
                path,
                brush = Brush.verticalGradient(listOf(MTN_TOP[layer], MTN_BOT[layer]), startY = hy - amp, endY = hy)
            )
        }
    }

    private fun DrawScope.drawGround() {
        val hy = horizonY
        drawRect(
            Brush.verticalGradient(listOf(Color(0xFF5A2F73), Color(0xFF20123A)), startY = hy, endY = h),
            Offset(0f, hy), Size(w, h - hy)
        )
        val bandLen = 18f
        val first = floor(camZ / bandLen).toInt()
        for (i in 36 downTo 0) {
            val idx = first + i
            val z0 = max(idx * bandLen - camZ, -20f)
            val z1 = idx * bandLen - camZ + bandLen
            val s0 = sc(z0)
            val s1 = sc(z1)
            val y0 = py(s0)
            val y1 = py(s1)
            val even = idx % 2 == 0
            if (even) drawRect(Color(0x14FFFFFF), Offset(0f, y1), Size(w, y0 - y1 + 1f))
            quad(
                px(-1f, s1), y1, px(1f, s1), y1, px(1f, s0), y0, px(-1f, s0), y0,
                if (even) Color(0xFF2B2F45) else Color(0xFF262A3E)
            )
            val curb = if (even) Color(0xFFFF4D6D) else Color(0xFFF5F5F5)
            quad(px(-1.08f, s1), y1, px(-1f, s1), y1, px(-1f, s0), y0, px(-1.08f, s0), y0, curb)
            quad(px(1f, s1), y1, px(1.08f, s1), y1, px(1.08f, s0), y0, px(1f, s0), y0, curb)
            if (even) {
                for (lx in floatArrayOf(-0.33f, 0.33f)) {
                    quad(
                        px(lx - 0.012f, s1), y1, px(lx + 0.012f, s1), y1,
                        px(lx + 0.012f, s0), y0, px(lx - 0.012f, s0), y0,
                        Color(0x55FFFFFF)
                    )
                }
            }
        }
    }

    private fun DrawScope.drawBarriers() {
        val bl = 16f
        val firstB = floor(camZ / bl).toInt()
        for (i in 20 downTo 0) {
            val zN = (firstB + i) * bl - camZ
            if (zN < -12f) continue
            box(-1.32f, -1.14f, zN, zN + 9f, 0.22f, true)
            box(1.14f, 1.32f, zN, zN + 9f, 0.22f, false)
        }
    }

    private fun DrawScope.box(xa: Float, xb: Float, zN: Float, zF: Float, hgt: Float, innerRight: Boolean) {
        val sN = sc(zN)
        val sF = sc(zF)
        val yN = py(sN)
        val yF = py(sF)
        val hN = hgt * scaleU * sN
        val hF = hgt * scaleU * sF
        val xi = if (innerRight) xb else xa
        quad(px(xi, sN), yN, px(xi, sN), yN - hN, px(xi, sF), yF - hF, px(xi, sF), yF, Color(0xFF272C57))
        quad(px(xa, sN), yN - hN, px(xb, sN), yN - hN, px(xb, sF), yF - hF, px(xa, sF), yF - hF, Color(0xFF7C86D6))
        drawRect(Color(0xFF3A4075), Offset(px(xa, sN), yN - hN), Size(px(xb, sN) - px(xa, sN), hN))
    }

    // ------------------------------------------------------------ askerler

    private fun DrawScope.soldier(
        cx: Float, gy: Float, r: Float,
        body: Color, dark: Color, light: Color,
        phase: Float, running: Boolean
    ) {
        val bob = if (running) abs(sin(t * 11f + phase)) * r * 0.35f else 0f
        drawOval(Color(0x66000000), Offset(cx - r * 0.15f, gy - r * 0.3f), Size(r * 1.7f, r * 0.55f))
        val bw = r * 1.5f
        val bh = r * 1.9f
        val legA = if (running) sin(t * 11f + phase) * r * 0.25f else 0f
        drawRoundRect(dark, Offset(cx - bw * 0.42f, gy - r * 0.55f - legA.coerceAtLeast(0f)), Size(bw * 0.36f, r * 0.55f), CornerRadius(r * 0.15f))
        drawRoundRect(dark, Offset(cx + bw * 0.06f, gy - r * 0.55f + legA.coerceAtMost(0f)), Size(bw * 0.36f, r * 0.55f), CornerRadius(r * 0.15f))
        val top = gy - bob - r * 0.35f - bh
        drawRoundRect(dark, Offset(cx - bw / 2f, top), Size(bw, bh), CornerRadius(bw * 0.45f))
        drawRoundRect(body, Offset(cx - bw / 2f, top), Size(bw * 0.78f, bh * 0.96f), CornerRadius(bw * 0.4f))
        drawRoundRect(light.copy(alpha = 0.55f), Offset(cx - bw * 0.38f, top + bh * 0.1f), Size(bw * 0.28f, bh * 0.5f), CornerRadius(bw * 0.14f))
        val hy = top - r * 0.38f
        drawCircle(dark, r * 0.72f, Offset(cx, hy))
        drawCircle(light, r * 0.66f, Offset(cx - r * 0.05f, hy - r * 0.03f))
        drawCircle(Color.White.copy(alpha = 0.6f), r * 0.2f, Offset(cx - r * 0.25f, hy - r * 0.28f))
    }

    private fun layout(n: Int, sp: Float) {
        for (i in 0 until n) {
            val rr = sqrt(i + 0.5f) * sp
            val a = i * 2.39996f
            fx[i] = rr * cos(a)
            fz[i] = rr * sin(a) * 38f
        }
    }

    private fun order(n: Int): List<Int> = (0 until n).sortedByDescending { fz[it] }

    private fun DrawScope.drawSquad() {
        val cnt = squad.roundToInt().coerceAtLeast(0)
        val shown = min(cnt, 60)
        if (shown <= 0) return
        layout(shown, 0.052f)
        for (i in order(shown)) {
            val rz = fz[i]
            val s = sc(rz)
            soldier(
                px(playerX + fx[i], s), py(s), 0.052f * scaleU * s,
                C_BLUE, C_BLUE_D, C_BLUE_L, i * 0.7f, true
            )
        }
        val s1 = 1f
        val cx = px(playerX, s1)
        val top = py(s1) - scaleU * (0.2f + sqrt(shown.toFloat()) * 0.05f)
        bubble(cnt.toString(), cx, top, scaleU * 0.15f, C_BLUE_D)
    }

    private fun DrawScope.drawEnemy(e: Enemy, rz: Float) {
        val s = sc(rz)
        val gy = py(s)
        val fighting = fight === e
        val cx0 = px(e.x, s)
        if (e.boss) {
            val r = 0.17f * scaleU * s
            for (k in 4 downTo 1) {
                drawOval(
                    C_BOSS.copy(alpha = 0.10f),
                    Offset(cx0 - r * k * 0.9f, gy - r * k * 0.18f),
                    Size(r * k * 1.8f, r * k * 0.36f)
                )
            }
            val jx = if (fighting) sin(t * 40f) * r * 0.08f else 0f
            soldier(cx0 + jx, gy, r, C_BOSS, C_BOSS_D, C_BOSS_L, 0f, fighting)
            val hy = gy - r * 2.63f
            path.reset()
            path.moveTo(cx0 - r * 0.55f, hy - r * 0.35f)
            path.lineTo(cx0 - r * 0.95f, hy - r * 1.5f)
            path.lineTo(cx0 - r * 0.1f, hy - r * 0.7f)
            path.close()
            drawPath(path, Color(0xFFFFE8B0))
            path.reset()
            path.moveTo(cx0 + r * 0.55f, hy - r * 0.35f)
            path.lineTo(cx0 + r * 0.95f, hy - r * 1.5f)
            path.lineTo(cx0 + r * 0.1f, hy - r * 0.7f)
            path.close()
            drawPath(path, Color(0xFFFFE8B0))
            val barW = r * 4f
            val barH = max(8f, r * 0.28f)
            val by = hy - r * 2.1f
            drawRoundRect(Color(0x99000000), Offset(cx0 - barW / 2f, by), Size(barW, barH), CornerRadius(barH / 2f))
            drawRoundRect(
                Brush.horizontalGradient(listOf(Color(0xFFFF7A3C), Color(0xFFFF2E4D)), startX = cx0 - barW / 2f, endX = cx0 + barW / 2f),
                Offset(cx0 - barW / 2f, by), Size(barW * (e.hp / e.maxHp).coerceIn(0f, 1f), barH), CornerRadius(barH / 2f)
            )
            bubble("BOSS  " + e.hp.roundToInt(), cx0, by - barH - r * 0.5f, max(20f, r * 0.7f), C_BOSS_D)
        } else {
            val shown = max(1, ceil(min(e.maxHp, 28f) * (e.hp / e.maxHp)).toInt())
            layout(shown, 0.05f)
            for (i in order(shown)) {
                val rzi = rz + fz[i]
                if (rzi < -18f) continue
                val si = sc(rzi)
                val jit = if (fighting) sin(t * 35f + i) * 0.012f else 0f
                soldier(
                    px(e.x + fx[i] + jit, si), py(si), 0.05f * scaleU * si,
                    C_RED, C_RED_D, C_RED_L, i * 0.5f, fighting
                )
            }
            val bx = cx0
            val by = gy - scaleU * s * (0.34f + sqrt(shown.toFloat()) * 0.045f)
            bubble(e.hp.roundToInt().toString(), bx, by, max(18f, scaleU * s * 0.14f), C_RED_D)
        }
    }

    // ------------------------------------------------------------ kapılar

    private fun DrawScope.glass(xl: Float, xr: Float, gy: Float, hh: Float, c1: Color, label: String, alpha: Float) {
        drawRect(
            Brush.verticalGradient(
                listOf(c1.copy(alpha = 0.78f * alpha), c1.copy(alpha = 0.30f * alpha)),
                startY = gy - hh, endY = gy
            ),
            Offset(xl, gy - hh), Size(xr - xl, hh)
        )
        val pw = xr - xl
        quad(
            xl + pw * 0.10f, gy, xl + pw * 0.30f, gy, xl + pw * 0.55f, gy - hh, xl + pw * 0.35f, gy - hh,
            Color.White.copy(alpha = 0.14f * alpha)
        )
        drawRect(
            lerp(c1, Color.White, 0.35f).copy(alpha = alpha),
            Offset(xl, gy - hh - 0.05f * hh), Size(pw, 0.06f * hh)
        )
        val ts = min(hh * 0.46f, pw * 0.85f / (label.length * 0.6f))
        txt(label, (xl + xr) / 2f, gy - hh * 0.42f, ts, Color.White, alpha = alpha)
    }

    private fun DrawScope.pillar(cx: Float, gy: Float, pw: Float, hh: Float, alpha: Float) {
        drawRect(
            Brush.horizontalGradient(
                listOf(Color(0xFF3A3F66).copy(alpha = alpha), Color(0xFFB8C0FF).copy(alpha = alpha), Color(0xFF3A3F66).copy(alpha = alpha)),
                startX = cx - pw / 2f, endX = cx + pw / 2f
            ),
            Offset(cx - pw / 2f, gy - hh * 1.08f), Size(pw, hh * 1.08f)
        )
    }

    private fun DrawScope.drawGate(g: Gate, rz: Float) {
        val alpha = if (rz < 0f) (1f + rz / 10f).coerceIn(0f, 1f) else 1f
        if (alpha <= 0f) return
        val s = sc(rz)
        val gy = py(s)
        val hh = 0.95f * scaleU * s
        val sB = sc(rz - 5f)
        val yB = py(sB)
        val shift = 0.25f * scaleU * s
        quad(px(-1f, s), gy, px(1f, s), gy, px(1f, sB) + shift, yB, px(-1f, sB) + shift, yB, Color(0x33000000).copy(alpha = 0.2f * alpha))
        for (side in 0..1) {
            val op = if (side == 0) g.lOp else g.rOp
            val v = if (side == 0) g.lVal else g.rVal
            val c1 = if (isGood(op)) C_BLUE else Color(0xFFFF3B52)
            val xa = if (side == 0) -1f else 0.03f
            val xb = if (side == 0) -0.03f else 1f
            quad(px(xa, s), gy, px(xb, s), gy, px(xb, sB), yB, px(xa, sB), yB, c1.copy(alpha = 0.22f * alpha))
            glass(px(xa, s), px(xb, s), gy, hh, c1, gateText(op, v), alpha)
        }
        val pw = 0.07f * scaleU * s
        pillar(px(-1.02f, s), gy, pw, hh, alpha)
        pillar(px(0f, s), gy, pw * 1.2f, hh, alpha)
        pillar(px(1.02f, s), gy, pw, hh, alpha)
    }

    // ------------------------------------------------------------ efektler

    private fun DrawScope.drawFog() {
        val yFar = py(sc(240f))
        drawRect(
            Brush.verticalGradient(
                listOf(Color(0xE6C8648A), Color(0x00C8648A)),
                startY = horizonY, endY = yFar
            ),
            Offset(0f, horizonY), Size(w, yFar - horizonY)
        )
    }

    private fun DrawScope.drawParticles() {
        for (p in particles) {
            drawCircle(
                p.color.copy(alpha = (p.life / p.maxLife).coerceIn(0f, 1f)),
                p.size, Offset(p.x, p.y)
            )
        }
    }

    private fun DrawScope.drawVignette() {
        drawRect(
            Brush.radialGradient(
                listOf(Color.Transparent, Color(0x66000000)),
                center = Offset(w / 2f, h * 0.55f), radius = h * 0.75f
            )
        )
    }

    // ------------------------------------------------------------ arayüz

    private fun DrawScope.drawHud() {
        val total = (coins + runCoins).toInt()
        val px0 = w * 0.04f
        val py0 = h * 0.045f
        val pw = w * 0.36f
        val ph = h * 0.05f
        drawRoundRect(Color(0x66000000), Offset(px0, py0), Size(pw, ph), CornerRadius(ph / 2f))
        coinIcon(px0 + ph / 2f, py0 + ph / 2f, ph * 0.38f)
        txt(total.toString(), px0 + ph * 1.05f, py0 + ph * 0.68f, ph * 0.6f, Color.White, Paint.Align.LEFT)
        txt("${camZ.toInt()} m", w * 0.5f, h * 0.085f, w * 0.07f, Color.White)
        txt("Bölüm ${(camZ / 340f).toInt() + 1}", w * 0.96f, h * 0.075f, w * 0.045f, Color(0xFFFFE27A), Paint.Align.RIGHT)
        for (p in popups) {
            txt(p.text, p.x, p.y, w * 0.12f, p.color, alpha = (p.life / 0.5f).coerceIn(0f, 1f))
        }
    }

    private fun DrawScope.drawMenu() {
        drawRect(Color(0x55000A1A))
        val enter = (stageTime / 0.5f).coerceIn(0f, 1f)
        title3d("GATE RUSH", w * 0.5f, h * 0.22f, w * 0.16f, Color(0xFFFFF1A8), Color(0xFFFF9E2C), Color(0xFF8A3B00), enter)
        txt("KINETIC STUDIO", w * 0.5f, h * 0.255f, w * 0.035f, Color(0xFFCFD6FF), alpha = enter)
        val pulse = sin(t * 4f) * 0.03f
        button("OYNA", w * 0.5f, h * 0.70f, w * 0.62f, h * 0.085f, Color(0xFF6BFF9A), Color(0xFF1FB45A), w * 0.1f, pulse)
        coinIcon(w * 0.30f, h * 0.805f, w * 0.03f)
        txt(coins.toString(), w * 0.345f, h * 0.812f, w * 0.05f, Color.White, Paint.Align.LEFT)
        txt("En iyi: $best m", w * 0.96f, h * 0.812f, w * 0.05f, Color(0xFFFFE27A), Paint.Align.RIGHT)
        txt("Parmağınla sürükle, doğru kapıyı seç", w * 0.5f, h * 0.90f, w * 0.04f, Color(0xFFE8ECFF), alpha = 0.6f + 0.4f * sin(t * 3f))
    }

    private fun DrawScope.drawDead() {
        drawRect(Color(0xAA05071A))
        val pw = w * 0.84f
        val top = h * 0.24f
        val ph = h * 0.50f
        val tl = Offset((w - pw) / 2f, top)
        drawRoundRect(Color(0xEE12163A), tl, Size(pw, ph), CornerRadius(w * 0.05f))
        drawRoundRect(Color(0xFF6B72B0), tl, Size(pw, ph), CornerRadius(w * 0.05f), style = Stroke(width = 4f))
        title3d("YENİLDİN", w * 0.5f, top + h * 0.085f, w * 0.13f, Color(0xFFFF9AA6), Color(0xFFFF2E4D), Color(0xFF6B0A1F))
        txt("Mesafe: $deathDistance m", w * 0.5f, top + h * 0.15f, w * 0.06f, Color.White)
        txt("Kazanılan altın: $deathCoins", w * 0.5f, top + h * 0.20f, w * 0.05f, C_GOLD)
        txt("En iyi: $best m", w * 0.5f, top + h * 0.245f, w * 0.045f, Color(0xFFCFD6FF))
        var y = top + h * 0.31f
        if (!adUsed) {
            btnRevive = button("REKLAM İZLE • DEVAM", w * 0.5f, y, pw * 0.86f, h * 0.07f, Color(0xFFFFE27A), Color(0xFFFF9E2C), w * 0.052f)
            y += h * 0.09f
        } else {
            btnRevive = Rect.Zero
        }
        btnReplay = button("TEKRAR OYNA", w * 0.5f, y, pw * 0.86f, h * 0.07f, Color(0xFF6BC4FF), Color(0xFF2E7BFF), w * 0.06f)
    }

    private fun DrawScope.drawAd() {
        drawRect(Color(0xE6000000))
        val pw = w * 0.8f
        val ph = h * 0.30f
        val tl = Offset((w - pw) / 2f, h * 0.35f)
        drawRoundRect(Color(0xFF1B1F4B), tl, Size(pw, ph), CornerRadius(w * 0.04f))
        txt("REKLAM (DEMO)", w * 0.5f, tl.y + ph * 0.28f, w * 0.07f, Color.White)
        txt("Gerçek reklam sonra eklenecek", w * 0.5f, tl.y + ph * 0.45f, w * 0.04f, Color(0xFFCFD6FF))
        val prog = (1f - adTimer / 3f).coerceIn(0f, 1f)
        val bx = tl.x + pw * 0.1f
        val bw = pw * 0.8f
        val by = tl.y + ph * 0.62f
        drawRoundRect(Color(0xFF0B0E2E), Offset(bx, by), Size(bw, ph * 0.1f), CornerRadius(ph * 0.05f))
        drawRoundRect(
            Brush.horizontalGradient(listOf(Color(0xFF6BFF9A), Color(0xFF1FB45A)), startX = bx, endX = bx + bw),
            Offset(bx, by), Size(bw * prog, ph * 0.1f), CornerRadius(ph * 0.05f)
        )
        txt(ceil(max(adTimer, 0f)).toInt().toString(), w * 0.5f, tl.y + ph * 0.92f, w * 0.08f, C_GOLD)
    }

    // ------------------------------------------------------------ açılış

    private fun DrawScope.drawSplash() {
        val fade = (stageTime / 0.6f).coerceIn(0f, 1f) * (1f - ((stageTime - 2.6f) / 0.4f).coerceIn(0f, 1f))
        val prog = (1f - (1f - (stageTime / 2.8f).coerceIn(0f, 1f)).let { it * it })

        drawRect(
            Brush.verticalGradient(
                listOf(Color(0xFF070A1F), Color(0xFF1B1245), Color(0xFF3A1B5C)),
                startY = 0f, endY = h
            )
        )
        drawCircle(
            Brush.radialGradient(
                listOf(Color(0x66FF9E5E), Color.Transparent),
                center = Offset(w / 2f, h * 0.42f), radius = w * 0.8f
            ),
            radius = w * 0.8f, center = Offset(w / 2f, h * 0.42f)
        )
        for (i in starX.indices) {
            val a = (0.3f + 0.7f * abs(sin(t * 1.5f + i))) * fade
            drawCircle(Color.White.copy(alpha = a.coerceIn(0f, 1f)), 1.5f + starS[i] * 2f, Offset(starX[i] * w, starY[i] * h * 0.6f))
        }

        txt("KINETIC STUDIO", w * 0.5f, h * 0.13f, w * 0.05f, Color(0xFFCFD6FF), alpha = fade)

        val bob = sin(stageTime * 3f) * 8f
        val gy = h * 0.34f + bob
        val gh = w * 0.30f
        val gw = w * 0.28f
        glass(w * 0.5f - gw - 14f, w * 0.5f - 14f, gy, gh, C_BLUE, "×2", fade)
        glass(w * 0.5f + 14f, w * 0.5f + gw + 14f, gy, gh, Color(0xFFFF3B52), "-9", fade)
        pillar(w * 0.5f - gw - 14f, gy, w * 0.02f, gh, fade)
        pillar(w * 0.5f, gy, w * 0.025f, gh, fade)
        pillar(w * 0.5f + gw + 14f, gy, w * 0.02f, gh, fade)
        drawOval(Color(0x44000000).copy(alpha = 0.3f * fade), Offset(w * 0.12f, gy - 6f), Size(w * 0.76f, w * 0.05f))

        val ts = w * 0.22f
        title3d("GATE", w * 0.5f, h * 0.52f, ts, Color(0xFFFFF1A8), Color(0xFFFF9E2C), Color(0xFF8A3B00), fade)
        title3d("RUSH", w * 0.5f, h * 0.52f + ts * 0.95f, ts, Color(0xFFFFF1A8), Color(0xFFFF9E2C), Color(0xFF8A3B00), fade)

        val groundLine = h * 0.76f
        for (i in 0 until 7) {
            val x = ((stageTime * 260f + i * w * 0.16f) % (w * 1.2f)) - w * 0.1f
            val col = if (i == 6) Triple(C_RED, C_RED_D, C_RED_L) else Triple(C_BLUE, C_BLUE_D, C_BLUE_L)
            soldier(x, groundLine + (i % 2) * 14f, w * 0.032f, col.first, col.second, col.third, i * 0.9f, true)
        }

        val bx = w * 0.15f
        val bw = w * 0.7f
        val by = h * 0.85f
        val bh = h * 0.022f
        drawRoundRect(Color(0x88000000), Offset(bx, by), Size(bw, bh), CornerRadius(bh / 2f))
        drawRoundRect(
            Brush.horizontalGradient(listOf(Color(0xFFFFE27A), Color(0xFFFF9E2C)), startX = bx, endX = bx + bw),
            Offset(bx, by), Size(max(bh, bw * prog), bh), CornerRadius(bh / 2f)
        )
        drawRoundRect(Color.White.copy(alpha = 0.35f * fade), Offset(bx, by), Size(bw, bh), CornerRadius(bh / 2f), style = Stroke(width = 2f))
        txt("Yükleniyor...  %${(prog * 100f).toInt()}", w * 0.5f, by + bh * 3.2f, w * 0.045f, Color.White, alpha = fade)
        val tips = arrayOf(
            "İpucu: Mavi kapılar asker kazandırır",
            "İpucu: Düşmandan kaçabilirsin ama altın kaybedersin",
            "İpucu: Boss için çok asker biriktir"
        )
        txt(tips[((stageTime / 1f).toInt()) % tips.size], w * 0.5f, h * 0.94f, w * 0.036f, Color(0xFFCFD6FF), alpha = 0.8f * fade)
    }
}
