import { Resend } from "resend";

// Initialize Resend safely with a fallback so build never fails even if API key is not yet set
const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_fallback_for_build");

const FROM_EMAIL = "Aura Tasks <onboarding@resend.dev>";

// Debug function to check env vars
export function debugEmailConfig() {
  console.log("📋 Email Configuration Debug:");
  console.log("- RESEND_API_KEY:", process.env.RESEND_API_KEY ? "✅ SET" : "❌ MISSING");
  console.log("- NEXTAUTH_URL:", process.env.NEXTAUTH_URL || "❌ MISSING");
  console.log("- FROM_EMAIL:", FROM_EMAIL);
  console.log("- NODE_ENV:", process.env.NODE_ENV);
  console.log("- VERCEL_ENV:", process.env.VERCEL_ENV);
}

// =============================================
// Welcome Email (After Sign Up)
// =============================================
export async function sendWelcomeEmail(to: string, name: string) {
  try {
    console.log("🚀 Attempting to send Welcome Email to:", to);
    console.log("📧 Using Resend API Key:", process.env.RESEND_API_KEY ? "✅ SET" : "❌ MISSING");

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Welcome to Aura Tasks 🚀",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Aura Tasks</title>
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e1b4b,#1a1a2e);border-radius:20px;overflow:hidden;border:1px solid rgba(99,102,241,0.3);box-shadow:0 0 60px rgba(99,102,241,0.15);">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:40px 40px 30px;background:linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.1));">
              <div style="width:60px;height:60px;background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;box-shadow:0 8px 32px rgba(99,102,241,0.4);">
                <span style="color:white;font-size:28px;font-weight:900;line-height:60px;display:block;text-align:center;">A</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">Aura Tasks</h1>
              <p style="margin:8px 0 0;color:#a5b4fc;font-size:14px;">Modern Project Management</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#ffffff;font-size:24px;font-weight:700;">
                Welcome aboard, ${name}! 🎉
              </h2>
              <p style="margin:0 0 24px;color:#c7d2fe;font-size:15px;line-height:1.7;">
                We're thrilled to have you join <strong style="color:#a78bfa;">Aura Tasks</strong> — your new home for beautifully organized projects, kanban boards, and seamless team collaboration.
              </p>

              <!-- Features -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="padding:14px;background:rgba(99,102,241,0.1);border-radius:12px;border:1px solid rgba(99,102,241,0.2);margin-bottom:10px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="36" style="padding-right:14px;">
                          <div style="width:36px;height:36px;background:rgba(99,102,241,0.2);border-radius:8px;text-align:center;line-height:36px;font-size:18px;">📋</div>
                        </td>
                        <td>
                          <p style="margin:0;color:#e0e7ff;font-size:14px;font-weight:600;">Kanban Boards</p>
                          <p style="margin:2px 0 0;color:#818cf8;font-size:12px;">Visualize your workflow with drag & drop</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="10"></td></tr>
                <tr>
                  <td style="padding:14px;background:rgba(139,92,246,0.1);border-radius:12px;border:1px solid rgba(139,92,246,0.2);">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="36" style="padding-right:14px;">
                          <div style="width:36px;height:36px;background:rgba(139,92,246,0.2);border-radius:8px;text-align:center;line-height:36px;font-size:18px;">⚡</div>
                        </td>
                        <td>
                          <p style="margin:0;color:#e0e7ff;font-size:14px;font-weight:600;">Real-time Collaboration</p>
                          <p style="margin:2px 0 0;color:#a78bfa;font-size:12px;">Work together with your team seamlessly</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${process.env.NEXTAUTH_URL}/dashboard" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;letter-spacing:0.3px;box-shadow:0 8px 24px rgba(99,102,241,0.4);">
                      🚀 Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid rgba(99,102,241,0.2);text-align:center;">
              <p style="margin:0;color:#6366f1;font-size:12px;">© 2026 Aura Tasks · Built with ✨ for modern teams</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log("📤 Welcome email send result:", result);
    console.log("✅ Welcome email sent successfully to:", to);
    console.log("📧 Resend API response:", JSON.stringify(result, null, 2));

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("❌ Failed to send welcome email:", err);
    console.error("📛 Error details:", {
      message: err.message,
      stack: err.stack,
      to,
      name
    });
  }
}

// =============================================
// Forgot Password Email
// =============================================
export async function sendPasswordResetEmail(to: string, name: string, resetToken: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

  console.log("🔑 Attempting to send Password Reset Email to:", to);
  console.log("📧 Using Resend API Key:", process.env.RESEND_API_KEY ? "✅ SET" : "❌ MISSING");
  console.log("🔗 Reset URL:", resetUrl);

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "Reset your Aura Tasks password 🔐",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#0f0f1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f0f1a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1e1b4b,#1a1a2e);border-radius:20px;overflow:hidden;border:1px solid rgba(99,102,241,0.3);box-shadow:0 0 60px rgba(99,102,241,0.15);">

          <!-- Header -->
          <tr>
            <td align="center" style="padding:40px 40px 30px;background:linear-gradient(135deg,rgba(239,68,68,0.15),rgba(99,102,241,0.1));">
              <div style="width:60px;height:60px;background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;box-shadow:0 8px 32px rgba(99,102,241,0.4);">
                <span style="color:white;font-size:28px;font-weight:900;line-height:60px;display:block;text-align:center;">A</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;">Aura Tasks</h1>
              <p style="margin:8px 0 0;color:#a5b4fc;font-size:14px;">Password Reset Request</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:700;">
                🔐 Reset your password
              </h2>
              <p style="margin:0 0 24px;color:#c7d2fe;font-size:15px;line-height:1.7;">
                Hi <strong style="color:#a78bfa;">${name}</strong>, we received a request to reset your Aura Tasks password. Click the button below to create a new password.
              </p>

              <!-- Warning box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:16px;background:rgba(245,158,11,0.1);border-radius:12px;border:1px solid rgba(245,158,11,0.3);">
                    <p style="margin:0;color:#fbbf24;font-size:13px;">
                      ⚠️ This link expires in <strong>1 hour</strong>. If you didn't request this, please ignore this email — your account is safe.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px;box-shadow:0 8px 24px rgba(99,102,241,0.4);">
                      🔑 Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0;color:#6366f1;font-size:12px;text-align:center;">
                Or copy this link: <span style="color:#a5b4fc;word-break:break-all;">${resetUrl}</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid rgba(99,102,241,0.2);text-align:center;">
              <p style="margin:0;color:#6366f1;font-size:12px;">© 2026 Aura Tasks · If you didn't request this, ignore this email.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log("📤 Password reset email send result:", result);
    console.log("✅ Password reset email sent successfully to:", to);
    console.log("📧 Resend API response:", JSON.stringify(result, null, 2));

  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("❌ Failed to send password reset email:", err);
    console.error("📛 Error details:", {
      message: err.message,
      stack: err.stack,
      to,
      name,
      resetToken
    });
  }
}
