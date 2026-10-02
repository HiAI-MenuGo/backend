import { createTransport, type Transporter } from 'nodemailer';
import logger from './logger';

export interface StaffInviteMailInput {
  to: string;
  name: string;
  role: string;
  tenantName: string;
  logoUrl?: string | null;
  inviteUrl?: string;
}

function isConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter: Transporter | null = null;

export function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!isConfigured()) return null;
  transporter = createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

/**
 * Cho phép inject transporter phục vụ test local / Ethereal
 */
export function setTestTransporter(customTransporter: Transporter | null) {
  transporter = customTransporter;
}

/**
 * Tạo template HTML email mời nhân viên mới (inline CSS, song ngữ VI/EN chuẩn C-024)
 */
export function generateStaffInviteHtml(input: StaffInviteMailInput): string {
  const inviteUrl =
    input.inviteUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
  const logoHtml = input.logoUrl
    ? `<img src="${input.logoUrl}" alt="${input.tenantName}" style="max-height: 48px; border-radius: 8px; margin-bottom: 12px; display: inline-block;" />`
    : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thư mời tham gia ${input.tenantName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #18181b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e4e4e7;">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #18181b; padding: 28px 24px; text-align: center;">
              ${logoHtml}
              <h1 style="margin: 0; color: #f59e0b; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">${input.tenantName}</h1>
              <p style="margin: 6px 0 0; color: #a1a1aa; font-size: 13px;">Hệ thống quản lý nhà hàng F&B HiAI-MenuGo</p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #18181b;">
                Xin chào ${input.name} / <span style="font-weight: 400; color: #71717a;">Hello ${input.name},</span>
              </p>
              
              <p style="margin: 0 0 16px; font-size: 14px; line-height: 1.6; color: #3f3f46;">
                Bạn đã được thêm vào hệ thống vận hành của <strong>${input.tenantName}</strong> với vai trò:
                <span style="display: inline-block; background-color: #fef3c7; color: #92400e; font-weight: 600; padding: 3px 10px; border-radius: 6px; font-size: 13px; margin: 0 4px;">${input.role}</span>
              </p>
              
              <p style="margin: 0 0 24px; font-size: 13px; line-height: 1.5; color: #71717a;">
                You have been invited to join the operational team at <strong>${input.tenantName}</strong> with the role of <strong>${input.role}</strong>.
              </p>

              <!-- CTA Button -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${inviteUrl}" target="_blank" style="display: inline-block; background-color: #f59e0b; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 32px; border-radius: 6px; box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);">
                      Thiết lập mật khẩu / Set Up Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry notice -->
              <p style="margin: 0; font-size: 12px; color: #e11d48; text-align: center; font-weight: 500;">
                ⏳ Liên kết có hiệu lực trong vòng 24 giờ. / This link is valid for 24 hours.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; border-top: 1px solid #f4f4f5; padding: 20px 24px; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #a1a1aa; line-height: 1.4;">
                Nếu bạn không phải là người nhận dự kiến, vui lòng bỏ qua thư này.<br/>
                If you were not expecting this invitation, please ignore this email.
              </p>
              <p style="margin: 0; font-size: 11px; color: #d4d4d8;">
                © ${new Date().getFullYear()} HiAI-MenuGo Multi-Tenant Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Gửi mail mời nhân viên mới (best-effort: thiếu cấu hình SMTP thì
 * chỉ log cảnh báo "mail skipped", không chặn luồng tạo tài khoản).
 */
export async function sendStaffInviteMail(input: StaffInviteMailInput): Promise<boolean> {
  const tx = getTransporter();
  if (!tx) {
    logger.warn('SMTP chưa cấu hình — mail skipped: invite email not sent', { to: input.to });
    return false;
  }

  const inviteUrl =
    input.inviteUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
  const subject = `[${input.tenantName}] Thư mời tham gia hệ thống / Invitation to join HiAI-MenuGo`;

  const plainText = `Xin chào ${input.name},

Bạn đã được thêm vào hệ thống HiAI-MenuGo của ${input.tenantName} với vai trò: ${input.role}.
Vui lòng truy cập liên kết sau để thiết lập mật khẩu và đăng nhập:
${inviteUrl}

(Lưu ý: Liên kết có hiệu lực trong vòng 24 giờ)

---
Hello ${input.name},

You have been invited to join ${input.tenantName} as ${input.role}.
Please visit the link below to set up your password:
${inviteUrl}

(Note: This link is valid for 24 hours)

Trân trọng / Best regards,
HiAI-MenuGo Team`;

  const htmlContent = generateStaffInviteHtml(input);

  try {
    await tx.sendMail({
      from: process.env.SMTP_FROM || 'HiAI-MenuGo <noreply@menu-go.vn>',
      to: input.to,
      subject,
      text: plainText,
      html: htmlContent,
    });
    return true;
  } catch (error: any) {
    logger.error('Gửi mail mời nhân sự thất bại', { stack: error?.stack, to: input.to });
    return false;
  }
}

export default {
  sendStaffInviteMail,
  generateStaffInviteHtml,
  getTransporter,
  setTestTransporter,
};
