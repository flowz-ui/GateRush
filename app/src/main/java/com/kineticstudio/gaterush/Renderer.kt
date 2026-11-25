package com.kineticstudio.gaterush

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Shader
import android.opengl.GLES20
import android.opengl.GLSurfaceView
import android.opengl.GLUtils
import android.opengl.Matrix
import android.util.Log
import java.nio.ByteBuffer
import java.nio.ByteOrder
import javax.microedition.khronos.egl.EGLConfig
import javax.microedition.khronos.opengles.GL10
import kotlin.math.abs
import kotlin.math.atan
import kotlin.math.ceil
import kotlin.math.cos
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.tan
import kotlin.random.Random

private const val PI_F = 3.14159265f

private const val MESH_VS = """
uniform mat4 uMVP;
uniform mat4 uModel;
uniform mat3 uNrm;
attribute vec3 aPos;
attribute vec3 aNrm;
varying vec3 vN;
varying vec3 vW;
void main() {
    vec4 wp = uModel * vec4(aPos, 1.0);
    vW = wp.xyz;
    vN = uNrm * aNrm;
    gl_Position = uMVP * vec4(aPos, 1.0);
}
"""

private const val MESH_FS = """
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec3 uColor;
uniform float uAlpha;
uniform float uGloss;
uniform vec3 uLight;
uniform vec3 uCam;
uniform vec3 uFog;
uniform vec2 uFogRange;
varying vec3 vN;
varying vec3 vW;
void main() {
    vec3 n = normalize(vN);
    vec3 v = normalize(uCam - vW);
    float d = max(dot(n, uLight), 0.0);
    float hemi = 0.5 + 0.5 * n.y;
    vec3 col = uColor * (0.40 + 0.25 * hemi + 0.45 * d);
    vec3 h = normalize(uLight + v);
    float sp = pow(max(dot(n, h), 0.0), 36.0) * uGloss;
    float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.16;
    col += vec3(sp) + uColor * rim;
    float dist = length(uCam - vW);
    float f = clamp((dist - uFogRange.x) / (uFogRange.y - uFogRange.x), 0.0, 1.0);
    col = mix(col, uFog, f);
    gl_FragColor = vec4(col * uAlpha, uAlpha);
}
"""

private const val TEX_VS = """
uniform mat4 uMVP;
attribute vec3 aPos;
attribute vec2 aUV;
varying vec2 vUV;
void main() {
    vUV = aUV;
    gl_Position = uMVP * vec4(aPos, 1.0);
}
"""

private const val TEX_FS = """
precision mediump float;
uniform sampler2D uTex;
uniform vec4 uTint;
uniform float uMask;
varying vec2 vUV;
void main() {
    vec4 c = texture2D(uTex, vUV);
    if (uMask > 0.5) {
        gl_FragColor = vec4(uTint.rgb * c.a, c.a) * uTint.a;
    } else {
        gl_FragColor = c * uTint.a;
    }
}
"""

private const val SKY_VS = """
attribute vec2 aP;
varying float vY;
void main() {
    vY = aP.y * 0.5 + 0.5;
    gl_Position = vec4(aP, 0.999, 1.0);
}
"""

private const val SKY_FS = """
precision mediump float;
varying float vY;
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uBot;
void main() {
    float h = 0.66;
    vec3 c;
    if (vY > h) {
        c = mix(uMid, uTop, smoothstep(0.0, 1.0, (vY - h) / (1.0 - h)));
    } else {
        c = mix(uBot, uMid, smoothstep(0.0, 1.0, vY / h));
    }
    gl_FragColor = vec4(c, 1.0);
}
"""

class GameRenderer(private val game: Game) : GLSurfaceView.Renderer {

    private class Mesh(val vbo: Int, val count: Int)
    private class TexInfo(val id: Int, val aspect: Float)

    private var vw = 1
    private var vh = 1
    private var lastNs = 0L

    private var progMesh = 0
    private var progTex = 0
    private var progSky = 0

    private var mMVP = 0
    private var mModel = 0
    private var mNrm = 0
    private var mColor = 0
    private var mAlpha = 0
    private var mGloss = 0
    private var mLight = 0
    private var mCam = 0
    private var mFog = 0
    private var mFogRange = 0

    private var tMVP = 0
    private var tTex = 0
    private var tTint = 0
    private var tMask = 0

    private var sTop = 0
    private var sMid = 0
    private var sBot = 0

    private var sphere = Mesh(0, 0)
    private var cube = Mesh(0, 0)
    private var cyl = Mesh(0, 0)
    private var cone = Mesh(0, 0)
    private var quadGround = 0
    private var quadVert = 0
    private var skyVbo = 0
    private var shadowTex = 0

    private val proj = FloatArray(16)
    private val view = FloatArray(16)
    private val vp = FloatArray(16)
    private val model = FloatArray(16)
    private val mvp = FloatArray(16)
    private val nm = FloatArray(9)
    private val tmp4 = FloatArray(4)
    private val out4 = FloatArray(4)
    private val camPos = FloatArray(3)
    private var projX = 0f
    private var projY = 0f
    private var projW = 0f

    private val labels = HashMap<String, TexInfo>()

    // golge kayitlari
    private val shX = FloatArray(160)
    private val shZ = FloatArray(160)
    private val shK = FloatArray(160)
    private var shN = 0

    // aktif asker donusumu
    private var sX = 0f
    private var sZ = 0f
    private var sC = 1f
    private var sS = 0f
    private var sRy = 0f
    private var sK = 1f

    private val light = floatArrayOf(-0.40f, 0.85f, 0.50f)

    // ------------------------------------------------------------ kurulum

    override fun onSurfaceCreated(gl: GL10?, config: EGLConfig?) {
        GLES20.glEnable(GLES20.GL_DEPTH_TEST)
        GLES20.glDepthFunc(GLES20.GL_LEQUAL)
        GLES20.glDisable(GLES20.GL_CULL_FACE)

        progMesh = program(MESH_VS, MESH_FS, arrayOf("aPos", "aNrm"))
        progTex = program(TEX_VS, TEX_FS, arrayOf("aPos", "aUV"))
        progSky = program(SKY_VS, SKY_FS, arrayOf("aP"))

        mMVP = GLES20.glGetUniformLocation(progMesh, "uMVP")
        mModel = GLES20.glGetUniformLocation(progMesh, "uModel")
        mNrm = GLES20.glGetUniformLocation(progMesh, "uNrm")
        mColor = GLES20.glGetUniformLocation(progMesh, "uColor")
        mAlpha = GLES20.glGetUniformLocation(progMesh, "uAlpha")
        mGloss = GLES20.glGetUniformLocation(progMesh, "uGloss")
        mLight = GLES20.glGetUniformLocation(progMesh, "uLight")
        mCam = GLES20.glGetUniformLocation(progMesh, "uCam")
        mFog = GLES20.glGetUniformLocation(progMesh, "uFog")
        mFogRange = GLES20.glGetUniformLocation(progMesh, "uFogRange")

        tMVP = GLES20.glGetUniformLocation(progTex, "uMVP")
        tTex = GLES20.glGetUniformLocation(progTex, "uTex")
        tTint = GLES20.glGetUniformLocation(progTex, "uTint")
        tMask = GLES20.glGetUniformLocation(progTex, "uMask")

        sTop = GLES20.glGetUniformLocation(progSky, "uTop")
        sMid = GLES20.glGetUniformLocation(progSky, "uMid")
        sBot = GLES20.glGetUniformLocation(progSky, "uBot")

        val l = sqrt(light[0] * light[0] + light[1] * light[1] + light[2] * light[2])
        light[0] /= l
        light[1] /= l
        light[2] /= l

        sphere = buildSphere()
        cube = buildCube()
        cyl = buildCylinder(1f, 1f)
        cone = buildCylinder(1f, 0f)
        quadGround = makeVbo(
            floatArrayOf(
                -0.5f, 0f, -0.5f, 0f, 0f,
                0.5f, 0f, -0.5f, 1f, 0f,
                0.5f, 0f, 0.5f, 1f, 1f,
                -0.5f, 0f, -0.5f, 0f, 0f,
                0.5f, 0f, 0.5f, 1f, 1f,
                -0.5f, 0f, 0.5f, 0f, 1f
            )
        )
        quadVert = makeVbo(
            floatArrayOf(
                -0.5f, -0.5f, 0f, 0f, 1f,
                0.5f, -0.5f, 0f, 1f, 1f,
                0.5f, 0.5f, 0f, 1f, 0f,
                -0.5f, -0.5f, 0f, 0f, 1f,
                0.5f, 0.5f, 0f, 1f, 0f,
                -0.5f, 0.5f, 0f, 0f, 0f
            )
        )
        skyVbo = makeVbo(floatArrayOf(-1f, -1f, 1f, -1f, -1f, 1f, 1f, 1f))

        labels.clear()
        shadowTex = makeShadowTex()
        game.glReady = true
    }

    override fun onSurfaceChanged(gl: GL10?, width: Int, height: Int) {
        vw = max(1, width)
        vh = max(1, height)
        GLES20.glViewport(0, 0, vw, vh)
    }

    private fun compile(type: Int, src: String): Int {
        val s = GLES20.glCreateShader(type)
        GLES20.glShaderSource(s, src)
        GLES20.glCompileShader(s)
        val ok = IntArray(1)
        GLES20.glGetShaderiv(s, GLES20.GL_COMPILE_STATUS, ok, 0)
        if (ok[0] == 0) Log.e("GateRush", "Shader hatasi: " + GLES20.glGetShaderInfoLog(s))
        return s
    }

    private fun program(vs: String, fs: String, attribs: Array<String>): Int {
        val p = GLES20.glCreateProgram()
        GLES20.glAttachShader(p, compile(GLES20.GL_VERTEX_SHADER, vs))
        GLES20.glAttachShader(p, compile(GLES20.GL_FRAGMENT_SHADER, fs))
        for (i in attribs.indices) GLES20.glBindAttribLocation(p, i, attribs[i])
        GLES20.glLinkProgram(p)
        val ok = IntArray(1)
        GLES20.glGetProgramiv(p, GLES20.GL_LINK_STATUS, ok, 0)
        if (ok[0] == 0) Log.e("GateRush", "Link hatasi: " + GLES20.glGetProgramInfoLog(p))
        return p
    }

    private fun makeVbo(data: FloatArray): Int {
        val bb = ByteBuffer.allocateDirect(data.size * 4).order(ByteOrder.nativeOrder())
        val fb = bb.asFloatBuffer()
        fb.put(data)
        fb.position(0)
        val ids = IntArray(1)
        GLES20.glGenBuffers(1, ids, 0)
        GLES20.glBindBuffer(GLES20.GL_ARRAY_BUFFER, ids[0])
        GLES20.glBufferData(GLES20.GL_ARRAY_BUFFER, data.size * 4, fb, GLES20.GL_STATIC_DRAW)
        GLES20.glBindBuffer(GLES20.GL_ARRAY_BUFFER, 0)
        return ids[0]
    }

    // ------------------------------------------------------------ mesh uretimi

    private fun put(o: FloatArray, i: Int, x: Float, y: Float, z: Float, nx: Float, ny: Float, nz: Float): Int {
        o[i] = x
        o[i + 1] = y
        o[i + 2] = z
        o[i + 3] = nx
        o[i + 4] = ny
        o[i + 5] = nz
        return i + 6
    }

    private fun buildSphere(): Mesh {
        val stacks = 10
        val slices = 14
        val out = FloatArray(stacks * slices * 6 * 6)
        var o = 0
        for (i in 0 until stacks) {
            val la0 = PI_F * i / stacks - PI_F / 2f
            val la1 = PI_F * (i + 1) / stacks - PI_F / 2f
            for (j in 0 until slices) {
                val lo0 = 2f * PI_F * j / slices
                val lo1 = 2f * PI_F * (j + 1) / slices
                val ax = cos(la0) * cos(lo0); val ay = sin(la0); val az = cos(la0) * sin(lo0)
                val bx = cos(la1) * cos(lo0); val by = sin(la1); val bz = cos(la1) * sin(lo0)
                val cx = cos(la1) * cos(lo1); val cy = sin(la1); val cz = cos(la1) * sin(lo1)
                val dx = cos(la0) * cos(lo1); val dy = sin(la0); val dz = cos(la0) * sin(lo1)
                o = put(out, o, ax, ay, az, ax, ay, az)
                o = put(out, o, bx, by, bz, bx, by, bz)
                o = put(out, o, cx, cy, cz, cx, cy, cz)
                o = put(out, o, ax, ay, az, ax, ay, az)
                o = put(out, o, cx, cy, cz, cx, cy, cz)
                o = put(out, o, dx, dy, dz, dx, dy, dz)
            }
        }
        return Mesh(makeVbo(out), out.size / 6)
    }

    private fun buildCube(): Mesh {
        // her yuz: n, u, v
        val faces = arrayOf(
            floatArrayOf(1f, 0f, 0f, 0f, 1f, 0f, 0f, 0f, 1f),
            floatArrayOf(-1f, 0f, 0f, 0f, 1f, 0f, 0f, 0f, 1f),
            floatArrayOf(0f, 1f, 0f, 1f, 0f, 0f, 0f, 0f, 1f),
            floatArrayOf(0f, -1f, 0f, 1f, 0f, 0f, 0f, 0f, 1f),
            floatArrayOf(0f, 0f, 1f, 1f, 0f, 0f, 0f, 1f, 0f),
            floatArrayOf(0f, 0f, -1f, 1f, 0f, 0f, 0f, 1f, 0f)
        )
        val ca = floatArrayOf(-1f, 1f, 1f, -1f)
        val cb = floatArrayOf(-1f, -1f, 1f, 1f)
        val order = intArrayOf(0, 1, 2, 0, 2, 3)
        val out = FloatArray(6 * 6 * 6)
        var o = 0
        for (f in faces) {
            for (k in order) {
                val a = ca[k]
                val b = cb[k]
                val x = f[0] * 0.5f + f[3] * 0.5f * a + f[6] * 0.5f * b
                val y = f[1] * 0.5f + f[4] * 0.5f * a + f[7] * 0.5f * b
                val z = f[2] * 0.5f + f[5] * 0.5f * a + f[8] * 0.5f * b
                o = put(out, o, x, y, z, f[0], f[1], f[2])
            }
        }
        return Mesh(makeVbo(out), out.size / 6)
    }

    /** Yuksekligi 1, y ekseni etrafinda, -0.5..0.5. rb alt, rt ust yaricap. */
    private fun buildCylinder(rb: Float, rt: Float): Mesh {
        val seg = 16
        val out = FloatArray(seg * (6 + 3) * 6)
        var o = 0
        val ny = (rb - rt)
        for (i in 0 until seg) {
            val a0 = 2f * PI_F * i / seg
            val a1 = 2f * PI_F * (i + 1) / seg
            val c0 = cos(a0); val s0 = sin(a0)
            val c1 = cos(a1); val s1 = sin(a1)
            val l0 = sqrt(c0 * c0 + ny * ny + s0 * s0)
            val l1 = sqrt(c1 * c1 + ny * ny + s1 * s1)
            val n0x = c0 / l0; val n0y = ny / l0; val n0z = s0 / l0
            val n1x = c1 / l1; val n1y = ny / l1; val n1z = s1 / l1
            o = put(out, o, c0 * rb, -0.5f, s0 * rb, n0x, n0y, n0z)
            o = put(out, o, c1 * rb, -0.5f, s1 * rb, n1x, n1y, n1z)
            o = put(out, o, c1 * rt, 0.5f, s1 * rt, n1x, n1y, n1z)
            o = put(out, o, c0 * rb, -0.5f, s0 * rb, n0x, n0y, n0z)
            o = put(out, o, c1 * rt, 0.5f, s1 * rt, n1x, n1y, n1z)
            o = put(out, o, c0 * rt, 0.5f, s0 * rt, n0x, n0y, n0z)
            // ust kapak
            o = put(out, o, 0f, 0.5f, 0f, 0f, 1f, 0f)
            o = put(out, o, c0 * rt, 0.5f, s0 * rt, 0f, 1f, 0f)
            o = put(out, o, c1 * rt, 0.5f, s1 * rt, 0f, 1f, 0f)
        }
        return Mesh(makeVbo(out), out.size / 6)
    }

    private fun makeShadowTex(): Int {
        val s = 64
        val bmp = Bitmap.createBitmap(s, s, Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp)
        val p = Paint(Paint.ANTI_ALIAS_FLAG)
        p.shader = RadialGradient(
            s / 2f, s / 2f, s / 2f,
            intArrayOf(0xFF000000.toInt(), 0x80000000.toInt(), 0x00000000),
            floatArrayOf(0f, 0.55f, 1f),
            Shader.TileMode.CLAMP
        )
        c.drawCircle(s / 2f, s / 2f, s / 2f, p)
        val id = uploadTexture(bmp, false)
        bmp.recycle()
        return id
    }

    private fun uploadTexture(bmp: Bitmap, mips: Boolean): Int {
        val ids = IntArray(1)
        GLES20.glGenTextures(1, ids, 0)
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, ids[0])
        GLES20.glTexParameteri(
            GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MIN_FILTER,
            if (mips) GLES20.GL_LINEAR_MIPMAP_LINEAR else GLES20.GL_LINEAR
        )
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE)
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE)
        GLUtils.texImage2D(GLES20.GL_TEXTURE_2D, 0, bmp, 0)
        if (mips) GLES20.glGenerateMipmap(GLES20.GL_TEXTURE_2D)
        return ids[0]
    }

    private fun label(text: String): TexInfo {
        labels[text]?.let { return it }
        val bw = 512
        val bh = 256
        val bmp = Bitmap.createBitmap(bw, bh, Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp)
        val p = Paint(Paint.ANTI_ALIAS_FLAG)
        p.typeface = Fonts.face
        p.textAlign = Paint.Align.CENTER
        var size = 190f
        p.textSize = size
        val tw = p.measureText(text)
        if (tw > bw * 0.84f) {
            size *= bw * 0.84f / tw
            p.textSize = size
        }
        val y = bh / 2f + size * 0.36f
        p.style = Paint.Style.STROKE
        p.strokeWidth = size * 0.2f
        p.strokeJoin = Paint.Join.ROUND
        p.color = 0xFF2A1B5E.toInt()
        c.drawText(text, bw / 2f, y, p)
        p.style = Paint.Style.FILL
        p.color = 0xFFFFFFFF.toInt()
        c.drawText(text, bw / 2f, y, p)
        val id = uploadTexture(bmp, true)
        bmp.recycle()
        val info = TexInfo(id, bw.toFloat() / bh)
        labels[text] = info
        return info
    }

    // ------------------------------------------------------------ cizim yardimcilari

    private fun part(
        m: Mesh, tx: Float, ty: Float, tz: Float, ry: Float,
        sx: Float, sy: Float, sz: Float,
        r: Float, g: Float, b: Float, alpha: Float, gloss: Float
    ) {
        val c = cos(ry)
        val s = sin(ry)
        model[0] = c * sx; model[1] = 0f; model[2] = -s * sx; model[3] = 0f
        model[4] = 0f; model[5] = sy; model[6] = 0f; model[7] = 0f
        model[8] = s * sz; model[9] = 0f; model[10] = c * sz; model[11] = 0f
        model[12] = tx; model[13] = ty; model[14] = tz; model[15] = 1f
        nm[0] = c / sx; nm[1] = 0f; nm[2] = -s / sx
        nm[3] = 0f; nm[4] = 1f / sy; nm[5] = 0f
        nm[6] = s / sz; nm[7] = 0f; nm[8] = c / sz
        Matrix.multiplyMM(mvp, 0, vp, 0, model, 0)
        GLES20.glUniformMatrix4fv(mMVP, 1, false, mvp, 0)
        GLES20.glUniformMatrix4fv(mModel, 1, false, model, 0)
        GLES20.glUniformMatrix3fv(mNrm, 1, false, nm, 0)
        GLES20.glUniform3f(mColor, r, g, b)
        GLES20.glUniform1f(mAlpha, alpha)
        GLES20.glUniform1f(mGloss, gloss)
        GLES20.glBindBuffer(GLES20.GL_ARRAY_BUFFER, m.vbo)
        GLES20.glEnableVertexAttribArray(0)
        GLES20.glVertexAttribPointer(0, 3, GLES20.GL_FLOAT, false, 24, 0)
        GLES20.glEnableVertexAttribArray(1)
        GLES20.glVertexAttribPointer(1, 3, GLES20.GL_FLOAT, false, 24, 12)
        GLES20.glDrawArrays(GLES20.GL_TRIANGLES, 0, m.count)
    }

    private fun quadTex(
        vertical: Boolean, tex: Int,
        tx: Float, ty: Float, tz: Float,
        sx: Float, sy: Float, sz: Float,
        r: Float, g: Float, b: Float, a: Float, mask: Boolean
    ) {
        Matrix.setIdentityM(model, 0)
        model[0] = sx
        model[5] = sy
        model[10] = sz
        model[12] = tx
        model[13] = ty
        model[14] = tz
        Matrix.multiplyMM(mvp, 0, vp, 0, model, 0)
        GLES20.glUniformMatrix4fv(tMVP, 1, false, mvp, 0)
        GLES20.glUniform4f(tTint, r, g, b, a)
        GLES20.glUniform1f(tMask, if (mask) 1f else 0f)
        GLES20.glActiveTexture(GLES20.GL_TEXTURE0)
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, tex)
        GLES20.glUniform1i(tTex, 0)
        GLES20.glBindBuffer(GLES20.GL_ARRAY_BUFFER, if (vertical) quadVert else quadGround)
        GLES20.glEnableVertexAttribArray(0)
        GLES20.glVertexAttribPointer(0, 3, GLES20.GL_FLOAT, false, 20, 0)
        GLES20.glEnableVertexAttribArray(1)
        GLES20.glVertexAttribPointer(1, 2, GLES20.GL_FLOAT, false, 20, 12)
        GLES20.glDrawArrays(GLES20.GL_TRIANGLES, 0, 6)
    }

    private fun useMesh() {
        GLES20.glUseProgram(progMesh)
    }

    private fun useTex() {
        GLES20.glUseProgram(progTex)
    }

    private fun rz(d: Float) = -(d - game.zP)

    // ------------------------------------------------------------ kare

    override fun onDrawFrame(gl: GL10?) {
        val now = System.nanoTime()
        val dt = if (lastNs == 0L) 0.016f else (now - lastNs) / 1_000_000_000f
        lastNs = now
        game.update(dt)

        GLES20.glClearColor(0.86f, 0.92f, 1f, 1f)
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT or GLES20.GL_DEPTH_BUFFER_BIT)
        if (game.stage == Stage.SPLASH) return

        drawSky()
        setupCamera()

        useMesh()
        GLES20.glUniform3f(mLight, light[0], light[1], light[2])
        GLES20.glUniform3f(mCam, camPos[0], camPos[1], camPos[2])
        GLES20.glUniform3f(mFog, 0.86f, 0.92f, 1f)
        GLES20.glUniform2f(mFogRange, 45f, 125f)

        shN = 0
        drawPlatform()
        drawClouds()
        drawEnemies()
        drawSquad()
        drawGateFrames()
        drawParticles()

        GLES20.glEnable(GLES20.GL_BLEND)
        GLES20.glBlendFunc(GLES20.GL_ONE, GLES20.GL_ONE_MINUS_SRC_ALPHA)
        GLES20.glDepthMask(false)
        drawShadows()
        drawGateGlass()
        GLES20.glDepthMask(true)
        GLES20.glDisable(GLES20.GL_BLEND)

        buildTags()
    }

    private fun setupCamera() {
        val aspect = vw.toFloat() / vh.toFloat()
        // yatay gorus ~46 derece olacak sekilde dikey FOV hesapla
        val halfH = atan(tan(23f * PI_F / 180f) / aspect)
        val fov = (halfH * 2f * 180f / PI_F).coerceIn(55f, 85f)
        Matrix.perspectiveM(proj, 0, fov, aspect, 0.5f, 220f)
        val sh = game.shake * 0.35f
        val ex = game.playerX * 0.55f + (Random.nextFloat() - 0.5f) * sh
        val ey = 6.2f + (Random.nextFloat() - 0.5f) * sh
        val ez = 9.5f
        camPos[0] = ex
        camPos[1] = ey
        camPos[2] = ez
        Matrix.setLookAtM(view, 0, ex, ey, ez, game.playerX * 0.35f, 0.6f, -9f, 0f, 1f, 0f)
        Matrix.multiplyMM(vp, 0, proj, 0, view, 0)
    }

    private fun drawSky() {
        GLES20.glDisable(GLES20.GL_DEPTH_TEST)
        GLES20.glUseProgram(progSky)
        GLES20.glUniform3f(sTop, 0.36f, 0.62f, 0.98f)
        GLES20.glUniform3f(sMid, 0.86f, 0.92f, 1f)
        GLES20.glUniform3f(sBot, 0.66f, 0.72f, 0.97f)
        GLES20.glBindBuffer(GLES20.GL_ARRAY_BUFFER, skyVbo)
        GLES20.glDisableVertexAttribArray(1)
        GLES20.glEnableVertexAttribArray(0)
        GLES20.glVertexAttribPointer(0, 2, GLES20.GL_FLOAT, false, 8, 0)
        GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, 4)
        GLES20.glEnable(GLES20.GL_DEPTH_TEST)
    }

    // ------------------------------------------------------------ sahne

    private fun drawPlatform() {
        val len = 6f
        val zp = game.zP
        val k0 = floor((zp - 14f) / len).toInt()
        for (i in 0..26) {
            val k = k0 + i
            val d0 = k * len
            val cz = -(d0 + len * 0.5f - zp)
            val even = (k and 1) == 0
            if (even) part(cube, 0f, -0.6f, cz, 0f, 6.4f, 1.2f, len + 0.02f, 0.98f, 0.98f, 1f, 1f, 0f)
            else part(cube, 0f, -0.6f, cz, 0f, 6.4f, 1.2f, len + 0.02f, 0.90f, 0.93f, 0.99f, 1f, 0f)
            val er = if (even) 1f else 1f
            val eg = if (even) 0.60f else 1f
            val eb = if (even) 0.72f else 1f
            part(cube, -3.35f, -0.04f, cz, 0f, 0.42f, 0.34f, len + 0.02f, er, eg, eb, 1f, 0.35f)
            part(cube, 3.35f, -0.04f, cz, 0f, 0.42f, 0.34f, len + 0.02f, er, eg, eb, 1f, 0.35f)
            if (even) part(cube, 0f, 0.012f, cz, 0f, 0.10f, 0.02f, 2.4f, 0.80f, 0.85f, 0.96f, 1f, 0f)
        }
    }

    private fun drawClouds() {
        val period = 190f
        val zp = game.zP
        for (i in 0 until 14) {
            val base = i * 13.7f
            val d = base + floor((zp - 30f - base) / period) * period + period
            val z = rz(d)
            val side = if (i % 2 == 0) -1f else 1f
            val x = side * (9f + ((i * 7) % 9) * 1.6f)
            val y = if (i % 3 == 0) 4f + (i % 4) else -3.5f - (i % 3)
            part(sphere, x, y, z, 0f, 3.0f, 1.5f, 2.2f, 1f, 1f, 1f, 1f, 0f)
            part(sphere, x + 2.2f, y - 0.2f, z + 0.3f, 0f, 2.2f, 1.2f, 1.8f, 0.98f, 0.98f, 1f, 1f, 0f)
            part(sphere, x - 2.0f, y - 0.1f, z - 0.2f, 0f, 2.0f, 1.1f, 1.6f, 0.97f, 0.98f, 1f, 1f, 0f)
        }
    }

    // ------------------------------------------------------------ askerler

    private fun sp(
        ox: Float, oy: Float, oz: Float, sx: Float, sy: Float, sz: Float,
        m: Mesh, r: Float, g: Float, b: Float, gloss: Float
    ) {
        val wx = sX + (sC * ox + sS * oz) * sK
        val wz = sZ + (-sS * ox + sC * oz) * sK
        part(m, wx, oy * sK, wz, sRy, sx * sK, sy * sK, sz * sK, r, g, b, 1f, gloss)
    }

    /** anim: 0 durgun, 1 kosu, 2 dovus, 3 hafif nefes */
    private fun soldier(
        x: Float, z: Float, ry: Float, k: Float,
        br: Float, bg: Float, bb: Float,
        cr: Float, cg: Float, cb: Float,
        phase: Float, anim: Int, eyes: Boolean
    ) {
        sX = x
        sZ = z
        sRy = ry
        sK = k
        sC = cos(ry)
        sS = sin(ry)
        val tt = game.t
        val w = when (anim) {
            1 -> sin(tt * 12f + phase)
            2 -> sin(tt * 22f + phase) * 0.7f
            else -> 0f
        }
        val bob = when (anim) {
            1 -> abs(sin(tt * 12f + phase)) * 0.07f
            2 -> abs(sin(tt * 22f + phase)) * 0.05f
            3 -> (1f + sin(tt * 3f + phase)) * 0.015f
            else -> 0f
        }
        if (shN < shX.size) {
            shX[shN] = x
            shZ[shN] = z
            shK[shN] = k
            shN++
        }
        // bacaklar
        sp(-0.13f, 0.26f + max(0f, w) * 0.06f, 0.12f * w, 0.11f, 0.26f, 0.12f, sphere, br * 0.55f, bg * 0.55f, bb * 0.6f, 0.1f)
        sp(0.13f, 0.26f + max(0f, -w) * 0.06f, -0.12f * w, 0.11f, 0.26f, 0.12f, sphere, br * 0.55f, bg * 0.55f, bb * 0.6f, 0.1f)
        // govde
        sp(0f, 0.74f + bob, 0f, 0.27f, 0.35f, 0.23f, sphere, br, bg, bb, 0.35f)
        // kollar
        sp(-0.35f, 0.76f + bob, -0.12f * w, 0.085f, 0.23f, 0.095f, sphere, br, bg, bb, 0.3f)
        sp(0.35f, 0.76f + bob, 0.12f * w, 0.085f, 0.23f, 0.095f, sphere, br, bg, bb, 0.3f)
        // sirt cantasi
        sp(0f, 0.78f + bob, -0.21f, 0.19f, 0.24f, 0.10f, sphere, 0.98f, 0.90f, 0.70f, 0.2f)
        // kafa
        sp(0f, 1.30f + bob, 0f, 0.28f, 0.28f, 0.28f, sphere, 1f, 0.83f, 0.69f, 0.45f)
        // sapka
        sp(0f, 1.43f + bob, -0.03f, 0.295f, 0.19f, 0.295f, sphere, cr, cg, cb, 0.5f)
        if (eyes) {
            sp(-0.10f, 1.31f + bob, 0.245f, 0.045f, 0.055f, 0.035f, sphere, 0.1f, 0.1f, 0.16f, 0.8f)
            sp(0.10f, 1.31f + bob, 0.245f, 0.045f, 0.055f, 0.035f, sphere, 0.1f, 0.1f, 0.16f, 0.8f)
            sp(-0.17f, 1.22f + bob, 0.22f, 0.05f, 0.03f, 0.02f, sphere, 1f, 0.55f, 0.6f, 0f)
            sp(0.17f, 1.22f + bob, 0.22f, 0.05f, 0.03f, 0.02f, sphere, 1f, 0.55f, 0.6f, 0f)
        }
    }

    private fun drawSquad() {
        val cnt = game.squadCount
        val shown = min(cnt, 30)
        if (shown <= 0) return
        val anim = if (game.stage == Stage.PLAY && game.fight != null) 2 else 1
        val moving = game.stage == Stage.MENU || game.stage == Stage.PLAY
        for (i in 0 until shown) {
            val rr = sqrt(i + 0.5f) * 0.36f
            val a = i * 2.39996f
            val fx = rr * cos(a) + sin(game.t * 3f + i) * 0.03f
            val fz = rr * sin(a) * 0.85f
            soldier(
                game.playerX + fx, fz, PI_F, 0.8f,
                0.20f, 0.60f, 1f, 0.10f, 0.32f, 0.78f,
                i * 0.7f, if (moving) anim else 0, false
            )
        }
    }

    private fun drawEnemies() {
        for (e in game.enemies) {
            if (e.dead) continue
            val z = rz(e.z)
            if (z < -150f || z > 14f) continue
            val fighting = game.fight === e
            if (e.boss) {
                soldier(
                    e.x, z, 0f, 2.6f,
                    0.62f, 0.12f, 0.70f, 0.36f, 0.05f, 0.42f,
                    0f, if (fighting) 2 else 3, true
                )
                sp(-0.17f, 1.68f, 0f, 0.07f, 0.28f, 0.07f, cone, 1f, 0.92f, 0.70f, 0.4f)
                sp(0.17f, 1.68f, 0f, 0.07f, 0.28f, 0.07f, cone, 1f, 0.92f, 0.70f, 0.4f)
            } else {
                val shown = max(1, ceil(min(e.maxHp, 28f) * (e.hp / e.maxHp)).toInt())
                for (i in 0 until shown) {
                    val rr = sqrt(i + 0.5f) * 0.36f
                    val a = i * 2.39996f
                    val fx = rr * cos(a)
                    val fz = rr * sin(a) * 0.85f
                    soldier(
                        e.x + fx, z + fz, 0f, 0.8f,
                        0.97f, 0.28f, 0.32f, 0.55f, 0.08f, 0.16f,
                        i * 0.5f, if (fighting) 2 else 3, true
                    )
                }
            }
        }
    }

    // ------------------------------------------------------------ kapilar

    private fun drawGateFrames() {
        for (g in game.gates) {
            val z = rz(g.z)
            if (z < -150f || z > 14f) continue
            for (side in 0..1) {
                val op = if (side == 0) g.lOp else g.rOp
                val good = game.isGood(op)
                val r = if (good) 0.18f else 1f
                val gg = if (good) 0.62f else 0.28f
                val b = if (good) 1f else 0.38f
                val cx = if (side == 0) -1.5f else 1.5f
                part(cube, cx, 3.25f, z, 0f, 2.95f, 0.38f, 0.30f, r, gg, b, 1f, 0.5f)
                part(cube, cx, 0.05f, z, 0f, 2.95f, 0.10f, 0.40f, r * 0.9f, gg * 0.9f, b * 0.9f, 1f, 0.3f)
            }
            for (px in floatArrayOf(-3.0f, 0f, 3.0f)) {
                part(cyl, px, 1.7f, z, 0f, 0.16f, 3.4f, 0.16f, 0.97f, 0.97f, 1f, 1f, 0.5f)
                part(sphere, px, 3.5f, z, 0f, 0.24f, 0.24f, 0.24f, 1f, 0.80f, 0.20f, 1f, 0.7f)
            }
        }
    }

    private fun drawGateGlass() {
        val gates = game.gates
        for (idx in gates.indices.reversed()) {
            val g = gates[idx]
            val z = rz(g.z)
            if (z < -150f || z > 14f) continue
            useMesh()
            for (side in 0..1) {
                val op = if (side == 0) g.lOp else g.rOp
                val good = game.isGood(op)
                val r = if (good) 0.18f else 1f
                val gg = if (good) 0.62f else 0.28f
                val b = if (good) 1f else 0.38f
                val cx = if (side == 0) -1.5f else 1.5f
                part(cube, cx, 1.65f, z, 0f, 2.9f, 3.0f, 0.06f, r, gg, b, 0.36f, 0.6f)
            }
            useTex()
            for (side in 0..1) {
                val op = if (side == 0) g.lOp else g.rOp
                val v = if (side == 0) g.lVal else g.rVal
                val good = game.isGood(op)
                val r = if (good) 0.18f else 1f
                val gg = if (good) 0.62f else 0.28f
                val b = if (good) 1f else 0.38f
                val cx = if (side == 0) -1.5f else 1.5f
                quadTex(false, shadowTex, cx, 0.02f, z - 1.0f, 2.9f, 1f, 2.6f, r, gg, b, 0.55f, true)
                val lb = label(game.gateText(op, v))
                quadTex(true, lb.id, cx, 1.75f, z + 0.10f, 2.6f, 2.6f / lb.aspect, 1f, 1f, 1f, 1f, 1f, false)
            }
        }
    }

    private fun drawShadows() {
        useTex()
        for (i in 0 until shN) {
            val k = shK[i]
            quadTex(
                false, shadowTex,
                shX[i] + 0.18f * k, 0.02f, shZ[i] - 0.12f * k,
                1.1f * k, 1f, 0.9f * k,
                0.18f, 0.12f, 0.35f, 0.38f, true
            )
        }
        for (g in game.gates) {
            val z = rz(g.z)
            if (z < -150f || z > 14f) continue
            quadTex(false, shadowTex, 0.5f, 0.02f, z - 0.9f, 6.6f, 1f, 1.8f, 0.18f, 0.12f, 0.35f, 0.22f, true)
        }
    }

    private fun drawParticles() {
        for (p in game.particles) {
            val f = (p.life / p.maxLife).coerceIn(0f, 1f)
            val s = p.size * (0.4f + 0.6f * f)
            part(sphere, p.x, p.y, rz(p.z), 0f, s, s, s, p.r, p.g, p.b, 1f, 0f)
        }
    }

    // ------------------------------------------------------------ etiketler

    private fun project(x: Float, y: Float, z: Float): Boolean {
        tmp4[0] = x
        tmp4[1] = y
        tmp4[2] = z
        tmp4[3] = 1f
        Matrix.multiplyMV(out4, 0, vp, 0, tmp4, 0)
        if (out4[3] <= 0.5f) return false
        projX = out4[0] / out4[3] * 0.5f + 0.5f
        projY = 1f - (out4[1] / out4[3] * 0.5f + 0.5f)
        projW = out4[3]
        return true
    }

    private fun buildTags() {
        val list = ArrayList<Tag>()
        val st = game.stage
        if (st == Stage.MENU || st == Stage.PLAY) {
            val cnt = game.squadCount
            if (cnt > 0) {
                val shown = min(cnt, 30)
                if (project(game.playerX, 2.1f + sqrt(shown.toFloat()) * 0.07f, 0f)) {
                    list.add(Tag(cnt.toString(), projX, projY, (11f / projW).coerceIn(0.6f, 1.4f), 0))
                }
            }
        }
        if (st == Stage.PLAY || st == Stage.AD) {
            for (e in game.enemies) {
                if (e.dead) continue
                val z = rz(e.z)
                if (z < -70f || z > 6f) continue
                val h = if (e.boss) 6.4f else 2.3f
                if (project(e.x, h, z)) {
                    val txt = if (e.boss) "BOSS " + e.hp.roundToInt() else e.hp.roundToInt().toString()
                    list.add(Tag(txt, projX, projY, (11f / projW).coerceIn(0.5f, 1.4f), if (e.boss) 2 else 1))
                }
            }
        }
        game.tags = list
    }
}
