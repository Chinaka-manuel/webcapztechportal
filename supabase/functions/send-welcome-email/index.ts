import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  fullName: string;
  role: string;
  tempPassword: string;
  loginUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, role, tempPassword, loginUrl }: WelcomeEmailRequest = await req.json();

    console.log(`Sending welcome email to ${email}`);

    const emailResponse = await resend.emails.send({
      from: "WEBCAPZ <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to WEBCAPZ - Your Account Credentials",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .credentials h3 { margin-top: 0; color: #667eea; }
            .password-box { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .password { font-family: monospace; font-size: 18px; font-weight: bold; color: #92400e; }
            .warning { color: #dc2626; font-weight: bold; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to WEBCAPZ!</h1>
              <p>Your account has been created</p>
            </div>
            <div class="content">
              <p>Hello <strong>${fullName}</strong>,</p>
              <p>Your ${role} account has been successfully created. Below are your login credentials:</p>
              
              <div class="credentials">
                <h3>Your Login Details</h3>
                <p><strong>Email:</strong> ${email}</p>
                <div class="password-box">
                  <p><strong>Temporary Password:</strong></p>
                  <p class="password">${tempPassword}</p>
                </div>
              </div>
              
              <p class="warning">⚠️ Important: Please change your password immediately after your first login for security purposes.</p>
              
              <p>To login and change your password:</p>
              <ol>
                <li>Click the button below to access the login page</li>
                <li>Enter your email and temporary password</li>
                <li>Go to your profile settings to change your password</li>
              </ol>
              
              <center>
                <a href="${loginUrl}" class="button">Login to WEBCAPZ</a>
              </center>
              
              <div class="footer">
                <p>This is an automated message from WEBCAPZ School Management System.</p>
                <p>If you did not request this account, please ignore this email.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-welcome-email function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
