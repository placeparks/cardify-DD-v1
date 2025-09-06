import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// service-role (RLS bypass)
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// No platform fees - all money goes to main account

export async function POST(req: NextRequest) {
  try {
    const { listingId } = await req.json()
    if (!listingId) {
      return NextResponse.json({ error: 'Missing listingId' }, { status: 400 })
    }

    // IMPORTANT: pass the *function* `cookies` to the helper, not a resolved store
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { user },
    } = await supabase.auth.getUser()
    
    // Allow anonymous purchases - user can be null
    const buyerId = user?.id || null

  // Get listing
  const { data: listing, error: listErr } = await admin
    .from('marketplace_listings') // Updated table name
    .select('id, price_cents, currency, status, seller_id')
    .eq('id', listingId)
    .single()

  if (listErr || !listing || !(listing.status === 'active')) { // Updated status check
    return NextResponse.json({ error: 'Listing unavailable' }, { status: 409 })
  }

  // All sales go to main account - no Stripe Connect required

  const cents = listing.price_cents

  // No platform fees - all money goes to main account

  // Reuse pending tx if exists (only for authenticated users)
  let open = null
  if (buyerId) {
    const { data } = await admin
      .from('marketplace_transactions') // Updated table name
      .select('id, stripe_payment_intent_id') // Updated column name
      .eq('listing_id', listing.id)
      .eq('buyer_id', buyerId)
      .eq('status', 'pending')
      .maybeSingle()
    open = data
  }

  const makePI = async (): Promise<Stripe.PaymentIntent> =>
    stripe.paymentIntents.create({
      amount: cents,
      currency: (listing.currency || 'USD').toLowerCase(),
      metadata: {
        marketplace_listing_id: listing.id,
        marketplace_buyer_id: buyerId || 'anonymous',
        marketplace_seller_id: listing.seller_id,
      },
    })

  let intent: Stripe.PaymentIntent
  if (open?.stripe_payment_intent_id) {
    intent = await stripe.paymentIntents.retrieve(open.stripe_payment_intent_id)
    if (intent.status !== 'requires_payment_method') {
      intent = await makePI()
      await admin
        .from('marketplace_transactions') // Updated table name
        .update({
          stripe_payment_intent_id: intent.id, // Updated column name
          platform_fee_cents: 0, // No platform fees
          amount_cents: cents,
          currency: (listing.currency || 'USD').toUpperCase(),
        })
        .eq('id', open.id)
    }
  } else {
    intent = await makePI()
    await admin.from('marketplace_transactions').insert({ // Updated table name
      buyer_id: buyerId, // Can be null for anonymous buyers
      listing_id: listing.id,
      seller_id: listing.seller_id, // Added seller_id
      amount_cents: cents,
      currency: (listing.currency || 'USD').toUpperCase(),
      stripe_payment_intent_id: intent.id, // Updated column name
      status: 'pending',
      platform_fee_cents: 0, // No platform fees
    })
  }

  return NextResponse.json({
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    stripeAccount: null, // No Stripe Connect
  })
  } catch (error) {
    console.error('Payment intent creation error:', error)
    return NextResponse.json({ error: 'Payment intent creation failed' }, { status: 500 })
  }
}
