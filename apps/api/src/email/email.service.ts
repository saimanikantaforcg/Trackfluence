import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    this.enabled = !!apiKey;
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = config.get<string>('EMAIL_FROM', 'Trackfluence <noreply@trackfluence.io>');

    if (!this.enabled) {
      this.logger.warn('RESEND_API_KEY not set — emails are disabled (dev mode)');
    }
  }

  // ── Welcome email ────────────────────────────────────────
  async sendWelcome(to: string, name: string): Promise<void> {
    await this.send({
      to,
      subject: 'Welcome to Trackfluence 🚀',
      html: this.welcomeHtml(name),
    });
  }

  // ── Password reset (future) ───────────────────────────────
  async sendPasswordReset(to: string, name: string, resetUrl: string): Promise<void> {
    await this.send({
      to,
      subject: 'Reset your Trackfluence password',
      html: this.passwordResetHtml(name, resetUrl),
    });
  }

  // ── Creator invite ────────────────────────────────────────
  async sendCreatorInvite(to: string, inviterName: string, inviteUrl: string): Promise<void> {
    await this.send({
      to,
      subject: `${inviterName} invited you to Trackfluence`,
      html: this.creatorInviteHtml(inviterName, inviteUrl),
    });
  }

  // ── Payout approved ───────────────────────────────────────
  async sendPayoutApproved(
    to: string,
    creatorName: string,
    amount: string,
    currency: string,
    portalUrl: string,
  ): Promise<void> {
    await this.send({
      to,
      subject: `Your payout of ${currency} ${amount} has been approved`,
      html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Payout Approved</title></head>
<body style="font-family:sans-serif;background:#09090b;color:#fafafa;padding:40px;max-width:600px;margin:0 auto">
  <h1 style="color:#10b981">Payout Approved 🎉</h1>
  <p style="color:#a1a1aa">Hi ${creatorName}, your payout of <strong style="color:#fafafa">${currency} ${amount}</strong> has been approved and is being processed.</p>
  <a href="${portalUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#10b981;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
    View in Portal →
  </a>
  <p style="margin-top:40px;color:#52525b;font-size:12px">Trackfluence · Creator Payouts</p>
</body></html>`,
    });
  }

  // ── Payout paid ───────────────────────────────────────────
  async sendPayoutPaid(
    to: string,
    creatorName: string,
    amount: string,
    currency: string,
    portalUrl: string,
  ): Promise<void> {
    await this.send({
      to,
      subject: `Payment of ${currency} ${amount} sent to you`,
      html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Payment Sent</title></head>
<body style="font-family:sans-serif;background:#09090b;color:#fafafa;padding:40px;max-width:600px;margin:0 auto">
  <h1 style="color:#6366f1">Payment Sent 💸</h1>
  <p style="color:#a1a1aa">Hi ${creatorName}, your payment of <strong style="color:#fafafa">${currency} ${amount}</strong> has been sent. Please allow 1–3 business days for funds to arrive.</p>
  <a href="${portalUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
    View in Portal →
  </a>
  <p style="margin-top:40px;color:#52525b;font-size:12px">Trackfluence · Creator Payouts</p>
</body></html>`,
    });
  }

  // ─────────────────────────────────────────────────────────
  private async send(opts: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.enabled || !this.resend) {
      this.logger.debug(`[Email skipped — no API key] To: ${opts.to} | Subject: ${opts.subject}`);
      return;
    }
    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
      if (error) throw new Error(error.message);
      this.logger.log(`Email sent: "${opts.subject}" → ${opts.to}`);
    } catch (err: unknown) {
      this.logger.error(`Email failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Templates ────────────────────────────────────────────
  private welcomeHtml(name: string): string {
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Welcome</title></head>
<body style="font-family:sans-serif;background:#09090b;color:#fafafa;padding:40px;max-width:600px;margin:0 auto">
  <h1 style="color:#6366f1;margin-bottom:8px">Welcome to Trackfluence, ${name}!</h1>
  <p style="color:#a1a1aa;line-height:1.6">
    Your account is ready. Start tracking creator-attributed revenue and unlocking insights from your influencer campaigns.
  </p>
  <a href="${this.config.get('APP_URL', 'http://localhost:3000')}/dashboard"
     style="display:inline-block;margin-top:24px;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
    Go to Dashboard →
  </a>
  <p style="margin-top:40px;color:#52525b;font-size:12px">Trackfluence · Revenue Attribution for Creator-Led Growth</p>
</body></html>`;
  }

  private passwordResetHtml(name: string, resetUrl: string): string {
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Reset Password</title></head>
<body style="font-family:sans-serif;background:#09090b;color:#fafafa;padding:40px;max-width:600px;margin:0 auto">
  <h1 style="color:#6366f1">Reset your password</h1>
  <p style="color:#a1a1aa">Hi ${name}, click below to reset your password. This link expires in 1 hour.</p>
  <a href="${resetUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
    Reset Password →
  </a>
  <p style="margin-top:24px;color:#52525b;font-size:12px">If you didn't request this, ignore this email.</p>
</body></html>`;
  }

  private creatorInviteHtml(inviterName: string, inviteUrl: string): string {
    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>You're Invited</title></head>
<body style="font-family:sans-serif;background:#09090b;color:#fafafa;padding:40px;max-width:600px;margin:0 auto">
  <h1 style="color:#6366f1">You've been invited!</h1>
  <p style="color:#a1a1aa">${inviterName} invited you to collaborate on Trackfluence — the revenue attribution platform for creator-led growth.</p>
  <a href="${inviteUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
    Accept Invitation →
  </a>
</body></html>`;
  }

  // ── Compliance violation ──────────────────────────────────
  async sendComplianceViolation(
    to: string,
    creatorName: string,
    contentUrl: string,
    issues: string[],
  ): Promise<void> {
    const issueList = issues.map((i) => `<li style="color:#fca5a5;margin-bottom:4px">${i}</li>`).join('');
    await this.send({
      to,
      subject: 'Action Required: FTC Compliance Issue Detected',
      html: `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Compliance Notice</title></head>
<body style="font-family:sans-serif;background:#09090b;color:#fafafa;padding:40px;max-width:600px;margin:0 auto">
  <h1 style="color:#ef4444">FTC Compliance Notice</h1>
  <p style="color:#a1a1aa">Hi ${creatorName},</p>
  <p style="color:#a1a1aa">Our compliance scanner detected the following issue(s) with your content:</p>
  <div style="background:#1c1917;border:1px solid #451a03;border-radius:8px;padding:16px;margin:16px 0">
    <p style="color:#f97316;font-weight:600;margin:0 0 8px">Content URL:</p>
    <a href="${contentUrl}" style="color:#60a5fa;word-break:break-all">${contentUrl}</a>
    <p style="color:#f97316;font-weight:600;margin:16px 0 8px">Issues Found:</p>
    <ul style="margin:0;padding-left:20px">${issueList}</ul>
  </div>
  <p style="color:#a1a1aa">Please add the required FTC disclosures (e.g. <strong>#ad</strong>, <strong>#sponsored</strong>, or <strong>Paid Partnership</strong>) prominently at the beginning of your content.</p>
  <p style="color:#71717a;font-size:13px;margin-top:24px">This is an automated notice from Trackfluence Compliance. If you believe this is an error, please contact your campaign manager.</p>
</body></html>`,
    });
  }

  // ── Attribution report ────────────────────────────────────
  async sendReport(
    to: string,
    name: string,
    since: Date,
    stats: Array<{ name: string; email: string | null; attributedRevenue: number; attributionCount: number; totalClicks: number }>,
    csv: string,
  ): Promise<void> {
    const rows = stats.slice(0, 10).map(
      (s) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #27272a">${s.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #27272a;text-align:right">$${s.attributedRevenue.toFixed(2)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #27272a;text-align:right">${s.attributionCount}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #27272a;text-align:right">${s.totalClicks}</td>
      </tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><title>Attribution Report</title></head>
<body style="font-family:sans-serif;background:#09090b;color:#fafafa;padding:40px;max-width:700px;margin:0 auto">
  <h1 style="color:#6366f1;margin-bottom:4px">Weekly Attribution Report</h1>
  <p style="color:#71717a;margin-top:0">Hi ${name} — here's your creator performance summary since ${since.toDateString()}.</p>
  <table style="width:100%;border-collapse:collapse;margin-top:24px;background:#18181b;border-radius:8px;overflow:hidden">
    <thead>
      <tr style="background:#27272a">
        <th style="padding:10px 12px;text-align:left;color:#a1a1aa;font-size:12px;text-transform:uppercase">Creator</th>
        <th style="padding:10px 12px;text-align:right;color:#a1a1aa;font-size:12px;text-transform:uppercase">Revenue</th>
        <th style="padding:10px 12px;text-align:right;color:#a1a1aa;font-size:12px;text-transform:uppercase">Attributions</th>
        <th style="padding:10px 12px;text-align:right;color:#a1a1aa;font-size:12px;text-transform:uppercase">Clicks</th>
      </tr>
    </thead>
    <tbody>${rows || '<tr><td colspan="4" style="padding:16px;text-align:center;color:#52525b">No attribution data this period</td></tr>'}</tbody>
  </table>
  <p style="margin-top:24px;color:#52525b;font-size:12px">A full CSV export is available in your Trackfluence dashboard → Reports.</p>
  <p style="margin-top:8px;color:#3f3f46;font-size:11px">Trackfluence · Automated weekly report</p>
</body></html>`;

    await this.send({ to, subject: `Trackfluence Weekly Report — ${new Date().toDateString()}`, html });
  }
}
