package com.kineticstudio.gaterush

import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.view.MotionEvent
import android.view.View
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/** 3D sahnenin ustune cizilen 2D arayuz: acilis, menu, HUD, sayi etiketleri. */
class HudView(ctx: Context, private val game: Game) : View(ctx) {

    private val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private val rf = RectF()
    private val btnPlay = RectF()
    private val btnRevive = RectF()
    private val btnReplay = RectF()
    private val t0 = System.nanoTime()

    private var downX = 0f
    private var downY = 0f
    private var lastX = 0f
    private var moved = 0f

    private val cOutline = 0xFF2A1B5E.toInt()
    private val cGold = 0xFFFFD54F.toInt()

    private fun now(): Float = (System.nanoTime() - t0) / 1_000_000_000f

    // ------------------------------------------------------------ girdi

    override fun onTouchEvent(e: MotionEvent): Boolean {
        when (e.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downX = e.x
                downY = e.y
                lastX = e.x
                moved = 0f
            }
            MotionEvent.ACTION_MOVE -> {
                val dx = e.x - lastX
                lastX = e.x
                moved = max(moved, hypot(e.x - downX, e.y - downY))
                if (width > 0) game.onDrag(dx / width)
            }
            MotionEvent.ACTION_UP -> {
                if (moved < width * 0.04f) onTap(e.x, e.y)
            }
        }
        return true
    }

    private fun onTap(x: Float, y: Float) {
        when (game.stage) {
            Stage.MENU -> game.cmdPlay()
            Stage.DEAD -> {
                if (!game.adUsed && btnRevive.contains(x, y)) game.cmdRevive()
                else if (btnReplay.contains(x, y)) game.cmdPlay()
            }
            else -> {}
        }
    }

    // ------------------------------------------------------------ cizim

    override fun onDraw(c: Canvas) {
        val w = width.toFloat()
        val h = height.toFloat()
        when (game.stage) {
            Stage.SPLASH -> splash(c, w, h)
            Stage.MENU -> {
                menu(c, w, h)
                drawTags(c, w, h)
            }
            Stage.PLAY -> {
                hud(c, w, h)
                drawTags(c, w, h)
                drawPopups(c, w, h)
            }
            Stage.DEAD -> {
                hud(c, w, h)
                dead(c, w, h)
            }
            Stage.AD -> {
                hud(c, w, h)
                ad(c, w, h)
            }
        }
        postInvalidateOnAnimation()
    }

    // ------------------------------------------------------------ yardimcilar

    private fun withA(color: Int, alpha: Float): Int {
        val a = (((color ushr 24) and 0xFF) * alpha).toInt().coerceIn(0, 255)
        return (a shl 24) or (color and 0x00FFFFFF)
    }

    private fun text(
        c: Canvas, s: String, x: Float, y: Float, size: Float, fill: Int,
        align: Paint.Align = Paint.Align.CENTER, alpha: Float = 1f
    ) {
        if (alpha <= 0f) return
        p.shader = null
        p.typeface = Fonts.face
        p.textSize = size
        p.textAlign = align
        p.strokeJoin = Paint.Join.ROUND
        p.style = Paint.Style.STROKE
        p.strokeWidth = size * 0.30f
        p.color = withA(0x44000000, alpha)
        c.drawText(s, x, y + size * 0.07f, p)
        p.strokeWidth = size * 0.20f
        p.color = withA(cOutline, alpha)
        c.drawText(s, x, y, p)
        p.style = Paint.Style.FILL
        p.color = withA(fill, alpha)
        c.drawText(s, x, y, p)
    }

    private fun title(c: Canvas, s: String, x: Float, y: Float, size: Float, alpha: Float) {
        if (alpha <= 0f) return
        p.shader = null
        p.typeface = Fonts.face
        p.textSize = size
        p.textAlign = Paint.Align.CENTER
        p.strokeJoin = Paint.Join.ROUND
        val depth = (size * 0.09f).toInt().coerceAtLeast(4)
        p.style = Paint.Style.FILL
        p.color = withA(0xFF8A3B00.toInt(), alpha)
        for (i in depth downTo 1) c.drawText(s, x, y + i, p)
        p.style = Paint.Style.STROKE
        p.strokeWidth = size * 0.16f
        p.color = withA(cOutline, alpha)
        c.drawText(s, x, y, p)
        p.style = Paint.Style.FILL
        p.shader = LinearGradient(
            0f, y - size * 0.8f, 0f, y,
            0xFFFFF59D.toInt(), 0xFFFF9800.toInt(), Shader.TileMode.CLAMP
        )
        p.alpha = (alpha * 255).toInt().coerceIn(0, 255)
        c.drawText(s, x, y, p)
        p.shader = null
    }

    private fun button(
        c: Canvas, out: RectF, cx: Float, cy: Float, bw: Float, bh: Float,
        label: String, c1: Int, c2: Int, textSize: Float, pulse: Float
    ) {
        val k = 1f + pulse
        val w = bw * k
        val h = bh * k
        out.set(cx - w / 2f, cy - h / 2f, cx + w / 2f, cy + h / 2f)
        val r = h * 0.32f
        p.shader = null
        p.style = Paint.Style.FILL
        p.color = 0x55000000
        rf.set(out.left, out.top + h * 0.16f, out.right, out.bottom + h * 0.16f)
        c.drawRoundRect(rf, r, r, p)
        p.color = 0xFF3A1F6B.toInt()
        rf.set(out.left, out.top + h * 0.09f, out.right, out.bottom + h * 0.09f)
        c.drawRoundRect(rf, r, r, p)
        p.shader = LinearGradient(0f, out.top, 0f, out.bottom, c1, c2, Shader.TileMode.CLAMP)
        c.drawRoundRect(out, r, r, p)
        p.shader = null
        p.color = 0x44FFFFFF
        rf.set(out.left + h * 0.1f, out.top + h * 0.07f, out.right - h * 0.1f, out.top + h * 0.45f)
        c.drawRoundRect(rf, h * 0.2f, h * 0.2f, p)
        p.style = Paint.Style.STROKE
        p.strokeWidth = max(3f, h * 0.05f)
        p.color = cOutline
        c.drawRoundRect(out, r, r, p)
        text(c, label, cx, cy + textSize * 0.34f, textSize, 0xFFFFFFFF.toInt())
    }

    private fun coinIcon(c: Canvas, cx: Float, cy: Float, r: Float) {
        p.shader = null
        p.style = Paint.Style.FILL
        p.color = 0xFF9A6A00.toInt()
        c.drawCircle(cx + r * 0.08f, cy + r * 0.12f, r, p)
        p.shader = LinearGradient(0f, cy - r, 0f, cy + r, 0xFFFFE680.toInt(), 0xFFFFB300.toInt(), Shader.TileMode.CLAMP)
        c.drawCircle(cx, cy, r, p)
        p.shader = null
        p.style = Paint.Style.STROKE
        p.strokeWidth = r * 0.16f
        p.color = 0xFFE59A00.toInt()
        c.drawCircle(cx, cy, r * 0.68f, p)
        p.style = Paint.Style.FILL
        p.color = 0x99FFFFFF.toInt()
        c.drawCircle(cx - r * 0.38f, cy - r * 0.4f, r * 0.16f, p)
    }

    private fun pill(c: Canvas, x0: Float, y0: Float, w: Float, h: Float, color: Int) {
        p.shader = null
        p.style = Paint.Style.FILL
        p.color = color
        rf.set(x0, y0, x0 + w, y0 + h)
        c.drawRoundRect(rf, h / 2f, h / 2f, p)
    }

    // ------------------------------------------------------------ etiketler

    private fun drawTags(c: Canvas, w: Float, h: Float) {
        for (t in game.tags) {
            val size = w * 0.058f * t.scale
            p.typeface = Fonts.face
            p.textSize = size
            val tw = p.measureText(t.text)
            val bw = tw + size * 1.1f
            val bh = size * 1.5f
            val cx = t.x * w
            val cy = t.y * h
            val c1: Int
            val c2: Int
            when (t.kind) {
                0 -> { c1 = 0xFF6EC8FF.toInt(); c2 = 0xFF2E7BFF.toInt() }
                1 -> { c1 = 0xFFFF8A94.toInt(); c2 = 0xFFE53950.toInt() }
                else -> { c1 = 0xFFE58BFF.toInt(); c2 = 0xFF8E24AA.toInt() }
            }
            rf.set(cx - bw / 2f, cy - bh / 2f, cx + bw / 2f, cy + bh / 2f)
            p.shader = null
            p.style = Paint.Style.FILL
            p.color = 0x55000000
            c.drawRoundRect(rf.left, rf.top + bh * 0.12f, rf.right, rf.bottom + bh * 0.12f, bh / 2f, bh / 2f, p)
            p.shader = LinearGradient(0f, rf.top, 0f, rf.bottom, c1, c2, Shader.TileMode.CLAMP)
            c.drawRoundRect(rf, bh / 2f, bh / 2f, p)
            p.shader = null
            p.style = Paint.Style.STROKE
            p.strokeWidth = max(2f, size * 0.08f)
            p.color = 0xFFFFFFFF.toInt()
            c.drawRoundRect(rf, bh / 2f, bh / 2f, p)
            text(c, t.text, cx, cy + size * 0.34f, size, 0xFFFFFFFF.toInt())
        }
    }

    private fun drawPopups(c: Canvas, w: Float, h: Float) {
        for (pp in game.popups) {
            val a = (pp.life / 0.5f).coerceIn(0f, 1f)
            val col = if (pp.good) 0xFF8CFFA8.toInt() else 0xFFFF8A94.toInt()
            text(c, pp.text, w / 2f, pp.y * h, w * 0.13f, col, Paint.Align.CENTER, a)
        }
    }

    // ------------------------------------------------------------ oyun ici

    private fun hud(c: Canvas, w: Float, h: Float) {
        val total = (game.coins + game.runCoins).toInt()
        val x0 = w * 0.04f
        val y0 = h * 0.04f
        val ph = h * 0.05f
        pill(c, x0, y0, w * 0.34f, ph, 0x66000000)
        coinIcon(c, x0 + ph / 2f, y0 + ph / 2f, ph * 0.38f)
        text(c, total.toString(), x0 + ph * 1.1f, y0 + ph * 0.7f, ph * 0.62f, 0xFFFFFFFF.toInt(), Paint.Align.LEFT)
        text(c, game.distance.toString() + " m", w * 0.5f, h * 0.085f, w * 0.075f, 0xFFFFFFFF.toInt())
        text(c, "Bölüm " + game.level, w * 0.96f, h * 0.075f, w * 0.045f, cGold, Paint.Align.RIGHT)
    }

    private fun menu(c: Canvas, w: Float, h: Float) {
        val t = now()
        val enter = (game.stageTime / 0.5f).coerceIn(0f, 1f)
        title(c, "GATE RUSH", w * 0.5f, h * 0.20f, w * 0.17f, enter)
        text(c, "KINETIC STUDIO", w * 0.5f, h * 0.245f, w * 0.036f, 0xFFFFFFFF.toInt(), Paint.Align.CENTER, enter)
        val pulse = sin(t * 4f) * 0.03f
        button(
            c, btnPlay, w * 0.5f, h * 0.72f, w * 0.62f, h * 0.085f, "OYNA",
            0xFF8CFFA8.toInt(), 0xFF1FB45A.toInt(), w * 0.11f, pulse
        )
        coinIcon(c, w * 0.30f, h * 0.822f, w * 0.032f)
        text(c, game.coins.toString(), w * 0.345f, h * 0.832f, w * 0.052f, 0xFFFFFFFF.toInt(), Paint.Align.LEFT)
        text(c, "En iyi: " + game.best + " m", w * 0.96f, h * 0.832f, w * 0.05f, cGold, Paint.Align.RIGHT)
        text(
            c, "Parmağınla sürükle, doğru kapıyı seç", w * 0.5f, h * 0.91f, w * 0.04f,
            0xFFFFFFFF.toInt(), Paint.Align.CENTER, 0.65f + 0.35f * sin(t * 3f)
        )
    }

    private fun dead(c: Canvas, w: Float, h: Float) {
        p.shader = null
        p.style = Paint.Style.FILL
        p.color = 0x99140A3A.toInt()
        c.drawRect(0f, 0f, w, h, p)
        val pw = w * 0.86f
        val top = h * 0.22f
        val ph = h * 0.54f
        rf.set((w - pw) / 2f, top, (w + pw) / 2f, top + ph)
        p.color = 0xFFFFFFFF.toInt()
        c.drawRoundRect(rf, w * 0.06f, w * 0.06f, p)
        p.style = Paint.Style.STROKE
        p.strokeWidth = 6f
        p.color = cOutline
        c.drawRoundRect(rf, w * 0.06f, w * 0.06f, p)
        text(c, "YENİLDİN", w * 0.5f, top + h * 0.09f, w * 0.13f, 0xFFFF6B7A.toInt())
        text(c, "Mesafe: " + game.deathDistance + " m", w * 0.5f, top + h * 0.16f, w * 0.06f, 0xFFFFFFFF.toInt())
        text(c, "Altın: +" + game.deathCoins, w * 0.5f, top + h * 0.215f, w * 0.055f, cGold)
        text(c, "En iyi: " + game.best + " m", w * 0.5f, top + h * 0.265f, w * 0.045f, 0xFFB7C4FF.toInt())
        var y = top + h * 0.34f
        if (!game.adUsed) {
            button(
                c, btnRevive, w * 0.5f, y, pw * 0.88f, h * 0.075f, "REKLAM İZLE • DEVAM",
                0xFFFFE27A.toInt(), 0xFFFF9800.toInt(), w * 0.05f, 0f
            )
            y += h * 0.10f
        } else {
            btnRevive.setEmpty()
        }
        button(
            c, btnReplay, w * 0.5f, y, pw * 0.88f, h * 0.075f, "TEKRAR OYNA",
            0xFF7FD0FF.toInt(), 0xFF2E7BFF.toInt(), w * 0.06f, 0f
        )
    }

    private fun ad(c: Canvas, w: Float, h: Float) {
        p.shader = null
        p.style = Paint.Style.FILL
        p.color = 0xE6000000.toInt()
        c.drawRect(0f, 0f, w, h, p)
        val pw = w * 0.8f
        val ph = h * 0.30f
        val x0 = (w - pw) / 2f
        val y0 = h * 0.35f
        p.color = 0xFF2A1B5E.toInt()
        rf.set(x0, y0, x0 + pw, y0 + ph)
        c.drawRoundRect(rf, w * 0.04f, w * 0.04f, p)
        text(c, "REKLAM (DEMO)", w * 0.5f, y0 + ph * 0.28f, w * 0.07f, 0xFFFFFFFF.toInt())
        text(c, "Gerçek reklam sonra eklenecek", w * 0.5f, y0 + ph * 0.46f, w * 0.04f, 0xFFB7C4FF.toInt())
        val prog = (1f - game.adTimer / 3f).coerceIn(0f, 1f)
        val bx = x0 + pw * 0.1f
        val bw = pw * 0.8f
        val by = y0 + ph * 0.62f
        p.color = 0xFF0B0E2E.toInt()
        rf.set(bx, by, bx + bw, by + ph * 0.1f)
        c.drawRoundRect(rf, ph * 0.05f, ph * 0.05f, p)
        p.color = 0xFF6BFF9A.toInt()
        rf.set(bx, by, bx + bw * prog, by + ph * 0.1f)
        c.drawRoundRect(rf, ph * 0.05f, ph * 0.05f, p)
        text(c, kotlin.math.ceil(max(game.adTimer, 0f)).toInt().toString(), w * 0.5f, y0 + ph * 0.93f, w * 0.08f, cGold)
    }

    // ------------------------------------------------------------ acilis / yukleme

    private fun cloud(c: Canvas, x: Float, y: Float, s: Float, alpha: Int) {
        p.shader = null
        p.style = Paint.Style.FILL
        p.color = (alpha shl 24) or 0x00FFFFFF
        c.drawCircle(x, y, s * 0.55f, p)
        c.drawCircle(x + s * 0.6f, y + s * 0.1f, s * 0.42f, p)
        c.drawCircle(x - s * 0.6f, y + s * 0.12f, s * 0.38f, p)
        rf.set(x - s * 0.9f, y + s * 0.1f, x + s * 0.95f, y + s * 0.52f)
        c.drawRoundRect(rf, s * 0.2f, s * 0.2f, p)
    }

    private fun chibi(c: Canvas, cx: Float, gy: Float, r: Float, body: Int, cap: Int, phase: Float, t: Float) {
        val sw = sin(t * 12f + phase)
        val bob = abs(sw) * r * 0.16f
        p.shader = null
        p.style = Paint.Style.FILL
        p.color = 0x33000000
        rf.set(cx - r * 0.9f, gy - r * 0.12f, cx + r * 0.9f, gy + r * 0.14f)
        c.drawOval(rf, p)
        // bacaklar
        p.color = 0xFF2A4E9E.toInt()
        rf.set(cx - r * 0.50f, gy - r * 0.62f + max(0f, sw) * -r * 0.12f, cx - r * 0.12f, gy - r * 0.02f)
        c.drawRoundRect(rf, r * 0.15f, r * 0.15f, p)
        rf.set(cx + r * 0.12f, gy - r * 0.62f + max(0f, -sw) * -r * 0.12f, cx + r * 0.50f, gy - r * 0.02f)
        c.drawRoundRect(rf, r * 0.15f, r * 0.15f, p)
        // govde
        p.color = body
        rf.set(cx - r * 0.62f, gy - r * 1.75f - bob, cx + r * 0.62f, gy - r * 0.45f - bob)
        c.drawOval(rf, p)
        // kafa
        p.color = 0xFFFFD4B0.toInt()
        c.drawCircle(cx, gy - r * 2.25f - bob, r * 0.62f, p)
        // sapka
        p.color = cap
        rf.set(cx - r * 0.66f, gy - r * 2.95f - bob, cx + r * 0.66f, gy - r * 1.75f - bob)
        c.drawArc(rf, 180f, 180f, true, p)
        // gozler
        p.color = 0xFF1B1B30.toInt()
        c.drawCircle(cx - r * 0.22f, gy - r * 2.2f - bob, r * 0.08f, p)
        c.drawCircle(cx + r * 0.22f, gy - r * 2.2f - bob, r * 0.08f, p)
    }

    private fun splash(c: Canvas, w: Float, h: Float) {
        val st = game.stageTime
        val t = now()
        val fade = (st / 0.6f).coerceIn(0f, 1f) * (1f - ((st - 2.6f) / 0.4f).coerceIn(0f, 1f))
        var prog = 1f - (1f - (st / 2.8f).coerceIn(0f, 1f)).let { it * it }
        if (!game.glReady) prog = min(prog, 0.92f)

        p.shader = LinearGradient(
            0f, 0f, 0f, h,
            intArrayOf(0xFF5CA8FF.toInt(), 0xFFDDEBFF.toInt(), 0xFFFFD6EC.toInt()),
            floatArrayOf(0f, 0.55f, 1f), Shader.TileMode.CLAMP
        )
        p.style = Paint.Style.FILL
        c.drawRect(0f, 0f, w, h, p)
        p.shader = null

        cloud(c, ((t * 40f) % (w * 1.4f)) - w * 0.2f, h * 0.16f, w * 0.12f, 200)
        cloud(c, w - ((t * 25f) % (w * 1.4f)) + w * 0.2f, h * 0.30f, w * 0.16f, 170)
        cloud(c, ((t * 18f + w * 0.5f) % (w * 1.4f)) - w * 0.2f, h * 0.62f, w * 0.14f, 190)

        text(c, "KINETIC STUDIO", w * 0.5f, h * 0.12f, w * 0.05f, 0xFFFFFFFF.toInt(), Paint.Align.CENTER, fade)

        val bounce = abs(sin(st * 3f)) * w * 0.02f
        title(c, "GATE", w * 0.5f, h * 0.36f - bounce, w * 0.24f, fade)
        title(c, "RUSH", w * 0.5f, h * 0.36f + w * 0.24f * 0.95f - bounce, w * 0.24f, fade)

        val gy = h * 0.74f
        for (i in 0 until 6) {
            val x = ((st * 240f + i * w * 0.2f) % (w * 1.2f)) - w * 0.1f
            val enemy = i == 5
            chibi(
                c, x, gy + (i % 2) * 12f, w * 0.045f,
                if (enemy) 0xFFFF5A66.toInt() else 0xFF3A9BFF.toInt(),
                if (enemy) 0xFF8C1530.toInt() else 0xFF1A4BB0.toInt(),
                i * 0.9f, t
            )
        }

        val bx = w * 0.15f
        val bw = w * 0.7f
        val by = h * 0.84f
        val bh = h * 0.026f
        p.style = Paint.Style.FILL
        p.color = withA(0x66000000, fade)
        rf.set(bx, by, bx + bw, by + bh)
        c.drawRoundRect(rf, bh / 2f, bh / 2f, p)
        p.shader = LinearGradient(bx, 0f, bx + bw, 0f, 0xFFFFE27A.toInt(), 0xFFFF9800.toInt(), Shader.TileMode.CLAMP)
        rf.set(bx, by, bx + max(bh, bw * prog), by + bh)
        c.drawRoundRect(rf, bh / 2f, bh / 2f, p)
        p.shader = null
        p.style = Paint.Style.STROKE
        p.strokeWidth = 3f
        p.color = withA(cOutline, fade)
        rf.set(bx, by, bx + bw, by + bh)
        c.drawRoundRect(rf, bh / 2f, bh / 2f, p)

        text(c, "Yükleniyor...  %" + (prog * 100f).toInt(), w * 0.5f, by + bh * 3.4f, w * 0.05f, 0xFFFFFFFF.toInt(), Paint.Align.CENTER, fade)
        val tips = arrayOf(
            "İpucu: Mavi kapılar asker kazandırır",
            "İpucu: Düşmandan kaçabilirsin ama altın kaybedersin",
            "İpucu: Boss için çok asker biriktir"
        )
        text(c, tips[(st.toInt()) % tips.size], w * 0.5f, h * 0.95f, w * 0.036f, 0xFFFFFFFF.toInt(), Paint.Align.CENTER, 0.85f * fade)
    }
}
