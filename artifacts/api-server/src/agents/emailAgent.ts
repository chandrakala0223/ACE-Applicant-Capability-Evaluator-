import { Resend } from "resend";
import { logger } from "../lib/logger";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) throw new Error("RESEND_API_KEY not configured");
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export async function verifyResendEmailKey(): Promise<void> {
  const apiKey = process.env["RESEND_API_KEY"];
  if (!apiKey) {
    logger.warn("Resend API key is missing. Email notifications will be disabled.");
    return;
  }
  try {
    const resend = new Resend(apiKey);
    // Ping Resend endpoint via domains list to check if API key works
    const result = await resend.domains.list();
    if (result.error) {
      if (result.error.name === "restricted_api_key" || result.error.message.includes("restricted")) {
        logger.info("Resend Connected");
        return;
      }
      throw new Error(result.error.message);
    }
    logger.info("Resend Connected");
  } catch (err) {
    logger.error({ err }, "Resend API key verification failed. Email service unavailable.");
  }
}

export interface EmailAgentOutput {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendInterviewInvitation(
  candidateName: string,
  candidateEmail: string,
  jobTitle: string,
  interviewQuestions: string[],
): Promise<EmailAgentOutput> {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: "TalentOS AI <onboarding@resend.dev>",
      to: [candidateEmail],
      subject: `Interview Invitation — ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Interview Invitation</h2>
          <p>Dear ${candidateName},</p>
          <p>We are pleased to invite you to interview for the <strong>${jobTitle}</strong> position.</p>
          <p>Our AI-powered assessment has reviewed your application and we'd love to learn more about your experience.</p>
          ${
            interviewQuestions.length > 0
              ? `<h3>Sample Questions to Prepare:</h3>
            <ul>${interviewQuestions.slice(0, 3).map((q) => `<li>${q}</li>`).join("")}</ul>`
              : ""
          }
          <p>Our team will be in touch shortly to schedule your interview.</p>
          <p>Best regards,<br><strong>TalentOS AI Recruitment Team</strong></p>
        </div>
      `,
    });

    if (error) throw new Error(error.message);
    logger.info({ candidateEmail, jobTitle }, "Interview invitation sent");
    return { success: true, messageId: data?.id };
  } catch (err) {
    logger.error({ err, candidateEmail }, "Email sending failed");
    const message = err instanceof Error ? err.message : "EMAIL_API_FAILURE";
    return { success: false, error: message };
  }
}

export async function sendRejectionEmail(
  candidateName: string,
  candidateEmail: string,
  jobTitle: string,
): Promise<EmailAgentOutput> {
  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: "TalentOS AI <onboarding@resend.dev>",
      to: [candidateEmail],
      subject: `Application Update — ${jobTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Application Update</h2>
          <p>Dear ${candidateName},</p>
          <p>Thank you for your interest in the <strong>${jobTitle}</strong> position.</p>
          <p>After careful consideration of your application, we have decided to move forward with other candidates whose profiles more closely match our current requirements.</p>
          <p>We appreciate the time you invested in your application and encourage you to apply for future opportunities that match your profile.</p>
          <p>Best regards,<br><strong>TalentOS AI Recruitment Team</strong></p>
        </div>
      `,
    });

    if (error) throw new Error(error.message);
    logger.info({ candidateEmail, jobTitle }, "Rejection email sent");
    return { success: true, messageId: data?.id };
  } catch (err) {
    logger.error({ err, candidateEmail }, "Rejection email failed");
    return { success: false, error: String(err) };
  }
}
