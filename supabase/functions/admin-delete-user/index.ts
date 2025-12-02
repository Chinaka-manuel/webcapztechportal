import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify the requesting user is an admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !requestingUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if requesting user is admin
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
    
    const isAdmin = roles?.some(r => r.role === 'admin')
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { userId, userType } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get the user_id from the student/staff record
    let targetUserId = userId
    
    if (userType === 'student') {
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('user_id')
        .eq('id', userId)
        .single()
      
      if (student) {
        targetUserId = student.user_id
        // Delete student record first
        await supabaseAdmin.from('students').delete().eq('id', userId)
      }
    } else if (userType === 'staff') {
      const { data: staff } = await supabaseAdmin
        .from('staff')
        .select('user_id')
        .eq('id', userId)
        .single()
      
      if (staff) {
        targetUserId = staff.user_id
        // Delete staff record first
        await supabaseAdmin.from('staff').delete().eq('id', userId)
      }
    }

    // Delete user roles
    await supabaseAdmin.from('user_roles').delete().eq('user_id', targetUserId)
    
    // Delete profile
    await supabaseAdmin.from('profiles').delete().eq('id', targetUserId)
    
    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId)
    
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'User deleted successfully'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
