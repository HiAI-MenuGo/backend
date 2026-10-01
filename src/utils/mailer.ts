import { createTransport, type Transporter } from 'nodemailer';
import logger from './logger';

function isConfigured(): boolean {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!isConfigured()) return null;
  if (!transporter) {
    transporter = createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Gửi mail mời nhân viên mới (best-effort: thiếu cấu hình SMTP thì
 * chỉ log cảnh báo, không chặn luồng tạo tài khoản).
 */
export async function sendStaffInviteMail(input: {
  to: string;
  name: string;
  role: string;
  tenantName: string;
}): Promise<boolean> {
  const tx = getTransporter();
  if (!tx) {
    logger.warn('SMTP chưa cấu hình — bỏ qua gửi mail mời nhân sự', { to: input.to });
    return false;
  }
  try {
    await tx.sendMail({
      from: process.env.SMTP_FROM || 'HiAI-MenuGo <noreply@menu-go.vn>',
      to: input.to,
      subject: `[${input.tenantName}] Thư mời tham gia hệ thống HiAI-MenuGo`,
      text: `Xin chào ${input.name},\n\nBạn đã được thêm vào hệ thống HiAI-MenuGo của ${input.tenantName} với vai trò ${input.role}.\nVui lòng liên hệ quản lý để nhận thông tin đăng nhập.\n\nTrân trọng,\nHiAI-MenuGo Team`,
    });
    return true;
  } catch (error: any) {
    logger.error('Gửi mail mời nhân sự thất bại', { stack: error?.stack, to: input.to });
    return false;
  }
}

export default { sendStaffInviteMail };
