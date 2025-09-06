import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Admin management API called')
    
    // Create Supabase client for auth
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ User not authenticated')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if current user is admin using admins table
    const { data: adminProfile } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single()
    
    if (!adminProfile) {
      console.log('❌ User not authorized as admin')
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get the request data
    const { email, action } = await request.json()
    
    if (!email || !action) {
      console.log('❌ Missing required parameters')
      return NextResponse.json({ error: 'Missing email or action' }, { status: 400 })
    }

    console.log('📝 Request data:', { email, action })

    // Get Supabase client with service key for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // For now, we'll just return success since the actual admin addition
    // requires code changes and deployment
    console.log('✅ Admin management request processed')
    
    return NextResponse.json({
      success: true,
      message: `Admin management request processed for ${email}`,
      note: 'To actually add admin users, update the AUTHORIZED_ADMIN_EMAILS array in lib/admin-auth.ts and redeploy'
    })

  } catch (error) {
    console.error('💥 Admin management error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Admin management GET called')
    
    // Create Supabase client for auth
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ User not authenticated')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if current user is admin using admins table
    const { data: adminProfile } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single()
    
    if (!adminProfile) {
      console.log('❌ User not authorized as admin')
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    // Get Supabase client with service key for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )

    // Get current admin users from admins table
    const { data: adminUsers, error } = await supabaseAdmin
      .from('admins')
      .select('user_id, email, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.log('❌ Error fetching admin users:', error)
      return NextResponse.json({ error: 'Failed to fetch admin users' }, { status: 500 })
    }

    console.log('✅ Admin users fetched successfully')
    
    return NextResponse.json({
      success: true,
      adminUsers: adminUsers || []
    })

  } catch (error) {
    console.error('💥 Admin management GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
