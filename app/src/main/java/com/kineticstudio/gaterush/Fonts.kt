package com.kineticstudio.gaterush

import android.content.Context
import android.graphics.Typeface

object Fonts {
    @Volatile
    var face: Typeface = Typeface.create("sans-serif-black", Typeface.BOLD)

    fun init(ctx: Context) {
        try {
            face = Typeface.createFromAsset(ctx.assets, "fonts/LilitaOne-Regular.ttf")
        } catch (e: Throwable) {
            // font indirilemediyse varsayilan kalin font kullanilir
        }
    }
}
