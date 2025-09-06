// app/api/stripe-webhook/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type Stripe from "stripe"
import { stripe } from "@/lib/stripe"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/* ---------------- Supabase admin client ---------------- */

function getAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY")
  return createClient(url, key)
}

/* ---------------- helpers ---------------- */

// Stripe Connect functionality removed



// Stripe Connect payouts removed - all money goes to main account

/* ---------------- core: mark tx + grant access ---------------- */

async function completeTxAndGrant(pi: Stripe.PaymentIntent) {
  const admin = getAdmin()
  
  console.log("[wh] Processing payment_intent.succeeded", { 
    piId: pi.id, 
    amount: pi.amount, 
    currency: pi.currency
  })

  // Use the new database function for reliable transaction updates
  try {
    const { data: result, error: rpcError } = await admin.rpc('update_transaction_on_payment_success', {
      p_stripe_payment_intent_id: pi.id,
      p_amount_cents: pi.amount,
      p_currency: pi.currency
    })
    
    if (rpcError) {
      console.error("[wh] RPC function failed:", rpcError.message)
    } else if (result) {
      console.log("[wh] Successfully updated transaction via RPC function for payment intent:", pi.id)
      return
    } else {
      console.warn("[wh] No transaction found for payment intent:", pi.id)
    }
  } catch (error) {
    console.error("[wh] RPC call failed:", error)
  }

  // Fallback: Direct update by stripe_payment_intent_id
  console.log("[wh] Trying direct update as fallback")
  const { data: directUpdate, error: directError } = await admin
    .from("marketplace_transactions")
    .update({ 
      status: "completed", 
      payment_status: "succeeded",
      updated_at: new Date().toISOString() 
    })
    .eq("stripe_payment_intent_id", pi.id)
    .select("id")
  
  if (directError) {
    console.error("[wh] Direct update by stripe_id failed:", directError.message)
  } else if (directUpdate && directUpdate.length > 0) {
    console.log("[wh] Successfully updated transaction by stripe_id:", directUpdate[0].id)
    return
  } else {
    console.warn("[wh] No transaction found with stripe_payment_intent_id:", pi.id)
  }

  // Asset ownership transfer handled by triggers in the database
  // No need for manual access grants in the new schema

  // All money goes to main account - no payouts needed
}

/* ---------------- credits (unchanged behavior) ---------------- */

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const admin = getAdmin()
  const md = (session.metadata ?? {}) as any
  if (md.kind !== "credits_purchase") return

  const userId = md.userId as string | undefined
  const credits = parseInt(md.credits ?? "0", 10)
  const amount_cents = session.amount_total ?? 0
  const piId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id || session.id

  if (!userId || !credits || credits <= 0) {
    console.warn("[wh] credits_purchase missing metadata", { userId, credits, md })
    return
  }

  const { error: insErr } = await admin.from("credits_ledger").insert({
    user_id: userId,
    payment_intent: piId,
    amount_cents,
    credits,
    reason: "purchase",
  })
  if (insErr && (insErr as any).code !== "23505") {
    console.error("[wh] ledger insert err:", insErr.message)
  }

  const { error: rpcErr } = await admin.rpc("increment_profile_credits", {
    p_user_id: userId,
    p_delta: credits,
  })
  if (rpcErr) {
    const { data: prof, error: readErr } = await admin
      .from("profiles") // Updated table name
      .select("credits")
      .eq("id", userId)
      .single()
    if (readErr) {
      const { error: createErr } = await admin
        .from("profiles") // Updated table name
        .upsert({ id: userId, credits }, { onConflict: "id" })
      if (createErr) console.error("[wh] upsert profile failed:", createErr.message)
    } else {
      const current = Number(prof?.credits ?? 0)
      const { error: upErr } = await admin
        .from("profiles") // Updated table name
        .upsert({ id: userId, credits: current + credits }, { onConflict: "id" })
      if (upErr) console.error("[wh] credits upsert failed:", upErr.message)
    }
  }
}

/* ---------------- route (synchronous!) ---------------- */

export async function POST(req: NextRequest) {
  const rawBody = Buffer.from(await req.arrayBuffer())
  const sig = req.headers.get("stripe-signature") ?? ""

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) return new NextResponse("webhook secret missing", { status: 500 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (e) {
    console.error("[wh] bad signature:", (e as any)?.message)
    return new NextResponse("bad sig", { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case "payment_intent.succeeded":
        await completeTxAndGrant(event.data.object as Stripe.PaymentIntent)
        break

      // Fallback: some setups only subscribe to charge.succeeded
      case "charge.succeeded": {
        const ch = event.data.object as Stripe.Charge
        const piId =
          typeof ch.payment_intent === "string"
            ? ch.payment_intent
            : ch.payment_intent?.id
        if (piId) {
          const pi = await stripe.paymentIntents.retrieve(piId)
          await completeTxAndGrant(pi)
        }
        break
      }

      default:
        // ignore others
        break
    }
  } catch (err) {
    console.error("[wh] handler error:", err)
    // Let Stripe retry on 5xx
    return new NextResponse("error", { status: 500 })
  }

  // ACK after work is done (prevents "pending" rows)
  return NextResponse.json({ received: true })
}
