package com.kineticstudio.gaterush

import android.content.Context
import java.util.concurrent.ConcurrentLinkedQueue
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.random.Random

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
        get() = if (boss) 2.2f else 0.9f + min(0.6f, sqrt(maxHp) * 0.05f)
}

/** z: pist uzerindeki mutlak mesafe (d). x,y dunya koordinati. */
class Particle(
    var x: Float, var y: Float, var z: Float,
    var vx: Float, var vy: Float, var vz: Float,
    var life: Float, val maxLife: Float,
    val r: Float, val g: Float, val b: Float, val size: Float
)

class Popup(val text: String, val good: Boolean, var y: Float, var life: Float)

/** Ekran uzerindeki sayi etiketi. x,y: 0..1 arasi ekran orani. kind: 0 mavi, 1 kirmizi, 2 boss */
class Tag(val text: String, val x: Float, val y: Float, val scale: Float, val kind: Int)

class Game(ctx: Context) {

    companion object {
        const val ROAD_HALF = 2.35f
        private const val CMD_PLAY = 1
        private const val CMD_REVIVE = 2
    }

    private val prefs = ctx.getSharedPreferences("gaterush", Context.MODE_PRIVATE)

    // ---- HUD ile paylasilan durum
    @Volatile var stage = Stage.SPLASH
    @Volatile var stageTime = 0f
    @Volatile var glReady = false
    @Volatile var coins = prefs.getInt("coins", 0)
    @Volatile var best = prefs.getInt("best", 0)
    @Volatile var runCoins = 0f
    @Volatile var deathDistance = 0
    @Volatile var deathCoins = 0
    @Volatile var adUsed = false
    @Volatile var adTimer = 0f
    @Volatile var tags: List<Tag> = emptyList()
    @Volatile var popups: List<Popup> = emptyList()
    @Volatile var distance = 0

    // ---- oyun durumu (GL thread)
    var t = 0f
    var zP = 0f
    var playerX = 0f
    @Volatile private var targetX = 0f
    var squad = 10f
    var shake = 0f
    var fight: Enemy? = null

    val gates = ArrayList<Gate>()
    val enemies = ArrayList<Enemy>()
    val particles = ArrayList<Particle>()
    private val popupList = ArrayList<Popup>()
    private val cmds = ConcurrentLinkedQueue<Int>()

    private var nextSpawnZ = 40f
    private var segment = 0
    private var simCount = 10f

    val squadCount: Int get() = max(0, squad.roundToInt())
    val level: Int get() = (zP / 260f).toInt() + 1
    private val speed: Float get() = 9f + min(segment * 0.12f, 5f)

    init {
        resetWorld()
    }

    // ------------------------------------------------------------ girdi (UI thread)

    fun onDrag(dxFrac: Float) {
        if (stage == Stage.PLAY) {
            targetX = (targetX + dxFrac * 7.5f).coerceIn(-ROAD_HALF, ROAD_HALF)
        }
    }

    fun cmdPlay() {
        cmds.add(CMD_PLAY)
    }

    fun cmdRevive() {
        cmds.add(CMD_REVIVE)
    }

    private fun handleCmd(c: Int) {
        when (c) {
            CMD_PLAY -> if ((stage == Stage.MENU && stageTime > 0.3f) || stage == Stage.DEAD) startRun()
            CMD_REVIVE -> if (stage == Stage.DEAD && !adUsed) {
                stage = Stage.AD
                stageTime = 0f
                adTimer = 3f
            }
        }
    }

    // ------------------------------------------------------------ mantik

    private fun resetWorld() {
        gates.clear()
        enemies.clear()
        particles.clear()
        popupList.clear()
        zP = 0f
        nextSpawnZ = 40f
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
        while (true) {
            val c = cmds.poll() ?: break
            handleCmd(c)
        }
        val dt = min(dtRaw, 0.05f)
        t += dt
        stageTime += dt
        shake = max(0f, shake - dt * 2.5f)
        updateParticles(dt)
        when (stage) {
            Stage.SPLASH -> {
                if (stageTime > 3f && glReady) {
                    stage = Stage.MENU
                    stageTime = 0f
                    resetWorld()
                }
            }
            Stage.MENU -> {
                zP += 7f * dt
                playerX = sin(t * 0.8f) * 1.4f
                squad = 10f
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
        distance = zP.toInt()
        popups = ArrayList(popupList)
    }

    private fun play(dt: Float) {
        if (fight == null) zP += speed * dt
        playerX += (targetX - playerX) * min(1f, dt * 12f)
        spawn()

        for (g in gates) {
            if (!g.used && g.z - zP <= 0f) {
                g.used = true
                applyGate(g)
                if (stage != Stage.PLAY) return
            }
        }

        if (fight == null) {
            for (e in enemies) {
                val rz = e.z - zP
                if (!e.dead && rz <= 2.6f && rz > -2f && abs(playerX - e.x) < e.radius + 0.6f) {
                    fight = e
                    zP = min(zP, e.z - 2.6f)
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
        popupList.add(Popup(gateText(op, v), good, 0.40f, 1.1f))
        if (good) emit(playerX, 1.6f, zP, 0.3f, 0.7f, 1f, 26, 6f)
        else emit(playerX, 1.6f, zP, 1f, 0.35f, 0.4f, 26, 6f)
        shake = max(shake, 0.25f)
        if (squad < 1f) die()
    }

    private fun stepFight(e: Enemy, dt: Float) {
        val a = 0.6f
        val bias = 0.5f
        val p = squad
        val en = e.hp
        squad = max(0f, p - (en * a + bias) * dt)
        e.hp = max(0f, en - (p * a + bias) * dt)
        runCoins += (en - e.hp) * (if (e.boss) 2f else 1f)

        val mx = playerX * 0.5f + e.x * 0.5f
        emit(mx, 1.1f, zP + 1.3f, 1f, 0.9f, 0.4f, 2, 4f)
        emit(mx, 1.1f, zP + 1.3f, 1f, 0.6f, 0.2f, 1, 3f)
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
            popupList.add(Popup("+$gain", true, 0.34f, 1.3f))
            emit(e.x, 1.4f, e.z, 1f, 0.85f, 0.2f, 34, 7f)
        }
    }

    private fun die() {
        stage = Stage.DEAD
        stageTime = 0f
        deathDistance = zP.toInt()
        deathCoins = runCoins.toInt()
        coins += deathCoins
        runCoins = 0f
        if (deathDistance > best) best = deathDistance
        prefs.edit().putInt("coins", coins).putInt("best", best).apply()
        shake = 1f
        emit(playerX, 1.2f, zP, 0.3f, 0.6f, 1f, 40, 7f)
        emit(playerX, 1.2f, zP, 1f, 0.35f, 0.4f, 20, 6f)
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
        gates.removeAll { it.z - zP < -14f }
        enemies.removeAll { it.z - zP < -14f }
    }

    private fun updateParticles(dt: Float) {
        for (i in particles.indices.reversed()) {
            val p = particles[i]
            p.life -= dt
            if (p.life <= 0f || p.y < -4f) {
                particles.removeAt(i)
                continue
            }
            p.vy -= 14f * dt
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.z += p.vz * dt
        }
        for (i in popupList.indices.reversed()) {
            val p = popupList[i]
            p.life -= dt
            p.y -= 0.10f * dt
            if (p.life <= 0f) popupList.removeAt(i)
        }
    }

    private fun emit(x: Float, y: Float, dz: Float, r: Float, g: Float, b: Float, n: Int, spd: Float) {
        if (particles.size > 260) return
        repeat(n) {
            val ang = Random.nextFloat() * 6.2832f
            val sp = Random.nextFloat() * spd
            val life = 0.4f + Random.nextFloat() * 0.5f
            particles.add(
                Particle(
                    x, y, dz,
                    cos(ang) * sp, Random.nextFloat() * spd * 0.9f + 1f, sin(ang) * sp,
                    life, life, r, g, b, 0.07f + Random.nextFloat() * 0.09f
                )
            )
        }
    }

    // ------------------------------------------------------------ uretim

    fun isGood(op: Op) = op == Op.ADD || op == Op.MUL

    fun gateText(op: Op, v: Int) = when (op) {
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
        val demo = stage == Stage.MENU
        while (nextSpawnZ < zP + 140f) {
            segment++
            val z = nextSpawnZ
            if (demo) {
                spawnGate(z)
                nextSpawnZ += 30f
                continue
            }
            when (segment % 6) {
                1, 3, 5 -> {
                    spawnGate(z)
                    nextSpawnZ += 26f
                }
                2, 4 -> {
                    spawnEnemy(z)
                    nextSpawnZ += 26f
                }
                else -> {
                    spawnBoss(z)
                    nextSpawnZ += 34f
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
        val x = Random.nextFloat() * 2.6f - 1.3f
        enemies.add(Enemy(z, x, hp, false))
        simCount = sqrt(max(1f, simCount * simCount - hp * hp))
    }

    private fun spawnBoss(z: Float) {
        val hp = max(10f, (simCount * (0.7f + Random.nextFloat() * 0.15f)).roundToInt().toFloat())
        enemies.add(Enemy(z, 0f, hp, true))
        simCount = max(10f, sqrt(max(1f, simCount * simCount - hp * hp)) + 15f)
    }
}
