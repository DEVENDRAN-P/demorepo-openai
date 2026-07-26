/**
 * Simple Automatic Bill Overdue Reminder
 * 
 * Endpoint: /api/checkOverdueBills
 * Trigger: Vercel Cron (daily at 09:00 AM IST)
 * 
 * This function:
 * 1. Finds all bills that are OVERDUE (past due date)
 * 2. Sends automatic email reminder to user
 * 3. Records the email in Firestore
 * 4. No user action needed - fully automatic!
 */

const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Configure Brevo SMTP
 */
function getTransporter() {
  const brevoKey = process.env.BREVO_API_KEY;
  
  if (!brevoKey) {
    throw new Error("BREVO_API_KEY not set");
  }

  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: {
      user: "a26ddc001@smtp-brevo.com",
      pass: brevoKey,
    },
  });
}

/**
 * Check if bill is overdue today
 */
function isOverdue(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  return due < today; // Due date is in the past
}

/**
 * Check days overdue
 */
function getDaysOverdue(dueDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const daysOverdue = Math.ceil((today - due) / (1000 * 60 * 60 * 24));
  return Math.max(daysOverdue, 0);
}

/**
 * Generate overdue email content
 */
function generateOverdueEmail(bill, daysOverdue) {
  const dueDate = new Date(bill.gstrDeadline || bill.dueDate);
  const dueStr = dueDate.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const subject = `🚨 URGENT: Payment OVERDUE for ${bill.supplierName || "Bill"} - ${daysOverdue} days past due`;

  const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background-color: #FEE2E2; padding: 20px; border-radius: 0 0 8px 8px; border: 2px solid #DC2626; }
        .bill-box { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #DC2626; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #ddd; }
        .row:last-child { border-bottom: none; }
        .label { font-weight: bold; color: #6b7280; }
        .value { text-align: right; color: #1f2937; }
        .action { background-color: #DC2626; color: white; padding: 12px 20px; text-align: center; margin: 20px 0; border-radius: 6px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0; font-size: 24px;">🚨 PAYMENT OVERDUE</h2>
            <p style="margin: 10px 0 0 0; font-size: 16px;">${daysOverdue} Days Past Due!</p>
        </div>

        <div class="content">
            <h3 style="color: #DC2626; margin-top: 0;">Immediate Action Required</h3>
            
            <p style="color: #991B1B; font-weight: bold; font-size: 16px;">
                This bill was DUE on: ${dueStr}<br>
                It is NOW ${daysOverdue} DAYS OVERDUE
            </p>

            <div class="bill-box">
                <h4 style="margin-top: 0; color: #DC2626;">Bill Details:</h4>
                <div class="row">
                    <span class="label">Supplier:</span>
                    <span class="value">${bill.supplierName || "N/A"}</span>
                </div>
                <div class="row">
                    <span class="label">Invoice #:</span>
                    <span class="value">${bill.invoiceNumber || "N/A"}</span>
                </div>
                <div class="row">
                    <span class="label">Amount:</span>
                    <span class="value" style="color: #DC2626; font-weight: bold;">₹${(bill.amount || 0).toFixed(2)}</span>
                </div>
                <div class="row">
                    <span class="label">Due Date:</span>
                    <span class="value" style="color: #DC2626; font-weight: bold;">${dueStr}</span>
                </div>
                <div class="row">
                    <span class="label">Days Overdue:</span>
                    <span class="value" style="color: #DC2626; font-weight: bold; font-size: 18px;">${daysOverdue} DAYS</span>
                </div>
            </div>

            <h4 style="color: #991B1B;">⚠️ IMPORTANT:</h4>
            <ul style="color: #991B1B;">
                <li><strong>This payment is PAST DUE</strong></li>
                <li>Late charges may apply</li>
                <li>Immediate payment is required</li>
                <li>Contact supplier immediately if there are any issues</li>
            </ul>

            <div class="action">
                <strong>❗ PLEASE PAY IMMEDIATELY ❗</strong>
            </div>

            <p style="color: #6b7280; font-size: 12px; margin-bottom: 0;">
                This is an automated payment reminder sent to alert you of overdue bills.
                <br>Please take immediate action to avoid late payment penalties.
            </p>
        </div>
    </div>
</body>
</html>
  `;

  return { subject, html };
}

/**
 * Check if overdue email already sent today
 */
async function hasOverdueEmailBeenSent(userId, billId) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("emailReminders")
      .where("billId", "==", billId)
      .where("type", "==", "overdue")
      .where("sentDate", ">=", today)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    console.error("Error checking email history:", error);
    return false;
  }
}

/**
 * Main function to check overdue bills and send emails
 */
async function checkOverdueBillsAndSend() {
  console.log("\n📧 [OVERDUE CHECKER] Starting automatic overdue bill scan...");
  console.log(`   Time: ${new Date().toISOString()}\n`);

  let stats = {
    usersChecked: 0,
    billsChecked: 0,
    overdueFound: 0,
    emailsSent: 0,
    alreadySent: 0,
    errors: 0,
  };

  try {
    const transporter = getTransporter();

    // Get all users
    const usersSnapshot = await db.collection("users").get();
    stats.usersChecked = usersSnapshot.size;

    if (usersSnapshot.size === 0) {
      console.log("   ℹ️  No users found in database");
      return { success: true, stats };
    }

    // Check each user's bills
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();
      const userEmail = userData.email;

      if (!userEmail) {
        console.log(`   ⚠️  User ${userId}: No email address`);
        continue;
      }

      try {
        // Get user's bills
        const billsSnapshot = await db
          .collection("users")
          .doc(userId)
          .collection("bills")
          .get();

        stats.billsChecked += billsSnapshot.size;

        // Check each bill for overdue status
        for (const billDoc of billsSnapshot.docs) {
          const bill = billDoc.data();
          bill.id = billDoc.id;

          // Get due date
          const dueDate = bill.gstrDeadline || bill.dueDate;
          if (!dueDate) {
            continue; // No due date, skip
          }

          // Check if overdue
          if (!isOverdue(dueDate)) {
            continue; // Not overdue yet
          }

          stats.overdueFound++;

          const daysOverdue = getDaysOverdue(dueDate);

          // Check if already sent today
          const alreadySent = await hasOverdueEmailBeenSent(userId, bill.id);
          if (alreadySent) {
            console.log(
              `   ⏭️  ${bill.supplierName}: Overdue email already sent today`
            );
            stats.alreadySent++;
            continue;
          }

          try {
            // Generate email
            const emailContent = generateOverdueEmail(bill, daysOverdue);

            // Send email
            const info = await transporter.sendMail({
              from: `"GST Buddy" <${process.env.EMAIL_FROM || "noreply@gstbuddy.app"}>`,
              to: userEmail,
              subject: emailContent.subject,
              html: emailContent.html,
            });

            console.log(
              `   ✅ SENT: ${bill.supplierName} (${daysOverdue} days overdue) → ${userEmail}`
            );

            // Record email sent
            await db
              .collection("users")
              .doc(userId)
              .collection("emailReminders")
              .add({
                billId: bill.id,
                type: "overdue",
                subject: emailContent.subject,
                emailSent: userEmail,
                sentDate: admin.firestore.FieldValue.serverTimestamp(),
                daysOverdue: daysOverdue,
                status: "sent",
                messageId: info.messageId,
              });

            stats.emailsSent++;
          } catch (emailError) {
            stats.errors++;
            console.error(
              `   ❌ FAILED: ${bill.supplierName} - ${emailError.message}`
            );
          }
        }
      } catch (userError) {
        stats.errors++;
        console.error(`   ❌ Error processing user ${userId}:`, userError);
      }
    }

    console.log("\n✅ Overdue bill check completed!");
    console.log(`   📊 Users checked: ${stats.usersChecked}`);
    console.log(`   📋 Bills checked: ${stats.billsChecked}`);
    console.log(`   🚨 Overdue found: ${stats.overdueFound}`);
    console.log(`   📧 Emails sent: ${stats.emailsSent}`);
    console.log(`   ⏭️  Already sent today: ${stats.alreadySent}`);
    if (stats.errors > 0) {
      console.log(`   ❌ Errors: ${stats.errors}`);
    }
    console.log();

    return { success: true, stats };
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    stats.errors++;

    return {
      success: false,
      error: error.message,
      stats,
    };
  }
}

/**
 * Vercel Serverless Function Handler
 */
module.exports = async (req, res) => {
  // Allow GET and POST
  if (!["GET", "POST"].includes(req.method)) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const result = await checkOverdueBillsAndSend();
    return res.status(200).json(result);
  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
