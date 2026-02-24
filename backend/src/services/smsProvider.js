// Development SMS provider: logs OTP server-side instead of sending real SMS.
// Replace with Twilio/Firebase provider in production.
export async function sendVerificationCode(phone, code) {
  console.log(`[DEV OTP] phone=${phone} code=${code}`);
  return { sent: true, provider: "dev-logger" };
}
