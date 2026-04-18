// Custom signup with Resend welcome email - bypasses client rate limits using service role

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const { email, password, name, redirect_to } = await req.json()

    if (!email || !password || password.length < 6) {
      return new Response(JSON.stringify({ error: 'Invalid email or password <6 chars' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const origin = redirect_to || 'http://localhost:8080'
    const projectId = 'wtizrycjhqometzmcaey' // from config.toml

    const supabaseUrl = `https://${projectId}.supabase.co`
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendKey = Deno.env.get('RESEND_API_KEY')

    if (!supabaseServiceKey || !resendKey) {
      return new Response(JSON.stringify({ error: 'Server config missing' }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Create confirmed user with service role (bypasses rate limits)
    const { data: user, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name || email.split('@')[0] }
    })

    if (error) {
      console.error('createUser error:', error)
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Send welcome email via Resend
    const html = `
      <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; line-height: 1.6; color: #333;">
        <h1 style="color: #6366f1;">Welcome to Aether, ${name || user.user.email.split('@')[0]}!</h1>
        <p>Your account has been created successfully.</p>
        <p><strong>Sign in here:</strong></p>
        <a href="${origin}/auth" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500;">Sign In</a>
        <p style="margin-top: 24px; font-size: 14px; color: #666;">If the button doesn't work, copy this link: ${origin}/auth</p>
        <hr />
        <p style="font-size: 12px; color: #999;">Aether — AI task agent</p>
      </div>
    `

    const resendResp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Aether <noreply@your-resend-verified.com>', // Update with verified domain
        to: [email],
        subject: 'Welcome to Aether — Your account is ready!',
        html,
      }),
    })

    if (!resendResp.ok) {
      const err = await resendResp.json()
      console.error('Resend error:', err)
      // Don't fail signup on email error
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Account created. Check email for welcome & sign in.' 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (err) {
    console.error('Signup error:', err)
    return new Response(JSON.stringify({ error: 'Internal error' }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})

